const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const { authentifier, autoriser } = require('../middlewares/auth');

router.post('/cotisations', authentifier, autoriser(['Tresorier', 'Administrateur']), financeController.enregistrerPaiementMensuel);
router.post('/annuler', authentifier, autoriser(['Tresorier', 'Administrateur']), financeController.annulerPaiement);
router.get('/membre/annuel', authentifier, financeController.obtenirPaiementsMembreAnnuel);

// Collectes exceptionnelles
router.post('/collectes', authentifier, autoriser(['Tresorier', 'Administrateur']), financeController.creerCollecteExceptionnelle);
router.post('/contribuer', authentifier, autoriser(['Tresorier', 'Administrateur']), financeController.contribuerCollecte);
router.get('/collectes', authentifier, financeController.obtenirToutesCollectes);
router.get('/collectes/:id', authentifier, financeController.obtenirDetailsCollecte);

module.exports = router;
