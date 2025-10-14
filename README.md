# Club Mahabaleshwar – Booking App (V5c with Assistant)

**No installs. Fully browser-based.**

- Member app: `/client/`
- Assistant (text + voice): `/client/assistant.html`
- Inventory Matrix: `/client/matrix.html`
- My Bookings (test/local): `/client/my-bookings.html`
- Admin console: `/admin/`
- Admin Forms (safe editors): `/admin/forms.html`
- Data: `/data/` (policies.json, tariff.json, promotions.json, calendar.json, rooms.json, members.csv)

## Quick start
1. Upload all folders (`client/`, `admin/`, `data/`, `README.md`) to your GitHub repo (root). Commit.
2. Settings → Pages → Build from branch (main, root). Open the published URL.
3. To test without OTP/payment, turn **Test Mode: On** in Admin Forms → Policies and re-upload `policies.json` to `/data/`.

## Assistant
- Open `/client/assistant.html`. Speak or type. Click **Apply to App** and finish on the main page.
- Optional AI replies require a serverless proxy (Vercel/Netlify/Cloudflare). Do **not** put API keys in client files.
