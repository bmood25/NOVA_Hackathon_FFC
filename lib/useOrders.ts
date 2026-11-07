"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getInspections, getOrders, subscribe } from "./api";
import type { Inspection, Order } from "./types";

const POLL_MS = 2000;

/** Orders + latest inspection per order, refreshed every 2s and on mock change events. */
export function useOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [inspections, setInspections] = useState<Record<number, Inspection[]>>({});
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const again = useRef(false);

  const refresh = useCallback(async (): Promise<void> => {
    if (inFlight.current) {
      again.current = true; // a change arrived mid-fetch; re-run when done
      return;
    }
    inFlight.current = true;
    try {
      const next = await getOrders();
      setOrders(next);
      setError(null);
      // Only fetch inspection history for orders that need it on screen.
      const needs = next.filter((o) => o.status === "flagged" || o.status === "pending");
      const pairs = await Promise.all(
        needs.map(async (o) => [o.id, await getInspections(o.id)] as const),
      );
      setInspections(Object.fromEntries(pairs));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      inFlight.current = false;
    }
    if (again.current) {
      again.current = false;
      await refreshRef.current();
    }
  }, []);
  const refreshRef = useRef(refresh);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    refresh();
    const t = setInterval(refresh, POLL_MS);
    const unsub = subscribe(refresh);
    return () => {
      clearInterval(t);
      unsub();
    };
  }, [refresh]);

  return { orders, inspections, error, refresh };
}
