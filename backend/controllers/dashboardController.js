const db = require('../config/db');

// Récupérer les statistiques du tableau de bord (Admin, Trésorier, Secrétaire)
const obtenirStatsTableauDeBord = async (req, res) => {
  try {
    // 1. Effectif total actif
    const totalActifRes = await db.query("SELECT COUNT(*) FROM membres WHERE statut = 'actif'");
    const effectifTotal = parseInt(totalActifRes.rows[0].count);

    // 2. Nouvelles inscriptions du mois courant
    const newRegRes = await db.query(`
      SELECT COUNT(*) FROM membres 
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
    `);
    const inscriptionsMois = parseInt(newRegRes.rows[0].count);

    // 3. Fiches en attente de validation
    const pendingRes = await db.query("SELECT COUNT(*) FROM membres WHERE statut = 'en attente'");
    const fichesEnAttente = parseInt(pendingRes.rows[0].count);

    // 4. Montants encaissés ce mois-ci
    const cotisMoisRes = await db.query(`
      SELECT COALESCE(SUM(montant_total), 0) FROM paiements 
      WHERE date_paiement >= DATE_TRUNC('month', CURRENT_DATE) AND statut != 'annule'
    `);
    const contribMoisRes = await db.query(`
      SELECT COALESCE(SUM(montant), 0) FROM contributions_exceptionnelles 
      WHERE date_contribution >= DATE_TRUNC('month', CURRENT_DATE)
    `);
    const encaisseMois = parseFloat(cotisMoisRes.rows[0].coalesce) + parseFloat(contribMoisRes.rows[0].coalesce);

    // 5. Montants encaissés cette année
    const cotisAnneeRes = await db.query(`
      SELECT COALESCE(SUM(montant_total), 0) FROM paiements 
      WHERE date_paiement >= DATE_TRUNC('year', CURRENT_DATE) AND statut != 'annule'
    `);
    const contribAnneeRes = await db.query(`
      SELECT COALESCE(SUM(montant), 0) FROM contributions_exceptionnelles 
      WHERE date_contribution >= DATE_TRUNC('year', CURRENT_DATE)
    `);
    const encaisseAnnee = parseFloat(cotisAnneeRes.rows[0].coalesce) + parseFloat(contribAnneeRes.rows[0].coalesce);

    // 6. Répartition des membres par CEB
    const cebRep = await db.query(`
      SELECT c.nom, COUNT(m.id) as total 
      FROM ceb c 
      LEFT JOIN membres m ON m.ceb_id = c.id AND m.statut = 'actif'
      GROUP BY c.id, c.nom
    `);

    // 7. Répartition par commission
    const commRep = await db.query(`
      SELECT com.nom, COUNT(mc.membre_id) as total
      FROM commissions com
      LEFT JOIN membre_commissions mc ON mc.commission_id = com.id
      LEFT JOIN membres m ON mc.membre_id = m.id AND m.statut = 'actif'
      GROUP BY com.id, com.nom
    `);

    // 8. Collectes exceptionnelles en cours
    const collectesEnCours = await db.query(`
      SELECT c.*, 
        COALESCE((SELECT SUM(montant) FROM contributions_exceptionnelles contr WHERE contr.collecte_id = c.id), 0) as total_collecte
      FROM collectes_exceptionnelles c
      WHERE c.date_debut <= CURRENT_DATE AND c.date_fin >= CURRENT_DATE AND c.statut = 'actif'
    `);

    // 9. Dernières activités journalisées (limité à 10)
    const dernieresActivites = await db.query(`
      SELECT j.*, u.telephone as utilisateur_telephone, r.nom as utilisateur_role
      FROM journal_activites j
      LEFT JOIN utilisateurs u ON j.utilisateur_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      ORDER BY j.created_at DESC
      LIMIT 10
    `);

    // 10. Taux de recouvrement & membres en retard (simplifié)
    // Calcul : nombre de membres à jour pour le mois courant
    const anneeCourante = new Date().getFullYear();
    const moisCourant = new Date().getMonth() + 1;
    
    const membresAjourRes = await db.query(`
      SELECT COUNT(DISTINCT p.membre_id) 
      FROM paiements p
      JOIN details_paiements dp ON dp.paiement_id = p.id
      WHERE dp.annee = $1 AND dp.mois = $2 AND p.statut != 'annule'
    `, [anneeCourante, moisCourant]);
    const membresAjour = parseInt(membresAjourRes.rows[0].count);
    const membresEnRetard = Math.max(0, effectifTotal - membresAjour);
    const tauxRecouvrement = effectifTotal > 0 ? (membresAjour / effectifTotal) * 100 : 0;

    return res.json({
      effectif_total_actif: effectifTotal,
      inscriptions_ce_mois: inscriptionsMois,
      fiches_en_attente: fichesEnAttente,
      encaisse_ce_mois: encaisseMois,
      encaisse_cette_annee: encaisseAnnee,
      taux_recouvrement: tauxRecouvrement,
      membres_en_retard: membresEnRetard,
      repartition_ceb: cebRep.rows,
      repartition_commission: commRep.rows,
      collectes_en_cours: collectesEnCours.rows,
      dernieres_activites: dernieresActivites.rows
    });

  } catch (error) {
    console.error('Erreur obtenirStatsTableauDeBord:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Récupérer le journal complet d'activités (Admin uniquement)
const obtenirJournalActivites = async (req, res) => {
  const { page = 1, limite = 50 } = req.query;
  const offset = (page - 1) * limite;

  try {
    const query = `
      SELECT j.*, u.telephone as utilisateur_telephone, r.nom as role_nom,
             m.nom as membre_nom, m.prenoms as membre_prenoms
      FROM journal_activites j
      LEFT JOIN utilisateurs u ON j.utilisateur_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN membres m ON m.utilisateur_id = u.id
      ORDER BY j.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await db.query(query, [limite, offset]);
    const totalRes = await db.query('SELECT COUNT(*) FROM journal_activites');
    
    return res.json({
      total: parseInt(totalRes.rows[0].count),
      page: parseInt(page),
      limite: parseInt(limite),
      logs: result.rows
    });
  } catch (error) {
    console.error('Erreur obtenirJournalActivites:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

module.exports = {
  obtenirStatsTableauDeBord,
  obtenirJournalActivites,
};
