import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, GraduationCap, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useStudentSession } from "../hooks/useStudentSession";

const DEFAULT_CREDS = { username: "odg_admin", password: "odg2024" };

function getStoredCreds(): { username: string; password: string } {
  try {
    const raw = localStorage.getItem("odg_secret_creds");
    if (raw) {
      const parsed = JSON.parse(raw) as { username: string; password: string };
      if (parsed.username && parsed.password) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_CREDS;
}

export default function Login() {
  const { login, isLoggingIn, identity } = useInternetIdentity();
  const { studentSession } = useStudentSession();
  const navigate = useNavigate();

  // Hidden admin trigger
  const [tapCount, setTapCount] = useState(0);
  const lastTapTimeRef = useRef<number>(0);
  const [showSecretForm, setShowSecretForm] = useState(false);
  const [showIIButton, setShowIIButton] = useState(false);
  const [secretUsername, setSecretUsername] = useState("");
  const [secretPassword, setSecretPassword] = useState("");
  const [showSecretPw, setShowSecretPw] = useState(false);
  const [credError, setCredError] = useState("");
  const [wrongAttempts, setWrongAttempts] = useState(0);

  // Redirect if already logged in
  useEffect(() => {
    if (studentSession || identity) {
      void navigate({ to: "/" });
    }
  }, [studentSession, identity, navigate]);

  useEffect(() => {
    if (identity) {
      setShowSecretForm(false);
      setShowIIButton(false);
    }
  }, [identity]);

  function handleLogoTap() {
    const now = Date.now();
    if (now - lastTapTimeRef.current > 3000) {
      setTapCount(1);
    } else {
      setTapCount((prev) => prev + 1);
    }
    lastTapTimeRef.current = now;

    if (tapCount + 1 >= 5) {
      setShowSecretForm(true);
      setTapCount(0);
      setCredError("");
      setWrongAttempts(0);
    }
  }

  function handleSecretSubmit() {
    const stored = getStoredCreds();
    if (
      secretUsername === stored.username &&
      secretPassword === stored.password
    ) {
      setShowSecretForm(false);
      setShowIIButton(true);
      setCredError("");
      setWrongAttempts(0);
    } else {
      const newAttempts = wrongAttempts + 1;
      setWrongAttempts(newAttempts);
      if (newAttempts >= 3) {
        setShowSecretForm(false);
        setShowIIButton(false);
        setTapCount(0);
        setCredError("");
        setWrongAttempts(0);
      } else {
        setCredError("Invalid credentials");
      }
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          "linear-gradient(160deg, oklch(0.22 0.08 255) 0%, oklch(0.18 0.12 265) 50%, oklch(0.14 0.06 260) 100%)",
      }}
    >
      {/* Header with animated logo */}
      <div className="flex flex-col items-center pt-16 pb-10 px-6">
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: hidden admin tap trigger */}
        <div
          className="relative mb-8 cursor-default select-none"
          onClick={handleLogoTap}
        >
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.5 0.2 255), oklch(0.42 0.22 270))",
              boxShadow:
                "0 0 0 8px oklch(0.5 0.2 255 / 0.15), 0 0 0 16px oklch(0.5 0.2 255 / 0.07), 0 8px 32px oklch(0.5 0.2 255 / 0.4)",
              animation: "logoPulse 2.8s ease-in-out infinite",
            }}
          >
            <GraduationCap className="h-12 w-12 text-white" />
          </div>
        </div>
        <h1 className="font-display text-3xl font-bold text-white tracking-tight mb-2">
          OdiGyan
        </h1>
        <p className="text-blue-200 text-sm text-center max-w-xs">
          Odisha's Rising Learning Platform
        </p>
      </div>

      {/* Card */}
      <div
        className="mx-4 mb-6 rounded-3xl bg-white p-6 shadow-2xl"
        style={{ boxShadow: "0 32px 80px oklch(0.1 0.08 260 / 0.5)" }}
      >
        {!showSecretForm && !showIIButton && (
          <div className="space-y-5" data-ocid="login.panel">
            <div className="text-center">
              <h2 className="font-bold text-xl text-gray-900 mb-1">
                Welcome Back
              </h2>
              <p className="text-sm text-gray-500">
                Sign in with your Internet Identity to continue
              </p>
            </div>

            <Button
              className="w-full h-13 text-base font-semibold rounded-xl gap-2"
              style={{
                height: "52px",
                background:
                  "linear-gradient(135deg, oklch(0.45 0.2 255), oklch(0.38 0.22 265))",
              }}
              onClick={() => login()}
              disabled={isLoggingIn}
              data-ocid="login.primary_button"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <GraduationCap className="h-5 w-5" />
                  Sign in with Internet Identity
                </>
              )}
            </Button>

            <div className="bg-blue-50 rounded-2xl px-4 py-3">
              <p className="text-xs text-blue-700 leading-relaxed text-center">
                New to OdiGyan? Sign in with Internet Identity and you will be
                asked to complete your profile automatically.
              </p>
            </div>
          </div>
        )}

        {/* Hidden admin credentials form */}
        {showSecretForm && (
          <div className="space-y-4" data-ocid="login.dialog">
            <p className="text-xs text-gray-400 text-center mb-2">
              Admin Access
            </p>
            <Input
              type="text"
              placeholder="Username"
              value={secretUsername}
              onChange={(e) => setSecretUsername(e.target.value)}
              className="h-11 rounded-xl"
              autoComplete="off"
              data-ocid="login.input"
            />
            <div className="relative">
              <Input
                type={showSecretPw ? "text" : "password"}
                placeholder="Password"
                value={secretPassword}
                onChange={(e) => setSecretPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSecretSubmit()}
                className="h-11 rounded-xl pr-11"
                autoComplete="off"
                data-ocid="login.input"
              />
              <button
                type="button"
                onClick={() => setShowSecretPw((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                tabIndex={-1}
              >
                {showSecretPw ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {credError && (
              <p className="text-red-500 text-xs" data-ocid="login.error_state">
                {credError}
              </p>
            )}
            <Button
              className="w-full h-11 rounded-xl"
              onClick={handleSecretSubmit}
              data-ocid="login.submit_button"
            >
              Continue
            </Button>
          </div>
        )}

        {/* Internet Identity button after creds verified */}
        {showIIButton && (
          <div data-ocid="login.modal">
            <Button
              className="w-full h-12 text-base gap-2 rounded-xl"
              onClick={() => login()}
              disabled={isLoggingIn}
              data-ocid="login.primary_button"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <GraduationCap className="h-4 w-4" />
                  Sign In with Identity
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center pb-10">
        <p className="text-white/30 text-xs">
          OdiGyan — Odisha's Rising Learning Platform
        </p>
      </div>

      <style>{`
        @keyframes logoPulse {
          0%, 100% {
            box-shadow: 0 0 0 8px oklch(0.5 0.2 255 / 0.15), 0 0 0 16px oklch(0.5 0.2 255 / 0.07), 0 8px 32px oklch(0.5 0.2 255 / 0.4);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 0 12px oklch(0.55 0.22 260 / 0.2), 0 0 0 24px oklch(0.55 0.22 260 / 0.08), 0 12px 48px oklch(0.5 0.2 255 / 0.55);
            transform: scale(1.04);
          }
        }
      `}</style>
    </div>
  );
}
