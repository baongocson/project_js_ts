// Canonicalize object keys only. Preserve strings exactly and arrays in their supplied order.
// Callers first validate/default the DTO and include the source-file checksum for upload requests.
export function canonicalRequest(value: unknown): string {
  function visit(input: unknown): unknown {
    if (input === null || typeof input === 'string' || typeof input === 'boolean') return input;
    if (typeof input === 'number' && Number.isFinite(input)) return input;
    if (Array.isArray(input)) return input.map(visit);
    if (typeof input === 'object' && input && Object.getPrototypeOf(input) === Object.prototype) {
      return Object.fromEntries(Object.keys(input).sort().map(key => [key, visit((input as Record<string, unknown>)[key])]));
    }
    throw new TypeError('Canonical request chỉ nhận dữ liệu JSON đã validate');
  }
  return JSON.stringify(visit(value));
}
