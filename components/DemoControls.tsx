"use client";

import { useEffect, useState } from "react";
import { USE_MOCK } from "@/lib/api";
import { getForceNext, resetMock, setForceNext, type ForceMode } from "@/lib/mockApi";
import type { Order, OrderItem, Verdict } from "@/lib/types";

export const DEMO_PRESETS: { label: string; items: OrderItem[] }[] = [
  { label: "🍔 Burger + lettuce", items: [{ menu_id: "burger", qty: 1, mods: { lettuce: true, cheese: true } }] },
  { label: "🍔 Burger, NO lettuce", items: [{ menu_id: "burger", qty: 1, mods: { lettuce: false, cheese: true } }] },
  {
    label: "🍗 Chicken plate",
    items: [
      { menu_id: "chicken", qty: 1 },
      { menu_id: "rice", qty: 1 },
      { menu_id: "broccoli", qty: 1 },
    ],
  },
  { label: "🍟 Fries ×2 + soda", items: [{ menu_id: "fries", qty: 2 }, { menu_id: "soda", qty: 1 }] },
];

type Props = {
  selected: Order | null;
  busy: boolean;
  onCreate: (items: OrderItem[]) => void;
  onInspect: (verdict: Verdict) => void;
  onAssign: () => void;
  onPickup: () => void;
};

export function DemoControls({ selected, busy, onCreate, onInspect, onAssign, onPickup }: Props) {
  const [open, setOpen] = useState(false);
  const [force, setForce] = useState<ForceMode>("auto");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read mock setting after mount
    if (USE_MOCK) setForce(getForceNext());
  }, [open]);

  const canInspect = selected && (selected.status === "pending" || selected.status === "flagged");
  const canAssign = selected && (selected.status === "pending" || selected.status === "flagged");
  const canPickup = selected?.status === "in_cubby";

  const btn =
    "rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="fixed right-4 bottom-4 z-50 w-[22rem] max-w-[calc(100vw-2rem)]">
      {open && (
        <div className="mb-2 space-y-4 rounded-2xl bg-graphite p-4 text-apricot shadow-2xl">
          <section>
            <h3 className="mb-2 text-xs font-bold tracking-widest text-apricot/60 uppercase">1 · Create demo order</h3>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_PRESETS.map((p) => (
                <button
                  key={p.label}
                  disabled={busy}
                  onClick={() => onCreate(p.items)}
                  className={`${btn} bg-apricot/10 text-left hover:bg-apricot/20`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold tracking-widest text-apricot/60 uppercase">
              2 · Selected ticket{" "}
              <span className="text-apricot normal-case">
                {selected ? `#${selected.id} (${selected.status.replace("_", " ")})` : "— click a ticket"}
              </span>
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                disabled={busy || !canInspect}
                onClick={() => onInspect("pass")}
                className={`${btn} bg-verified text-white`}
              >
                Inspect: pass
              </button>
              <button
                disabled={busy || !canInspect}
                onClick={() => onInspect("flag")}
                className={`${btn} bg-strawberry text-white`}
              >
                Inspect: flag
              </button>
              <button
                disabled={busy || !canInspect}
                onClick={() => onInspect("retake")}
                className={`${btn} bg-coral text-graphite`}
              >
                Inspect: retake
              </button>
            </div>
            {!USE_MOCK && (
              <p className="mt-1 text-xs text-apricot/60">Real mode: sends a demo photo; the model decides the verdict.</p>
            )}
          </section>

          <section className="grid grid-cols-2 gap-2">
            <button disabled={busy || !canAssign} onClick={onAssign} className={`${btn} bg-navy text-white`}>
              3 · Assign cubby
            </button>
            <button disabled={busy || !canPickup} onClick={onPickup} className={`${btn} bg-apricot text-graphite`}>
              4 · Confirm pickup
            </button>
          </section>

          {USE_MOCK && (
            <section>
              <h3 className="mb-2 text-xs font-bold tracking-widest text-apricot/60 uppercase">
                Mock: camera inspections will…
              </h3>
              <div className="grid grid-cols-4 gap-1 rounded-lg bg-apricot/10 p-1">
                {(["auto", "pass", "flag", "retake"] as ForceMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setForceNext(m);
                      setForce(m);
                    }}
                    className={`rounded-md px-2 py-1 text-xs font-semibold capitalize ${
                      force === m ? "bg-apricot text-graphite" : "hover:bg-apricot/10"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  if (window.confirm("Reset all mock orders back to the seed data?")) resetMock();
                }}
                className="mt-2 text-xs text-apricot/60 underline hover:text-apricot"
              >
                Reset mock data
              </button>
            </section>
          )}
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="ml-auto block rounded-full bg-graphite px-4 py-2 text-sm font-bold text-apricot shadow-lg hover:bg-graphite-soft"
      >
        {open ? "Hide demo controls ▾" : "Demo controls ▴"}
      </button>
    </div>
  );
}
