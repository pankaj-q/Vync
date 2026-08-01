import Message from '../model/message.model.js';
import Conversation from '../model/conversation.model.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

const assertParticipant = (conversation, userId) => {
    if (!conversation.participants.some((p) => p.toString() === userId.toString())) {
        throw new AppError("Not authorized to access this conversation", 403);
    }
};

const sendMessage = catchAsync(async (req, res) => {
    const { conversationId, content, messageType, mediaUrl, replyTo } = req.body;

    if (!conversationId || !content) {
        throw new AppError("Conversation ID and content are required", 400);
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
        throw new AppError("Conversation not found", 404);
    }

    assertParticipant(conversation, req.user._id);

    const message = await Message.create({
        conversation: conversationId,
        sender: req.user._id,
        content,
        messageType: messageType || 'text',
        mediaUrl: mediaUrl || null,
        replyTo: replyTo || null
    });

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const populated = await Message.findById(message._id)
        .populate('sender', 'name email avatar');

    const io = req.app.get('io');
    if (io) {
        for (const participant of conversation.participants) {
            if (participant.toString() !== req.user._id.toString()) {
                io.to(`user:${participant}`).emit('new-message', populated);
            }
        }
    }

    res.status(201).json({ message: populated });
});

const getMessages = catchAsync(async (req, res) => {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new AppError("Conversation not found", 404);
    assertParticipant(conversation, req.user._id);

    const messages = await Message.find({ conversation: conversationId })
        .populate('sender', 'name email avatar')
        .populate('replyTo')
        .populate('reactions.user', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    res.json({ messages: messages.reverse() });
});

const editMessage = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) throw new AppError("Content is required", 400);

    const message = await Message.findById(id);
    if (!message) throw new AppError("Message not found", 404);
    if (message.sender.toString() !== req.user._id.toString()) {
        throw new AppError("Can only edit your own messages", 403);
    }

    const conversation = await Conversation.findById(message.conversation);
    assertParticipant(conversation, req.user._id);

    message.content = content;
    message.isEdited = true;
    await message.save();

    const populated = await Message.findById(id)
        .populate('sender', 'name email avatar')
        .populate('replyTo');

    const io = req.app.get('io');
    if (io) {
        for (const participant of conversation.participants) {
            if (participant.toString() !== req.user._id.toString()) {
                io.to(`user:${participant}`).emit('message-edited', populated);
            }
        }
    }

    res.json({ message: populated });
});

const deleteMessage = catchAsync(async (req, res) => {
    const { id } = req.params;

    const message = await Message.findById(id);
    if (!message) throw new AppError("Message not found", 404);
    if (message.sender.toString() !== req.user._id.toString()) {
        throw new AppError("Can only delete your own messages", 403);
    }

    const conversation = await Conversation.findById(message.conversation);
    assertParticipant(conversation, req.user._id);

    message.content = "This message was deleted";
    message.isDeleted = true;
    message.isEdited = false;
    await message.save();

    const io = req.app.get('io');
    if (io) {
        for (const participant of conversation.participants) {
            if (participant.toString() !== req.user._id.toString()) {
                io.to(`user:${participant}`).emit('message-deleted', { _id: id, content: "This message was deleted", isDeleted: true });
            }
        }
    }

    res.json({ message: { _id: id, content: "This message was deleted", isDeleted: true } });
});

const forwardMessage = catchAsync(async (req, res) => {
    const { messageId, targetConversationId } = req.body;
    if (!messageId || !targetConversationId) {
        throw new AppError("Message ID and target conversation are required", 400);
    }

    const original = await Message.findById(messageId);
    if (!original) throw new AppError("Original message not found", 404);

    const conversation = await Conversation.findById(targetConversationId);
    if (!conversation) throw new AppError("Target conversation not found", 404);
    assertParticipant(conversation, req.user._id);

    const sourceConversation = await Conversation.findById(original.conversation);
    assertParticipant(sourceConversation, req.user._id);

    const forwarded = await Message.create({
        conversation: targetConversationId,
        sender: req.user._id,
        content: original.content,
        messageType: original.messageType,
        mediaUrl: original.mediaUrl,
        forwardedFrom: messageId,
    });

    conversation.lastMessage = forwarded._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const populated = await Message.findById(forwarded._id)
        .populate('sender', 'name email avatar')
        .populate('forwardedFrom');

    const io = req.app.get('io');
    if (io) {
        for (const participant of conversation.participants) {
            if (participant.toString() !== req.user._id.toString()) {
                io.to(`user:${participant}`).emit('new-message', populated);
            }
        }
    }

    res.status(201).json({ message: populated });
});

const reactToMessage = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { emoji } = req.body;
    if (!emoji) throw new AppError("Emoji is required", 400);

    const message = await Message.findById(id);
    if (!message) throw new AppError("Message not found", 404);

    const conversation = await Conversation.findById(message.conversation);
    assertParticipant(conversation, req.user._id);

    const existing = message.reactions.find(
        (r) => r.user.toString() === req.user._id.toString() && r.emoji === emoji
    );

    if (existing) {
        message.reactions.pull({ _id: existing._id });
    } else {
        const existingEmoji = message.reactions.find(
            (r) => r.user.toString() === req.user._id.toString()
        );
        if (existingEmoji) {
            existingEmoji.emoji = emoji;
        } else {
            message.reactions.push({ user: req.user._id, emoji });
        }
    }

    await message.save();

    const populated = await Message.findById(id).populate('reactions.user', 'name');

    const io = req.app.get('io');
    if (io) {
        for (const participant of conversation.participants) {
            if (participant.toString() !== req.user._id.toString()) {
                io.to(`user:${participant}`).emit('message-reacted', {
                    messageId: id,
                    conversationId: message.conversation,
                    reactions: populated.reactions,
                });
            }
        }
    }

    res.json({ reactions: populated.reactions });
});

const searchMessages = catchAsync(async (req, res) => {
    const { conversationId } = req.params;
    const { q } = req.query;
    if (!q || !q.trim()) return res.json({ messages: [] });

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new AppError("Conversation not found", 404);
    assertParticipant(conversation, req.user._id);

    const messages = await Message.find({
        conversation: conversationId,
        content: { $regex: q.trim(), $options: 'i' },
        isDeleted: false,
    })
        .populate('sender', 'name email avatar')
        .populate('replyTo')
        .sort({ createdAt: -1 })
        .limit(30);

    res.json({ messages: messages.reverse() });
});

const markAsRead = catchAsync(async (req, res) => {
    const { conversationId } = req.body;
    if (!conversationId) throw new AppError("Conversation ID required", 400);

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new AppError("Conversation not found", 404);
    assertParticipant(conversation, req.user._id);

    const result = await Message.updateMany(
        { conversation: conversationId, sender: { $ne: req.user._id }, status: { $ne: 'read' } },
        { status: 'read' }
    );

    if (result.modifiedCount > 0) {
        const io = req.app.get('io');
        if (io) {
            io.to(`conversation:${conversationId}`).emit('messages-read', {
                conversationId,
                userId: req.user._id,
            });
        }
    }

    res.json({ success: true, modified: result.modifiedCount });
});

export { sendMessage, getMessages, editMessage, deleteMessage, forwardMessage, reactToMessage, searchMessages, markAsRead };