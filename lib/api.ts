// Low-level transport: mock store or P3's real backend. Teammates should call
// lib/actions.ts, not this file.
//
// Mock mode is on when NEXT_PUBLIC_USE_MOCK=true, or when forced on in this
// browser from /dev (handy if the backend dies mid-demo; no restart needed).

import * as mock from "./mockApi";
import type { AssignCubbyInput, CreateOrderInput, Inspection, Order } from "./types";

// ---------------------------------------------------------------------------
// Every backend call the frontend makes. P3: these are the routes to implement.
// ---------------------------------------------------------------------------
export const ENDPOINTS = {
  listOrders: { method: "GET", path: () => "/api/orders" }, // → Order[]
  createOrder: { method: "POST", path: () => "/api/orders" }, // { items } → Order
  inspect: { method: "POST", path: (id: number) => `/api/orders/${id}/inspect` }, // { image } → Inspection
  listInspections: { method: "GET", path: (id: number) => `/api/orders/${id}/inspections` }, // → Inspection[] newest first
  assignCubby: { method: "POST", path: (id: number) => `/api/orders/${id}/assign-cubby` }, // { override? } → Order  ("mark ready for pickup")
  pickup: { method: "POST", path: (id: number) => `/api/orders/${id}/pickup` }, // → Order
  inspecting: { method: "GET", path: () => "/api/inspecting" }, // → { order_ids: number[] } (orders with an inspect call in flight)
} as const;

const ENV_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
const OVERRIDE_KEY = "ffc-force-mock";

/** True when calls go to the in-browser mock instead of the real backend. */
export function isMock(): boolean {
  if (ENV_MOCK) return true;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(OVERRIDE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isMockFromEnv(): boolean {
  return ENV_MOCK;
}

/** Force mock mode on/off in this browser only (from /dev). */
export function setMockOverride(on: boolean) {
  try {
    if (on) window.localStorage.setItem(OVERRIDE_KEY, "1");
    else window.localStorage.removeItem(OVERRIDE_KEY);
  } catch {
    /* ignore */
  }
}

async function http<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const b = await res.json();
      msg = b.error ?? b.message ?? msg;
    } catch {
      /* not JSON */
    }
    throw new Error(`${method} ${path}: ${msg}`);
  }
  return res.json() as Promise<T>;
}

export function getOrders(): Promise<Order[]> {
  if (isMock()) return mock.getOrders();
  const e = ENDPOINTS.listOrders;
  return http<Order[]>(e.method, e.path());
}

export function createOrder(input: CreateOrderInput): Promise<Order> {
  if (isMock()) return mock.createOrder(input);
  const e = ENDPOINTS.createOrder;
  return http<Order>(e.method, e.path(), input);
}

/** @param image raw base64 JPEG (no "data:" prefix) */
export function inspectOrder(orderId: number, image: string): Promise<Inspection> {
  if (isMock()) return mock.inspectOrder(orderId, image);
  const e = ENDPOINTS.inspect;
  return http<Inspection>(e.method, e.path(orderId), { image });
}

/** assign-cubby == "mark ready for pickup". */
export function assignCubby(orderId: number, input: AssignCubbyInput = {}): Promise<Order> {
  if (isMock()) return mock.assignCubby(orderId, input);
  const e = ENDPOINTS.assignCubby;
  return http<Order>(e.method, e.path(orderId), input);
}

export function pickupOrder(orderId: number): Promise<Order> {
  if (isMock()) return mock.pickupOrder(orderId);
  const e = ENDPOINTS.pickup;
  return http<Order>(e.method, e.path(orderId), {});
}

/** Past inspections for an order, newest first. Returns [] if the backend lacks the route. */
export async function getInspections(orderId: number): Promise<Inspection[]> {
  if (isMock()) return mock.getInspections(orderId);
  const e = ENDPOINTS.listInspections;
  try {
    return await http<Inspection[]>(e.method, e.path(orderId));
  } catch {
    return [];
  }
}

/** Order ids currently being photo-checked (display-only VERIFYING). [] if the backend lacks the route. */
export async function getInspectingIds(): Promise<number[]> {
  if (isMock()) return mock.getInspectingIds();
  const e = ENDPOINTS.inspecting;
  try {
    return (await http<{ order_ids: number[] }>(e.method, e.path())).order_ids ?? [];
  } catch {
    return [];
  }
}

/**
 * Mark/unmark an order as VERIFYING. Mock only: in real mode the backend
 * derives this from its own in-flight POST /inspect calls.
 */
export async function setInspecting(orderId: number, on: boolean): Promise<void> {
  if (isMock()) await mock.setInspecting(orderId, on);
}

/** Instant change notifications (mock only; real mode relies on polling). */
export function subscribe(cb: () => void): () => void {
  return isMock() ? mock.subscribe(cb) : () => {};
}
