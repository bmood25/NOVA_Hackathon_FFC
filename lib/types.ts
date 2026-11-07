// Shared data contract — keep in sync with P1 (voice), P2 (vision), P3 (backend).
// Do not change these shapes without telling the team.

export type OrderStatus = "pending" | "in_cubby" | "flagged" | "delivered";

export type OrderItem = {
  menu_id: string;
  qty: number;
  mods?: Record<string, boolean>;
};

export type Order = {
  id: number;
  status: OrderStatus;
  items: OrderItem[];
  cubby: number | null;
  flag_reason: string | null;
  created_at: string;
};

export type Observation = "present" | "absent" | "unknown";

export type DetectedItem = {
  menu_id: string;
  qty: number;
  mods?: Record<string, Observation>;
  confidence: number;
};

export type Verdict = "pass" | "flag" | "retake";

export type Inspection = {
  id: string;
  order_id: number;
  created_at: string;
  verdict: Verdict;
  detected: { items: DetectedItem[]; notes: string };
  differences: string[]; // e.g. "Burger: ticket says no lettuce, lettuce detected"
  possible_swap_order_id: number | null; // "this looks like Order 22, possible swap"
};

// ---- Request bodies (P4 assumptions — confirm with P3) ----

/** Body for POST /api/orders */
export type CreateOrderInput = { items: OrderItem[] };

/** Body for POST /api/orders/:id/inspect. `image` is raw base64 JPEG (no "data:" prefix). */
export type InspectInput = { image: string };

/** Body for POST /api/orders/:id/assign-cubby */
export type AssignCubbyInput = { override?: boolean };

export const CUBBY_COUNT = 8;
