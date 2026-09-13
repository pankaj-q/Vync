import { Link } from "react-router-dom";

function PrivacyPolicy() {
  return (
    <div className="register-container" style={{ maxWidth: 640 }}>
      <h2 style={{ textAlign: "center" }}>Privacy Policy</h2>
      <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", marginBottom: 24 }}>Last updated: September 13, 2026</p>

      <div style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-primary)" }}>
        <h3 style={{ color: "#22c55e", margin: "16px 0 8px" }}>1. Information We Collect</h3>
        <p>We collect your name, email address, and a securely hashed password when you create an account. You may optionally provide a profile bio and avatar image.</p>

        <h3 style={{ color: "#22c55e", margin: "16px 0 8px" }}>2. How We Use Your Information</h3>
        <p>Your email address is used solely for account-related communication: email verification, password reset verification, and security notifications. We do not send marketing emails.</p>

        <h3 style={{ color: "#22c55e", margin: "16px 0 8px" }}>3. Data Storage & Security</h3>
        <p>Account data is stored securely in a managed database. Passwords are hashed and never stored in plain text. Messages are processed between users to enable the chat functionality.</p>

        <h3 style={{ color: "#22c55e", margin: "16px 0 8px" }}>4. Sharing of Information</h3>
        <p>We do not sell or share your personal information with third parties, except as required to operate the service (hosting providers) or by law.</p>

        <h3 style={{ color: "#22c55e", margin: "16px 0 8px" }}>5. Data Retention & Deletion</h3>
        <p>You may request deletion of your account and data at any time by contacting support. Your data is removed promptly upon such a request.</p>

        <h3 style={{ color: "#22c55e", margin: "16px 0 8px" }}>6. Contact</h3>
        <p>For any privacy questions, contact: <a href="mailto:codepankaj84@gmail.com" style={{ color: "#22c55e" }}>codepankaj84@gmail.com</a></p>
      </div>

      <p style={{ textAlign: "center", marginTop: 24 }}>
        <Link to="/" style={{ color: "#22c55e", fontSize: 14 }}>Back to Register</Link>
      </p>
    </div>
  );
}

export default PrivacyPolicy;