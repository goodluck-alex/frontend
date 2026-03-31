"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "@/services/api";
import { createOrInitiatePayment, getPaymentMethods, getPaymentStatus } from "@/services/paymentApi";
import { useLocalizedUsdPrice } from "@/hooks/useLocalizedUsdPrice";

const DEFAULT_PLANS = [
  { id: "free", name: "Free Plan", price: 0, dailyMinutes: 5, durationHours: null, unlimited: false },
  { id: "daily", name: "Daily Unlimited", price: 0.25, durationHours: 24, unlimited: true },
  { id: "weekly", name: "Weekly Unlimited", price: 1.5, durationHours: 24 * 7, unlimited: true },
  { id: "monthly", name: "Monthly Unlimited", price: 5, durationHours: 24 * 30, unlimited: true },
];

function LocalizedPlanPrice({ usd }) {
  const { primary, secondary } = useLocalizedUsdPrice(usd);
  return (
    <span>
      {primary} {secondary ? <span className="plans-muted">{secondary}</span> : null}
    </span>
  );
}

function makeIdempotencyKey() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `gtn-pay-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function formatExpiresIn(iso) {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms)) return "";
  if (ms <= 0) return "Expired";
  const totalMins = Math.floor(ms / 60000);
  const d = Math.floor(totalMins / (60 * 24));
  const h = Math.floor((totalMins - d * 24 * 60) / 60);
  const m = totalMins - d * 24 * 60 - h * 60;
  if (d > 0) return `${d}d ${h}h`;
  return `${h}h ${m}m`;
}

export default function Plans({ user }) {
  const router = useRouter();
  const isAuthed = Boolean(user?.dbId);
  const [nowTick, setNowTick] = useState(0);
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [subHistory, setSubHistory] = useState([]);
  const [busyPlanId, setBusyPlanId] = useState(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [payPlan, setPayPlan] = useState(null);
  const [payProvider, setPayProvider] = useState("MTN");
  const [payMethod, setPayMethod] = useState("mobile_money"); // mobile_money | crypto | card
  const [payPhone, setPayPhone] = useState("");
  const [payBusy, setPayBusy] = useState(false);
  const [payPendingId, setPayPendingId] = useState(null);
  const [payPendingProvider, setPayPendingProvider] = useState(null);
  const [payIdemKey, setPayIdemKey] = useState("");
  const [cryptoInfo, setCryptoInfo] = useState(null);
  const [txHash, setTxHash] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [payStage, setPayStage] = useState("idle"); // idle | awaiting_action | pending | confirmed | failed
  const [methods, setMethods] = useState([]); // [{ method, providers: [{id,...}] }]

  const payPlanUsdPrice = Number(payPlan?.price || 0);
  const displayPayPlanPrice = useLocalizedUsdPrice(payPlanUsdPrice);

  useEffect(() => {
    // Keep expiry countdown fresh (otherwise useMemo only updates when user changes).
    const t = window.setInterval(() => setNowTick((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const active = useMemo(() => {
    const planId = user?.planId || "free";
    const planExpiry = user?.planExpiry || null;
    const planUnlimited = Boolean(user?.planUnlimited);
    const planName = user?.planName || (planId === "free" ? "Free Plan" : "Plan");
    const expiresIn = planExpiry ? formatExpiresIn(planExpiry) : "";
    const expired = planExpiry ? new Date(planExpiry).getTime() <= Date.now() : false;
    return { planId, planName, planUnlimited, planExpiry, expiresIn, expired };
  }, [user?.planExpiry, user?.planId, user?.planName, user?.planUnlimited, nowTick]);

  useEffect(() => {
    if (!isAuthed) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get("/plans");
        if (!cancelled && Array.isArray(res.data?.plans)) setPlans(res.data.plans);
        if (!cancelled && Array.isArray(res.data?.history)) setSubHistory(res.data.history);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load plans");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthed]);

  const openPay = (plan) => {
    setError("");
    setInfo("");
    setPayPlan(plan);
    // defaults will be selected after loading enabled methods/providers
    setPayMethod("mobile_money");
    setPayProvider("");
    setPayPhone("");
    setCryptoInfo(null);
    setTxHash("");
    setCheckoutUrl("");
    setPayIdemKey(makeIdempotencyKey());
    setPayStage("idle");
    setPayOpen(true);
  };

  useEffect(() => {
    if (!payOpen || !isAuthed) return;
    let cancelled = false;
    (async () => {
      try {
        const out = await getPaymentMethods({
          country: user?.countryIso || "",
          // Do NOT filter by local currency; we want method categories (mobile money/crypto/card)
          // even when they settle in different currencies (e.g. crypto USDT).
          currency: "",
        });
        const list = Array.isArray(out?.methods) ? out.methods : [];
        if (!cancelled) {
          setMethods(list);
          // pick first enabled method/provider
          const firstMethod = list?.[0]?.method || "mobile_money";
          const firstProvider = String(list?.[0]?.providers?.[0]?.id || "").toUpperCase();
          setPayMethod((m) => (list.some((x) => x.method === m) ? m : firstMethod));
          setPayProvider((p) => (firstProvider ? (p && list.some((x) => x.providers?.some((pp) => String(pp.id).toUpperCase() === String(p).toUpperCase())) ? p : firstProvider) : p));
        }
      } catch (e) {
        if (!cancelled) setMethods([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [payOpen, isAuthed, user?.countryIso, user?.currencyCode]);

  const providersForSelectedMethod = useMemo(() => {
    const row = methods.find((m) => m.method === payMethod);
    const providers = Array.isArray(row?.providers) ? row.providers : [];
    return providers;
  }, [methods, payMethod]);

  // Keep modal state consistent when switching methods/providers.
  useEffect(() => {
    if (!payOpen) return;
    const providers = providersForSelectedMethod;
    if (providers.length > 0 && !providers.some((p) => p.id === payProvider)) {
      setPayProvider(String(providers[0].id || "").toUpperCase());
    }
    if (payMethod !== "mobile_money") setPayPhone("");
    if (payMethod !== "crypto") {
      setCryptoInfo(null);
      setTxHash("");
    }
    if (payMethod !== "card") setCheckoutUrl("");
    setPayStage("idle");
  }, [payMethod, payOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const payNow = async () => {
    if (!isAuthed) return;
    setError("");
    setInfo("");
    if (!payPlan?.id) {
      setError("Select a plan.");
      return;
    }
    if (payMethod === "mobile_money" && !payPhone.trim()) {
      setError("Enter phone number.");
      return;
    }
    setPayBusy(true);
    setPayStage("pending");
    try {
      const data = await createOrInitiatePayment(
        {
          planId: payPlan.id,
          paymentMethod: payMethod,
          provider: payProvider,
          phone: payMethod === "mobile_money" ? payPhone.trim() : undefined,
          country: user?.countryIso || "",
          currency: payMethod === "crypto" ? "USDT" : user?.currencyCode || "",
          idempotencyKey: payIdemKey || makeIdempotencyKey(),
        },
        {
          headers: {
            "Idempotency-Key": payIdemKey || makeIdempotencyKey(),
          },
        }
      );
      setInfo(data?.message || "Payment initiated.");
      setCryptoInfo(data?.metadata?.crypto || data?.crypto || null);
      setCheckoutUrl(String(data?.checkoutUrl || ""));
      setPayPendingId(data?.paymentId || null);
      setPayPendingProvider(payProvider);
      setPayStage(payMethod === "crypto" || payMethod === "card" ? "awaiting_action" : "awaiting_action");
      // Refresh user profile so header updates (if activation happened immediately in dev)
      try {
        const me = await axios.get("/users/me");
        window.dispatchEvent(new CustomEvent("gtn-user-updated", { detail: { ...me.data } }));
      } catch {
        // ignore
      }
      // Refresh plan history
      try {
        const latest = await axios.get("/plans");
        if (Array.isArray(latest.data?.plans)) setPlans(latest.data.plans);
        if (Array.isArray(latest.data?.history)) setSubHistory(latest.data.history);
      } catch {
        // ignore
      }
    } catch (e) {
      setError(e.message || "Payment failed");
      setPayStage("failed");
    } finally {
      setPayBusy(false);
    }
  };

  const confirmCryptoPaid = async () => {
    if (!payPendingId) return;
    setError("");
    setInfo("");
    try {
      const res = await axios.post(`/payment/confirm/${encodeURIComponent(payPendingId)}`, {
        txHash: txHash.trim() || undefined,
      });
      const out = res?.data?.data || res?.data || {};
      const status = String(out?.status || "").toLowerCase();
      if (status === "succeeded") {
        setInfo("Payment confirmed. Plan activated.");
        setCryptoInfo(null);
        setTxHash("");
        setPayStage("confirmed");
      } else if (status === "expired") {
        setError("Payment expired. Create a new payment and try again.");
        setPayStage("failed");
      } else {
        setInfo("Still pending. If you paid, wait a moment and try confirm again.");
        setPayStage("pending");
      }
    } catch (e) {
      setError(e?.message || "Could not confirm payment yet.");
      setPayStage("failed");
    }
  };

  // Optional: accept push updates (future webhook→ws bridge).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPush = (ev) => {
      const d = ev?.detail || {};
      if (!d?.paymentId || !payPendingId) return;
      if (String(d.paymentId) !== String(payPendingId)) return;
      const st = String(d.status || "").toLowerCase();
      if (st === "succeeded") {
        setInfo("Payment successful. Plan activated.");
        setPayPendingId(null);
        setPayStage("confirmed");
      } else if (st === "failed") {
        setError("Payment failed. Try again.");
        setPayPendingId(null);
        setPayStage("failed");
      } else {
        setPayStage("pending");
      }
    };
    window.addEventListener("gtn-payment-updated", onPush);
    return () => window.removeEventListener("gtn-payment-updated", onPush);
  }, [payPendingId]);

  useEffect(() => {
    if (!payPendingId) return;
    let cancelled = false;
    let tries = 0;
    const maxTries = 30; // ~90s at 3s interval

    const tick = async () => {
      tries += 1;
      try {
        const st = await getPaymentStatus(payPendingId);
        if (cancelled) return;
        const status = String(st?.status || "").toLowerCase();
        if (status === "succeeded") {
          setInfo("Payment successful. Plan activated.");
          setPayPendingId(null);
          setPayStage("confirmed");
          // refresh user + plans
          try {
            const me = await axios.get("/users/me");
            window.dispatchEvent(new CustomEvent("gtn-user-updated", { detail: { ...me.data } }));
          } catch {}
          try {
            const latest = await axios.get("/plans");
            if (Array.isArray(latest.data?.plans)) setPlans(latest.data.plans);
            if (Array.isArray(latest.data?.history)) setSubHistory(latest.data.history);
          } catch {}
          return;
        }
        if (status === "failed") {
          setError("Payment failed. Try again.");
          setPayPendingId(null);
          setPayStage("failed");
          return;
        }
        if (status === "pending") {
          setPayStage(payMethod === "crypto" ? "pending" : "awaiting_action");
        }
        if (tries >= maxTries) {
          setInfo("Payment is still pending. Check your phone and try again in a moment.");
          setPayPendingId(null);
          setPayStage("pending");
          return;
        }
      } catch {
        if (!cancelled && tries >= maxTries) {
          setInfo("Payment pending. If you approved it, wait a moment and refresh.");
          setPayPendingId(null);
          setPayStage("pending");
        }
      }
      if (!cancelled) window.setTimeout(tick, 3000);
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [payPendingId, payMethod]);

  if (!isAuthed) {
    return (
      <div className="phone-panel phone-panel-scroll plans-screen">
        <div className="plans-header">
          <div>
            <div className="plans-title">Plans</div>
            <div className="plans-subtitle">Choose your plan</div>
          </div>
        </div>
        <div className="plans-clean-muted">Sign in to view and upgrade plans.</div>
      </div>
    );
  }

  const free = plans.find((p) => p.id === "free") || DEFAULT_PLANS[0];
  const upgrades = plans.filter((p) => p.id !== "free");

  return (
    <div className="phone-panel phone-panel-scroll plans-screen">
      <div className="plans-header">
        <div>
          <div className="plans-title">Plans</div>
          <div className="plans-subtitle">Your calling access</div>
        </div>
      </div>

      {error && <div className="plans-clean-toast">{error}</div>}
      {info && <div className="plans-clean-toast">{info}</div>}
      {payPendingId && (
        <div className="plans-clean-toast">
          {payStage === "awaiting_action"
            ? `Awaiting user action (${payPendingProvider})…`
            : payStage === "confirmed"
              ? "Payment confirmed."
              : payStage === "failed"
                ? "Payment failed."
                : `Payment pending (${payPendingProvider})…`}
        </div>
      )}

      <div className="plans-card">
        <div className="plans-section-title">Your Current Plan</div>
        <div className="plans-current-name">{active.planId === "free" ? free.name : active.planName}</div>
        {active.planId === "free" ? (
          <div className="plans-current-meta">
            <div>{free.dailyMinutes} minutes daily</div>
            <div className="plans-muted">Resets every day</div>
          </div>
        ) : (
          <div className="plans-current-meta">
            <div className="plans-status-pill">Active</div>
            {active.expiresIn && !active.expired && (
              <div className="plans-muted">
                Expires in: <span className="plans-exp">{active.expiresIn}</span>
              </div>
            )}
            {active.expired ? <div className="plans-muted">Expired</div> : null}
          </div>
        )}
      </div>

      <div className="plans-card">
        <div className="plans-section-title">Upgrade Plan</div>
        <div className="plans-upgrades">
          {upgrades.map((p) => (
            <div key={p.id} className="plans-upgrade-row">
              <div className="plans-upgrade-left">
                <div className="plans-upgrade-name">{p.name}</div>
                <div className="plans-upgrade-price">
                  <LocalizedPlanPrice usd={Number(p.price || 0)} />
                </div>
                <div className="plans-muted">Unlimited GTN calls</div>
              </div>
              <button
                type="button"
                className="plans-upgrade-btn"
                onClick={() => router.push(`/pay-now?planId=${encodeURIComponent(p.id)}`)}
                disabled={busyPlanId === p.id}
              >
                Buy Now
              </button>
            </div>
          ))}
        </div>
      </div>

      {subHistory.length > 0 && (
        <div className="plans-card">
          <div className="plans-section-title">Subscription History</div>
          <div className="plans-history">
            {subHistory.map((s) => (
              <div key={s.id} className="plans-history-row">
                <div className="plans-history-name">{s.planName}</div>
                <div className="plans-muted">{s.startedAtLabel}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {payOpen && (
        <div className="plans-pay-backdrop" role="dialog" aria-modal="true">
          <div className="plans-pay-card">
            <div className="plans-pay-title">Buy {payPlan?.name}</div>
            <div className="plans-pay-price">
              Price: {displayPayPlanPrice.primary} {displayPayPlanPrice.secondary ? <span className="plans-muted">{displayPayPlanPrice.secondary}</span> : null}
            </div>

            {(error || info) && (
              <div className="plans-clean-toast" style={{ marginTop: 10 }}>
                {error || info}
              </div>
            )}

            <div className="plans-pay-field">
              <div className="plans-pay-label">Payment Method</div>
              {methods.length === 0 ? (
                <div className="plans-muted" style={{ marginTop: 6 }}>
                  Loading…
                </div>
              ) : (
                <div className="plans-pay-choice-grid">
                  <button
                    type="button"
                    className={`plans-pay-choice ${payMethod === "mobile_money" ? "active" : ""}`}
                    onClick={() => setPayMethod("mobile_money")}
                  >
                    Mobile Money
                  </button>
                  <button
                    type="button"
                    className={`plans-pay-choice ${payMethod === "crypto" ? "active" : ""}`}
                    onClick={() => setPayMethod("crypto")}
                  >
                    Crypto
                  </button>
                  <button
                    type="button"
                    className={`plans-pay-choice ${payMethod === "card" ? "active" : ""}`}
                    onClick={() => setPayMethod("card")}
                  >
                    Bank/Card
                  </button>
                </div>
              )}
            </div>

            {payMethod === "mobile_money" ? (
              <div className="plans-pay-field">
                <div className="plans-pay-label">Choose Provider</div>
                {providersForSelectedMethod.length === 0 ? (
                  <div className="plans-muted" style={{ marginTop: 6 }}>
                    No providers enabled.
                  </div>
                ) : (
                  <div className="plans-pay-choice-grid">
                    {providersForSelectedMethod.map((p) => (
                      <button
                        key={String(p.id)}
                        type="button"
                        className={`plans-pay-choice ${String(payProvider).toUpperCase() === String(p.id).toUpperCase() ? "active" : ""}`}
                        onClick={() => setPayProvider(String(p.id).toUpperCase())}
                      >
                        {String(p.id).toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {payMethod === "mobile_money" && payProvider ? (
              <div className="plans-pay-field">
                <div className="plans-pay-label">Phone Number</div>
                <input
                  className="plans-pay-input"
                  placeholder="Enter phone number"
                  value={payPhone}
                  onChange={(e) => setPayPhone(e.target.value)}
                />
              </div>
            ) : null}

            {payMethod === "crypto" && cryptoInfo ? (
              <div className="plans-pay-field">
                <div className="plans-pay-label">Send USDT (TRC20)</div>
                <div className="plans-muted">Amount: {cryptoInfo.expectedAmount} USDT</div>
                <div className="plans-muted">Wallet: {cryptoInfo.address}</div>
                <div className="plans-muted">Expires: {cryptoInfo.expiresAt}</div>
                <div className="plans-pay-label" style={{ marginTop: 10 }}>Transaction hash (optional)</div>
                <input
                  className="plans-pay-input"
                  placeholder="Paste tx hash (optional)"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                />
                <button
                  type="button"
                  className="plans-pay-now"
                  style={{ marginTop: 10 }}
                  onClick={() => void confirmCryptoPaid()}
                  disabled={payBusy}
                >
                  I Have Paid
                </button>
              </div>
            ) : null}

            {payMethod === "card" && checkoutUrl ? (
              <div className="plans-pay-field">
                <div className="plans-pay-label">Hosted Checkout</div>
                <div className="plans-muted">Continue in secure checkout to complete payment.</div>
                <a className="plans-pay-now" href={checkoutUrl} style={{ display: "inline-block", textAlign: "center" }}>
                  Open Checkout
                </a>
              </div>
            ) : null}

            <div className="plans-pay-actions">
              <button type="button" className="plans-pay-cancel" onClick={() => setPayOpen(false)} disabled={payBusy}>
                Cancel
              </button>
              <button type="button" className="plans-pay-now" onClick={payNow} disabled={payBusy}>
                {payBusy ? "Paying…" : "Pay Now"}
              </button>
            </div>
            <div className="plans-pay-hint">
              {payMethod === "mobile_money"
                ? "You’ll confirm on your phone by entering your PIN."
                : payMethod === "crypto"
                  ? "Send exact amount, then tap “I Have Paid”."
                  : "Card is optional and may open hosted checkout."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

