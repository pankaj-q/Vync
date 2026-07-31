import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createOrGetConversation, getConversations } from '../controller/conversation.controller.js';

const router = express.Router();

router.post('/', protect, createOrGetConversation);
router.get('/', protect, getConversations);

export default router;
