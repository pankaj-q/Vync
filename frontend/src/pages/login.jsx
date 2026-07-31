import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [resending, setResending] = useState(false);

  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setNeedsVerification(false);

    try {
      const response = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        const userData = data.user._id ? data.user : { ...data.user, _id: data.user.id };
        localStorage.setItem("user", JSON.stringify(userData));
        navigate("/dashboard");
      } else if (data.needsVerification) {
        setNeedsVerification(true);
        setVerifyEmail(data.email);
        setMessage(data.message);
      } else {
        setMessage(data.message || "Invalid Credentials");
      }
    } catch (error) {
      setMessage("Server Error");
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await fetch("/api/users/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmail }),
      });
      const data = await res.json();
      setMessage(data.message || "Verification email resent!");
    } catch (e) {
      setMessage("Failed to resend");
    }
    setResending(false);
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      {message && <div className="error-bar" style={{ marginBottom: 16 }}>{message}</div>}
      <a href="/api/auth/google" className="google-btn">
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/>
        </svg>
        Continue with Google
      </a>
      <div className="divider"><span>or</span></div>
      <form onSubmit={handleSubmit}>
        <input type="email" name="email" placeholder="Enter Email" value={user.email} onChange={handleChange} required />
        <input type="password" name="password" placeholder="Enter Password" value={user.password} onChange={handleChange} required />
        <button type="submit">Login</button>
        <p>Don't have an account? <Link to="/">Register</Link></p>
      </form>
      {needsVerification && (
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button onClick={handleResend} disabled={resending} className="small-btn" style={{ fontSize: 12 }}>
            {resending ? "Sending..." : "Resend verification email"}
          </button>
        </div>
      )}
    </div>
  );
}

export default Login;