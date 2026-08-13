const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authentifier } = require('../middlewares/auth');

router.post('/login', authController.login);
router.get('/me', authentifier, authController.getMe);

module.exports = router;
