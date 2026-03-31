import axios from "@/services/api";

export function unwrapApiEnvelope(response) {
  const payload = response?.data;
  if (payload && typeof payload === "object" && payload.data && typeof payload.data === "object") {
    return payload.data;
  }
  return payload || {};
}

export async function createOrInitiatePayment(body, options = {}) {
  const res = await axios.post("/payment/initiate", body, options);
  return unwrapApiEnvelope(res);
}

export async function getPaymentStatus(paymentId) {
  const res = await axios.get(`/payment/status/${encodeURIComponent(paymentId)}`);
  return unwrapApiEnvelope(res);
}

export async function getPaymentMethods({ country, currency } = {}) {
  const qs = new URLSearchParams();
  if (country) qs.set("country", country);
  if (currency) qs.set("currency", currency);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await axios.get(`/payment-methods${suffix}`);
  return unwrapApiEnvelope(res);
}

