const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const balanceController = require('../controllers/balanceController');

// All balance routes require authentication
router.use(requireAuth);

// Get overall balance for authenticated user
router.get('/', balanceController.getOverallBalance);

// Get pairwise balance with specific user
router.get('/:userId', balanceController.getPairwiseBalance);

module.exports = router;
