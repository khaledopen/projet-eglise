const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { journaliser } = require('../utils/logger');

// Générer un numéro de membre unique M-ANNEE-XXXX
const genererNumeroMembre = async () => {
  const annee = new Date().getFullYear();
  const res = await db.query(
    `SELECT COUNT(*) FROM membres WHERE numero_membre LIKE $1`,
    [`M-${annee}-%`]
  );
  const count = parseInt(res.rows[0].count) + 1;
  const sequence = String(count).padStart(4, '0');
  return `M-${annee}-${sequence}`;
};

// Formulaire d'inscription publique (sans authentification)
const inscriptionPublique = async (req, res) => {
  const {
    nom,
    prenoms,
    telephone_principal,
    telephone_whatsapp,
    email,
    situation_matrimoniale,
    type_mariage,
    baptise,
    date_bapteme,
    paroisse_bapteme,
    date_naissance,
    quartier_residence,
    photo_url,
    ceb_id,
    commissions, // Array of commission IDs (Max 3)
    groupes, // Array of group IDs
    mot_de_passe, // Obligatoire pour pouvoir se connecter ultérieurement
    consentement_rgpd
  } = req.body;

  // Validation des champs obligatoires
  if (!nom || !prenoms || !telephone_principal || !situation_matrimoniale || !consentement_rgpd || !mot_de_passe) {
    return res.status(400).json({ message: 'Veuillez remplir tous les champs obligatoires et accepter les conditions de confidentialité.' });
  }

  // Vérifier le consentement
  if (!consentement_rgpd) {
    return res.status(400).json({ message: 'Le consentement de confidentialité est obligatoire.' });
  }

  try {
    // 1. Signaler les doublons selon le téléphone ou la combinaison nom et prénoms
    const doublonTel = await db.query('SELECT id FROM membres WHERE telephone_principal = $1', [telephone_principal]);
    if (doublonTel.rows.length > 0) {
      return res.status(400).json({ message: 'Ce numéro de téléphone principal est déjà utilisé par un membre.' });
    }

    const doublonNom = await db.query(
      'SELECT id FROM membres WHERE LOWER(nom) = LOWER($1) AND LOWER(prenoms) = LOWER($2)',
      [nom, prenoms]
    );
    if (doublonNom.rows.length > 0) {
      return res.status(400).json({ message: 'Un membre avec le même nom et prénom existe déjà.' });
    }

    // Validation des commissions max 3
    if (commissions && commissions.length > 3) {
      return res.status(400).json({ message: 'Un membre peut appartenir à 3 commissions au maximum.' });
    }

    // Commencer une transaction
    await db.query('BEGIN');

    // 2. Créer le compte utilisateur associé avec le rôle Membre par défaut
    const roleRes = await db.query("SELECT id FROM roles WHERE nom = 'Membre'");
    const roleMembreId = roleRes.rows[0].id;
    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(mot_de_passe, salt);

    const userRes = await db.query(
      'INSERT INTO utilisateurs (telephone, mot_de_passe, role_id) VALUES ($1, $2, $3) RETURNING id',
      [telephone_principal, hashedPass, roleMembreId]
    );
    const utilisateurId = userRes.rows[0].id;

    // 3. Générer le numéro de membre unique
    const numeroMembre = await genererNumeroMembre();

    // 4. Insérer le membre avec statut 'en attente'
    const membreQuery = `
      INSERT INTO membres (
        numero_membre, nom, prenoms, telephone_principal, telephone_whatsapp, email,
        situation_matrimoniale, type_mariage, baptise, date_bapteme, paroisse_bapteme,
        date_naissance, quartier_residence, photo_url, ceb_id, statut, utilisateur_id, consentement_rgpd
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'en attente', $16, $17)
      RETURNING id
    `;
    const membreRes = await db.query(membreQuery, [
      numeroMembre, nom, prenoms, telephone_principal, telephone_whatsapp, email,
      situation_matrimoniale, type_mariage, baptise === 'true' || baptise === true,
      date_bapteme || null, paroisse_bapteme || null, date_naissance || null,
      quartier_residence || null, photo_url || null, ceb_id || null, utilisateurId, consentement_rgpd
    ]);
    const membreId = membreRes.rows[0].id;

    // 5. Insérer les commissions du membre
    if (commissions && commissions.length > 0) {
      for (const comId of commissions) {
        await db.query(
          'INSERT INTO membre_commissions (membre_id, commission_id) VALUES ($1, $2)',
          [membreId, comId]
        );
      }
    }

    // 6. Insérer les groupes du membre
    if (groupes && groupes.length > 0) {
      for (const grpId of groupes) {
        await db.query(
          'INSERT INTO membre_groupes (membre_id, groupe_id) VALUES ($1, $2)',
          [membreId, grpId]
        );
      }
    }

    await db.query('COMMIT');

    // Journaliser l'action
    await journaliser(null, 'inscription_publique', 'membres', null, { numero_membre: numeroMembre, nom, prenoms });

    return res.status(201).json({
      message: 'Inscription enregistrée avec succès. Bienvenue ! Votre fiche est en attente de validation par le secrétaire.',
      numero_membre: numeroMembre,
    });

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Erreur lors de l\'inscription publique:', error);
    return res.status(500).json({ message: 'Une erreur serveur est survenue lors de l\'inscription.' });
  }
};

