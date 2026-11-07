// The ONLY place teammates should call to change order state.
// Every function goes through lib/api.ts, so it works in mock and real mode.
// Each one says which backend endpoint(s) it hits in real mode.
//
//   import { submitVoiceOrder, submitMealPhoto, confirmSwap, pickupOrder } from "@/lib/actions";
//
// Note: "cubby" in the contract (status "in_cubby", assign-cubby endpoint) just
// means READY FOR PICKUP. The UI never shows cubbies.

import * as api from "./api";
import type { Inspection, Order, OrderItem } from "./types";

/**
 * Create a new ticket from a confirmed voice order.
 * Caller: P1, after staff confirm the voice confirmation card.
 * Backend: POST /api/orders  { items } → Order
 */
export function submitVoiceOrder(order: { items: OrderItem[] }): Promise<Order> {
  return api.createOrder({ items: order.items });
}

/**
 * Check a meal photo against its ticket.
 * Caller: the /camera page (P4) after staff pick a ticket and take a photo.
 * Flow: board shows VERIFYING → inspect → on "pass", automatically marks the
 * order READY FOR PICKUP (no human step). "flag" leaves it flagged (CHECK ORDER);
 * "retake" leaves it pending.
 * Backend: POST /api/orders/:id/inspect { image } → Inspection,
 *          then on pass POST /api/orders/:id/assign-cubby {} → Order
 * @param imageBase64 JPEG as raw base64; a "data:image/jpeg;base64," prefix is stripped if present.
 */
export async function submitMealPhoto(orderId: number, imageBase64: string): Promise<Inspection> {
  const image = imageBase64.startsWith("data:") ? imageBase64.slice(imageBase64.indexOf(",") + 1) : imageBase64;
  await api.setInspecting(orderId, true);
  try {
    const inspection = await api.inspectOrder(orderId, image);
    if (inspection.verdict === "pass") {
      await api.assignCubby(orderId);
    }
    return inspection;
  } finally {
    await api.setInspecting(orderId, false);
  }
}

/**
 * Staff confirm that the meal photographed for `flaggedOrderId` is actually
 * `actualOrderId`'s meal: mark `actualOrderId` READY FOR PICKUP.
 * `flaggedOrderId` stays flagged until its correct meal is photographed.
 * Caller: the /camera page, only after staff tap "Confirm swap". Never the display board.
 * Backend: POST /api/orders/:actualOrderId/assign-cubby { override: true } → Order
 */
export function confirmSwap(flaggedOrderId: number, actualOrderId: number): Promise<Order> {
  void flaggedOrderId; // kept for the call signature/logging; backend only needs the actual order
  return api.assignCubby(actualOrderId, { override: true });
}

/**
 * Customer picked up their order ("Order 21").
 * Caller: P1's voice pickup screen.
 * Backend: POST /api/orders/:id/pickup → Order
 */
export function pickupOrder(orderId: number): Promise<Order> {
  return api.pickupOrder(orderId);
}
