import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("No verification token found.");
      return;
    }
    fetch(`/api/users/verify-email?token=${encodeURIComponent(token)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus("success");
          setMessage(data.message);
        } else {
          setStatus("error");
          setMessage(data.message || "Verification failed");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Server error. Please try again.");
      });
  }, [searchParams]);

  return (
    <div className="register-container" style={{ textAlign: "center" }}>
      <h2>Email Verification</h2>
      <div style={{ margin: "32px 0", fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
        {status === "verifying" && (
          <>
            <div className="loading-spinner" style={{ margin: "0 auto 16px" }} />
            <p>Verifying your email...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <p style={{ color: "#166534", fontWeight: 500 }}>{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <p style={{ color: "#dc2626" }}>{message}</p>
          </>
        )}
      </div>
      <p>
        {status === "success" ? <Link to="/login">Go to Login</Link> : <Link to="/">Back to Register</Link>}
      </p>
    </div>
  );
}

export default VerifyEmail;