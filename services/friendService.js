const User = require('../models/User');
const FriendRequest = require('../models/friendRequest');

// 친구 요청 보내기
const sendFriendRequest = async (senderId, receiverId) => {
    if (senderId.toString() === receiverId.toString()) {
        throw new Error('자기 자신에게 친구 요청을 보낼 수 없습니다.');
    }

    // 이미 친구인지 확인
    const sender = await User.findById(senderId);
    const alreadyFriend = sender.friends.some(f => f.user.toString() === receiverId.toString());
    if (alreadyFriend) throw new Error('이미 친구입니다.');

    // 중복 요청 확인
    const existing = await FriendRequest.findOne({ sender: senderId, receiver: receiverId, status: 'pending' });
    if (existing) throw new Error('이미 친구 요청을 보냈습니다.');

    const request = await FriendRequest.create({ sender: senderId, receiver: receiverId });
    return request;
};

// 친구 요청 수락
const acceptFriendRequest = async (requestId, receiverId) => {
    const request = await FriendRequest.findById(requestId);
    if (!request) throw new Error('요청을 찾을 수 없습니다.');
    if (request.receiver.toString() !== receiverId.toString()) throw new Error('권한이 없습니다.');
    if (request.status !== 'pending') throw new Error('이미 처리된 요청입니다.');

    request.status = 'accepted';
    await request.save();

    // 양쪽 friends 배열에 추가
    await User.findByIdAndUpdate(request.sender, {
        $push: { friends: { user: request.receiver } }
    });
    await User.findByIdAndUpdate(request.receiver, {
        $push: { friends: { user: request.sender } }
    });

    return request;
};

// 친구 요청 거절
const rejectFriendRequest = async (requestId, receiverId) => {
    const request = await FriendRequest.findById(requestId);
    if (!request) throw new Error('요청을 찾을 수 없습니다.');
    if (request.receiver.toString() !== receiverId.toString()) throw new Error('권한이 없습니다.');

    request.status = 'rejected';
    await request.save();
    return request;
};

// 친구 삭제
const removeFriend = async (userId, friendId) => {
    await User.findByIdAndUpdate(userId, {
        $pull: { friends: { user: friendId } }
    });
    await User.findByIdAndUpdate(friendId, {
        $pull: { friends: { user: userId } }
    });
};

// 즐겨찾기 토글
const toggleFavorite = async (userId, friendId) => {
    const user = await User.findById(userId);
    const friend = user.friends.find(f => f.user.toString() === friendId.toString());
    if (!friend) throw new Error('친구 목록에 없는 유저입니다.');

    friend.isFavorite = !friend.isFavorite;
    await user.save();
    return friend.isFavorite;
};

// 친구 목록 조회 (즐찾 우선 정렬)
const getFriendList = async (userId) => {
    const user = await User.findById(userId)
        .populate('friends.user', 'name gender age profileImage');

    const sorted = user.friends.sort((a, b) => {
        if (a.isFavorite === b.isFavorite) return 0;
        return a.isFavorite ? -1 : 1;
    });

    return sorted;
};

// 받은 친구 요청 목록
const getPendingRequests = async (userId) => {
    return await FriendRequest.find({ receiver: userId, status: 'pending' })
        .populate('sender', 'name gender age profileImage')
        .sort({ createdAt: -1 });
};

module.exports = {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    toggleFavorite,
    getFriendList,
    getPendingRequests
};