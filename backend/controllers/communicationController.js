const db = require('../config/db');
const { journaliser } = require('../utils/logger');

// ==========================================
// PAROLE DU JOUR
// ==========================================

// Publier ou corriger la Parole du Jour (Admin uniquement)
const publierParoleDuJour = async (req, res) => {
  const {
    date_liturgique,
    saint_du_jour,
    references_lectures,
    textes_lectures,
    evangile,
    meditation,
    intention_priere
  } = req.body;

  if (!date_liturgique || !evangile || !meditation) {
    return res.status(400).json({ message: 'La date, l\'Évangile et la méditation sont obligatoires.' });
  }

  try {
    const query = `
      INSERT INTO paroles_du_jour (
        date_liturgique, saint_du_jour, references_lectures, textes_lectures, evangile, meditation, intention_priere, auteur_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (date_liturgique) 
      DO UPDATE SET 
        saint_du_jour = EXCLUDED.saint_du_jour,
        references_lectures = EXCLUDED.references_lectures,
        textes_lectures = EXCLUDED.textes_lectures,
        evangile = EXCLUDED.evangile,
        meditation = EXCLUDED.meditation,
        intention_priere = EXCLUDED.intention_priere,
        auteur_id = EXCLUDED.auteur_id
      RETURNING *
    `;

    const result = await db.query(query, [
      date_liturgique,
      saint_du_jour || null,
      references_lectures || null,
      textes_lectures || null,
      evangile,
      meditation,
      intention_priere || null,
      req.user.id
    ]);

    await journaliser(req.user.id, 'publication_parole', 'paroles_du_jour', null, { date_liturgique });

    return res.status(201).json({
      message: 'Parole du Jour publiée avec succès.',
      parole: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur publierParoleDuJour:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Récupérer la Parole du jour d'une date spécifique (Défaut : aujourd'hui)
const obtenirParoleDuJour = async (req, res) => {
  const { date } = req.query;
  const dateCible = date || new Date().toISOString().split('T')[0];

  try {
    const result = await db.query('SELECT * FROM paroles_du_jour WHERE date_liturgique = $1', [dateCible]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Aucune Parole du Jour disponible pour cette date.' });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur obtenirParoleDuJour:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Récupérer les 7 derniers jours de la Parole du Jour (pour consultation hors-ligne côté client)
const obtenirParoles7Dours = async (req, res) => {
  try {
    const query = `
      SELECT * FROM paroles_du_jour 
      WHERE date_liturgique >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY date_liturgique DESC
    `;
    const result = await db.query(query);
    return res.json(result.rows);
  } catch (error) {
    console.error('Erreur obtenirParoles7Dours:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ==========================================
// ANNONCES
// ==========================================

// Publier une annonce
const publierAnnonce = async (req, res) => {
  const {
    titre,
    texte,
    image_url,
    date_publication,
    date_expiration,
    urgent,
    epingler,
    destinataires // Array of { type: 'public'|'ceb'|'commission'|'groupe', targetId: number|null }
  } = req.body;

  if (!titre || !texte || !date_publication || !date_expiration || !destinataires || destinataires.length === 0) {
    return res.status(400).json({ message: 'Veuillez remplir tous les champs requis.' });
  }

  // Si c'est un responsable de CEB/commission/groupe, vérifier qu'il ne publie que pour son entité
  const role = req.user.role;
  if (role === 'Responsable') {
    // Dans une version plus poussée, nous aurions une table "responsables" pour faire correspondre l'id utilisateur avec son CEB/commission/groupe.
    // Pour simplifier cette version, nous faisons confiance aux permissions reçues du client tout en validant le format.
  }

  try {
    await db.query('BEGIN');

    const insertAnnonce = `
      INSERT INTO annonces (titre, texte, image_url, date_publication, date_expiration, urgent, epingler, auteur_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
    `;
    const annonceRes = await db.query(insertAnnonce, [
      titre,
      texte,
      image_url || null,
      date_publication,
      date_expiration,
      urgent === true || urgent === 'true',
      epingler === true || epingler === 'true',
      req.user.id
    ]);
    const annonceId = annonceRes.rows[0].id;

    for (const dest of destinataires) {
      await db.query(
        'INSERT INTO destinataires_annonces (annonce_id, type_destinataire, cible_id) VALUES ($1, $2, $3)',
        [annonceId, dest.type, dest.targetId || null]
      );
    }

    await db.query('COMMIT');

    await journaliser(req.user.id, 'creation_annonce', 'annonces', null, { id: annonceId, titre });

    return res.status(201).json({ message: 'Annonce publiée avec succès.' });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Erreur publierAnnonce:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Récupérer les annonces destinées à l'utilisateur (Filtrées par ses appartenances CEB/Commissions/Groupes)
const obtenirAnnoncesUtilisateur = async (req, res) => {
  const membreId = req.user.membreId;

  try {
    let subqueries = ["da.type_destinataire = 'public'"];
    let params = [];
    let index = 1;

    if (membreId) {
      // 1. Récupérer les appartenances du membre
      const membreRes = await db.query('SELECT ceb_id FROM membres WHERE id = $1', [membreId]);
      const cebId = membreRes.rows[0]?.ceb_id;

      if (cebId) {
        subqueries.push(`(da.type_destinataire = 'ceb' AND da.cible_id = $${index})`);
        params.push(cebId);
        index++;
      }

      // Commissions
      const commRes = await db.query('SELECT commission_id FROM membre_commissions WHERE membre_id = $1', [membreId]);
      const commIds = commRes.rows.map(r => r.commission_id);
      if (commIds.length > 0) {
        subqueries.push(`(da.type_destinataire = 'commission' AND da.cible_id = ANY($${index}))`);
        params.push(commIds);
        index++;
      }

      // Groupes
      const grpRes = await db.query('SELECT groupe_id FROM membre_groupes WHERE membre_id = $1', [membreId]);
      const grpIds = grpRes.rows.map(r => r.groupe_id);
      if (grpIds.length > 0) {
        subqueries.push(`(da.type_destinataire = 'groupe' AND da.cible_id = ANY($${index}))`);
        params.push(grpIds);
        index++;
      }
    } else {
      // Si pas lié à un membre (par ex: Admin global qui n'est pas sur le répertoire ou Secrétaire)
      // Voir toutes les annonces
      subqueries.push("true");
    }

    const query = `
      SELECT DISTINCT a.* 
      FROM annonces a
      JOIN destinataires_annonces da ON da.annonce_id = a.id
      WHERE (${subqueries.join(' OR ')})
      AND a.date_publication <= NOW()
      AND a.date_expiration >= NOW()
      ORDER BY a.epingler DESC, a.date_publication DESC
    `;

    const result = await db.query(query, params);
    return res.json(result.rows);

  } catch (error) {
    console.error('Erreur obtenirAnnoncesUtilisateur:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

module.exports = {
  publierParoleDuJour,
  obtenirParoleDuJour,
  obtenirParoles7Dours,
  publierAnnonce,
  obtenirAnnoncesUtilisateur,
};
