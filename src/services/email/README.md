# Email service

Everything the website sends by email lives here.

```
src/services/email/
  index.ts          sendEmail() and the helpers other code imports
  transport.ts      How mail leaves: Gmail (SMTP), Resend, or the terminal while developing
  layout.ts         The shared branded layout, buttons and plain-text version
  templates/        One file per email
    sign-in-code.ts           6-digit code to create an account or sign in
    submission-received.ts    "We've got your race" (and "We've got your changes")
    submission-decision.ts    Approved and live / changes needed / not approved
```

## Choosing how mail is sent

Set these in `.env.local` (first match wins):

| Provider | Variables | Notes |
| --- | --- | --- |
| Gmail | `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Use a Google **App Password** (Google Account → Security → 2-Step Verification → App passwords), not your normal password. Gmail sends up to about 500 emails a day. |
| Resend | `RESEND_API_KEY`, `EMAIL_FROM` | Better for a live site: higher limits, your own domain. |
| None | — | While developing (`npm run dev`), emails are printed in the terminal instead. |

Optional: `EMAIL_FROM_NAME` (default "Stride GH"), `EMAIL_REPLY_TO`, and `SITE_URL` (the address links in emails point to, default `http://localhost:3000`).

Check it works: `npm run email:test -- you@example.com`

## Adding an email

1. Create `templates/your-email.ts` that returns `{ subject, html, text }` using `layout()` from `layout.ts`.
2. Export it from `index.ts`.
3. Send it with `await sendEmail({ to, ...yourEmail(...) })`, or `notify()` when the email is a courtesy and shouldn't block the request.
