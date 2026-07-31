import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const token = searchParams.get("token");
    const refreshToken = searchParams.get("refreshToken");
    const userParam = searchParams.get("user");

    if (!token) {
      navigate("/login");
      return;
    }

    localStorage.setItem("token", token);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
    if (userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        localStorage.setItem("user", JSON.stringify({ ...user, _id: user.id }));
      } catch (e) {
        console.error("Failed to parse user data", e);
      }
    }
    navigate("/dashboard");
  }, [navigate, searchParams]);

  return (
    <div className="login-container" style={{ textAlign: "center" }}>
      <div className="loading-spinner" style={{ margin: "40px auto" }} />
      <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Signing you in with Google...</p>
    </div>
  );
}

export default OAuthCallback;