import express from "express";
import passport from "../config/passport.js";
import User from "../model/user.model.js";
import jwt from "jsonwebtoken";

const router = express.Router();
const isGoogleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

router.get("/google", (req, res, next) => {
  if (!isGoogleConfigured()) {
    return res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/login?google=not_configured`);
  }
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

router.get(
  "/google/callback",
  (req, res, next) => {
    if (!isGoogleConfigured()) {
      return res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/login`);
    }
    passport.authenticate("google", { session: false, failureRedirect: `${process.env.CLIENT_URL || "http://localhost:5173"}/login` })(req, res, next);
  },
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id).select('-password');
      const accessToken = user.generateAccessToken();
      const refreshToken = user.generateRefreshToken();
      const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
      const userData = encodeURIComponent(JSON.stringify({
        id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio || '',
        avatarUrl: user.avatarUrl || ''
      }));
      res.redirect(`${clientUrl}/oauth-callback?token=${accessToken}&refreshToken=${refreshToken}&user=${userData}`);
    } catch (err) {
      console.error("Google callback error:", err);
      res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/login`);
    }
  },
);

router.get("/google/success", (req, res) => {
  res.json({ success: true, message: "Google auth configured" });
});

export default router;