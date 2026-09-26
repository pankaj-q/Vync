import Conversation from '../model/conversation.model.js';
import Message from '../model/message.model.js';

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
        const conversations = await Conversation.find({
            participants: req.user._id
        })
            .populate('participants', 'name email avatarUrl bio')
            .populate('lastMessage')
            .sort({ lastMessageAt: -1 });

        res.json({ conversations });
    } catch (error) {
        console.error("Get conversations error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export { createOrGetConversation, getConversations };
