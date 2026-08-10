import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setMessage("No reset token found in URL.");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;

    setMessage("");
    setLoading(true);

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      setLoading(false);
      return;
    }

    // Client-side validation matching backend
    if (!/^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(password)) {
      setMessage("Password must be at least 6 characters and contain at least one letter and one number");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || "Password has been reset successfully!");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        setMessage(data.message || "Failed to reset password");
      }
    } catch (error) {
      setMessage("Server Error");
    }
    setLoading(false);
  };

  if (!tokenValid) {
    return (
      <div className="login-container" style={{ textAlign: "center" }}>
        <h2>Invalid Link</h2>
        <div style={{ fontSize: 48, margin: "24px 0" }}>⚠️</div>
        <p style={{ fontSize: 14, color: "#dc2626", marginBottom: 16 }}>{message}</p>
        <p>
          <Link to="/forgot-password" style={{ display: "inline-block", padding: "12px 24px", background: "#22c55e", color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}>
            Request New Reset Link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="login-container">
      <h2>Reset Password</h2>
      {message && <div className="error-bar" style={{ marginBottom: 16 }}>{message}</div>}
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          name="password"
          placeholder="Enter New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Resetting..." : "Reset Password"}
        </button>
        <p>Remember your password? <Link to="/login">Login</Link></p>
      </form>
    </div>
  );
}

export default ResetPassword;