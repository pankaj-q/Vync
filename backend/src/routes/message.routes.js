import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { sendMessage, getMessages, editMessage, deleteMessage, forwardMessage, reactToMessage, searchMessages, markAsRead } from '../controller/message.controller.js';

const router = express.Router();

router.post('/', protect, sendMessage);
router.get('/:conversationId', protect, getMessages);
router.put('/:id', protect, editMessage);
router.delete('/:id', protect, deleteMessage);
router.post('/forward', protect, forwardMessage);
router.put('/:id/react', protect, reactToMessage);
router.get('/:conversationId/search', protect, searchMessages);
router.post('/read', protect, markAsRead);

export default router;
