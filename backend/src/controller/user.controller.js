import User from '../model/user.model.js';
import crypto from 'crypto';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { sendVerificationEmail, isEmailConfigured } from '../utils/email.js';

const registerUser = catchAsync(async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        throw new AppError("Please fill all the fields", 400);
    }

    const existing = await User.findOne({ email });
    if (existing) {
        throw new AppError("User already exists", 400);
    }

    const user = await User.create({ name, email, password });

    if (isEmailConfigured()) {
        const token = crypto.randomBytes(32).toString('hex');
        user.verificationToken = token;
        user.verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await user.save();
        await sendVerificationEmail(email, name, token);
    } else {
        user.isVerified = true;
        await user.save();
    }

    res.status(201).json({
        success: true,
        message: isEmailConfigured()
            ? "Registration successful! Please check your email to verify your account."
            : "Registration successful!",
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
        }
    });
});

const verifyEmail = catchAsync(async (req, res) => {
    const { token } = req.query;
    if (!token) throw new AppError("Verification token is required", 400);

    const user = await User.findOne({
        verificationToken: token,
        verificationExpires: { $gt: new Date() },
    });
    if (!user) throw new AppError("Invalid or expired verification token", 400);

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationExpires = null;
    await user.save();

    res.json({ success: true, message: "Email verified successfully! You can now log in." });
});

const resendVerification = catchAsync(async (req, res) => {
    const { email } = req.body;
    if (!email) throw new AppError("Email is required", 400);

    const user = await User.findOne({ email });
    if (!user) throw new AppError("No account found with this email", 404);
    if (user.isVerified) throw new AppError("Email is already verified", 400);

    const token = crypto.randomBytes(32).toString('hex');
    user.verificationToken = token;
    user.verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    await sendVerificationEmail(email, user.name, token);

    res.json({ success: true, message: "Verification email resent. Please check your inbox." });
});

const loginUser = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new AppError("Please fill all the fields", 400);
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new AppError("User does not exist please register first", 400);
    }

    if (!user.isVerified && isEmailConfigured()) {
        return res.status(403).json({
            message: "Please verify your email before logging in",
            needsVerification: true,
            email: user.email,
        });
    }

    const isMatched = await user.comparePassword(password);
    if (!isMatched) {
        throw new AppError("Invalid credentials", 400);
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    res.status(200).json({
        accessToken,
        refreshToken,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            bio: user.bio || '',
            avatarUrl: user.avatarUrl || ''
        }
    });
});

const searchUsers = catchAsync(async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ users: [] });

    const users = await User.find({
        _id: { $ne: req.user._id },
        $or: [
            { name: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } }
        ]
    }).select('name email avatarUrl bio');
    res.json({ users });
});

const getMe = catchAsync(async (req, res) => {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ user });
});

const updateProfile = catchAsync(async (req, res) => {
    const { name, bio } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (req.file) {
        updateData.avatarUrl = `/uploads/${req.file.filename}`;
    }
    const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true }).select('-password');
    if (!user) throw new AppError("User not found", 404);
    res.json({ user });
});

export {
    registerUser,
    loginUser,
    verifyEmail,
    resendVerification,
    searchUsers,
    getMe,
    updateProfile
}