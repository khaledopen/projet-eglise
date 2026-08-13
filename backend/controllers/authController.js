const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { journaliser } = require('../utils/logger');

// Connexion d'un utilisateur (Membre, Trésorier, Secrétaire, Administrateur, Responsable)
const login = async (req, res) => {
  const { telephone, mot_de_passe } = req.body;

  if (!telephone || !mot_de_passe) {
    return res.status(400).json({ message: 'Le numéro de téléphone et le mot de passe sont requis.' });
  }

  try {
    // Récupérer l'utilisateur avec son rôle
    const userQuery = `
      SELECT u.*, r.nom as role_nom 
      FROM utilisateurs u
      JOIN roles r ON u.role_id = r.id
      WHERE u.telephone = $1
    `;
    const userRes = await db.query(userQuery, [telephone]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }

    const utilisateur = userRes.rows[0];

    // Vérifier si c'est un membre et s'il est validé
    const membreQuery = `SELECT id, nom, prenoms, statut FROM membres WHERE utilisateur_id = $1`;
    const membreRes = await db.query(membreQuery, [utilisateur.id]);
    
    let infoMembre = null;
    if (membreRes.rows.length > 0) {
      infoMembre = membreRes.rows[0];
      if (infoMembre.statut === 'en attente') {
        return res.status(403).json({ message: 'Votre compte est en attente de validation par le secrétaire.' });
      }
      if (infoMembre.statut === 'refusé' || infoMembre.statut === 'archivé') {
        return res.status(403).json({ message: 'Votre accès a été désactivé.' });
      }
    }

    // Vérifier le mot de passe
    const motDePasseValide = await bcrypt.compare(mot_de_passe, utilisateur.mot_de_passe);
    if (!motDePasseValide) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }

    // Générer le token JWT
    const token = jwt.sign(
      {
        id: utilisateur.id,
        telephone: utilisateur.telephone,
        role: utilisateur.role_nom,
        membreId: infoMembre ? infoMembre.id : null,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Mettre à jour la date de dernier accès
    await db.query('UPDATE utilisateurs SET dernier_acces = NOW() WHERE id = $1', [utilisateur.id]);

    // Enregistrer dans le journal d'activités
    await journaliser(utilisateur.id, 'connexion', 'utilisateurs', null, { telephone: utilisateur.telephone }, req.ip);

    return res.json({
      token,
      utilisateur: {
        id: utilisateur.id,
        telephone: utilisateur.telephone,
        role: utilisateur.role_nom,
        membre: infoMembre ? {
          id: infoMembre.id,
          nom: infoMembre.nom,
          prenoms: infoMembre.prenoms,
          statut: infoMembre.statut
        } : null
      }
    });

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    return res.status(500).json({ message: 'Une erreur serveur est survenue.' });
  }
};

// Obtenir le profil de l'utilisateur connecté
const getMe = async (req, res) => {
  try {
    const userQuery = `
      SELECT u.id, u.telephone, u.dernier_acces, r.nom as role
      FROM utilisateurs u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `;
    const userRes = await db.query(userQuery, [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    const utilisateur = userRes.rows[0];

    // Infos membres si applicable
    const membreRes = await db.query('SELECT * FROM membres WHERE utilisateur_id = $1', [utilisateur.id]);
    const membre = membreRes.rows[0] || null;

    return res.json({
      id: utilisateur.id,
      telephone: utilisateur.telephone,
      role: utilisateur.role,
      membre
    });
  } catch (error) {
    console.error('Erreur getMe:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

module.exports = {
  login,
  getMe,
};
