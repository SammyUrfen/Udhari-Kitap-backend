const Friend = require('../models/friend');
const User = require('../models/user');
const { calculatePairwiseBalance } = require('./balanceCalculation');
const { createFriendAddedActivity } = require('./activityService');

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
  await friendship.populate('friend', 'name email profilePicture');
  
  // Get current user details for activity
  const currentUser = await User.findById(userId);
  
  // Create activity (async, non-blocking)
  if (currentUser) {
    createFriendAddedActivity(
      userId,
      friendId,
      { name: currentUser.name, email: currentUser.email },
      { name: friendUser.name, email: friendUser.email }
    ).catch(err => {
      console.error('Failed to create friend added activity:', err);
    });
  }
  
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
          email: friendship.friend.email,
          profilePicture: friendship.friend.profilePicture
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
  await friendship.populate('friend', 'name email profilePicture');
  
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
    .populate('friend', 'name email profilePicture');
  
  if (!friendship) {
    throw new Error('Friendship not found');
  }
  
  return friendship;
};

/**
 * Ensure bidirectional friendship exists between two users
 * If either direction doesn't exist, create it
 * 
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @returns {Promise<void>}
 */
const ensureBidirectionalFriendship = async (userId1, userId2) => {
  const user1Str = userId1.toString();
  const user2Str = userId2.toString();
  
  // Don't create friendship if it's the same user
  if (user1Str === user2Str) {
    return;
  }
  
  // Check if user1 -> user2 friendship exists
  const friendship1to2 = await Friend.friendshipExists(user1Str, user2Str);
  if (!friendship1to2) {
    // Get user2's details for the nickname
    const user2 = await User.findById(user2Str);
    if (user2) {
      const newFriendship = new Friend({
        user: user1Str,
        friend: user2Str,
        nickname: user2.name
      });
      await newFriendship.save();
    }
  }
  
  // Check if user2 -> user1 friendship exists
  const friendship2to1 = await Friend.friendshipExists(user2Str, user1Str);
  if (!friendship2to1) {
    // Get user1's details for the nickname
    const user1 = await User.findById(user1Str);
    if (user1) {
      const newFriendship = new Friend({
        user: user2Str,
        friend: user1Str,
        nickname: user1.name
      });
      await newFriendship.save();
    }
  }
};

module.exports = {
  addFriend,
  getFriendsWithBalances,
  updateFriendNickname,
  removeFriend,
  getFriendById,
  ensureBidirectionalFriendship
};
