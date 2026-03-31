const NO_DECIMALS = new Set(["UGX", "KES", "RWF", "TZS", "XOF", "XAF", "GNF", "BIF", "JPY", "KRW", "VND"]);

function safeNumber(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

export function formatUsd(usd) {
  const amount = safeNumber(usd);
  const digits = amount % 1 === 0 ? 0 : 2;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(digits)}`;
  }
}

export function formatCurrency(amount, currencyCode) {
  const code = String(currencyCode || "USD").toUpperCase();
  const n = safeNumber(amount);
  const digits = NO_DECIMALS.has(code) ? 0 : n % 1 === 0 ? 0 : 2;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }).format(n);
  } catch {
    return `${code} ${n.toFixed(digits)}`;
  }
}

/**
 * Convert and format a USD price for display.
 * Returns local currency string + a USD approximation for trust.
 */
export function formatLocalizedPrice({ usd, currencyCode, usdToCurrencyRate }) {
  const usdAmount = safeNumber(usd);
  const code = String(currencyCode || "USD").toUpperCase();
  if (!usdToCurrencyRate || !Number.isFinite(Number(usdToCurrencyRate)) || code === "USD") {
    return { primary: formatUsd(usdAmount), secondary: "" };
  }
  const local = usdAmount * Number(usdToCurrencyRate);
  return { primary: formatCurrency(local, code), secondary: `(~${formatUsd(usdAmount)})` };
}

