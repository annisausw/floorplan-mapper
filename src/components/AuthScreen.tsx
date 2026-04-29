/**
 * @file Authentication Screen Component
 * @description Login and registration UI component
 */

import React, { useState } from "react";
import { apiService } from "../services/APIService";
import { SessionManager } from "../services/SessionManager";

interface AuthScreenProps {
  onLogin: (username: string) => void;
}

/**
 * AuthScreen Component
 * Handles user authentication (login and registration)
 */
export function AuthScreen({ onLogin }: AuthScreenProps) {
  const [isReg, setIsReg] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      const response = isReg
        ? await apiService.register({ username, password })
        : await apiService.login({ username, password });

      if (isReg) {
        setIsReg(false);
        setError("Registration successful! Please login.");
        setPassword("");
      } else {
        SessionManager.setToken(response.token);
        SessionManager.setUser(response.username);
        onLogin(response.username);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background:
          "linear-gradient(145deg, #0f1c26 0%, #1a2f40 40%, #243b55 100%)",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.04,
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div
        style={{
          position: "relative",
          background: "rgba(255,255,255,0.97)",
          borderRadius: 20,
          padding: "44px 48px",
          width: 420,
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "linear-gradient(135deg, #1a6fad, #2ecc71)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              margin: "0 auto 14px",
              boxShadow: "0 8px 24px rgba(26,111,173,0.4)",
            }}
          >
            🗺️
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 800,
              color: "#0f1c26",
            }}
          >
            Floorplan Mapper
          </h2>
        </div>

        {/* Tab Toggle */}
        <div
          style={{
            display: "flex",
            background: "#f1f5f9",
            borderRadius: 10,
            padding: 4,
            marginBottom: 24,
          }}
        >
          {(["Sign In", "Register"] as const).map((label, i) => {
            const active = isReg === (i === 1);
            return (
              <button
                key={label}
                onClick={() => {
                  setIsReg(i === 1);
                  setError("");
                }}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  border: "none",
                  borderRadius: 7,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 13,
                  transition: "all 0.2s",
                  background: active ? "white" : "transparent",
                  color: active ? "#1a6fad" : "#64748b",
                  boxShadow: active ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              background: "#fff5f5",
              color: "#b91c1c",
              padding: "10px 14px",
              borderRadius: 8,
              marginBottom: 18,
              fontSize: 13,
              borderLeft: "3px solid #ef4444",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Username Input */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 700,
              color: "#475569",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={{
              width: "100%",
              padding: "11px 14px",
              border: "2px solid #e2e8f0",
              borderRadius: 10,
              fontSize: 14,
              outline: "none",
            }}
          />
        </div>

        {/* Password Input */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 700,
              color: "#475569",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={{
              width: "100%",
              padding: "11px 14px",
              border: "2px solid #e2e8f0",
              borderRadius: 10,
              fontSize: 14,
              outline: "none",
            }}
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          style={{
            width: "100%",
            padding: "13px",
            marginTop: 8,
            background: "linear-gradient(135deg, #1a6fad, #1558a0)",
            color: "white",
            border: "none",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {isReg ? "✨ Create Account" : "→ Sign In"}
        </button>
      </div>
    </div>
  );
}
