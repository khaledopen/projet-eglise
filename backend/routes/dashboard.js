const express = require('express');
const router = express.Router();
const dashController = require('../controllers/dashboardController');
const { authentifier, autoriser } = require('../middlewares/auth');

router.get('/', authentifier, autoriser(['Administrateur', 'Tresorier', 'Secretaire']), dashController.obtenirStatsTableauDeBord);
router.get('/journal', authentifier, autoriser(['Administrateur']), dashController.obtenirJournalActivites);

module.exports = router;
