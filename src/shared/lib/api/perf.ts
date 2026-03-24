/**
 * Server-side performance measurement utility.
 *
 * Measures execution time of async operations and exposes the results
 * via the standard Server-Timing HTTP header, which is visible in the
 * browser DevTools Network tab (Timing section) without any extra tools.
 *
 * Usage in API routes:
 *   const perf = createPerfTracker();
 *   const data = await perf.measure("db-query", () => db.select(...));
 *   return perf.toResponse(data);
 *
 * The browser will show:
 *   Server-Timing: db-query;dur=12.5
 */

export interface PerfEntry {
  name: string;
  duration: number;
}

export interface PerfTracker {
  /** Measure an async operation and record its duration */
  measure: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
  /** Get all recorded entries */
  entries: () => PerfEntry[];
  /** Build the Server-Timing header value */
  headerValue: () => string;
  /** Create a NextResponse.json with Server-Timing header attached */
  toResponse: <T>(data: T, init?: ResponseInit) => Response;
  /** Get total elapsed time since tracker creation */
  totalMs: () => number;
}

export function createPerfTracker(): PerfTracker {
  const records: PerfEntry[] = [];
  const start = performance.now();

  const measure = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    const t0 = performance.now();
    const result = await fn();
    records.push({ name, duration: Math.round((performance.now() - t0) * 100) / 100 });
    return result;
  };

  const entries = () => [...records];

  const headerValue = () => {
    const total = Math.round((performance.now() - start) * 100) / 100;
    return [
      ...records.map((e) => `${e.name};dur=${e.duration}`),
      `total;dur=${total}`,
    ].join(", ");
  };

  const toResponse = <T>(data: T, init?: ResponseInit): Response => {
    const headers = new Headers(init?.headers);
    headers.set("Server-Timing", headerValue());
    return Response.json(data, { ...init, headers });
  };

  const totalMs = () => Math.round((performance.now() - start) * 100) / 100;

  return { measure, entries, headerValue, toResponse, totalMs };
}
