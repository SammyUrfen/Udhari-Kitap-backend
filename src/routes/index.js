const express = require('express');
const router = express.Router();

const health = require('../controllers/healthController');
const authRoutes = require('./auth');
const userRoutes = require('./users');
const expenseRoutes = require('./expenses');
const balanceRoutes = require('./balances');
const transactionRoutes = require('./transactions');
const activityRoutes = require('./activities');

router.get('/health', health.getHealth);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/expenses', expenseRoutes);
router.use('/balances', balanceRoutes);
router.use('/transactions', transactionRoutes);
router.use('/activities', activityRoutes);

module.exports = router;
