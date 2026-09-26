import Conversation from '../model/conversation.model.js';
import Message from '../model/message.model.js';
import User from '../model/user.model.js';

const createOrGetConversation = async (req, res) => {
    try {
        const { participantId } = req.body;
        if (!participantId) {
            return res.status(400).json({ message: "Participant ID is required" });
        }

        const key = [req.user._id, participantId].map(String).sort().join(':');

        let conversation = await Conversation.findOne({ conversationKey: key })
            .populate('participants', 'name email avatarUrl bio');

        if (conversation) {
            return res.json({ conversation });
        }

        try {
            conversation = await Conversation.create({
                participants: [req.user._id, participantId],
                conversationKey: key
            });
        } catch (error) {
            if (error.code === 11000) {
                conversation = await Conversation.findOne({ conversationKey: key })
                    .populate('participants', 'name email avatarUrl bio');
                if (conversation) {
                    return res.json({ conversation });
                }
            }
            throw error;
        }

        const populated = await Conversation.findById(conversation._id)
            .populate('participants', 'name email avatarUrl bio');

        res.status(201).json({ conversation: populated });
    } catch (error) {
        console.error("Conversation error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const getConversations = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 25, 50);
        const skip = (page - 1) * limit;
        const search = req.query.search?.trim();

        let query = { participants: req.user._id };

        if (search) {
            // Use text index for fast search
            const matchingUsers = await User.find(
                { $text: { $search: search } },
                { score: { $meta: 'textScore' } }
            ).select('_id').limit(50).lean();
            
            const userIds = matchingUsers.map(u => u._id);
            query.participants = { $in: [...new Set([...query.participants, ...userIds])] };
        }

        const conversations = await Conversation.find(query)
            .populate('participants', 'name avatarUrl')
            .sort({ lastMessageAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        res.json({ conversations, page, limit });
    } catch (error) {
        console.error("Get conversations error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export { createOrGetConversation, getConversations };
