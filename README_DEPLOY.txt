HOME TASTE — CLOUDFLARE WORKERS + D1 DEPLOYMENT
================================================

This package converts the original Home Taste Node/JSON website to a Cloudflare Worker with D1 persistent storage. The customer website and admin panel use the same responsive HTML/CSS/JS assets.

IMPORTANT SECURITY BEFORE GO-LIVE
- The first admin login is username: admin / password: HomeTaste@123.
- Sign in immediately after deployment and change the password in Admin > Settings.
- Choose a new password of at least 12 characters. The password is stored using PBKDF2-SHA256; sessions expire after 12 hours.
- Do not share Cloudflare passwords, API tokens or recovery codes.

DATABASE
- D1 binding name: DB
- Database name: home-taste-prod
- Apply schema.sql to the remote D1 database before deployment. The Worker initializes menu/settings data on first request.
- Orders and customers are stored in separate D1 tables. Settings, products, categories, coupons and expenses are stored in app_state.

DEPLOY WITH GITHUB + CLOUDFLARE DASHBOARD (NO LOCAL CMD REQUIRED)
1. Create a private GitHub repository named home-taste-cloudflare.
2. Upload the CONTENTS of this folder to the repository root (not the parent folder).
3. In Cloudflare Dashboard > Workers & Pages > Create application > Workers > Import a repository, connect GitHub and select this repository.
4. Set build command to: npm install
   Set deploy command to: npx wrangler deploy
   Set root directory to: / (repository root).
5. Before first deploy, replace PASTE_YOUR_D1_DATABASE_ID_HERE in wrangler.jsonc with the D1 database ID shown in Cloudflare > Storage & Databases > D1 > home-taste-prod.
6. In D1 > home-taste-prod > Console, run the contents of schema.sql (paste and execute). Do not run destructive DROP commands.
7. Trigger deployment. Cloudflare will assign a URL ending in workers.dev.
8. Test the customer URL, then open /admin and sign in using the temporary credentials above.
9. Change the password immediately in Admin > Settings. Sign in again after the password change.

ROUTES
- Customer site: https://YOUR-WORKER.workers.dev/
- Admin panel: https://YOUR-WORKER.workers.dev/admin
- API: /api/*

NOTES
- The worker does not need a separate Express server or local JSON file.
- WhatsApp ordering opens WhatsApp for the customer to review and send; it does not send automatically.
- Distance is entered by the customer and must be manually verified against the real delivery route.
- Before accepting real customer orders, test a sample order and confirm it appears in Admin > Orders.
