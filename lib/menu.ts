import type { OrderItem } from "./types";

export type MenuMod = { key: string; label: string };

export type MenuItem = {
  id: string;
  name: string;
  emoji: string;
  mods?: MenuMod[];
};

// Stable IDs — P1 (voice) and P2 (vision) must use these exact menu_id values.
export const MENU: MenuItem[] = [
  {
    id: "burger",
    name: "Burger",
    emoji: "🍔",
    mods: [
      { key: "lettuce", label: "lettuce" },
      { key: "cheese", label: "cheese" },
    ],
  },
  { id: "chicken", name: "Chicken", emoji: "🍗" },
  { id: "fries", name: "Fries", emoji: "🍟" },
  { id: "rice", name: "Rice", emoji: "🍚" },
  { id: "broccoli", name: "Broccoli", emoji: "🥦" },
  { id: "soda", name: "Soda", emoji: "🥤" },
];

const BY_ID = new Map(MENU.map((m) => [m.id, m]));

export function getMenuItem(id: string): MenuItem | undefined {
  return BY_ID.get(id);
}

export function menuName(id: string): string {
  return BY_ID.get(id)?.name ?? id;
}

export function modLabel(menuId: string, key: string): string {
  return BY_ID.get(menuId)?.mods?.find((m) => m.key === key)?.label ?? key;
}

/** "No lettuce", "Extra… " style list of mods for display. */
export function describeMods(item: OrderItem): string[] {
  if (!item.mods) return [];
  return Object.entries(item.mods).map(([key, want]) =>
    want ? `with ${modLabel(item.menu_id, key)}` : `no ${modLabel(item.menu_id, key)}`,
  );
}
