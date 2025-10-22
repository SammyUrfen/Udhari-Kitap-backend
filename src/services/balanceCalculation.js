const Expense = require('../models/expense');
const Transaction = require('../models/transaction');
const { paiseToRupees } = require('./expenseValidation');

/**
 * Balance Calculation Service
 * 
 * Core concepts:
 * - When you PAY for an expense, others owe YOU money
 * - When you're a PARTICIPANT in someone else's expense, you OWE them money
 * - Net balance = (what others owe you) - (what you owe others)
 * 
 * Example:
 * - Alice pays ₹300, split 3 ways
 * - Bob and Charlie each owe Alice ₹100
 * - Alice's balance with Bob: +₹100 (Bob owes Alice)
 * - Bob's balance with Alice: -₹100 (Bob owes Alice)
 */

/**
 * Calculate what a user is owed from an expense (when they paid)
 * @param {Object} expense - Expense document
 * @param {string} userId - User ID to calculate for
 * @returns {number} Amount in paise that user is owed
 */
const calculateOwedFromExpense = (expense, userId) => {
  const userIdStr = userId.toString();
  const payerId = expense.payer._id ? expense.payer._id.toString() : expense.payer.toString();
  
  // If user is not the payer, they're not owed anything from this expense
  if (payerId !== userIdStr) {
    return 0;
  }
  
  // User paid the full amount
  const totalPaid = expense.amount;
  
  // Find user's own share (what they owe themselves, i.e., their portion)
  const userParticipant = expense.participants.find(p => {
    const pUserId = p.user._id ? p.user._id.toString() : p.user.toString();
    return pUserId === userIdStr;
  });
  
  const userShare = userParticipant ? userParticipant.share : 0;
  
  // Amount owed = total paid - own share
  // (Others owe the payer for their portions)
  return totalPaid - userShare;
};

/**
 * Calculate what a user owes from an expense (when they're a participant)
 * @param {Object} expense - Expense document
 * @param {string} userId - User ID to calculate for
 * @returns {number} Amount in paise that user owes
 */
const calculateOwingFromExpense = (expense, userId) => {
  const userIdStr = userId.toString();
  const payerId = expense.payer._id ? expense.payer._id.toString() : expense.payer.toString();
  
  // If user is the payer, they don't owe money (they paid it)
  if (payerId === userIdStr) {
    return 0;
  }
  
  // Find user's share in this expense
  const userParticipant = expense.participants.find(p => {
    const pUserId = p.user._id ? p.user._id.toString() : p.user.toString();
    return pUserId === userIdStr;
  });
  
  // User owes their share to the payer
  return userParticipant ? userParticipant.share : 0;
};

/**
 * Calculate pairwise balance between two users
 * Positive = otherUser owes currentUser
 * Negative = currentUser owes otherUser
 * 
 * @param {Object} expense - Expense document
 * @param {string} currentUserId - Current user ID
 * @param {string} otherUserId - Other user ID
 * @returns {number} Net balance in paise (positive = they owe you, negative = you owe them)
 */
const calculatePairwiseBalanceFromExpense = (expense, currentUserId, otherUserId) => {
  const currentUserIdStr = currentUserId.toString();
  const otherUserIdStr = otherUserId.toString();
  const payerId = expense.payer._id ? expense.payer._id.toString() : expense.payer.toString();
  
  // Case 1: Current user paid, other user is participant
  if (payerId === currentUserIdStr) {
    const otherParticipant = expense.participants.find(p => {
      const pUserId = p.user._id ? p.user._id.toString() : p.user.toString();
      return pUserId === otherUserIdStr;
    });
    
    // Other user owes current user their share (positive balance)
    return otherParticipant ? otherParticipant.share : 0;
  }
  
  // Case 2: Other user paid, current user is participant
  if (payerId === otherUserIdStr) {
    const currentParticipant = expense.participants.find(p => {
      const pUserId = p.user._id ? p.user._id.toString() : p.user.toString();
      return pUserId === currentUserIdStr;
    });
    
    // Current user owes other user their share (negative balance)
    return currentParticipant ? -currentParticipant.share : 0;
  }
  
  // Case 3: Neither paid (someone else paid) - no direct balance between them
  return 0;
};

/**
 * Get all expenses involving a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of expense documents
 */
