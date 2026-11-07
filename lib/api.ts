// Single entry point for talking to the backend.
// NEXT_PUBLIC_USE_MOCK=true  → in-browser mock (lib/mockApi.ts)
// anything else              → real endpoints implemented by P3 under app/api/

import * as mock from "./mockApi";
import type { AssignCubbyInput, CreateOrderInput, Inspection, Order, Verdict } from "./types";

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      msg = body.error ?? body.message ?? msg;
    } catch {
      /* not JSON */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export function getOrders(): Promise<Order[]> {
  return USE_MOCK ? mock.getOrders() : http<Order[]>("/api/orders");
}

export function createOrder(input: CreateOrderInput): Promise<Order> {
  return USE_MOCK
    ? mock.createOrder(input)
    : http<Order>("/api/orders", { method: "POST", body: JSON.stringify(input) });
}

/**
 * @param image raw base64 JPEG (no "data:" prefix)
 * @param opts.force mock-only: force a verdict for demo controls. Ignored by the real backend.
 */
export function inspectOrder(
  orderId: number,
  image: string,
  opts?: { force?: Verdict },
): Promise<Inspection> {
  return USE_MOCK
    ? mock.inspectOrder(orderId, image, opts)
    : http<Inspection>(`/api/orders/${orderId}/inspect`, {
        method: "POST",
        body: JSON.stringify({ image }),
      });
}

export function assignCubby(orderId: number, input: AssignCubbyInput = {}): Promise<Order> {
  return USE_MOCK
    ? mock.assignCubby(orderId, input)
    : http<Order>(`/api/orders/${orderId}/assign-cubby`, {
        method: "POST",
        body: JSON.stringify(input),
      });
}

export function pickupOrder(orderId: number): Promise<Order> {
  return USE_MOCK
    ? mock.pickupOrder(orderId)
    : http<Order>(`/api/orders/${orderId}/pickup`, { method: "POST", body: "{}" });
}

/**
 * Past inspections for an order, newest first.
 * NOT in the original contract — P3 needs GET /api/orders/:id/inspections → Inspection[].
 * Until then the real-mode call returns [] on error so the UI degrades to flag_reason.
 */
export async function getInspections(orderId: number): Promise<Inspection[]> {
  if (USE_MOCK) return mock.getInspections(orderId);
  try {
    return await http<Inspection[]>(`/api/orders/${orderId}/inspections`);
  } catch {
    return [];
  }
}

/** Subscribe to instant change notifications (mock only; real mode relies on polling). */
export function subscribe(cb: () => void): () => void {
  return USE_MOCK ? mock.subscribe(cb) : () => {};
}
