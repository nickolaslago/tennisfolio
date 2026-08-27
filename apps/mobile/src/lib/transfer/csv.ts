/**
 * CSV reading and writing, byte-compatible with Python's `csv` module.
 *
 * The export bundle has to be interchangeable with the one
 * `apps/api/src/app/routers/export.py` produces, and re-importable by
 * `app/seed_import.py`. That makes Python's defaults the specification:
 *
 * - `csv.writer` terminates rows with **CRLF**, not LF.
 * - Quoting is `QUOTE_MINIMAL`: a field is quoted only when it contains the
 *   delimiter, a double quote, CR or LF. An empty field is never quoted, so an
 *   empty cell means null.
 * - A literal double quote inside a quoted field is escaped by doubling it.
 *
 * The reader is correspondingly permissive about line endings (CRLF, LF or a
 * lone CR) because a CSV that has been through a text editor or a zip tool on
 * another platform should still import.
 */

const QUOTE_REQUIRED = /[",\r\n]/;

/** Quotes a single field the way `csv.QUOTE_MINIMAL` does. */
function writeField(value: string): string {
  return QUOTE_REQUIRED.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Serialises a header plus rows, CRLF-terminated, with a trailing CRLF. */
export function writeCsv(header: string[], rows: string[][]): string {
  return [header, ...rows].map((row) => row.map(writeField).join(',')).join('\r\n') + '\r\n';
}

/**
 * Parses CSV text into rows of raw fields, including the header row.
 *
 * A trailing newline does not produce a final empty row, matching Python's
 * reader.
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let fieldStarted = false;

  const endField = () => {
    row.push(field);
    field = '';
    fieldStarted = false;
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && !fieldStarted) {
      quoted = true;
      fieldStarted = true;
    } else if (char === ',') {
      endField();
    } else if (char === '\r' || char === '\n') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      endRow();
    } else {
      field += char;
      fieldStarted = true;
    }
  }

  // A file that does not end in a newline still has one last row to flush.
  if (field.length > 0 || row.length > 0) endRow();

  return rows;
}

/**
 * Parses CSV text into per-row objects keyed by the header, the way
 * `csv.DictReader` does: short rows leave later keys empty, and extra fields
 * beyond the header are dropped.
 */
export function parseCsvDicts(text: string): Record<string, string>[] {
  const rows = parseCsvRows(text);
  if (rows.length === 0) return [];
  const header = rows[0];
  // Python's DictReader skips blank lines rather than yielding an all-empty record.
  const body = rows.slice(1).filter((row) => row.length > 1 || row[0] !== '');
  return body.map((row) => {
    const record: Record<string, string> = {};
    header.forEach((column, index) => {
      record[column] = row[index] ?? '';
    });
    return record;
  });
}