// Valider ou refuser un membre (Secrétaire ou Administrateur)
const validerStatutMembre = async (req, res) => {
  const { id } = req.params;
  const { statut, motif } = req.body; // 'actif' ou 'refusé'

  if (!['actif', 'refusé'].includes(statut)) {
    return res.status(400).json({ message: 'Statut de validation invalide.' });
  }

  try {
    const checkMembre = await db.query('SELECT * FROM membres WHERE id = $1', [id]);
    if (checkMembre.rows.length === 0) {
      return res.status(404).json({ message: 'Membre non trouvé.' });
    }

    const membre = checkMembre.rows[0];
    
    await db.query('UPDATE membres SET statut = $1, updated_at = NOW() WHERE id = $2', [statut, id]);
    
    // Journaliser l'activité
    await journaliser(
      req.user.id,
      statut === 'actif' ? 'validation_membre' : 'refus_membre',
      'membres',
      { id, statut: membre.statut },
      { id, statut, motif }
    );

    return res.json({ message: `Le membre a été défini comme ${statut} avec succès.` });
  } catch (error) {
    console.error('Erreur validation membre:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Obtenir le répertoire des membres (Recherche, filtres et statistiques)
const obtenirRepertoire = async (req, res) => {
  const { recherche, ceb_id, commission_id, groupe_id, situation_matrimoniale, statut } = req.query;

  try {
    // 1. Construire les filtres dynamiques
    let conditions = [];
    let values = [];
    let paramIndex = 1;

    // Par défaut, seuls les membres actifs sont visibles dans le répertoire officiel,
    // sauf si l'utilisateur est Secrétaire ou Admin qui peuvent filtrer par tout statut
    const roleUtilisateur = req.user.role;
    if (['Secretaire', 'Administrateur'].includes(roleUtilisateur)) {
      if (statut) {
        conditions.push(`m.statut = $${paramIndex++}`);
        values.push(statut);
      }
    } else {
      conditions.push(`m.statut = 'actif'`);
    }

    if (recherche) {
      conditions.push(`(LOWER(m.nom) LIKE LOWER($${paramIndex}) OR LOWER(m.prenoms) LIKE LOWER($${paramIndex}) OR m.telephone_principal LIKE $${paramIndex} OR m.numero_membre LIKE $${paramIndex})`);
      values.push(`%${recherche}%`);
      paramIndex++;
    }

    if (ceb_id) {
      conditions.push(`m.ceb_id = $${paramIndex++}`);
      values.push(ceb_id);
    }

    if (situation_matrimoniale) {
      conditions.push(`m.situation_matrimoniale = $${paramIndex++}`);
      values.push(situation_matrimoniale);
    }

    if (commission_id) {
      conditions.push(`EXISTS (SELECT 1 FROM membre_commissions mc WHERE mc.membre_id = m.id AND mc.commission_id = $${paramIndex++})`);
      values.push(commission_id);
    }

    if (groupe_id) {
      conditions.push(`EXISTS (SELECT 1 FROM membre_groupes mg WHERE mg.membre_id = m.id AND mg.groupe_id = $${paramIndex++})`);
      values.push(groupe_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Récupérer la liste des membres filtrés
    const queryMembres = `
      SELECT m.*, c.nom as ceb_nom,
        ARRAY(SELECT com.nom FROM commissions com JOIN membre_commissions mc ON mc.commission_id = com.id WHERE mc.membre_id = m.id) as commissions_nom
      FROM membres m
      LEFT JOIN ceb c ON m.ceb_id = c.id
      ${whereClause}
      ORDER BY m.nom ASC, m.prenoms ASC
    `;
    const membresRes = await db.query(queryMembres, values);

    // Statistiques globales
    const totalRes = await db.query("SELECT COUNT(*) FROM membres WHERE statut = 'actif'");
    const cebStats = await db.query(`
      SELECT c.nom, COUNT(m.id) as total 
      FROM ceb c 
      LEFT JOIN membres m ON m.ceb_id = c.id AND m.statut = 'actif'
      GROUP BY c.id, c.nom
    `);
    const commissionStats = await db.query(`
      SELECT com.nom, COUNT(mc.membre_id) as total
      FROM commissions com
      LEFT JOIN membre_commissions mc ON mc.commission_id = com.id
      LEFT JOIN membres m ON mc.membre_id = m.id AND m.statut = 'actif'
      GROUP BY com.id, com.nom
    `);

    return res.json({
      membres: membresRes.rows,
      statistiques: {
        effectif_total_actif: parseInt(totalRes.rows[0].count),
        par_ceb: cebStats.rows,
        par_commission: commissionStats.rows
      }
    });

  } catch (error) {
    console.error('Erreur obtenirRepertoire:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Obtenir la fiche détaillée d'un membre avec son historique financier
const obtenirDetailsMembre = async (req, res) => {
  const { id } = req.params;

  try {
    // Récupérer le profil du membre
    const membreQuery = `
      SELECT m.*, c.nom as ceb_nom
      FROM membres m
      LEFT JOIN ceb c ON m.ceb_id = c.id
      WHERE m.id = $1
    `;
    const membreRes = await db.query(membreQuery, [id]);
    if (membreRes.rows.length === 0) {
      return res.status(404).json({ message: 'Membre non trouvé.' });
    }

    const membre = membreRes.rows[0];

    // Vérifier les droits d'accès
    const estLuiMeme = req.user.membreId === parseInt(id);
    const estTresorierOuAdmin = ['Tresorier', 'Administrateur'].includes(req.user.role);

    // Si membre normal et pas lui-même, restreindre
    if (req.user.role === 'Membre' && !estLuiMeme) {
      return res.status(403).json({ message: 'Accès interdit.' });
    }

    // Commissions et groupes associés
    const commissions = await db.query(
      'SELECT c.* FROM commissions c JOIN membre_commissions mc ON mc.commission_id = c.id WHERE mc.membre_id = $1',
      [id]
    );
    const groupes = await db.query(
      'SELECT g.* FROM groupes g JOIN membre_groupes mg ON mg.groupe_id = g.id WHERE mg.membre_id = $1',
      [id]
    );

    let historiqueFinancier = null;

    // Les informations financières ne sont visibles que par le membre concerné, le trésorier et l'administrateur
    if (estLuiMeme || estTresorierOuAdmin) {
      // Cotisations mensuelles payées
      const cotisations = await db.query(`
        SELECT p.id as paiement_id, p.mode_paiement, p.reference_transaction, p.date_paiement, p.statut as paiement_statut,
               dp.annee, dp.mois, dp.montant_attribue
        FROM paiements p
        JOIN details_paiements dp ON dp.paiement_id = p.id
        WHERE p.membre_id = $1
        ORDER BY dp.annee DESC, dp.mois DESC
      `, [id]);

      // Contributions exceptionnelles
      const contributions = await db.query(`
        SELECT c.id as contribution_id, c.montant, c.mode_paiement, c.reference_transaction, c.date_contribution,
               col.titre as collecte_titre
        FROM contributions_exceptionnelles c
        JOIN collectes_exceptionnelles col ON c.collecte_id = col.id
        WHERE c.membre_id = $1
        ORDER BY c.date_contribution DESC
      `, [id]);

      historiqueFinancier = {
        cotisations: cotisations.rows,
        contributions_exceptionnelles: contributions.rows
      };
    }

    return res.json({
      ...membre,
      commissions: commissions.rows,
      groupes: groupes.rows,
      historiqueFinancier
    });

  } catch (error) {
    console.error('Erreur obtenirDetailsMembre:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Modifier les informations d'un membre (Secrétaire, Admin ou lui-même)
const mettreAJourMembre = async (req, res) => {
  const { id } = req.params;
  const {
    nom, prenoms, telephone_principal, telephone_whatsapp, email,
    situation_matrimoniale, type_mariage, baptise, date_bapteme,
    paroisse_bapteme, date_naissance, quartier_residence, photo_url,
    ceb_id, commissions, groupes, statut
  } = req.body;

  const estLuiMeme = req.user.membreId === parseInt(id);
  const estSecretaireOuAdmin = ['Secretaire', 'Administrateur'].includes(req.user.role);

  if (!estLuiMeme && !estSecretaireOuAdmin) {
    return res.status(403).json({ message: 'Accès interdit. Permissions insuffisantes.' });
  }

  try {
    const checkMembre = await db.query('SELECT * FROM membres WHERE id = $1', [id]);
    if (checkMembre.rows.length === 0) {
      return res.status(404).json({ message: 'Membre non trouvé.' });
    }

    const ancienMembre = checkMembre.rows[0];

    // Seuls Secrétaire ou Admin peuvent changer le statut ou le numéro de membre
    const nouveauStatut = estSecretaireOuAdmin && statut ? statut : ancienMembre.statut;

    if (commissions && commissions.length > 3) {
      return res.status(400).json({ message: 'Un membre peut appartenir à 3 commissions au maximum.' });
    }

    await db.query('BEGIN');

    const updateQuery = `
      UPDATE membres SET
        nom = $1, prenoms = $2, telephone_principal = $3, telephone_whatsapp = $4, email = $5,
        situation_matrimoniale = $6, type_mariage = $7, baptise = $8, date_bapteme = $9,
        paroisse_bapteme = $10, date_naissance = $11, quartier_residence = $12, photo_url = $13,
        ceb_id = $14, statut = $15, updated_at = NOW()
      WHERE id = $16
    `;

    await db.query(updateQuery, [
      nom || ancienMembre.nom,
      prenoms || ancienMembre.prenoms,
      telephone_principal || ancienMembre.telephone_principal,
      telephone_whatsapp !== undefined ? telephone_whatsapp : ancienMembre.telephone_whatsapp,
      email !== undefined ? email : ancienMembre.email,
      situation_matrimoniale || ancienMembre.situation_matrimoniale,
      type_mariage !== undefined ? type_mariage : ancienMembre.type_mariage,
      baptise !== undefined ? (baptise === 'true' || baptise === true) : ancienMembre.baptise,
      date_bapteme || ancienMembre.date_bapteme,
      paroisse_bapteme || ancienMembre.paroisse_bapteme,
      date_naissance || ancienMembre.date_naissance,
      quartier_residence !== undefined ? quartier_residence : ancienMembre.quartier_residence,
      photo_url !== undefined ? photo_url : ancienMembre.photo_url,
      ceb_id !== undefined ? (ceb_id ? ceb_id : null) : ancienMembre.ceb_id,
      nouveauStatut,
      id
    ]);

    // Mettre à jour commissions
    if (commissions) {
      await db.query('DELETE FROM membre_commissions WHERE membre_id = $1', [id]);
      for (const comId of commissions) {
        await db.query('INSERT INTO membre_commissions (membre_id, commission_id) VALUES ($1, $2)', [id, comId]);
      }
    }

    // Mettre à jour groupes
    if (groupes) {
      await db.query('DELETE FROM membre_groupes WHERE membre_id = $1', [id]);
      for (const grpId of groupes) {
        await db.query('INSERT INTO membre_groupes (membre_id, groupe_id) VALUES ($1, $2)', [id, grpId]);
      }
    }

    await db.query('COMMIT');

    await journaliser(req.user.id, 'modification_membre', 'membres', ancienMembre, { id, nom, prenoms, statut: nouveauStatut });

    return res.json({ message: 'Fiche membre mise à jour avec succès.' });

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Erreur mettreAJourMembre:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Suppression définitive (Admin uniquement, enregistré dans le journal)
const supprimerMembreDefinitif = async (req, res) => {
  const { id } = req.params;

  try {
    const checkMembre = await db.query('SELECT * FROM membres WHERE id = $1', [id]);
    if (checkMembre.rows.length === 0) {
      return res.status(404).json({ message: 'Membre non trouvé.' });
    }

    const membre = checkMembre.rows[0];

    await db.query('BEGIN');
    
    // Supprimer d'abord de la table utilisateurs
    if (membre.utilisateur_id) {
      await db.query('DELETE FROM utilisateurs WHERE id = $1', [membre.utilisateur_id]);
    }
    
    // Supprimer le membre (cascade supprimera membre_commissions et membre_groupes)
    await db.query('DELETE FROM membres WHERE id = $1', [id]);

    await db.query('COMMIT');

    await journaliser(req.user.id, 'suppression_definitive', 'membres', membre, null);

    return res.json({ message: 'Le membre et son compte utilisateur ont été définitivement supprimés.' });

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Erreur supprimerMembreDefinitif:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

module.exports = {
  inscriptionPublique,
  validerStatutMembre,
  obtenirMembresEnAttente,
  obtenirRepertoire,
  obtenirDetailsMembre,
  mettreAJourMembre,
  supprimerMembreDefinitif,
};

