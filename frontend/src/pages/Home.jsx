import React from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import {
  ChartIcon,
  LightningIcon,
  LockIcon,
  KeyIcon,
  ClipboardIcon,
  TrendUpIcon,
} from "../components/Icons";

const Home = () => {
  const { theme } = useTheme();
  const light = theme === "light";

  const t = {
    heading: light ? "#0f172a" : "#f1f5f9",
    body: light ? "#475569" : "#94a3b8",
    muted: "#64748b",
    border: light ? "rgba(0,0,0,0.09)" : "rgba(255,255,255,0.06)",
    borderF: light ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.04)",
    rowBg: light ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)",
    badge: light ? "#1d4ed8" : "#60a5fa",
  };

  return (
    <div style={{
      paddingTop: "3.75rem",
      background: light
        ? "linear-gradient(135deg, #e0e7ff 0%, #f0f9ff 40%, #fdf4ff 100%)"
        : "linear-gradient(135deg, #0f0c29 0%, #1a1040 40%, #0d1b2a 100%)",
      minHeight: "100vh",
    }}>
      {/*  Hero Section  */}
      <section
        style={{
          minHeight: "calc(100vh - 3.75rem)",
          display: "flex",
          alignItems: "center",
          padding: "4rem 2rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background decorative elements */}
        <div
          style={{
            position: "absolute",
            top: "-20%",
            right: "-10%",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-30%",
            left: "-10%",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4rem",
            alignItems: "center",
            width: "100%",
          }}
        >
          {/* Left: Text */}
          <div className="animate-fade-in-up">
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "rgba(59,130,246,0.1)",
                border: `1px solid rgba(59,130,246,${light ? "0.3" : "0.2"})`,
                borderRadius: "9999px",
                padding: "0.35rem 1rem",
                fontSize: "0.8rem",
                fontWeight: "600",
                color: t.badge,
                marginBottom: "1.5rem",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#3b82f6",
                }}
              />
              University Attendance Platform
            </div>

            <h1
              style={{
                fontSize: "clamp(2.5rem, 5vw, 3.75rem)",
                fontWeight: "900",
                lineHeight: "1.1",
                marginBottom: "1.5rem",
                color: t.heading,
              }}
            >
              Smart Attendance,{" "}
              <span className="gradient-text">Simplified</span>
            </h1>

            <p
              style={{
                fontSize: "1.15rem",
                color: t.body,
                lineHeight: "1.7",
                marginBottom: "2.5rem",
                maxWidth: "500px",
              }}
            >
              Streamline your university's attendance tracking with MiSched.
              Real-time monitoring, smart analytics, and seamless role-based
              portals for admins, staff, and students.
            </p>

            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <Link
                to="/login"
                className="btn btn-primary btn-lg"
                style={{ textDecoration: "none" }}
              >
                Get Started
              </Link>
              <a
                href="#features"
                className="btn btn-secondary btn-lg"
                style={{ textDecoration: "none" }}
              >
                Learn More
              </a>
            </div>

            {/* Quick stats */}
            <div
              style={{
                display: "flex",
                gap: "2.5rem",
                marginTop: "3rem",
                paddingTop: "2rem",
                borderTop: `1px solid ${t.borderF}`,
              }}
            >
              {[
                { value: "3", label: "Role Portals" },
                { value: "24/7", label: "Access" },
                { value: "100%", label: "Digital" },
              ].map((stat, i) => (
                <div key={i}>
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "800",
                      color: t.heading,
                    }}
                  >
                    {stat.value}
                  </div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: t.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Hero Image */}
          <div
            className="animate-fade-in-up delay-2"
            style={{ display: "flex", justifyContent: "center" }}
          >
            <div
              style={{ position: "relative", width: "100%", maxWidth: "500px" }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: "-2px",
                  borderRadius: "1.5rem",
                  background:
                    "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(6,182,212,0.3))",
                  filter: "blur(20px)",
                  opacity: 0.5,
                }}
              />
              <img
                src="/images/hero.png"
                alt="MiSched Attendance Platform"
                style={{
                  width: "100%",
                  borderRadius: "1.5rem",
                  border: `1px solid ${t.border}`,
                  position: "relative",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/*  Features Section  */}
      <section
        id="features"
        style={{ padding: "6rem 2rem", position: "relative" }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div
            style={{ textAlign: "center", marginBottom: "4rem" }}
            className="animate-fade-in-up"
          >
            <h2
              style={{
                fontSize: "2.25rem",
                fontWeight: "800",
                marginBottom: "1rem",
                color: t.heading,
              }}
            >
              Everything You Need to{" "}
              <span className="gradient-text">Track Attendance</span>
            </h2>
            <p
              style={{
                color: t.body,
                fontSize: "1.1rem",
                maxWidth: "600px",
                margin: "0 auto",
              }}
            >
              A complete platform designed for universities to manage attendance
              effortlessly across all roles.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {/* Feature 1 */}
            <div
              className="glass-card animate-fade-in-up delay-1"
              style={{ padding: "2rem" }}
            >
              <div
                style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "0.75rem",
                  background:
                    "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(6,182,212,0.2))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.25rem",
                  marginBottom: "1.25rem",
                }}
              >
                <ChartIcon size={22} className="text-blue-400" />
              </div>
              <h3
                style={{
                  fontSize: "1.2rem",
                  fontWeight: "700",
                  marginBottom: "0.75rem",
                  color: t.heading,
                }}
              >
                Smart Analytics
              </h3>
              <p
                style={{
                  color: t.body,
                  lineHeight: "1.6",
                  fontSize: "0.95rem",
                }}
              >
                Real-time dashboards with present, late, and absent tracking.
                Export data to CSV for detailed reports and institutional
                audits.
              </p>
              <img
                src="/images/feature-dashboard.png"
                alt="Analytics Dashboard"
                style={{
                  width: "100%",
                  borderRadius: "0.75rem",
                  marginTop: "1.25rem",
                  border: `1px solid ${t.border}`,
                }}
              />
            </div>

            {/* Feature 2 */}
            <div
              className="glass-card animate-fade-in-up delay-2"
              style={{ padding: "2rem" }}
            >
              <div
                style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "0.75rem",
                  background:
                    "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.2))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.25rem",
                  marginBottom: "1.25rem",
                }}
              >
                <LightningIcon size={22} className="text-emerald-400" />
              </div>
              <h3
                style={{
                  fontSize: "1.2rem",
                  fontWeight: "700",
                  marginBottom: "0.75rem",
                  color: t.heading,
                }}
              >
                Real-Time Tracking
              </h3>
              <p
                style={{
                  color: t.body,
                  lineHeight: "1.6",
                  fontSize: "0.95rem",
                }}
              >
                Staff can mark attendance instantly during lectures. Students
                see their status update in real-time on their personal portal.
              </p>
              <img
                src="/images/feature-realtime.png"
                alt="Real-time Attendance"
                style={{
                  width: "100%",
                  borderRadius: "0.75rem",
                  marginTop: "1.25rem",
                  border: `1px solid ${t.border}`,
                }}
              />
            </div>

            {/* Feature 3 */}
            <div
              className="glass-card animate-fade-in-up delay-3"
              style={{ padding: "2rem" }}
            >
              <div
                style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "0.75rem",
                  background:
                    "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.2))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.25rem",
                  marginBottom: "1.25rem",
                }}
              >
                <LockIcon size={22} className="text-purple-400" />
              </div>
              <h3
                style={{
                  fontSize: "1.2rem",
                  fontWeight: "700",
                  marginBottom: "0.75rem",
                  color: t.heading,
                }}
              >
                Role-Based Portals
              </h3>
              <p
                style={{
                  color: t.body,
                  lineHeight: "1.6",
                  fontSize: "0.95rem",
                }}
              >
                Dedicated dashboards for Admins, Staff, and Students. Each role
                gets a tailored experience with the tools they need.
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  marginTop: "1.25rem",
                }}
              >
                {[
                  {
                    role: "Admin",
                    desc: "Manage users, modules, lectures & analytics",
                    color: "#3b82f6",
                  },
                  {
                    role: "Staff",
                    desc: "View schedule & mark attendance in real-time",
                    color: "#10b981",
                  },
                  {
                    role: "Student",
                    desc: "View timetable, modules & attendance profile",
                    color: "#8b5cf6",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "0.85rem 1rem",
                      borderRadius: "0.75rem",
                      background: t.rowBg,
                      border: `1px solid ${t.border}`,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: item.color,
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div
                        style={{
                          fontWeight: "600",
                          fontSize: "0.875rem",
                          color: t.heading,
                        }}
                      >
                        {item.role}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: t.muted }}>
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/*  How It Works  */}
      <section
        style={{ padding: "6rem 2rem", borderTop: `1px solid ${t.borderF}` }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <h2
              style={{
                fontSize: "2.25rem",
                fontWeight: "800",
                marginBottom: "1rem",
                color: t.heading,
              }}
            >
              How It <span className="gradient-text">Works</span>
            </h2>
            <p style={{ color: t.body, fontSize: "1.1rem" }}>
              Three simple steps to modernise your attendance workflow
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "2rem",
            }}
          >
            {[
              {
                step: "01",
                title: "Sign In",
                desc: "Log in with your university credentials. You'll be automatically directed to your role-specific portal.",
                icon: <KeyIcon size={28} className="text-blue-400" />,
              },
              {
                step: "02",
                title: "Track & Manage",
                desc: "Admins manage the system, staff mark attendance during lectures, and students view their schedule.",
                icon: <ClipboardIcon size={28} className="text-emerald-400" />,
              },
              {
                step: "03",
                title: "Analyse & Report",
                desc: "View real-time analytics, monitor attendance trends, and export comprehensive reports as CSV.",
                icon: <TrendUpIcon size={28} className="text-cyan-400" />,
              },
            ].map((item, i) => (
              <div
                key={i}
                className="glass-card"
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    fontSize: "3rem",
                    fontWeight: "900",
                    color: "#3468bb",
                    marginBottom: "1rem",
                  }}
                >
                  {item.step}
                </div>
                <div
                  style={{
                    marginBottom: "0.75rem",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  {item.icon}
                </div>
                <h3
                  style={{
                    fontSize: "1.15rem",
                    fontWeight: "700",
                    marginBottom: "0.75rem",
                    color: t.heading,
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    color: t.body,
                    fontSize: "0.9rem",
                    lineHeight: "1.6",
                  }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CTA Section ========== */}
      <section style={{ padding: "6rem 2rem", textAlign: "center" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h2
            style={{
              fontSize: "2rem",
              fontWeight: "800",
              marginBottom: "1rem",
              color: t.heading,
            }}
          >
            Ready to Get Started?
          </h2>
          <p
            style={{ color: t.body, fontSize: "1.05rem", marginBottom: "2rem" }}
          >
            Log in to access your personalised attendance portal.
          </p>
          <Link
            to="/login"
            className="btn btn-primary btn-lg"
            style={{ textDecoration: "none" }}
          >
            Sign In to Your Portal
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: "2rem",
          borderTop: `1px solid ${t.borderF}`,
          textAlign: "center",
        }}
      >
        <p style={{ color: t.muted, fontSize: "0.85rem" }}>
          &copy; {new Date().getFullYear()} MiSched — Smart University
          Attendance. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default Home;
