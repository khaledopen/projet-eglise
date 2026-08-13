const db = require('../config/db');

/**
 * Enregistre une action dans le journal d'activités
 * @param {number|null} utilisateurId ID de l'utilisateur ayant fait l'action
 * @param {string} action Nom de l'action
 * @param {string} elementConcerne Table ou concept concerné
 * @param {object|null} ancienneValeur Valeur avant modification
 * @param {object|null} nouvelleValeur Valeur après modification
 * @param {string|null} ip Adresse IP de l'utilisateur
 */
const journaliser = async (utilisateurId, action, elementConcerne, ancienneValeur = null, nouvelleValeur = null, ip = null) => {
  try {
    const query = `
      INSERT INTO journal_activites (utilisateur_id, action, element_concerne, ancienne_valeur, nouvelle_valeur, adresse_ip)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    await db.query(query, [
      utilisateurId,
      action,
      elementConcerne,
      ancienneValeur ? JSON.stringify(ancienneValeur) : null,
      nouvelleValeur ? JSON.stringify(nouvelleValeur) : null,
      ip
    ]);
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement dans le journal d\'activité:', error);
  }
};

module.exports = { journaliser };
