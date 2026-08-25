import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get("email") || "";
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (inputRefs.current[0]) inputRefs.current[0].focus();
  }, []);

  const handleChange = (index, value) => {
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

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newOtp = pasted.split("").concat(Array(6).fill("")).slice(0, 6);
    setOtp(newOtp);
    const nextEmpty = newOtp.findIndex((d) => !d);
    inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty].focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    const code = otp.join("");
    if (code.length !== 6) {
      setMessage("Please enter the complete 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/users/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setMessage(data.message);
      } else {
        setMessage(data.message || "Verification failed");
      }
    } catch {
      setMessage("Server error. Please try again.");
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setResending(true);
    setMessage("");
    try {
      const res = await fetch("/api/users/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(data.message || "New code sent!");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch {
      setMessage("Failed to resend code");
    }
    setResending(false);
  };

  return (
    <div className="register-container" style={{ textAlign: "center" }}>
      <h2>Verify Email</h2>
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
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined}
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
            <button type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Verify"}
            </button>
          </form>
          <p style={{ marginTop: 16, fontSize: 13 }}>
            Didn't get the code?{" "}
            <button onClick={handleResend} disabled={resending} className="small-btn" style={{ background: "none", border: "none", color: "#22c55e", cursor: "pointer", fontWeight: 600, fontSize: 13, padding: 0 }}>
              {resending ? "Sending..." : "Resend"}
            </button>
          </p>
          <p style={{ marginTop: 8 }}><Link to="/login">Back to Login</Link></p>
        </>
      )}
    </div>
  );
}

export default VerifyEmail;
