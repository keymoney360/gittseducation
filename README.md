# GITTS-Education

Full-stack educational e-book marketplace starter using Node.js, Express, MongoDB Atlas and Safaricom Daraja STK Push.

## Hosting recommendation: Railway

Railway is a suitable alternative to Render for this Node.js application. It is a paid/usage-based hosting service; check its current pricing before deploying. MongoDB Atlas remains the database provider.

## Included
- Blue/black responsive storefront
- Customer registration and login
- KSh 300 registration STK Push
- Two-level referral commissions (KSh 50 / KSh 30)
- Member dashboard, referral link and withdrawal requests
- E-book catalogue and cart-ready order API
- Protected purchased-book access
- Separate admin area
- Book upload, edit price, deactivate
- Payment and withdrawal administration
- Password reset by emailed secure link
- MongoDB models and transaction ledger

## Requirements
- Node.js 20+
- MongoDB Atlas database
- Safaricom Daraja app credentials and approved payment configuration
- SMTP account for password reset email
- Railway account (or another Node.js host)

## Run locally on Windows
1. Install Node.js LTS.
2. Extract this ZIP.
3. Open the extracted `gitts-education` folder.
4. In File Explorer, click the address bar, type `cmd`, and press Enter.
5. Run `npm install`.
6. Copy `.env.example` to `.env`.
7. Fill in `MONGODB_URI` and a long random `SESSION_SECRET`.
8. For local UI testing, you can start with Daraja sandbox credentials. Do not use production credentials in source files.
9. Run `npm run dev`.
10. Open `http://localhost:3000`.

## Create the first administrator
Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` (use a strong unique password of at least 12 characters), then run:
`npm run seed:admin`

Log in at `/login.html`. Admin users are redirected to `/admin.html`. Admin API routes enforce server-side role checks.

## Railway deployment
1. Create a Railway project and deploy this folder from GitHub or upload through a supported deployment workflow.
2. Add all required environment variables from `.env.example` in Railway Variables.
3. Set `NODE_ENV=production`, `BASE_URL` to your public HTTPS domain and `SESSION_COOKIE_SECURE=true`.
4. Add a MongoDB Atlas URI in `MONGODB_URI`.
5. Set the public domain in Railway and configure `MPESA_CALLBACK_URL` as `https://YOUR-DOMAIN/api/payments/mpesa/callback`.
6. Configure Daraja callback URL with Safaricom and verify that the callback is reachable over HTTPS.
7. Run the admin seed command once using Railway's shell/one-off command facility, or create the admin locally against the production database and then remove the temporary credentials.
8. Check `/health`.

## Daraja configuration notes
- Use the correct shortcode, passkey, consumer key and consumer secret from your Daraja app.
- The Buy Goods till/STK configuration must match the transaction type and shortcode arrangement Safaricom has enabled for your merchant. Do not assume a Till number can be used as the BusinessShortCode in every Daraja setup. Confirm the correct shortcode, PartyB and transaction type with Safaricom/your Daraja portal.
- `MPESA_TILL_NUMBER` defaults to 1745713 from the project requirements.
- Start in sandbox. Test success, cancellation, timeout, duplicate callback and incorrect amount scenarios before enabling production.
- The callback is not cryptographically signed by this application. Restrict exposure where Safaricom supports it, log callbacks, reconcile receipts against Daraja records and never rely on a browser redirect as proof of payment.
- This starter does not implement automated B2C disbursements. Admin approval and recording of an M-Pesa receipt are included; the administrator must send the withdrawal separately until Safaricom B2C is separately configured and integrated.

## Important production work before accepting real money
1. **Persistent file storage:** this starter stores uploaded files in `uploads/`. Railway containers may be ephemeral. Configure a persistent volume or replace local upload handling with Cloudinary/S3 object storage before uploading real e-books. The optional Cloudinary variables are reserved for a future object-storage adapter; they are not wired into the upload route.
2. **MongoDB transactions:** commission and payment callback logic uses MongoDB transactions. Use an Atlas replica set (Atlas clusters support this).
3. **Payment reconciliation:** verify each successful receipt against Safaricom transaction records. Callback amount and CheckoutRequestID checks are included, but production reconciliation and operational monitoring are still required.
4. **Withdrawal accounting:** have a Kenyan accountant/legal adviser review the referral and withdrawal model, and obtain any required approvals. A registration-fee-funded referral scheme can raise consumer-protection and pyramid-selling concerns. The marketplace should provide genuine educational products and must not promise guaranteed income.
5. Add privacy policy, terms, refund policy, customer support contacts and data-retention procedures.
6. Configure CSRF protection, stricter security headers/CSP, backups, monitoring and automated tests before production.
7. Ensure all e-books are owned by you or licensed for resale.

## Current limitations
- Storefront cart supports adding/removing books, quantities and checkout through the authenticated order API.
- Upload route currently writes to local disk; configure persistent storage before production.
- Withdrawal approval is administrative/manual; no automated B2C payout integration.
- Admin overview and management APIs are included, but advanced reports/export and audit-event UI can be expanded.
- Daraja credentials and callback details must be supplied by the site owner. This ZIP cannot contain your private credentials.

## Environment variables
See `.env.example`. Never commit `.env` to GitHub.


## Production Daraja troubleshooting update
- `MPESA_ENV` is normalized case-insensitively; use `production` on the live Daraja application.
- Set `MPESA_CALLBACK_URL` to `https://YOUR-RENDER-DOMAIN.onrender.com/api/payments/mpesa/callback`.
- The server accepts `CALLBACK_URL` as a temporary alias, but `MPESA_CALLBACK_URL` is preferred.
- OAuth failure logs now include the HTTP status and Safaricom response body when supplied, without logging credentials.
- Use the Consumer Key and Consumer Secret generated for the same Daraja production app. Do not use sandbox credentials with the production host.
- The Buy Goods shortcode, till number, passkey and transaction type must match the exact STK Push configuration Safaricom approved for the merchant.
