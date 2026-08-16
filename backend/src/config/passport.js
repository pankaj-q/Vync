import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../model/user.model.js";

const isGoogleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

if (isGoogleConfigured()) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || "http://localhost:5005"}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(null, false, { message: "No email from Google" });

          let user = await User.findOne({ email });

          if (!user) {
            user = await User.create({
              name: profile.displayName || email.split("@")[0],
              email,
              password: Math.random().toString(36).slice(2) + "Aa1!",
              provider: "google",
              googleId: profile.id,
              avatarUrl: profile.photos?.[0]?.value || "",
              isVerified: true,
            });
          } else if (user.provider === "local" && !user.googleId) {
            user.googleId = profile.id;
            user.provider = "google";
            user.isVerified = true;
            await user.save();
          }

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      },
    ),
  );
}

export default passport;