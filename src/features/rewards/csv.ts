import { MAX_AWARD } from "./constants";

/**
 * Parses a bulk token award file. One row per student:
 *
 *   email,tokens,reason
 *   aziza@uni.edu,50,Dean's list – autumn semester
 *
 * With a header row, columns are found by name (email, tokens, reason) and any other
 * columns (name, faculty…) are ignored, so the downloadable template can be filled in
 * directly. Without one, the order is email, tokens, reason. Rows with no tokens (or 0)
 * are skipped. Quoted fields ("a, b") are supported so reasons can contain commas.
 */
export type AwardRow = { line: number; email: string; amount: number; reason: string };

export const MAX_ROWS = 2000;
const DEFAULT_REASON = "Achievement award";

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === "," || char === ";" || char === "\t") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

const HEADER = {
  email: /^e-?mail(\s*address)?$/i,
  amount: /^(tokens?|amount|points)$/i,
  reason: /^(reason|description|comment|note)$/i,
};

export function parseAwardCsv(text: string): { rows: AwardRow[]; errors: string[]; skipped: number } {
  const rows: AwardRow[] = [];
  const errors: string[] = [];
  let skipped = 0;
  // Column positions: by default email, tokens, then the rest is the reason.
  let columns: { email: number; amount: number; reason: number | "rest" } | null = null;
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);

  for (const [index, raw] of lines.entries()) {
    const line = index + 1;
    if (!raw.trim()) continue;
    const cells = splitCsvLine(raw);

    if (!columns) {
      const looksLikeHeader = !cells.some((c) => c.includes("@") || /^-?\d+$/.test(c));
      if (looksLikeHeader) {
        const find = (re: RegExp) => cells.findIndex((c) => re.test(c));
        const email = find(HEADER.email);
        const amount = find(HEADER.amount);
        if (email < 0 || amount < 0) {
          errors.push(`Line ${line}: the header needs an "email" and a "tokens" column.`);
          break;
        }
        const reason = find(HEADER.reason);
        columns = { email, amount, reason: reason < 0 ? -1 : reason };
        continue;
      }
      columns = { email: 0, amount: 1, reason: "rest" };
    }

    const email = cells[columns.email] ?? "";
    const amountText = (cells[columns.amount] ?? "").replace(/^'/, "");
    const reason =
      (columns.reason === "rest" ? cells.slice(2).join(", ") : (cells[columns.reason] ?? "")).trim() || DEFAULT_REASON;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(`Line ${line}: "${email}" is not a valid e-mail address.`);
    } else if (amountText === "" || amountText === "0") {
      skipped++;
    } else if (!/^-?\d+$/.test(amountText)) {
      errors.push(`Line ${line}: tokens must be a whole number.`);
    } else if (Math.abs(Number(amountText)) > MAX_AWARD) {
      errors.push(`Line ${line}: at most ${MAX_AWARD} tokens per row.`);
    } else if (reason.length > 200) {
      errors.push(`Line ${line}: the reason is too long (max 200 characters).`);
    } else {
      rows.push({ line, email: email.toLowerCase(), amount: Number(amountText), reason });
    }
  }

  if (rows.length + errors.length + skipped > MAX_ROWS) errors.unshift(`At most ${MAX_ROWS} rows per file.`);
  if (rows.length === 0 && errors.length === 0) {
    errors.push(skipped ? "No row has tokens filled in." : "The file has no rows.");
  }
  return { rows, errors, skipped };
}
