/** Build a CSV document (RFC 4180) from rows of primitive values. */
export function toCsv(rows: (string | number | boolean | null | undefined | Date)[][]) {
  return (
    rows
      .map((row) =>
        row
          .map((value) => {
            if (value === null || value === undefined) return "";
            let text = value instanceof Date ? value.toISOString() : String(value);
            // Neutralise spreadsheet formula injection (=, +, -, @ at the start of a cell).
            if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
            return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
          })
          .join(","),
      )
      .join("\r\n") + "\r\n"
  );
}
