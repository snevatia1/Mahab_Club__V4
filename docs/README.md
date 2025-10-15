
# Club Mahabaleshwar — Booking (Public Calendar + Wizards)

This repo shows a **public, OTP-free six-month availability calendar** and **booking wizards** per the MC-approved policy.
- All tariffs are **inclusive of GST**.
- Terminology retains **Temporary Member**.
- Counts of FREE/BOOKED rooms are visible; clicking dates shows **room numbers with attributes**.
- The Assistant suggests **split-stay transfers** when needed.

## Structure
- `/index.html` — main UI (public)
- `/css/style.css` — styles
- `/js/*.js` — split modules (calendar, loader, app)
- `/assets/logo/clubmahabaleshwar_logo.png` — logo
- `/data/rooms.json` — room master with attributes
- `/data/config/*.json` — tariffs, rules, restricted periods, long weekends
- `/data/samples/bookings.json` — placeholder ledger for demos
- `.nojekyll` + `env.txt` — GitHub Pages compatible

## Deploy (GitHub Pages)
1. Create a new repo and upload these files (or upload `club-booking-repo-full.zip`).
2. Settings → Pages → Source = `main` (or default) / root.
3. Open the Pages URL. The calendar and wizards work immediately.

## Next Steps (LIVE mode)
- Add OTP and dues endpoints; replace sample booking logic with live ledger.
- Expand `rooms.json` with complete inventory (attributes already supported).
- Wire invoices/confirmations and Admin JSON editor (no-code).

