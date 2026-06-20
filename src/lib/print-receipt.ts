import { formatCurrency, formatDateTime } from "./format";

export type ReceiptStore = {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  receipt_footer?: string | null;
  tax_rate?: number | null;
};

export type ReceiptLine = { name: string; quantity: number; price: number };

export type ReceiptData = {
  sale_ref: string;
  created_at: string;
  payment_method: string;
  customer_name?: string | null;
  cashier?: string | null;
  items: ReceiptLine[];
  total: number;
  store: ReceiptStore;
};

export function printReceipt(r: ReceiptData) {
  const subtotal = r.items.reduce((s, l) => s + l.price * l.quantity, 0);
  const tax = r.store.tax_rate ? subtotal * (Number(r.store.tax_rate) / 100) : 0;
  const html = `<!doctype html><html><head><meta charset="utf-8"/>
<title>Receipt ${r.sale_ref}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  body { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 12px; color: #000; width: 72mm; margin: 0 auto; }
  h1 { font-size: 16px; text-align: center; margin: 0 0 4px; }
  .muted { color: #555; }
  .center { text-align: center; }
  .row { display: flex; justify-content: space-between; gap: 8px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th, td { text-align: left; padding: 3px 0; font-weight: normal; }
  th:last-child, td:last-child { text-align: right; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
  .bold { font-weight: 700; }
  .total { font-size: 14px; }
  .footer { text-align: center; margin-top: 10px; font-size: 11px; }
  @media print { .noprint { display: none; } }
  .noprint { text-align: center; margin: 12px 0; }
  button { font: inherit; padding: 6px 12px; border: 1px solid #000; background: #fff; cursor: pointer; }
</style></head><body>
  <h1>${escape(r.store.name ?? "Receipt")}</h1>
  ${r.store.address ? `<div class="center muted">${escape(r.store.address)}</div>` : ""}
  ${r.store.phone ? `<div class="center muted">${escape(r.store.phone)}</div>` : ""}
  <div class="divider"></div>
  <div class="row"><span>Ref</span><span class="bold">${escape(r.sale_ref)}</span></div>
  <div class="row"><span>Date</span><span>${escape(formatDateTime(r.created_at))}</span></div>
  <div class="row"><span>Payment</span><span>${escape(r.payment_method)}</span></div>
  ${r.customer_name ? `<div class="row"><span>Customer</span><span>${escape(r.customer_name)}</span></div>` : ""}
  ${r.cashier ? `<div class="row"><span>Cashier</span><span>${escape(r.cashier)}</span></div>` : ""}
  <div class="divider"></div>
  <table>
    <thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
    <tbody>
      ${r.items.map((l) => `<tr><td>${escape(l.name)}</td><td style="text-align:center">${l.quantity}</td><td>${escape(formatCurrency(l.price * l.quantity))}</td></tr>`).join("")}
    </tbody>
  </table>
  <div class="divider"></div>
  <div class="row"><span>Subtotal</span><span>${escape(formatCurrency(subtotal))}</span></div>
  ${tax > 0 ? `<div class="row"><span>Tax (${r.store.tax_rate}%)</span><span>${escape(formatCurrency(tax))}</span></div>` : ""}
  <div class="row total bold"><span>TOTAL</span><span>${escape(formatCurrency(r.total))}</span></div>
  <div class="footer">${escape(r.store.receipt_footer ?? "Thank you for your business!")}</div>
  <div class="noprint"><button onclick="window.print()">Print</button> <button onclick="window.close()">Close</button></div>
  <script>setTimeout(function(){ window.print(); }, 200);</script>
</body></html>`;

  const w = window.open("", "_blank", "width=420,height=640");
  if (!w) return;
  w.document.open(); w.document.write(html); w.document.close();
}

function escape(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
