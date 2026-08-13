const express = require('express');
const router = express.Router();
const membreController = require('../controllers/membreController');
const { authentifier, autoriser } = require('../middlewares/auth');

// Inscription publique
router.post('/inscription', membreController.inscriptionPublique);
router.get('/setup', membreController.obtenirSetupInscription);

// Routes sécurisées pour Secrétaire et Administrateur
router.get('/attente', authentifier, autoriser(['Secretaire', 'Administrateur']), membreController.obtenirMembresEnAttente);
router.post('/valider/:id', authentifier, autoriser(['Secretaire', 'Administrateur']), membreController.validerStatutMembre);

// Répertoire et gestion individuelle
router.get('/', authentifier, membreController.obtenirRepertoire);
router.get('/details/:id', authentifier, membreController.obtenirDetailsMembre);
router.put('/modifier/:id', authentifier, membreController.mettreAJourMembre);
router.delete('/supprimer/:id', authentifier, autoriser(['Administrateur']), membreController.supprimerMembreDefinitif);

module.exports = router;
