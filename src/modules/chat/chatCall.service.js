const ChatCall = require('./chatCall.model');
const User = require('../users/user.model');
const AppError = require('../../shared/utils/appError');

const populateCall = (query) =>
    query
        .populate('callerId', 'name email profilePhoto')
        .populate('receiverId', 'name email profilePhoto');

const emitCall = (event, call) => {
    const { getIo } = require('../../config/socket');
    const io = getIo();
    if (!io) return;
    const payload = call.toObject ? call.toObject() : call;
    io.to(String(payload.callerId?._id || payload.callerId)).emit(
        event,
        payload
    );
    io.to(String(payload.receiverId?._id || payload.receiverId)).emit(
        event,
        payload
    );
};

const startCall = async (callerId, payload = {}) => {
    if (!payload.receiverId) {
        throw new AppError('Call recipient is required', 400);
    }
    if (String(callerId) === String(payload.receiverId)) {
        throw new AppError('You cannot call yourself', 400);
    }
    const receiver = await User.findOne({
        _id: payload.receiverId,
        status: { $in: ['Active', 'ACTIVE'] }
    });
    if (!receiver) throw new AppError('Call recipient not found', 404);

    const call = await ChatCall.create({
        callerId,
        receiverId: payload.receiverId,
        conversationId: payload.conversationId || null,
        callType: payload.callType || 'Voice'
    });
    const populated = await populateCall(ChatCall.findById(call._id));
    emitCall('incoming_call', populated);

    const missedCallTimer = setTimeout(async () => {
        try {
            const unanswered = await ChatCall.findOne({
                _id: call._id,
                status: 'Ringing'
            });
            if (!unanswered) return;
            unanswered.status = 'Missed';
            unanswered.endedAt = new Date();
            await unanswered.save();
            const missed = await populateCall(
                ChatCall.findById(unanswered._id)
            );
            emitCall('call_updated', missed);
        } catch {
            // Call expiry should never interrupt the socket process.
        }
    }, 30000);
    missedCallTimer.unref?.();

    return populated;
};

const updateCall = async (userId, callId, status) => {
    const call = await ChatCall.findOne({
        _id: callId,
        $or: [{ callerId: userId }, { receiverId: userId }]
    });
    if (!call) throw new AppError('Call record not found', 404);

    const allowed = ['Answered', 'Declined', 'Missed', 'Ended', 'Cancelled'];
    if (!allowed.includes(status)) {
        throw new AppError('Invalid call status', 400);
    }
    if (status === 'Answered') {
        if (String(call.receiverId) !== String(userId)) {
            throw new AppError('Only the recipient can answer this call', 403);
        }
        call.answeredAt = call.answeredAt || new Date();
    }
    if (['Declined', 'Missed'].includes(status)) {
        if (String(call.receiverId) !== String(userId)) {
            throw new AppError('Only the recipient can decline this call', 403);
        }
    }
    if (['Ended', 'Declined', 'Missed', 'Cancelled'].includes(status)) {
        call.endedAt = new Date();
        if (call.answeredAt) {
            call.durationSeconds = Math.max(
                0,
                Math.round((call.endedAt - call.answeredAt) / 1000)
            );
        }
    }
    call.status = status;
    await call.save();
    const populated = await populateCall(ChatCall.findById(call._id));
    emitCall('call_updated', populated);
    return populated;
};

const listCalls = (userId, filters = {}) => {
    const query = {
        $or: [{ callerId: userId }, { receiverId: userId }]
    };
    if (filters.peerId) {
        query.$and = [
            {
                $or: [
                    { callerId: filters.peerId, receiverId: userId },
                    { callerId: userId, receiverId: filters.peerId }
                ]
            }
        ];
    }
    return populateCall(
        ChatCall.find(query)
            .sort({ startedAt: -1 })
            .limit(Math.min(Number(filters.limit || 25), 100))
    );
};

module.exports = { startCall, updateCall, listCalls };
