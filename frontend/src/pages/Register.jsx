import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

function Register() {
  const [user, setUser] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [registered, setRegistered] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (user.password !== user.confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    try {
      const response = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: user.name, email: user.email, password: user.password }),
      });

      const data = await response.json();

      if (response.ok) {
        setRegistered(true);
        setMessage(data.message || "Registration successful!");
      } else {
        setMessage(data.message || "Registration Failed");
      }
    } catch (error) {
      setMessage("Server Error");
    }
  };

  if (registered) {
    return (
      <div className="register-container" style={{ textAlign: "center" }}>
        <h2>Registration Complete</h2>
        <div style={{ fontSize: 48, margin: "24px 0" }}>📧</div>
        <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, marginBottom: 8 }}>{message}</p>
        <p style={{ fontSize: 13, color: "#9ca3af" }}>
          {message.includes("email") ? "Check your inbox (and spam folder) for the verification link." : "You can now log in."}
        </p>
        <p style={{ marginTop: 20 }}>
          <Link to="/login" style={{ display: "inline-block", padding: "12px 24px", background: "#22c55e", color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}>Go to Login</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="register-container">
      <h2>Register</h2>
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
        <input type="text" name="name" placeholder="Enter Name" value={user.name} onChange={handleChange} required />
        <input type="email" name="email" placeholder="Enter Email" value={user.email} onChange={handleChange} required />
        <div className="password-field">
          <input type={showPassword ? "text" : "password"} name="password" placeholder="Enter Password" value={user.password} onChange={handleChange} required />
          <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <div className="password-field">
          <input type={showConfirm ? "text" : "password"} name="confirmPassword" placeholder="Confirm Password" value={user.confirmPassword} onChange={handleChange} required />
          <button type="button" className="password-toggle" onClick={() => setShowConfirm(!showConfirm)} aria-label="Toggle confirm password visibility">
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <button type="submit">Register</button>
        <p>Already have an account? <Link to="/login">Login</Link></p>
      </form>
    </div>
  );
}

export default Register;