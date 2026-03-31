"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  IoSyncOutline,
  IoListOutline,
  IoSearchOutline,
  IoArrowForwardOutline,
  IoRefreshOutline,
  IoOpenOutline,
  IoLogInOutline,
} from "react-icons/io5";
import axios from "@/services/api";
import ReferralInviteShare from "@/components/ReferralInviteShare";
import { buildSignupInviteAbsoluteUrl } from "@/lib/referralAttribution";
import { clearSkippedFindFriends, setSkippedFindFriends } from "@/lib/findFriendsOnboarding";
import { canUseContactPicker, flattenPickerContacts } from "@/lib/contactsPicker";
import { mergeMatchIntoStore } from "@/lib/contactsStorage";
import styles from "./find-friends.module.css";

function parseManualPhones(text) {
  const lines = text.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
  return lines.map((phone) => ({ name: "", phone }));
}

function LoadingBlock() {
  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={styles.spinner} aria-busy="true" aria-label="Loading" />
      </div>
    </div>
  );
}

function FindFriendsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNewUser = searchParams.get("new") === "1";
  const isFirstLogin = searchParams.get("first") === "1";

  const [loadingMe, setLoadingMe] = useState(true);
  const [authError, setAuthError] = useState("");
  const [me, setMe] = useState(null);

  const [step, setStep] = useState("intro");
  const [pickerSupported, setPickerSupported] = useState(false);
  const [manualText, setManualText] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const [onGtn, setOnGtn] = useState([]);
  const [notOnGtn, setNotOnGtn] = useState([]);

  const loadMe = useCallback(async () => {
    setLoadingMe(true);
    setAuthError("");
    try {
      const res = await axios.get("/users/me");
      setMe(res.data);
    } catch {
      setAuthError("auth_required");
    } finally {
      setLoadingMe(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  useEffect(() => {
    setPickerSupported(canUseContactPicker());
  }, []);

  useEffect(() => {
    if (error) console.warn("[GTN find-friends]", error);
  }, [error]);

  useEffect(() => {
    if (authError) console.warn("[GTN find-friends]", authError);
  }, [authError]);

  const refCode = me?.referralCode ?? me?.subscriberId;
  const inviteLink =
    typeof window !== "undefined" && refCode != null && String(refCode).trim() !== ""
      ? buildSignupInviteAbsoluteUrl(refCode, { source: "find_friends", meta: "match_results" })
      : "";

  const runMatch = async (entries) => {
    if (!entries.length) {
      setError("no_numbers");
      return;
    }
    setSyncing(true);
    setError("");
    try {
      const res = await axios.post("/users/contacts/match", { contacts: entries });
      setOnGtn(res.data?.onGtn || []);
      setNotOnGtn(res.data?.notOnGtn || []);
      mergeMatchIntoStore(res.data?.onGtn || [], res.data?.notOnGtn || []);
      setStep("results");
    } catch (e) {
      setError(e.message || "match_failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleAllowContacts = async () => {
    if (!canUseContactPicker()) {
      setShowManual(true);
      setError("picker_unavailable");
      return;
    }
    setSyncing(true);
    setError("");
    try {
      const selected = await navigator.contacts.select(["name", "tel"], { multiple: true });
      const entries = flattenPickerContacts(selected);
      await runMatch(entries);
    } catch (e) {
      if (e?.name === "AbortError" || e?.name === "NotAllowedError") {
        setError("contacts_denied");
        setShowManual(true);
      } else {
        setError(e?.message || "contacts_read_failed");
        setShowManual(true);
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleManualMatch = async () => {
    const entries = parseManualPhones(manualText);
    await runMatch(entries);
  };

  if (loadingMe) {
    return <LoadingBlock />;
  }

  if (authError || !me?.dbId) {
    return (
      <div className={styles.root}>
        <div className={styles.card}>
          <span className="sr-only" role="alert">
            {authError}
          </span>
          <Link
            href="/login"
            className={styles.btnPrimary}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
            aria-label="Sign in"
          >
            <IoLogInOutline size={24} aria-hidden />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        {isNewUser && (
          <span className="sr-only" aria-live="polite">
            Welcome
          </span>
        )}
        {isFirstLogin && !isNewUser && (
          <span className="sr-only" aria-live="polite">
            Get started
          </span>
        )}
        <h1 className="sr-only">Find friends</h1>

        {step === "intro" && (
          <>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={handleAllowContacts}
              disabled={syncing}
              aria-label="Sync contacts"
            >
              {syncing ? <span className={styles.btnSpinner} aria-hidden /> : <IoSyncOutline size={24} aria-hidden />}
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => setShowManual((v) => !v)}
              aria-label={showManual ? "Hide manual entry" : "Enter numbers manually"}
            >
              <IoListOutline size={22} aria-hidden />
            </button>
            {(showManual || !pickerSupported) && (
              <>
                <textarea
                  className={styles.textarea}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder={"+256700000000\n+254700000000"}
                  aria-label="Phone numbers"
                />
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={handleManualMatch}
                  disabled={syncing || !manualText.trim()}
                  aria-label="Find matches"
                >
                  {syncing ? <span className={styles.btnSpinner} aria-hidden /> : <IoSearchOutline size={24} aria-hidden />}
                </button>
              </>
            )}
            {error && (
              <div className={styles.errorDot} role="alert">
                <span className="sr-only">{error}</span>
              </div>
            )}
            <div className={styles.skipRow}>
              <button
                type="button"
                className={styles.skipLink}
                onClick={() => {
                  setSkippedFindFriends();
                  router.push("/dashboard");
                }}
                aria-label="Skip"
              >
                <IoArrowForwardOutline size={22} aria-hidden />
              </button>
            </div>
          </>
        )}

        {step === "results" && (
          <>
            <p className="sr-only">
              On GTN ({onGtn.length})
            </p>
            {onGtn.length === 0 ? (
              <div className={styles.emptyPad} aria-hidden />
            ) : (
              <ul className={styles.list}>
                {onGtn.map((u) => (
                  <li key={u.id} className={styles.row}>
                    <div>
                      <div className={styles.name}>{u.name}</div>
                      <div className={styles.meta}>{u.phone}</div>
                    </div>
                    <Link
                      href="/dashboard"
                      className={styles.inviteBtn}
                      style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                      aria-label="Open app"
                    >
                      <IoOpenOutline size={20} aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <p className="sr-only">
              Not on GTN ({notOnGtn.length})
            </p>
            {notOnGtn.length === 0 ? (
              <div className={styles.emptyPad} aria-hidden />
            ) : (
              <ul className={styles.list}>
                {notOnGtn.map((x) => (
                  <li key={x.phone} className={styles.row}>
                    <div>
                      <div className={styles.name}>{x.name || "—"}</div>
                      <div className={styles.meta}>{x.phone}</div>
                    </div>
                    <div className={styles.inviteRowActions}>
                      <ReferralInviteShare
                        refCode={refCode}
                        source="find_friends"
                        meta="not_on_gtn_row"
                        layout="rowIcons"
                        className={styles.inviteRowShare}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <input
              type="text"
              readOnly
              value={inviteLink || ""}
              className={styles.textarea}
              style={{ minHeight: "2.5rem", fontSize: "0.75rem" }}
              aria-label="Invite link"
            />
            {refCode != null && String(refCode).trim() !== "" ? (
              <ReferralInviteShare refCode={refCode} source="find_friends" meta="match_results" layout="bar" />
            ) : null}

            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => {
                clearSkippedFindFriends();
                router.push("/dashboard");
              }}
              aria-label="Continue"
            >
              <IoArrowForwardOutline size={24} aria-hidden />
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => {
                setStep("intro");
                setOnGtn([]);
                setNotOnGtn([]);
                setError("");
                setManualText("");
              }}
              aria-label="Sync again"
            >
              <IoRefreshOutline size={22} aria-hidden />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function FindFriendsPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <FindFriendsContent />
    </Suspense>
  );
}
