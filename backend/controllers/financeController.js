const db = require('../config/db');
const { journaliser } = require('../utils/logger');

// Générer un numéro unique de reçu REC-ANNEE-XXXXX
const genererNumeroRecu = async () => {
  const annee = new Date().getFullYear();
  const res = await db.query(
    `SELECT COUNT(*) FROM recus WHERE numero_recu LIKE $1`,
    [`REC-${annee}-%`]
  );
  const count = parseInt(res.rows[0].count) + 1;
  const sequence = String(count).padStart(5, '0');
  return `REC-${annee}-${sequence}`;
};

// Enregistrer les cotisations mensuelles (Trésorier ou Administrateur)
const enregistrerPaiementMensuel = async (req, res) => {
  const {
    membre_id,
    annee,
    mois_list, // Tableau des mois à payer (ex: [1, 2, 3])
    montant_total,
    mode_paiement,
    reference_transaction,
    observation
  } = req.body;

  if (!membre_id || !annee || !mois_list || mois_list.length === 0 || !montant_total || !mode_paiement) {
    return res.status(400).json({ message: 'Veuillez renseigner tous les champs obligatoires.' });
  }

  try {
    await db.query('BEGIN');

    // 1. Récupérer les paramètres de cotisation pour cette année
    const cmRes = await db.query('SELECT * FROM cotisations_mensuelles WHERE annee = $1', [annee]);
    if (cmRes.rows.length === 0) {
      return res.status(400).json({ message: 'Les tarifs de cotisation ne sont pas définis pour cette année.' });
    }
    const tarifNormal = parseFloat(cmRes.rows[0].montant_normal);
    
    // Vérifier si le membre bénéficie d'un tarif réduit (jeune/élève/cas social)
    // Pour cette version, nous allons attribuer le tarif selon les saisies ou le profil du membre
    const membreRes = await db.query('SELECT date_naissance FROM membres WHERE id = $1', [membre_id]);
    if (membreRes.rows.length === 0) {
      return res.status(404).json({ message: 'Membre introuvable.' });
    }
    
    // Détecter tarif réduit si l'âge est inférieur à 18 ans
    const dateNaiss = membreRes.rows[0].date_naissance;
    let typeTarif = 'normal';
    let montantDuParMois = tarifNormal;
    if (dateNaiss) {
      const age = new Date().getFullYear() - new Date(dateNaiss).getFullYear();
      if (age < 18) {
        typeTarif = 'reduit';
        montantDuParMois = parseFloat(cmRes.rows[0].montant_reduit);
      }
    }

    // 2. Enregistrer la transaction de paiement globale
    const insertPaiement = `
      INSERT INTO paiements (membre_id, montant_total, mode_paiement, reference_transaction, enregistre_par, observation)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
    `;
    const paiementRes = await db.query(insertPaiement, [
      membre_id,
      montant_total,
      mode_paiement,
      reference_transaction || null,
      req.user.id,
      observation || null
    ]);
    const paiementId = paiementRes.rows[0].id;

    // 3. Répartir le montant total sur les mois demandés
    // Si le montant versé couvre exactement tous les mois à montantDuParMois, tant mieux.
    // Sinon, on répartit équitablement ou au prorata.
    const nbMois = mois_list.length;
    let montantRestantARepartir = parseFloat(montant_total);

    for (let i = 0; i < nbMois; i++) {
      const mois = mois_list[i];
      let montantPourCeMois = 0;
      
      if (i === nbMois - 1) {
        // Dernier mois reçoit le reste
        montantPourCeMois = montantRestantARepartir;
      } else {
        // Les autres reçoivent au maximum la cotisation due par mois
        montantPourCeMois = Math.min(montantDuParMois, montantRestantARepartir / (nbMois - i));
      }

      montantRestantARepartir -= montantPourCeMois;

      await db.query(`
        INSERT INTO details_paiements (paiement_id, annee, mois, montant_attribue, type_tarif)
        VALUES ($1, $2, $3, $4, $5)
      `, [paiementId, annee, mois, montantPourCeMois, typeTarif]);
    }

    // 4. Générer le reçu avec numéro unique
    const numeroRecu = await genererNumeroRecu();
    await db.query(`
      INSERT INTO recus (numero_recu, paiement_id)
      VALUES ($1, $2)
    `, [numeroRecu, paiementId]);

    await db.query('COMMIT');

    await journaliser(req.user.id, 'enregistrement_paiement', 'paiements', null, { paiement_id: paiementId, montant_total, numero_recu: numeroRecu });

    return res.status(201).json({
      message: 'Paiement enregistré avec succès.',
      paiement_id: paiementId,
      numero_recu: numeroRecu
    });

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Erreur enregistrerPaiementMensuel:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Annuler un paiement (Écriture inverse - Trésorier ou Administrateur)
const annulerPaiement = async (req, res) => {
  const { paiement_id, motif } = req.body;

  if (!paiement_id || !motif) {
    return res.status(400).json({ message: 'L\'ID du paiement et le motif d\'annulation sont requis.' });
  }

  try {
    const checkPaiement = await db.query('SELECT * FROM paiements WHERE id = $1', [paiement_id]);
    if (checkPaiement.rows.length === 0) {
      return res.status(404).json({ message: 'Paiement non trouvé.' });
    }

    const paiement = checkPaiement.rows[0];
    if (paiement.statut === 'annule') {
      return res.status(400).json({ message: 'Ce paiement est déjà annulé.' });
    }

    await db.query('BEGIN');

    // Mettre à jour le statut du paiement d'origine
    await db.query("UPDATE paiements SET statut = 'annule' WHERE id = $1", [paiement_id]);

    // Enregistrer l'écriture d'annulation
    await db.query(`
      INSERT INTO annulations_paiements (paiement_id, motif, annule_par)
      VALUES ($1, $2, $3)
    `, [paiement_id, motif, req.user.id]);

    await db.query('COMMIT');

    await journaliser(req.user.id, 'annulation_paiement', 'paiements', paiement, { id: paiement_id, statut: 'annule', motif });

    return res.json({ message: 'Paiement annulé avec succès (écriture inverse enregistrée).' });

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Erreur annulerPaiement:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Obtenir le statut annuel de paiement d'un membre
const obtenirPaiementsMembreAnnuel = async (req, res) => {
  const { membre_id, annee } = req.query;

  if (!membre_id || !annee) {
    return res.status(400).json({ message: 'ID membre et année requis.' });
  }

  try {
    // Tarif dû
    const cmRes = await db.query('SELECT * FROM cotisations_mensuelles WHERE annee = $1', [annee]);
    if (cmRes.rows.length === 0) {
      return res.json({ status: 'no_tarif', message: 'Pas de cotisation définie pour cette année.' });
    }
    const normalRate = parseFloat(cmRes.rows[0].montant_normal);
    const reducedRate = parseFloat(cmRes.rows[0].montant_reduit);

    // Détecter tarif du membre
    const mRes = await db.query('SELECT date_naissance FROM membres WHERE id = $1', [membre_id]);
    const dateNaiss = mRes.rows[0]?.date_naissance;
    let rate = normalRate;
    if (dateNaiss) {
      const age = new Date().getFullYear() - new Date(dateNaiss).getFullYear();
      if (age < 18) rate = reducedRate;
    }

    // Récupérer les montants payés par mois pour cette année
    const query = `
      SELECT dp.mois, SUM(dp.montant_attribue) as paye
      FROM details_paiements dp
      JOIN paiements p ON dp.paiement_id = p.id
      WHERE p.membre_id = $1 AND dp.annee = $2 AND p.statut != 'annule'
      GROUP BY dp.mois
    `;
    const result = await db.query(query, [membre_id, annee]);

    // Bâtir l'état mensuel (1 à 12)
    const monthlyStatus = [];
    for (let mois = 1; mois <= 12; mois++) {
      const row = result.rows.find(r => r.mois === mois);
      const paye = row ? parseFloat(row.paye) : 0;
      
      let statut = 'impayé';
      if (paye >= rate) {
        statut = 'payé';
      } else if (paye > 0) {
        statut = 'partiellement payé';
      }

      monthlyStatus.push({
        mois,
        montant_paye: paye,
        montant_du: rate,
        statut
      });
    }

    return res.json({
      annee,
      cotisation_mensuelle: rate,
      statut_mensuel: monthlyStatus
    });

  } catch (error) {
    console.error('Erreur obtenirPaiementsMembreAnnuel:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ------------------------------------------
// COTISATIONS EXCEPTIONNELLES (COLLECTES)
// ------------------------------------------

// Créer une collecte exceptionnelle (Admin ou Trésorier)
const creerCollecteExceptionnelle = async (req, res) => {
  const {
    titre,
    motif,
    description,
    objectif_financier,
    date_debut,
    date_fin,
    repartition_mode, // 'manuel', 'automatique_age', 'automatique_statut', 'choix_membre'
    groupes_contributeurs // Array of { nom_groupe: string, montant_attendu: number }
  } = req.body;

  if (!titre || !motif || !date_debut || !date_fin || !repartition_mode || !groupes_contributeurs || groupes_contributeurs.length === 0) {
    return res.status(400).json({ message: 'Veuillez remplir tous les champs obligatoires.' });
  }

  try {
    await db.query('BEGIN');

    // Insérer la collecte
    const insertCollecte = `
      INSERT INTO collectes_exceptionnelles (titre, motif, description, objectif_financier, date_debut, date_fin, repartition_mode)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
    `;
    const colRes = await db.query(insertCollecte, [
      titre, motif, description || null, objectif_financier || null, date_debut, date_fin, repartition_mode
    ]);
    const collecteId = colRes.rows[0].id;

    // Insérer les groupes
    for (const g of groupes_contributeurs) {
      await db.query(`
        INSERT INTO groupes_collecte (collecte_id, nom_groupe, montant_attendu)
        VALUES ($1, $2, $3)
      `, [collecteId, g.nom_groupe, g.montant_attendu]);
    }

    await db.query('COMMIT');

    await journaliser(req.user.id, 'creation_collecte', 'collectes_exceptionnelles', null, { id: collecteId, titre });

    return res.status(201).json({
      message: 'Collecte exceptionnelle créée avec succès.',
      collecte_id: collecteId
    });

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Erreur creerCollecteExceptionnelle:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Enregistrer une contribution exceptionnelle (Trésorier ou Administrateur)
const contribuerCollecte = async (req, res) => {
  const {
    collecte_id,
    membre_id,
    montant,
    mode_paiement,
    reference_transaction
  } = req.body;

  if (!collecte_id || !membre_id || !montant || !mode_paiement) {
    return res.status(400).json({ message: 'Champs obligatoires manquants.' });
  }

  try {
    await db.query('BEGIN');

    const insertContrib = `
      INSERT INTO contributions_exceptionnelles (collecte_id, membre_id, montant, mode_paiement, reference_transaction, enregistre_par)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
    `;
    const contribRes = await db.query(insertContrib, [
      collecte_id, membre_id, montant, mode_paiement, reference_transaction || null, req.user.id
    ]);
    const contributionId = contribRes.rows[0].id;

    // Générer le reçu
    const numeroRecu = await genererNumeroRecu();
    await db.query(`
      INSERT INTO recus (numero_recu, contribution_id)
      VALUES ($1, $2)
    `, [numeroRecu, contributionId]);

    await db.query('COMMIT');

    await journaliser(req.user.id, 'contribution_exceptionnelle', 'contributions_exceptionnelles', null, { contribution_id: contributionId, montant, numero_recu: numeroRecu });

    return res.status(201).json({
      message: 'Contribution enregistrée avec succès.',
      contribution_id: contributionId,
      numero_recu: numeroRecu
    });

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Erreur contribuerCollecte:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Obtenir les détails et statistiques réelles d'une collecte
const obtenirDetailsCollecte = async (req, res) => {
  const { id } = req.params;

  try {
    // Infos collecte
    const colRes = await db.query('SELECT * FROM collectes_exceptionnelles WHERE id = $1', [id]);
    if (colRes.rows.length === 0) {
      return res.status(404).json({ message: 'Collecte non trouvée.' });
    }
    const collecte = colRes.rows[0];

    // Groupes associés
    const grpsRes = await db.query('SELECT * FROM groupes_collecte WHERE collecte_id = $1', [id]);
    const groupes = grpsRes.rows;

    // Contributions réelles
    const contribsRes = await db.query(`
      SELECT c.*, m.nom, m.prenoms 
      FROM contributions_exceptionnelles c
      JOIN membres m ON c.membre_id = m.id
      WHERE c.collecte_id = $1
      ORDER BY c.date_contribution DESC
    `, [id]);

    const contributions = contribsRes.rows;

    // Stats réelles
    const totalCollecte = contributions.reduce((sum, c) => sum + parseFloat(c.montant), 0);
    const nbContributeurs = new Set(contributions.map(c => c.membre_id)).size;

    // Objectif financier total attendu (somme des montants attendus des groupes)
    const totalAttendu = groupes.reduce((sum, g) => sum + parseFloat(g.montant_attendu), 0);
    const restant = Math.max(0, totalAttendu - totalCollecte);
    const progression = totalAttendu > 0 ? (totalCollecte / totalAttendu) * 100 : 0;

    return res.json({
      collecte,
      groupes,
      statistiques: {
        total_attendu: totalAttendu,
        total_collecte: totalCollecte,
        total_restant: restant,
        pourcentage_progression: progression,
        nombre_contributeurs: nbContributeurs
      },
      contributions
    });

  } catch (error) {
    console.error('Erreur obtenirDetailsCollecte:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Obtenir toutes les collectes
const obtenirToutesCollectes = async (req, res) => {
  try {
    const query = `
      SELECT c.*, 
        (SELECT COALESCE(SUM(contr.montant), 0) FROM contributions_exceptionnelles contr WHERE contr.collecte_id = c.id) as total_collecte
      FROM collectes_exceptionnelles c
      ORDER BY c.date_debut DESC
    `;
    const result = await db.query(query);
    return res.json(result.rows);
  } catch (error) {
    console.error('Erreur obtenirToutesCollectes:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

module.exports = {
  enregistrerPaiementMensuel,
  annulerPaiement,
  obtenirPaiementsMembreAnnuel,
  creerCollecteExceptionnelle,
  contribuerCollecte,
  obtenirDetailsCollecte,
  obtenirToutesCollectes,
};

