/** Kleine Prüfhelfer für geladene JSON-Daten. Fehler nennen den Pfad zum fehlerhaften Feld. */
export class ValidationError extends Error {}

export function expectRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError(`${path}: Objekt erwartet`);
  }
  return value as Record<string, unknown>;
}

export function expectString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ValidationError(`${path}: nicht leerer Text erwartet`);
  }
  return value;
}

export function expectNumber(
  value: unknown,
  path: string,
  min = -Infinity,
  max = Infinity,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new ValidationError(`${path}: Zahl von ${String(min)} bis ${String(max)} erwartet`);
  }
  return value;
}

export function expectNumberList(value: unknown, path: string, length: number): number[] {
  if (!Array.isArray(value) || value.length !== length) {
    throw new ValidationError(`${path}: Liste mit ${String(length)} Zahlen erwartet`);
  }
  return value.map((item, index) => expectNumber(item, `${path}[${String(index)}]`));
}
