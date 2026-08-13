const express = require('express');
const router = express.Router();
const commController = require('../controllers/communicationController');
const { authentifier, autoriser } = require('../middlewares/auth');

// Parole du jour
router.post('/parole', authentifier, autoriser(['Administrateur']), commController.publierParoleDuJour);
router.get('/parole', authentifier, commController.obtenirParoleDuJour);
router.get('/paroles/7jours', authentifier, commController.obtenirParoles7Dours);

// Annonces
router.post('/annonces', authentifier, autoriser(['Administrateur', 'Secretaire', 'Responsable']), commController.publierAnnonce);
router.get('/annonces', authentifier, commController.obtenirAnnoncesUtilisateur);

module.exports = router;