const getExpensesInvolvingUser = async (userId) => {
  const userIdStr = userId.toString();
  
  // Find all non-deleted expenses where user is either payer or participant
  const expenses = await Expense.find({
    isDeleted: false,
    $or: [
      { payer: userIdStr },
      { 'participants.user': userIdStr }
    ]
  })
  .populate('payer', 'name email')
  .populate('participants.user', 'name email')
  .sort({ createdAt: -1 });
  
  return expenses;
};

/**
 * Calculate overall balance for a user
 * Returns what they're owed, what they owe, and net balance
 * Includes both expenses and transactions (settlements)
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} { totalOwed, totalOwing, netBalance, perUser: [...] }
 */
const calculateOverallBalance = async (userId) => {
  const expenses = await getExpensesInvolvingUser(userId);
  
  let totalOwed = 0; // What others owe this user
  let totalOwing = 0; // What this user owes others
  const perUserMap = new Map(); // Track balance per other user
  
  // Step 1: Calculate balances from expenses
  for (const expense of expenses) {
    // Calculate what user is owed from this expense
    const owed = calculateOwedFromExpense(expense, userId);
    totalOwed += owed;
    
    // Calculate what user owes from this expense
    const owing = calculateOwingFromExpense(expense, userId);
    totalOwing += owing;
    
    // Track per-user balances
    const payerId = expense.payer._id ? expense.payer._id.toString() : expense.payer.toString();
    const userIdStr = userId.toString();
    
    // If user paid, update balances with each participant
    if (payerId === userIdStr) {
      for (const participant of expense.participants) {
        const participantId = participant.user._id ? participant.user._id.toString() : participant.user.toString();
        
        // Skip self
        if (participantId === userIdStr) continue;
        
        // Other user owes this user
        if (!perUserMap.has(participantId)) {
          perUserMap.set(participantId, {
            user: participant.user,
            balance: 0
          });
        }
        
        const entry = perUserMap.get(participantId);
        entry.balance += participant.share; // They owe user their share
      }
    }
    
    // If user is participant and someone else paid
    if (payerId !== userIdStr) {
      const userParticipant = expense.participants.find(p => {
        const pUserId = p.user._id ? p.user._id.toString() : p.user.toString();
        return pUserId === userIdStr;
      });
      
      if (userParticipant) {
        if (!perUserMap.has(payerId)) {
          perUserMap.set(payerId, {
            user: expense.payer,
            balance: 0
          });
        }
        
        const entry = perUserMap.get(payerId);
        entry.balance -= userParticipant.share; // User owes payer their share
      }
    }
  }
  
  // Step 2: Adjust balances based on transactions (settlements)
  const transactions = await Transaction.find({
    $or: [
      { from: userId },
      { to: userId }
    ]
  })
  .populate('from', 'name email')
  .populate('to', 'name email')
  .sort({ createdAt: -1 });
  
  for (const transaction of transactions) {
    const fromId = transaction.from._id.toString();
    const toId = transaction.to._id.toString();
    const userIdStr = userId.toString();
    
    if (fromId === userIdStr) {
      // User paid someone - reduces what user owes them (or increases what they owe user)
      totalOwing -= transaction.amount;
      
      if (!perUserMap.has(toId)) {
        perUserMap.set(toId, {
          user: transaction.to,
          balance: 0
        });
      }
      
      const entry = perUserMap.get(toId);
      entry.balance += transaction.amount; // After payment, they owe user this much (or user owes less)
    } else {
      // User received payment - reduces what others owe user (or increases what user owes them)
      totalOwed -= transaction.amount;
      
      if (!perUserMap.has(fromId)) {
        perUserMap.set(fromId, {
          user: transaction.from,
          balance: 0
        });
      }
      
      const entry = perUserMap.get(fromId);
      entry.balance -= transaction.amount; // After receiving, user owes them this much (or they owe user less)
    }
  }
  
  // Convert map to array and format
  const perUser = Array.from(perUserMap.values()).map(entry => ({
    user: {
      id: entry.user._id,
      name: entry.user.name,
      email: entry.user.email
    },
    balance: entry.balance,
    balanceInRupees: paiseToRupees(entry.balance),
    status: entry.balance > 0 ? 'owes_you' : entry.balance < 0 ? 'you_owe' : 'settled'
  }))
  .filter(entry => entry.balance !== 0) // Only show non-zero balances
  .sort((a, b) => b.balance - a.balance); // Sort by balance (highest first)
  
  const netBalance = totalOwed - totalOwing;
  
  return {
    totalOwed,
    totalOwedInRupees: paiseToRupees(totalOwed),
    totalOwing,
    totalOwingInRupees: paiseToRupees(totalOwing),
    netBalance,
    netBalanceInRupees: paiseToRupees(netBalance),
    perUser
  };
};

