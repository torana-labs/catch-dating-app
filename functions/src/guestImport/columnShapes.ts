// What a column holds, described without its values. The model fallback
// sees headers and these shapes only (decision on #2061): the guarded
// runner's rules forbid sending a guest list to a model.

export type ColumnShape = "empty" | "phone-like" | "email-like" |
  "date-like" | "number" | "text";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/u;
const PHONE = /^\+?[0-9][0-9 ()-]{6,18}[0-9]$/u;
const DATE = /^(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/u;
const NUMBER = /^-?[0-9]+(?:[.,][0-9]+)?$/u;

/** The shape most of a column's non-empty cells share. */
export function columnShapes(headers: string[], rows: string[][],
  sample = 50): ColumnShape[] {
  const sampled = rows.slice(0, sample);
  return headers.map((_, column) => {
    const counts = new Map<ColumnShape, number>();
    for (const row of sampled) {
      const shape = cellShape(row[column] ?? "");
      if (shape !== "empty") counts.set(shape, (counts.get(shape) ?? 0) + 1);
    }
    let best: ColumnShape = "empty";
    let bestCount = 0;
    for (const [shape, count] of counts) {
      if (count > bestCount) {
        best = shape;
        bestCount = count;
      }
    }
    return best;
  });
}

function cellShape(raw: string): ColumnShape {
  const value = raw.trim();
  if (!value) return "empty";
  if (EMAIL.test(value)) return "email-like";
  if (DATE.test(value)) return "date-like";
  const digits = value.replace(/[^0-9]/gu, "").length;
  if (PHONE.test(value) && digits >= 8 && digits <= 15) return "phone-like";
  if (NUMBER.test(value)) return "number";
  return "text";
}
