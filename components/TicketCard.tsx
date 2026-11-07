"use client";

import type { Inspection, Order } from "@/lib/types";
import { OrderItems } from "./OrderItems";

function ago(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  return `${Math.round(s / 60)}m ago`;
}

type Props = {
  order: Order;
  latest?: Inspection;
  selected: boolean;
  onSelect: () => void;
  onConfirmSwap?: (swapId: number) => void;
  onOverride?: () => void;
  onPickup?: () => void;
  busy?: boolean;
};

export function TicketCard({ order, latest, selected, onSelect, onConfirmSwap, onOverride, onPickup, busy }: Props) {
  const flagged = order.status === "flagged";
  const differences =
    latest && latest.verdict === "flag" && latest.differences.length > 0
      ? latest.differences
      : order.flag_reason
        ? order.flag_reason.split("; ")
        : [];
  const swapId = flagged ? (latest?.possible_swap_order_id ?? null) : null;

  const tone =
    order.status === "flagged"
      ? "border-strawberry bg-[#fff0f4]"
      : order.status === "in_cubby"
        ? "border-verified/40 bg-white"
        : order.status === "delivered"
          ? "border-transparent bg-white/50 opacity-70"
          : "border-transparent bg-white";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
      className={`pop-in cursor-pointer rounded-2xl border-4 p-4 shadow-sm transition ${tone} ${
        selected ? "ring-4 ring-navy ring-offset-2 ring-offset-apricot" : ""
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="text-5xl leading-none font-black tracking-tight tabular-nums">#{order.id}</div>
        <div className="flex flex-col items-end gap-1 text-right">
          {flagged && (
            <span className="rounded-full bg-strawberry px-3 py-1 text-sm font-bold tracking-wide text-white uppercase">
              ⚠ Flagged
            </span>
          )}
          {order.status === "in_cubby" && (
            <span className="rounded-full bg-verified px-3 py-1 text-sm font-bold text-white">
              Cubby {order.cubby}
            </span>
          )}
          {order.status === "pending" && latest?.verdict === "pass" && (
            <span className="rounded-full bg-verified-light px-3 py-1 text-sm font-bold text-verified">
              ✓ Verified
            </span>
          )}
          <span className="text-xs text-graphite-soft">{ago(order.created_at)}</span>
        </div>
      </div>

      <OrderItems items={order.items} />

      {flagged && differences.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-xl bg-strawberry/10 p-3 text-base font-semibold text-[#b0123f]">
          {differences.map((d) => (
            <li key={d}>✗ {d}</li>
          ))}
        </ul>
      )}

      {flagged && swapId !== null && (
        <div className="mt-3 rounded-xl border-2 border-dashed border-coral bg-coral/10 p-3">
          <div className="text-lg font-bold">🔀 Looks like Order {swapId}, possible swap</div>
          <button
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              onConfirmSwap?.(swapId);
            }}
            className="mt-2 w-full rounded-lg bg-navy px-3 py-2 font-semibold text-white hover:bg-navy-dark disabled:opacity-50"
          >
            Confirm: this meal is Order {swapId} → assign cubby
          </button>
        </div>
      )}

      {flagged && (
        <button
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            onOverride?.();
          }}
          className="mt-2 w-full rounded-lg border-2 border-graphite/30 px-3 py-1.5 text-sm font-semibold hover:bg-graphite/5 disabled:opacity-50"
        >
          Staff override: assign #{order.id} anyway
        </button>
      )}

      {order.status === "in_cubby" && onPickup && (
        <button
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            onPickup();
          }}
          className="mt-3 w-full rounded-lg bg-verified px-3 py-2 font-semibold text-white hover:brightness-110 disabled:opacity-50"
        >
          Picked up → open cubby {order.cubby}
        </button>
      )}
    </div>
  );
}