/**
 * Calculate pairwise balance between current user and another user
 * Includes both expenses and transactions (settlements)
 * 
 * @param {string} currentUserId - Current user ID
 * @param {string} otherUserId - Other user ID
 * @returns {Promise<Object>} { balance, expenses: [...], transactions: [...] }
 */
const calculatePairwiseBalance = async (currentUserId, otherUserId) => {
  const currentUserIdStr = currentUserId.toString();
  const otherUserIdStr = otherUserId.toString();
  
  // Find all non-deleted expenses involving both users
  const expenses = await Expense.find({
    isDeleted: false,
    $or: [
      // Current user paid, other user is participant
      {
        payer: currentUserIdStr,
        'participants.user': otherUserIdStr
      },
      // Other user paid, current user is participant
      {
        payer: otherUserIdStr,
        'participants.user': currentUserIdStr
      }
    ]
  })
  .populate('payer', 'name email')
  .populate('participants.user', 'name email')
  .sort({ createdAt: -1 });
  
  let totalBalance = 0;
  const expenseDetails = [];
  
  for (const expense of expenses) {
    const balance = calculatePairwiseBalanceFromExpense(expense, currentUserId, otherUserId);
    totalBalance += balance;
    
    expenseDetails.push({
      id: expense._id,
      title: expense.title,
      amount: expense.amount,
      amountInRupees: paiseToRupees(expense.amount),
      payer: expense.payer,
      yourShare: balance < 0 ? -balance : 0, // What you owe from this expense
      yourShareInRupees: balance < 0 ? paiseToRupees(-balance) : 0,
      theirShare: balance > 0 ? balance : 0, // What they owe from this expense
      theirShareInRupees: balance > 0 ? paiseToRupees(balance) : 0,
      createdAt: expense.createdAt
    });
  }
  
  // Find all transactions between these two users
  const transactions = await Transaction.find({
    $or: [
      { from: currentUserIdStr, to: otherUserIdStr },
      { from: otherUserIdStr, to: currentUserIdStr }
    ]
  })
  .populate('from', 'name email')
  .populate('to', 'name email')
  .populate('createdBy', 'name email')
  .sort({ createdAt: -1 });
  
  const transactionDetails = [];
  
  for (const transaction of transactions) {
    const fromId = transaction.from._id.toString();
    
    // If current user paid, balance increases (they owe less or other owes more)
    // If current user received, balance decreases (they owe more or other owes less)
    const balanceChange = fromId === currentUserIdStr ? transaction.amount : -transaction.amount;
    totalBalance += balanceChange;
    
    transactionDetails.push({
      id: transaction._id,
      amount: transaction.amount,
      amountInRupees: paiseToRupees(transaction.amount),
      from: transaction.from,
      to: transaction.to,
      note: transaction.note,
      createdBy: transaction.createdBy,
      createdAt: transaction.createdAt,
      direction: fromId === currentUserIdStr ? 'you_paid' : 'they_paid',
      balanceEffect: fromId === currentUserIdStr 
        ? `Reduced your debt by ₹${paiseToRupees(transaction.amount)}`
        : `Reduced their debt by ₹${paiseToRupees(transaction.amount)}`
    });
  }
  
  return {
    balance: totalBalance,
    balanceInRupees: paiseToRupees(totalBalance),
    status: totalBalance > 0 ? 'owes_you' : totalBalance < 0 ? 'you_owe' : 'settled',
    message: totalBalance > 0 
      ? `They owe you ₹${paiseToRupees(totalBalance)}`
      : totalBalance < 0
      ? `You owe them ₹${paiseToRupees(-totalBalance)}`
      : 'All settled up',
    expenses: expenseDetails,
    transactions: transactionDetails
  };
};

module.exports = {
  calculateOverallBalance,
  calculatePairwiseBalance,
  getExpensesInvolvingUser
};
