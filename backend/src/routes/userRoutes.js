import {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  searchUsers,
  getMe,
  updateProfile
} from "../controller/user.controller.js";
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/multer.middleware.js';
import express from 'express'
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/search', protect, searchUsers);
router.get('/me', protect, getMe);
router.put('/profile', protect, upload.single('avatar'), updateProfile);

export default router;