/** Lesender Zugriff, der fehlende Einträge als Programmierfehler meldet statt `undefined` durchzureichen. */
export function at<T>(items: readonly T[], index: number): T {
  if (index < 0 || index >= items.length) {
    throw new RangeError(`Index ${String(index)} außerhalb von 0..${String(items.length - 1)}`);
  }
  return items[index] as T;
}

/** Unveränderliches Ersetzen eines Eintrags. */
export function replaceAt<T>(items: readonly T[], index: number, value: T): readonly T[] {
  return items.map((item, i) => (i === index ? value : item));
}
