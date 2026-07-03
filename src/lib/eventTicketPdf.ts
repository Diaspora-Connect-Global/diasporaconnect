import { jsPDF } from "jspdf";
import QRCode from "qrcode";

const BRAND = "#004c9c";
const INK = "#0f172a";
const MUTED = "#64748b";
const LINE = "#e2e8f0";
const SOFT = "#f8fafc";

export interface EventTicketPdfData {
  /** Event title, shown as the ticket headline. */
  eventTitle: string;
  eventId: string;
  /** Registration id — the booking reference and the value encoded in the QR code. */
  registrationId?: string | null;
  holderName: string;
  holderEmail?: string | null;
  /** Pre-formatted date/time range (e.g. "Jul 3, 2026, 6:00 PM – 9:00 PM"). */
  dateLine: string;
  timezone?: string | null;
  /** One-line human readable location. */
  location: string;
  venueName?: string | null;
  addressLines?: string[];
  virtualLink?: string | null;
  platform?: string | null;
  category?: string | null;
  ticketName?: string | null;
  isPaid: boolean;
  unitPriceInCents?: number | null;
  currency?: string | null;
  quantity?: number;
  /** Pre-formatted issue date (e.g. "Jul 3, 2026"). */
  issuedAt: string;
  /** Public event URL, printed in the footer. */
  eventUrl?: string;
}

function money(cents: number, currency: string): string {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

/**
 * Builds an invoice-style PDF ticket carrying every detail an attendee needs —
 * holder, schedule, venue, order breakdown, booking reference and a scannable
 * check-in QR — then triggers a browser download. Runs client-side only.
 */
export async function downloadEventTicketPdf(data: EventTicketPdfData): Promise<void> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentW = pageW - margin * 2;

  const currency = (data.currency || "USD").toUpperCase();
  const quantity = Math.max(1, data.quantity ?? 1);
  const unitCents = data.isPaid ? data.unitPriceInCents ?? 0 : 0;
  const totalCents = unitCents * quantity;
  const reference = data.registrationId || data.eventId;

  // Pre-render the QR (registration reference used for check-in).
  let qrDataUrl = "";
  try {
    qrDataUrl = await QRCode.toDataURL(reference, {
      margin: 0,
      width: 320,
      color: { dark: INK, light: "#ffffff" },
    });
  } catch {
    qrDataUrl = "";
  }

  // ---- Header band ----------------------------------------------------------
  doc.setFillColor(BRAND);
  doc.rect(0, 0, pageW, 90, "F");
  doc.setTextColor("#ffffff");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Diaspoplug", margin, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Event Ticket & Receipt", margin, 60);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("BOOKING REFERENCE", pageW - margin, 42, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(reference, pageW - margin, 60, { align: "right" });

  let y = 128;

  // ---- Event title ----------------------------------------------------------
  doc.setTextColor(INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  const titleLines = doc.splitTextToSize(data.eventTitle, contentW - 150);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 26;

  if (data.category) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(MUTED);
    doc.text(data.category.replace(/_/g, " ").toUpperCase(), margin, y);
    y += 18;
  }

  // ---- QR code (top-right) --------------------------------------------------
  const qrSize = 110;
  const qrX = pageW - margin - qrSize;
  const qrY = 116;
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.text("Scan at entry", qrX + qrSize / 2, qrY + qrSize + 12, { align: "center" });
  }

  y = Math.max(y + 8, qrY + qrSize + 30);

  // ---- Detail rows ----------------------------------------------------------
  const detailField = (label: string, value: string | string[]) => {
    const values = Array.isArray(value) ? value.filter(Boolean) : [value];
    if (values.length === 0 || (values.length === 1 && !values[0])) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(MUTED);
    doc.text(label.toUpperCase(), margin, y);
    y += 15;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(INK);
    for (const v of values) {
      const wrapped = doc.splitTextToSize(v, contentW);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 15;
    }
    y += 8;
  };

  detailField("Ticket holder", data.holderEmail ? `${data.holderName}  ·  ${data.holderEmail}` : data.holderName);
  detailField("Date & time", data.timezone ? `${data.dateLine}  (${data.timezone})` : data.dateLine);

  const venueLines: string[] = [];
  if (data.venueName) venueLines.push(data.venueName);
  if (data.addressLines?.length) venueLines.push(...data.addressLines);
  if (venueLines.length === 0 && data.location) venueLines.push(data.location);
  if (data.platform) venueLines.push(data.platform);
  if (data.virtualLink) venueLines.push(data.virtualLink);
  detailField("Location", venueLines);

  // ---- Order summary table --------------------------------------------------
  y += 6;
  const tableTop = y;
  const rowH = 26;
  const colDesc = margin + 12;
  const colQty = margin + contentW * 0.62;
  const colUnit = margin + contentW * 0.78;
  const colAmt = pageW - margin - 12;

  // header
  doc.setFillColor(SOFT);
  doc.rect(margin, tableTop, contentW, rowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text("DESCRIPTION", colDesc, tableTop + 17);
  doc.text("QTY", colQty, tableTop + 17);
  doc.text("UNIT", colUnit, tableTop + 17);
  doc.text("AMOUNT", colAmt, tableTop + 17, { align: "right" });

  // row
  const rowY = tableTop + rowH;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(INK);
  const desc = data.ticketName || (data.isPaid ? "Event ticket" : "Free admission");
  doc.text(doc.splitTextToSize(desc, colQty - colDesc - 10), colDesc, rowY + 17);
  doc.text(String(quantity), colQty, rowY + 17);
  doc.text(data.isPaid ? money(unitCents, currency) : "Free", colUnit, rowY + 17);
  doc.text(data.isPaid ? money(totalCents, currency) : "Free", colAmt, rowY + 17, { align: "right" });

  // divider + total
  const totalY = rowY + rowH + 6;
  doc.setDrawColor(LINE);
  doc.line(margin, totalY, pageW - margin, totalY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(INK);
  doc.text("Total paid", colUnit, totalY + 24);
  doc.setTextColor(BRAND);
  doc.text(data.isPaid ? money(totalCents, currency) : "Free", colAmt, totalY + 24, { align: "right" });

  // table border
  doc.setDrawColor(LINE);
  doc.rect(margin, tableTop, contentW, rowH * 2);

  // ---- Footer ---------------------------------------------------------------
  const pageH = doc.internal.pageSize.getHeight();
  let fy = pageH - 78;
  doc.setDrawColor(LINE);
  doc.line(margin, fy, pageW - margin, fy);
  fy += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text(`Issued ${data.issuedAt}`, margin, fy);
  doc.text(`Ticket ID: ${reference}`, pageW - margin, fy, { align: "right" });
  fy += 14;
  doc.text(
    "Present this ticket (printed or on your phone) at entry. This document is your proof of registration and receipt.",
    margin,
    fy,
    { maxWidth: contentW }
  );
  if (data.eventUrl) {
    fy += 22;
    doc.setTextColor(BRAND);
    doc.text(data.eventUrl, margin, fy);
  }

  const safeTitle = data.eventTitle.replace(/[^\w\-]+/g, "_").slice(0, 40) || "event";
  doc.save(`ticket-${safeTitle}.pdf`);
}
