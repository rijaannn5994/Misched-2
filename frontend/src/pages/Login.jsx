import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { EyeIcon, EyeOffIcon } from "../components/Icons";
import api from "../api";

const Login = () => {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const linkColor = isLight ? "#1d4ed8" : "#60a5fa";
  const dividerColor = isLight ? "rgba(0,0,0,0.09)" : "rgba(255,255,255,0.06)";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const role = await login(email, password);
      if (role === "admin") navigate("/admin");
      else if (role === "staff") navigate("/staff");
      else navigate("/student");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Login failed. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMsg("");
    try {
      await api.post("/auth/forgot-password", { email: forgotEmail });
      setForgotMsg("Request sent. The admin will reset your password shortly.");
      setForgotEmail("");
    } catch {
      setForgotMsg("Something went wrong. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        paddingTop: "5rem",
        position: "relative",
        overflow: "hidden",
        background: isLight
          ? "linear-gradient(135deg, #e0e7ff 0%, #f0f9ff 40%, #fdf4ff 100%)"
          : "linear-gradient(135deg, #0f0c29 0%, #1a1040 40%, #0d1b2a 100%)",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ width: "100%", maxWidth: "420px", position: "relative" }}
      >
        {/* Card */}
        <div
          className="glass-card-static"
          style={{ padding: "2.5rem", borderRadius: "1.25rem" }}
        >
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <img
              src="/images/logo.png"
              alt="MiSched"
              style={{
                height: "3rem",
                width: "auto",
                marginBottom: "1rem",
                display: "block",
                marginLeft: "auto",
                marginRight: "auto",
              }}
            />
            <h1 style={{ fontSize: "1.75rem", fontWeight: "800" }}>
              <span className="gradient-text">
                {showForgot ? "Reset Password" : "Welcome Back"}
              </span>
            </h1>
            <p
              style={{
                color: "#64748b",
                fontSize: "0.9rem",
                marginTop: "0.5rem",
              }}
            >
              {showForgot
                ? "Enter your email to request a password reset"
                : "Sign in to access your portal"}
            </p>
          </div>

          {/* ── LOGIN FORM ── */}
          {!showForgot && (
            <>
              {error && (
                <div
                  className="alert alert-error"
                  style={{ marginBottom: "1.25rem" }}
                >
                  {error}
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                }}
              >
                <div>
                  <label className="label">Email Address</label>
                  <input
                    type="email"
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@university.com"
                    required
                  />
                </div>

                <div>
                  <label className="label">Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      style={{ paddingRight: "2.75rem" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: "0.75rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#64748b",
                        display: "flex",
                        alignItems: "center",
                        padding: "0",
                      }}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOffIcon size={18} />
                      ) : (
                        <EyeIcon size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "0.8rem",
                    fontSize: "0.95rem",
                    marginTop: "0.5rem",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>

              <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
                <button
                  onClick={() => {
                    setShowForgot(true);
                    setError("");
                    setForgotMsg("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: linkColor,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                    textDecoration: "underline",
                    textUnderlineOffset: "2px",
                  }}
                >
                  Forgot Password?
                </button>
              </div>
            </>
          )}

          {/* ── FORGOT PASSWORD FORM ── */}
          {showForgot && (
            <>
              {forgotMsg && (
                <div
                  className={`alert ${forgotMsg.startsWith("Request sent") ? "alert-success" : "alert-error"}`}
                  style={{ marginBottom: "1.25rem" }}
                >
                  {forgotMsg}
                </div>
              )}

              {!forgotMsg && (
                <form
                  onSubmit={handleForgotSubmit}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.25rem",
                  }}
                >
                  <div>
                    <label className="label">Your Email Address</label>
                    <input
                      type="email"
                      className="input"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@university.com"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={forgotLoading}
                    style={{
                      width: "100%",
                      padding: "0.8rem",
                      fontSize: "0.95rem",
                      opacity: forgotLoading ? 0.7 : 1,
                    }}
                  >
                    {forgotLoading ? "Sending..." : "Send Reset Request"}
                  </button>
                </form>
              )}

              <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
                <button
                  onClick={() => {
                    setShowForgot(false);
                    setForgotMsg("");
                    setForgotEmail("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: linkColor,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                    textDecoration: "underline",
                    textUnderlineOffset: "2px",
                  }}
                >
                  &larr; Back to Sign In
                </button>
              </div>
            </>
          )}

          {/* Footer link */}
          <div
            style={{
              textAlign: "center",
              marginTop: "1.25rem",
              paddingTop: "1.25rem",
              borderTop: `1px solid ${dividerColor}`,
            }}
          >
            <Link
              to="/"
              style={{
                color: "#64748b",
                fontSize: "0.85rem",
                textDecoration: "none",
              }}
            >
              &larr; Back to Home
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Login;
