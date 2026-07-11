import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { APP_INFO } from "../constants/formConfig";
import { resetPassword } from "../services/authService";
import { passwordRequirements } from "../utils/validation";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) {
      setToken(t);
      setReady(true);
    } else {
      setError("This reset link is invalid or expired. Please request a new one.");
    }
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    const unmet = passwordRequirements(password);
    if (unmet.length > 0) {
      setError(`Password must have: ${unmet.join(', ')}.`);
      setMessage("");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setMessage("");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      await resetPassword(token, password);
      sessionStorage.clear();
      setMessage("Password updated successfully. Redirecting to login...");
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (err) {
      setError(err?.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; font-family: 'Segoe UI', Arial, sans-serif; }

  .dyp-input {
    width: 100%;
    padding: 11px 14px;
    border: 1.5px solid rgba(255,255,255,0.55);
    border-radius: 4px;
    font-size: 14px;
    color: white;
    background: rgba(255,255,255,0.08);
    margin-bottom: 14px;
    font-family: inherit;
    transition: border-color 0.2s, box-shadow 0.2s;
    outline: none;
  }
  .dyp-input::placeholder { color: rgba(255,255,255,0.5); }
  .dyp-input:focus {
    border-color: white;
    box-shadow: 0 0 0 2px rgba(255,255,255,0.15);
  }
  .dyp-input:disabled { opacity: 0.5; cursor: not-allowed; }
  .dyp-btn {
    width: 100%;
    padding: 12px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.2s;
    margin-bottom: 12px;
    letter-spacing: 0.2px;
  }
  .dyp-btn:hover:not(:disabled) { background: #1d4ed8; }
  .dyp-btn:disabled { opacity: 0.72; cursor: not-allowed; }
`}</style>

      <div style={s.wrap}>
        {/* Top Left Logo */}
        <img src="/image.png" alt="University Logo" style={s.topLeftLogo} />
        {/* Top Right Logo */}
        <img src="/IQAS.png" alt="IQAC Logo" style={s.topRightLogo} />

        <div style={s.overlay} />

        <div style={s.card}>
          <h2 style={s.panelTitle}>Reset Password</h2>
          <p style={s.sub}>{APP_INFO.PORTAL_NAME}</p>

          {error   && <div style={s.error}>{error}</div>}
          {message && <div style={s.success}>{message}</div>}

          <form onSubmit={handleUpdatePassword}>
            <label style={s.label}>New Password</label>
            <input
              className="dyp-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              disabled={!ready || loading}
            />

            <label style={s.label}>Confirm Password</label>
            <input
              className="dyp-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              disabled={!ready || loading}
            />

            <button
              type="submit"
              className="dyp-btn"
              style={{ opacity: !ready || loading ? 0.72 : 1 }}
              disabled={!ready || loading}
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>

          <p style={s.backText}>
            <Link to="/login" style={s.backLink}>Back to login</Link>
          </p>
        </div>
      </div>
    </>
  );
}

// - Styles -
const s = {
  topLeftLogo: {
    position: "absolute",
    top: 20,
    left: 20,
    height: 100,
    zIndex: 2,
  },
  topRightLogo: {
    position: "absolute",
    top: 20,
    right: 20,
    height: 100,
    zIndex: 2,
  },
  wrap: {
    minHeight: "100vh",
    width: "100%",
    backgroundImage: "url('/dyp.jpeg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    position: "relative",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(8, 16, 38, 0.30)",
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 380,
    borderRadius: 8,
    background: "rgba(15, 25, 50, 0.72)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
    padding: "32px 28px",
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "white",
    marginBottom: 4,
    marginTop: 0,
  },
  sub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    margin: "0 0 22px",
  },
  label: {
    display: "block",
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  error: {
    background: "rgba(185,28,28,0.25)",
    border: "1px solid rgba(252,165,165,0.5)",
    color: "#fca5a5",
    padding: "9px 12px",
    borderRadius: 4,
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 1.5,
  },
  success: {
    background: "rgba(21,128,61,0.25)",
    border: "1px solid rgba(134,239,172,0.5)",
    color: "#86efac",
    padding: "9px 12px",
    borderRadius: 4,
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 1.5,
  },
  backText: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
  },
  backLink: {
    color: "#60a5fa",
    fontWeight: 600,
    textDecoration: "none",
  },
};

