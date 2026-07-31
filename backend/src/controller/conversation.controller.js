import Conversation from '../model/conversation.model.js';
import Message from '../model/message.model.js';

const createOrGetConversation = async (req, res) => {
    try {
        const { participantId } = req.body;
        if (!participantId) {
            return res.status(400).json({ message: "Participant ID is required" });
        }

        const existing = await Conversation.findOne({
            participants: { $all: [req.user._id, participantId], $size: 2 }
        }).populate('participants', 'name email avatar');

        if (existing) {
            return res.json({ conversation: existing });
        }

        const conversation = await Conversation.create({
            participants: [req.user._id, participantId]
        });

        const populated = await Conversation.findById(conversation._id)
            .populate('participants', 'name email avatar');

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
            .populate('participants', 'name email avatar')
            .populate('lastMessage')
            .sort({ lastMessageAt: -1 });

        res.json({ conversations });
    } catch (error) {
        console.error("Get conversations error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export { createOrGetConversation, getConversations };
