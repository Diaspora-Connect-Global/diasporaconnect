/**
 * Shared CSV writer: RFC 4180 quoting, optional UTF-8 BOM (so Excel opens accents
 * correctly) and formula neutralisation. Attendee answers are typed by strangers, so
 * a cell that a spreadsheet would read as a formula (starts with = + - @ TAB or CR)
 * gets a leading apostrophe.
 */

const FORMULA_START = /^[=+\-@\t\r]/;

/** RFC 4180 quoting AFTER formula-injection escaping. */
export function escapeCsvCell(value: string | number | null | undefined): string {
  let s = String(value ?? '');
  if (FORMULA_START.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: Array<Array<string | number | null | undefined>>, opts: { bom?: boolean } = {}): string {
  const body = `${rows.map((r) => r.map(escapeCsvCell).join(',')).join('\r\n')}\r\n`;
  return opts.bom ? `﻿${body}` : body;
}

/** A readable, id-free file name: `slug-suffix-2030-11-24.csv`. */
export function csvSlugFilename(title: string, suffix: string, now: Date = new Date()): string {
  const slug = (title || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `${slug || 'event'}-${suffix}-${date}.csv`;
}

/** Hand the text to the browser as a download. */
export function downloadCsv(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
