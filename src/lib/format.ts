export function formatCurrency(value: number | string | null | undefined, currency = "NGN") {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  const symbol = currency === "NGN" ? "₦" : currency === "USD" ? "$" : currency + " ";
  return symbol + (Number.isFinite(n) ? n : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatNumber(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return (Number.isFinite(n) ? n : 0).toLocaleString();
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function genSaleRef() {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${ts}-${rnd}`;
}
