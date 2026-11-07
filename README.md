# NOVA_Hackathon_FFC
Repo for the 2026 NOVA Hackathon for the Flushi_Fan_Club Team
Bhavi

## Front House: AI-verified pickup

Staff speak an order → it becomes a ticket. When the meal is ready, staff pick the ticket on a phone and photograph
the meal. A vision model checks it against the ticket: match → **READY FOR PICKUP**; mismatch → **CHECK ORDER** with
the exact problem ("ticket says no lettuce, lettuce detected"). At pickup someone says "Order 21".

| Route     | Who sees it                 | What it is                                                                            |
| --------- | --------------------------- | ------------------------------------------------------------------------------------- |
| `/`       | Projector / TV              | Passive departures-style board. Read-only, no buttons. Polls every 1.5s.              |
| `/camera` | Staff phone                 | Pick ticket → photo → result. The only place a swap gets confirmed.                   |
| `/dev`    | Team only (never projected) | Demo controls, forced mock results, **Run demo script**.                              |

## Run it

```bash
npm install
echo "NEXT_PUBLIC_USE_MOCK=true" > .env.local   # mock mode (no backend needed)
npm run dev                                       # http://localhost:3000
```

The dev server listens on your LAN, so a phone on the same Wi-Fi can open `http://<laptop-ip>:3000/camera`
(find the IP with `ipconfig getifaddr en0` on a Mac).

### Mock vs real backend

- **Mock:** `NEXT_PUBLIC_USE_MOCK=true` in `.env.local`. State lives in the browser's localStorage and syncs across
  tabs in the **same browser** (board tab + camera tab + /dev tab). A phone and a laptop do **not** share mock state.
- **Real:** delete that line (or set it to `false`) and restart `npm run dev`. All calls go to P3's `/api/...` routes.
- **Emergency switch:** on `/dev`, "Force mock in this browser" flips that browser to mock without a restart (the
  board picks it up on its next poll). Use it if the backend dies mid-demo.

## `lib/actions.ts`: the only functions teammates call to change state

```ts
import { submitVoiceOrder, submitMealPhoto, confirmSwap, pickupOrder } from "@/lib/actions";
```

| Function                                   | Who calls it, and when                                        | Backend call(s) in real mode                                                         |
| ------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `submitVoiceOrder({ items })`              | P1, after staff confirm the voice confirmation card            | `POST /api/orders` `{ items }` → `Order`                                             |
| `submitMealPhoto(orderId, imageBase64)`    | `/camera`, after a ticket is picked and a photo taken          | `POST /api/orders/:id/inspect` `{ image }` → `Inspection`; on `pass`, then `POST /api/orders/:id/assign-cubby` `{}` |
| `confirmSwap(flaggedOrderId, actualOrderId)` | `/camera`, only when staff tap "Confirm swap" (never the board) | `POST /api/orders/:actualOrderId/assign-cubby` `{ override: true }` → `Order`        |
| `pickupOrder(orderId)`                     | P1's "Order 21" pickup screen                                 | `POST /api/orders/:id/pickup` → `Order`                                              |

- `submitMealPhoto` shows **VERIFYING** on the board while the check runs, then: pass → READY FOR PICKUP automatically
  (no human step); flag → stays CHECK ORDER; retake → stays PREPARING.
- "Cubby" in the contract (`in_cubby`, `cubby`, `assign-cubby`) just means **ready for pickup**. The UI never shows
  cubbies. The contract in `lib/types.ts` is unchanged.

### Read-only calls (board and camera)

| Call                                         | Returns                                         | If missing                          |
| -------------------------------------------- | ----------------------------------------------- | ----------------------------------- |
| `GET /api/orders`                            | `Order[]`                                       | board shows "OFFLINE · RETRYING"    |
| `GET /api/orders/:id/inspections`            | `Inspection[]`, newest first                    | falls back to `flag_reason`         |
| `GET /api/inspecting`                        | `{ order_ids: number[] }` (inspect in flight)   | VERIFYING just isn't shown          |

All endpoints live in one table, `ENDPOINTS` in `lib/api.ts`.

### Board statuses

| Contract status                    | Board shows                                  |
| ---------------------------------- | -------------------------------------------- |
| `pending`                          | PREPARING                                    |
| `pending`/`flagged` + check running | VERIFYING (coral, pulsing)                  |
| `flagged`                          | CHECK ORDER + differences + POSSIBLE SWAP WITH #N |
| `in_cubby`                         | READY FOR PICKUP (green)                     |
| `delivered`                        | PICKED UP (after a green flash), fades out after ~10s |

## Demo script

**Automatic (backup / video):** open `/` on the projector and `/dev` in another tab of the **same browser**, then
click **Run demo script**. It resets the mock data and plays, 3.5s apart:

1. Voice order **#21**: burger with lettuce
2. Voice order **#22**: burger, **no lettuce**
3. Photo for #22 (actually #21's burger) → **CHECK ORDER**: "ticket says no lettuce, lettuce detected",
   **POSSIBLE SWAP WITH #21**
4. `confirmSwap(22, 21)` → #21 **READY FOR PICKUP**
5. Retake photo for #22 (correct burger) → passes → #22 **READY FOR PICKUP**
6. Pick up #21 → flash → PICKED UP
7. Pick up #22

**Live:** say the two burger orders to P1's voice screen; on the phone open `/camera`, pick #22, photograph the burger
*with* lettuce → flagged with a possible swap → tap "Yes, #21". Retake #22 with the right burger → passes. Say
"Order 21", then "Order 22". If the camera or Wi-Fi fails, tap "Camera not working? Use demo photo". In mock mode,
set the expected result first on `/dev` ("Mock photo checks will… flag / pass").

Demo photos are placeholders in `public/demo/`. Replace them and update `lib/demoPhotos.ts`.
