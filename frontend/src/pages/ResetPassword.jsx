import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get("email") || "";
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (inputRefs.current[0]) inputRefs.current[0].focus();
  }, []);

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    const code = otp.join("");
    if (code.length !== 6) {
      setMessage("Please enter the complete 6-digit code");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(password)) {
      setMessage("Password must be at least 6 characters with at least one letter and one number");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code, password, confirmPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setMessage(data.message);
      } else {
        setMessage(data.message || "Failed to reset password");
      }
    } catch {
      setMessage("Server error");
    }
    setLoading(false);
  };

  return (
    <div className="register-container" style={{ textAlign: "center" }}>
      <h2>Reset Password</h2>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
        Enter the 6-digit code sent to<br />
        <strong style={{ color: "var(--text-primary)" }}>{email || "your email"}</strong>
      </p>

      {success ? (
        <>
          <div style={{ fontSize: 48, margin: "24px 0" }}>&#10003;</div>
          <p style={{ color: "#166534", fontWeight: 500, marginBottom: 20 }}>{message}</p>
          <Link to="/login" style={{ display: "inline-block", padding: "12px 24px", background: "#22c55e", color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}>
            Go to Login
          </Link>
        </>
      ) : (
        <>
          {message && <div className="error-bar" style={{ marginBottom: 16 }}>{message}</div>}
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  style={{
                    width: 44,
                    height: 52,
                    textAlign: "center",
                    fontSize: 22,
                    fontWeight: 600,
                    border: "1.5px solid var(--border-color, #d1d5db)",
                    borderRadius: 8,
                    background: "var(--bg-secondary, #f9fafb)",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                  required
                />
              ))}
            </div>
            <input
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
          <p style={{ marginTop: 16 }}><Link to="/forgot-password">Back to Forgot Password</Link></p>
        </>
      )}
    </div>
  );
}

export default ResetPassword;
