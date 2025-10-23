const Friend = require('../models/friend');
const User = require('../models/user');
const { calculatePairwiseBalance } = require('./balanceCalculation');

/**
 * Friend Service
 * 
 * Handles friend management operations including adding, removing,
 * and retrieving friends with balance information.
 */

/**
 * Add a friend for a user
 * 
 * @param {string} userId - User ID who is adding the friend
 * @param {string} friendEmail - Email of the user to add as friend
 * @param {string} nickname - Optional custom nickname
 * @returns {Promise<Object>} { success, friend, message }
 */
const addFriend = async (userId, friendEmail, nickname = null) => {
  // Find the user to be added as friend
  const friendUser = await User.findByEmail(friendEmail);
  
  if (!friendUser) {
    return {
      success: false,
      error: 'User not found',
      message: `No user found with email ${friendEmail}`
    };
  }
  
  const friendId = friendUser._id.toString();
  
  // Prevent adding yourself
  if (userId.toString() === friendId) {
    return {
      success: false,
      error: 'Invalid operation',
      message: 'Cannot add yourself as a friend'
    };
  }
  
  // Check if friendship already exists
  const existingFriendship = await Friend.friendshipExists(userId, friendId);
  if (existingFriendship) {
    return {
      success: false,
      error: 'Friendship already exists',
      message: `${friendUser.name} is already in your friends list`
    };
  }
  
  // Create friendship
  const friendship = new Friend({
    user: userId,
    friend: friendId,
    nickname: nickname || friendUser.name
  });
  
  await friendship.save();
  await friendship.populate('friend', 'name email');
  
  return {
    success: true,
    friend: friendship,
    message: 'Friend added successfully'
  };
};

/**
 * Get all friends for a user with balance information
 * 
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
const getFriendsWithBalances = async (userId, options = {}) => {
  const friends = await Friend.getFriendsForUser(userId, options);
  
  // Enhance each friend with balance information
  const friendsWithBalances = await Promise.all(
    friends.map(async (friendship) => {
      const friendId = friendship.friend._id.toString();
      
      // Calculate balance between user and this friend
      let balance = 0;
      let balanceInRupees = 0;
      let status = 'settled';
      
      try {
        const balanceData = await calculatePairwiseBalance(userId, friendId);
        balance = balanceData.balance;
        balanceInRupees = balanceData.balanceInRupees;
        status = balanceData.status;
      } catch (error) {
        console.error(`Error calculating balance for friend ${friendId}:`, error);
      }
      
      return {
        id: friendship._id,
        friend: {
          id: friendship.friend._id,
          name: friendship.friend.name,
          email: friendship.friend.email
        },
        nickname: friendship.nickname,
        balance: {
          amount: balance,
          amountInRupees: balanceInRupees,
          status, // 'owes_you', 'you_owe', 'settled'
          message: status === 'owes_you' 
            ? `Owes you ₹${Math.abs(balanceInRupees)}`
            : status === 'you_owe'
            ? `You owe ₹${Math.abs(balanceInRupees)}`
            : 'Settled up'
        },
        createdAt: friendship.createdAt,
        updatedAt: friendship.updatedAt
      };
    })
  );
  
  return friendsWithBalances;
};

/**
 * Update friend's nickname
 * 
 * @param {string} userId - User ID
 * @param {string} friendshipId - Friendship ID
 * @param {string} nickname - New nickname
 * @returns {Promise<Object>}
 */
const updateFriendNickname = async (userId, friendshipId, nickname) => {
  const friendship = await Friend.findOne({ _id: friendshipId, user: userId });
  
  if (!friendship) {
    throw new Error('Friendship not found or you do not have permission');
  }
  
  friendship.nickname = nickname;
  friendship.updatedAt = new Date();
  await friendship.save();
  await friendship.populate('friend', 'name email');
  
  return friendship;
};

/**
 * Remove a friend
 * 
 * @param {string} userId - User ID
 * @param {string} friendshipId - Friendship ID
 * @returns {Promise<Object>}
 */
const removeFriend = async (userId, friendshipId) => {
  const friendship = await Friend.findOne({ 
    _id: friendshipId, 
    user: userId 
  });
  
  if (!friendship) {
    throw new Error('Friendship not found or you do not have permission');
  }
  
  // Check if there's a pending balance with this friend
  const balance = await calculatePairwiseBalance(userId, friendship.friend.toString());
  
  if (balance.balance !== 0) {
    const balanceInRupees = balance.balance / 100;
    const message = balance.balance > 0 
      ? `Cannot remove friend. They owe you ₹${balanceInRupees}. Please settle up first.`
      : `Cannot remove friend. You owe them ₹${Math.abs(balanceInRupees)}. Please settle up first.`;
    throw new Error(message);
  }
  
  // Delete the friendship
  await Friend.findByIdAndDelete(friendshipId);
  
  return friendship;
};

/**
 * Get a specific friend by friendship ID
 * 
 * @param {string} userId - User ID
 * @param {string} friendshipId - Friendship ID
 * @returns {Promise<Object>}
 */
const getFriendById = async (userId, friendshipId) => {
  const friendship = await Friend.findOne({ _id: friendshipId, user: userId })
    .populate('friend', 'name email');
  
  if (!friendship) {
    throw new Error('Friendship not found');
  }
  
  return friendship;
};

module.exports = {
  addFriend,
  getFriendsWithBalances,
  updateFriendNickname,
  removeFriend,
  getFriendById
};
