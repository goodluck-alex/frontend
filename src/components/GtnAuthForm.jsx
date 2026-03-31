"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { login, register, logout, completeLogin2fa } from "@/services/authService";
import axios from "@/services/api";
import { SKIP_KEY } from "@/lib/findFriendsOnboarding";
import {
  captureReferralFromCurrentUrl,
  clearStoredReferralAttribution,
  getOrCreateDeviceKey,
  getStoredReferralAttribution,
  logReferralClickHttp,
} from "@/lib/referralAttribution";
import SmartKeyboard from "@/components/SmartKeyboard";
import { IoEyeOutline, IoEyeOffOutline } from "react-icons/io5";

/**
 * @param {{ variant?: "page" | "embedded" }} props
 * - page: full-screen login route (forces body.dark, auth-root background)
 * - embedded: hero / inline (dark auth card only)
 */
export default function GtnAuthForm({ variant = "page" }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mode, setMode] = useState("login");
  const [postAuthIntent, setPostAuthIntent] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [keyboardMode, setKeyboardMode] = useState("lower");
  const [activeField, setActiveField] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [referrerRef, setReferrerRef] = useState(null);
  const [loginStep, setLoginStep] = useState(/** @type {"password"|"2fa"} */ ("password"));
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [totpCode, setTotpCode] = useState("");

  useEffect(() => {
    if (variant !== "page") return undefined;
    document.body.classList.add("dark");
    return () => document.body.classList.remove("dark");
  }, [variant]);

  /** Read query only on the client — avoids Next.js useSearchParams() SSR/client HTML mismatches. */
  const syncFromUrl = useCallback(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "signup") setMode("signup");

    const urlRef = params.get("ref")?.trim();
    if (urlRef) {
      captureReferralFromCurrentUrl();
      setReferrerRef(urlRef);
      void logReferralClickHttp(urlRef, params.get("src")?.trim() || "link", params.get("meta")?.trim() || "");
    } else {
      const stored = getStoredReferralAttribution();
      if (stored?.ref) setReferrerRef(String(stored.ref));
    }
    setHasSession(Boolean(localStorage.getItem("gtn_token")));
  }, []);

  useEffect(() => {
    syncFromUrl();
  }, [pathname, syncFromUrl]);

  useEffect(() => {
    setInfo("");
  }, [mode]);

  useEffect(() => {
    if (mode !== "login") {
      setLoginStep("password");
      setTwoFactorToken("");
      setTotpCode("");
    }
  }, [mode]);

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const openKeyboardForField = (field) => {
    setActiveField(field);
    setShowKeyboard(true);
    setKeyboardMode("lower");
  };

  const allowedModesForField = () => {
    if (activeField === "name") return ["lower", "upper", "symbols", "numbers"];
    if (activeField === "email") return ["lower", "upper", "symbols", "numbers"];
    if (activeField === "password") return ["lower", "upper", "symbols", "numbers"];
    return ["lower", "upper", "symbols", "numbers"];
  };

  const applyChar = (field, char) => {
    const current = form[field] || "";
    if (field === "email") {
      let next = current + char;
      next = next.replace(/[^a-zA-Z0-9@._%+\-]/g, "");
      return next.slice(0, 80);
    }
    if (field === "name") {
      let next = current + char;
      next = next.replace(/[^a-zA-Z0-9 _\-']/g, "");
      return next.slice(0, 60);
    }
    if (field === "password") {
      return (current + char).slice(0, 80);
    }
    return current;
  };

  const handleKeyboardPress = (key) => {
    if (!activeField) return;

    if (key === "BACK") {
      setForm((prev) => ({ ...prev, [activeField]: (prev[activeField] || "").slice(0, -1) }));
      return;
    }

    if (key === "SPACE") return;
    if (key === "SEND") return;

    if (typeof key !== "string") return;
    if (key.length !== 1 && key !== "@") return;

    setForm((prev) => ({ ...prev, [activeField]: applyChar(activeField, key) }));
  };

  const handleSignOut = () => {
    logout();
    setHasSession(false);
    setError("");
    setInfo("");
    setForm({ name: "", email: "", password: "" });
    setLoginStep("password");
    setTwoFactorToken("");
    setTotpCode("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      if (mode === "login" && loginStep === "2fa") {
        await completeLogin2fa(twoFactorToken, totpCode);
        setPostAuthIntent("login");
        setHasSession(true);
        setLoginStep("password");
        setTwoFactorToken("");
        setTotpCode("");
      } else if (mode === "login") {
        const out = await login(form.email.trim(), form.password);
        if (out?.twoFactorRequired && out?.twoFactorToken) {
          setTwoFactorToken(out.twoFactorToken);
          setLoginStep("2fa");
          setTotpCode("");
          setInfo("Enter the 6-digit code from your authenticator app, or a backup code.");
        } else {
          setPostAuthIntent("login");
          setHasSession(true);
        }
      } else {
        const email = form.email.trim().toLowerCase();
        if (!email) throw new Error("Enter your email.");
        if (!form.name.trim()) throw new Error("Enter your name.");
        const attr = getStoredReferralAttribution();
        const effectiveRef = referrerRef || (attr?.ref ? String(attr.ref) : "");
        const payload = {
          name: form.name.trim(),
          password: form.password,
          email,
          deviceKey: getOrCreateDeviceKey(),
        };
        if (effectiveRef) {
          payload.ref = effectiveRef;
          payload.referralSource = attr?.src || "recovery";
          payload.referralSourceMeta = attr?.meta || undefined;
          if (attr?.clickedAt) {
            payload.referralClickedAt = new Date(Number(attr.clickedAt)).toISOString();
          }
        }
        await register(payload);
        clearStoredReferralAttribution();
        setPostAuthIntent("signup");
        setHasSession(true);
      }
      setShowKeyboard(false);
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasSession) return;
    let canceled = false;
    (async () => {
      try {
        if (postAuthIntent === "signup") {
          router.push("/find-friends?new=1");
          return;
        }
        const me = await axios.get("/users/me", { timeoutMs: 20000 });
        if (canceled) return;
        const hasChats = Boolean(me.data?.hasChats);
        const skipped = typeof window !== "undefined" && window.localStorage.getItem(SKIP_KEY) === "1";
        if (hasChats) router.push("/dashboard?tab=dial");
        else if (!skipped) router.push("/find-friends?first=1");
        else router.push("/dashboard");
      } catch (e) {
        if (canceled) return;
        logout();
        setHasSession(false);
        setError(
          e?.message ||
            "Signed in but could not load your account. Check that the API is running, then try again."
        );
      }
    })();
    return () => {
      canceled = true;
    };
  }, [hasSession, postAuthIntent, router]);

  const outerClass = variant === "page" ? "auth-root" : "auth-embedded";

  return (
    <div className={outerClass}>
      <div className="auth-card">
        {hasSession && (
          <div className="auth-session-bar">
            <button type="button" className="auth-signout" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        )}

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === "login" ? "auth-tab active" : "auth-tab"}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === "signup" ? "auth-tab active" : "auth-tab"}
            onClick={() => setMode("signup")}
          >
            Sign Up
          </button>
        </div>

        <h2 className="auth-title">
          {mode === "login" && loginStep === "2fa"
            ? "Two-factor authentication"
            : mode === "login"
              ? "Welcome back"
              : "Create your GTN account"}
        </h2>

        {error && <div className="auth-error">{error}</div>}
        {info && <div className="auth-info">{info}</div>}

        <form onSubmit={submit} className="auth-form">
          {mode === "login" && loginStep === "2fa" ? (
            <>
              <p className="auth-hint" style={{ margin: "0 0 12px", fontSize: "0.88rem", color: "#94a3b8" }}>
                Authenticator code (6 digits) or one of your saved backup codes.
              </p>
              <div className="auth-field">
                <label htmlFor="gtn-totp-code">Verification code</label>
                <input
                  id="gtn-totp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\s/g, "").slice(0, 32))}
                  placeholder="123456 or backup code"
                  required
                />
              </div>
              <button
                type="button"
                className="auth-submit auth-submit--secondary"
                style={{ marginBottom: 8, background: "transparent", border: "1px solid #475569", color: "#cbd5e1" }}
                onClick={() => {
                  setLoginStep("password");
                  setTwoFactorToken("");
                  setTotpCode("");
                  setError("");
                  setInfo("");
                }}
              >
                Back to password
              </button>
            </>
          ) : (
            <>
              {mode === "signup" && (
                <>
                  <div className="auth-field">
                    <label>Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={handleChange("email")}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      onFocus={() => openKeyboardForField("email")}
                    />
                  </div>
                  <div className="auth-field">
                    <label>Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={handleChange("name")}
                      required
                      autoComplete="name"
                      onFocus={() => openKeyboardForField("name")}
                    />
                  </div>
                </>
              )}

              {mode === "login" && (
                <div className="auth-field">
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={handleChange("email")}
                    required
                    autoComplete="email"
                    onFocus={() => openKeyboardForField("email")}
                  />
                </div>
              )}

              <div className="auth-field">
                <label>Password</label>
                <div className="auth-password-row">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange("password")}
                    required
                    minLength={6}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    onFocus={() => openKeyboardForField("password")}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setShowKeyboard(false);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <IoEyeOffOutline size={22} /> : <IoEyeOutline size={22} />}
                  </button>
                </div>
              </div>
            </>
          )}

          <button type="submit" disabled={loading} className="auth-submit">
            {loading
              ? "Please wait…"
              : mode === "login" && loginStep === "2fa"
                ? "Verify & sign in"
                : mode === "login"
                  ? "Login"
                  : "Create account"}
          </button>
        </form>

        {showKeyboard && (
          <div className="auth-keyboard-wrap">
            <SmartKeyboard
              keyboardMode={keyboardMode}
              onChangeMode={setKeyboardMode}
              onKeyPress={handleKeyboardPress}
              showModeTabs
              allowedModes={allowedModesForField()}
              showSpaceButton={activeField !== "password"}
              showSendButton={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
