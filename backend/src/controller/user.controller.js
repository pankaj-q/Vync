import User from '../model/user.model.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { sendVerificationOTP, sendResetPasswordOTP, isEmailConfigured } from '../utils/email.js';
import { s3Configured } from '../middleware/multer.middleware.js';

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

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
        const otp = generateOTP();
        user.verificationOTP = otp;
        user.verificationOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();
        sendVerificationOTP(email, name, otp).catch((err) => console.error('Email send failed:', err));
    } else {
        user.isVerified = true;
        await user.save();
    }

    res.status(201).json({
        success: true,
        message: isEmailConfigured()
            ? "Registration successful! Please check your email for the verification code."
            : "Registration successful!",
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
        }
    });
});

const verifyEmail = catchAsync(async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) throw new AppError("Email and OTP are required", 400);

    const user = await User.findOne({
        email,
        verificationOTP: otp,
        verificationOTPExpiry: { $gt: new Date() },
    });
    if (!user) throw new AppError("Invalid or expired OTP", 400);

    user.isVerified = true;
    user.verificationOTP = null;
    user.verificationOTPExpiry = null;
    await user.save();

    res.json({ success: true, message: "Email verified successfully! You can now log in." });
});

const resendVerification = catchAsync(async (req, res) => {
    const { email } = req.body;
    if (!email) throw new AppError("Email is required", 400);

    const user = await User.findOne({ email });
    if (!user) throw new AppError("No account found with this email", 404);
    if (user.isVerified) throw new AppError("Email is already verified", 400);

    const otp = generateOTP();
    user.verificationOTP = otp;
    user.verificationOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    sendVerificationOTP(email, user.name, otp).catch((err) => console.error('Email send failed:', err));

    res.json({ success: true, message: "Verification code resent. Please check your inbox." });
});

const forgotPassword = catchAsync(async (req, res) => {
    const { email } = req.body;
    if (!email) throw new AppError("Email is required", 400);

    const user = await User.findOne({ email });

    if (!user) {
        return res.json({
            success: true,
            message: "If an account exists with this email, a reset code has been sent."
        });
    }

    const otp = generateOTP();
    user.resetOTP = otp;
    user.resetOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    sendResetPasswordOTP(email, user.name, otp).catch((err) => console.error('Email send failed:', err));

    res.json({
        success: true,
        message: "If an account exists with this email, a reset code has been sent."
    });
});

const resetPassword = catchAsync(async (req, res) => {
    const { email, otp, password, confirmPassword } = req.body;

    if (!email || !otp || !password || !confirmPassword) {
        throw new AppError("Email, OTP, password, and confirm password are required", 400);
    }

    if (password !== confirmPassword) {
        throw new AppError("Passwords do not match", 400);
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(password)) {
        throw new AppError("Password must be at least 6 characters and contain at least one letter and one number", 400);
    }

    const user = await User.findOne({
        email,
        resetOTP: otp,
        resetOTPExpiry: { $gt: new Date() }
    });

    if (!user) {
        throw new AppError("Invalid or expired OTP", 400);
    }

    user.password = password;
    user.resetOTP = null;
    user.resetOTPExpiry = null;
    await user.save();

    res.json({ success: true, message: "Password has been reset successfully. You can now log in." });
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
        updateData.avatarUrl = s3Configured()
            ? req.file.location
            : `/uploads/${req.file.filename}`;
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
    forgotPassword,
    resetPassword,
    searchUsers,
    getMe,
    updateProfile
}