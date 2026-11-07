"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { assignCubby, createOrder, inspectOrder, pickupOrder, USE_MOCK } from "@/lib/api";
import { DEMO_PHOTOS } from "@/lib/demoPhotos";
import { stripDataUrl, toJpegDataUrl } from "@/lib/image";
import type { Order, OrderItem, Verdict } from "@/lib/types";
import { useOrders } from "@/lib/useOrders";
import { DemoControls } from "./DemoControls";
import { TicketCard } from "./TicketCard";

type Toast = { kind: "ok" | "err"; msg: string };

/** Pick a plausible demo photo for an order (used by "Inspect" demo buttons). */
function demoPhotoFor(order: Order): string {
  const ids = order.items.map((i) => i.menu_id);
  const burger = order.items.find((i) => i.menu_id === "burger");
  if (burger && ids.includes("fries")) return "/demo/burger-fries.svg";
  if (burger) return burger.mods?.lettuce === false ? "/demo/burger-no-lettuce.svg" : "/demo/burger-lettuce.svg";
  if (ids.includes("chicken")) return "/demo/chicken-rice-broccoli.svg";
  if (ids.includes("fries")) return "/demo/fries-soda.svg";
  return DEMO_PHOTOS[0].src;
}

export default function Dashboard() {
  const { orders, inspections, error, refresh } = useOrders();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const byStatus = useMemo(() => {
    const all = orders ?? [];
    return {
      // Flagged first so problems are impossible to miss, then oldest first.
      waiting: all
        .filter((o) => o.status === "pending" || o.status === "flagged")
        .sort((a, b) => Number(b.status === "flagged") - Number(a.status === "flagged") || a.id - b.id),
      inCubby: all.filter((o) => o.status === "in_cubby").sort((a, b) => (a.cubby ?? 0) - (b.cubby ?? 0)),
      delivered: all
        .filter((o) => o.status === "delivered")
        .sort((a, b) => b.id - a.id)
        .slice(0, 6),
    };
  }, [orders]);

  const selected = orders?.find((o) => o.id === selectedId) ?? null;

  const run = useCallback(
    async (fn: () => Promise<string | void>) => {
      setBusy(true);
      try {
        const msg = await fn();
        if (msg) setToast({ kind: "ok", msg });
      } catch (e) {
        setToast({ kind: "err", msg: e instanceof Error ? e.message : String(e) });
      } finally {
        setBusy(false);
        refresh();
      }
    },
    [refresh],
  );

  const handleCreate = (items: OrderItem[]) =>
    run(async () => {
      const o = await createOrder({ items });
      setSelectedId(o.id);
      return `Created order #${o.id}`;
    });

  const handleInspect = (verdict: Verdict) =>
    run(async () => {
      if (!selected) return;
      const image = stripDataUrl(await toJpegDataUrl(demoPhotoFor(selected)));
      const ins = await inspectOrder(selected.id, image, { force: verdict });
      if (ins.verdict === "pass") return `#${selected.id} verified ✓`;
      if (ins.verdict === "retake") return `#${selected.id}: please retake photo`;
      return `#${selected.id} flagged: ${ins.differences.join("; ")}`;
    });

  const handleAssign = (id: number, override = false) =>
    run(async () => {
      const o = await assignCubby(id, override ? { override: true } : {});
      return `#${o.id} → cubby ${o.cubby}`;
    });

  const handlePickup = (id: number) =>
    run(async () => {
      const o = await pickupOrder(id);
      return `#${o.id} picked up`;
    });

  const confirmSwap = (flaggedId: number, swapId: number) => {
    if (
      window.confirm(
        `Reassign this meal to Order ${swapId}?\n\nOrder ${swapId} goes into a cubby. Order ${flaggedId} stays flagged until its correct meal is made.`,
      )
    ) {
      handleAssign(swapId, true);
    }
  };

  const confirmOverride = (id: number) => {
    if (window.confirm(`Staff override: put Order ${id} in a cubby even though it was flagged?`)) {
      handleAssign(id, true);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 bg-graphite px-6 py-4 text-apricot">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden>
            🗄️
          </span>
          <h1 className="text-2xl font-black tracking-tight md:text-3xl">Front House Cubbies</h1>
          {USE_MOCK && (
            <span className="rounded-full bg-coral px-2.5 py-0.5 text-xs font-bold tracking-wider text-graphite uppercase">
              Mock data
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {error && <span className="text-sm font-semibold text-coral">⚠ {error}</span>}
          <Link
            href="/camera"
            target="_blank"
            className="rounded-full bg-navy px-4 py-2 text-sm font-bold text-white hover:bg-navy-dark"
          >
            📷 Camera
          </Link>
        </div>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-5 p-5 lg:grid-cols-3">
        <Column title="Waiting to be made" count={byStatus.waiting.length} accent="bg-coral">
          {byStatus.waiting.map((o) => (
            <TicketCard
              key={o.id}
              order={o}
              latest={inspections[o.id]?.[0]}
              selected={o.id === selectedId}
              onSelect={() => setSelectedId(o.id)}
              onConfirmSwap={(swapId) => confirmSwap(o.id, swapId)}
              onOverride={() => confirmOverride(o.id)}
              busy={busy}
            />
          ))}
        </Column>
        <Column title="In cubby" count={byStatus.inCubby.length} accent="bg-verified">
          {byStatus.inCubby.map((o) => (
            <TicketCard
              key={o.id}
              order={o}
              selected={o.id === selectedId}
              onSelect={() => setSelectedId(o.id)}
              onPickup={() => handlePickup(o.id)}
              busy={busy}
            />
          ))}
        </Column>
        <Column title="Delivered" count={byStatus.delivered.length} accent="bg-graphite">
          {byStatus.delivered.map((o) => (
            <TicketCard key={o.id} order={o} selected={o.id === selectedId} onSelect={() => setSelectedId(o.id)} />
          ))}
        </Column>
      </main>

      {toast && (
        <div
          className={`pop-in fixed bottom-4 left-1/2 z-50 max-w-md -translate-x-1/2 rounded-xl px-4 py-3 text-base font-semibold shadow-xl ${
            toast.kind === "ok" ? "bg-graphite text-apricot" : "bg-strawberry text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <DemoControls
        selected={selected}
        busy={busy}
        onCreate={handleCreate}
        onInspect={handleInspect}
        onAssign={() => selected && handleAssign(selected.id)}
        onPickup={() => selected && handlePickup(selected.id)}
      />
    </div>
  );
}

function Column({
  title,
  count,
  accent,
  children,
}: {
  title: string;
  count: number;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-col rounded-3xl bg-apricot-light/70 p-4">
      <h2 className="mb-4 flex items-center gap-3 text-2xl font-black">
        <span className={`h-4 w-4 rounded-full ${accent}`} />
        {title}
        <span className="ml-auto rounded-full bg-graphite px-3 py-0.5 text-lg text-apricot tabular-nums">{count}</span>
      </h2>
      <div className="flex flex-col gap-4">
        {count === 0 ? <p className="py-8 text-center text-lg text-graphite-soft">Nothing here</p> : children}
      </div>
    </section>
  );
}
