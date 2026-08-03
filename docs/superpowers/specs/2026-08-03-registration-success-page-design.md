# Registration Success Page Design

**Date:** 2026-08-03
**Status:** Approved in conversation
**Repository:** `jimbo90015/workshop-registration`

## Problem

The registration form currently handles a successful webhook response by showing a small status message at the bottom of the form and immediately resetting every field (`index.html:730-735`). A person who has just submitted a long form remains on the same page, so the completion state is easy to miss and the flow feels unfinished.

## Goal

After the webhook confirms success, move the person to a dedicated success page that:

- makes completion unmistakable;
- shows only a concise summary;
- tells them to check their confirmation email;
- supports both workshop registration and new-workshop notifications;
- preserves Traditional Chinese, Simplified Chinese, and English;
- keeps personal data out of the URL.

No webhook, CRM, catalog, payment, or confirmation-email changes are in scope.

## Chosen Experience

Use the approved **A — Focused confirmation** layout:

1. Green success checkmark and clear success heading.
2. Email address receiving the confirmation or notification.
3. A compact summary card.
4. A short next-step message telling the person to check their email.
5. A button returning to the registration form.

The page keeps the existing warm beige, orange, and teal visual language. It remains a narrow, mobile-first card and respects `prefers-reduced-motion`.

## User Flows

### Workshop registration

1. The person submits with `intent: "register"`.
2. The existing webhook returns an HTTP success response and does not return `ok: false`.
3. The form stores a small success-state object in `sessionStorage`.
4. The browser navigates to `./success.html`.
5. The page shows:
   - “Registration successful” in the active language;
   - email;
   - workshop name;
   - ticket name;
   - seat count;
   - confirmation-email next step.

### New-workshop notification

1. The person submits with `intent: "notify"`.
2. The same webhook success rule is met.
3. The form stores notification success state and navigates to `./success.html`.
4. The page shows:
   - “Notification registered” in the active language;
   - email;
   - a message that they will be notified when a new workshop opens.
5. Ticket and seat rows are omitted.

### Submission failure

If the webhook request fails, returns a non-2xx response, or returns `ok: false`, the browser stays on the form. Existing field values remain intact and the existing localized error status is shown. No success state is written.

### Direct or stale success-page visit

If `success.html` cannot read a valid success state, it must not claim that a registration succeeded. It shows a localized “No recent registration details found” state and a button back to the form.

## Success-State Contract

Use one namespaced key, `workshop_registration_success`, in `sessionStorage`.

```json
{
  "version": 1,
  "intent": "register",
  "lang": "zh-Hant",
  "email": "person@example.com",
  "workshopName": "AI Agent Workshop - London",
  "ticketName": "Standard Ticket",
  "seatCount": 1
}
```

Rules:

- `version`, `intent`, `lang`, and `email` are required.
- `workshopName`, `ticketName`, and `seatCount` are included only for registration.
- The state is created only after the server confirms success.
- The form removes any old value before beginning a new submission, preventing an earlier success from being reused after a failed attempt.
- The success page validates the required fields and allowed enum values before rendering success.
- The value remains available for refreshes in the same tab and naturally disappears when that tab is closed.
- No email address or summary field is placed in query parameters, hashes, analytics events, or page titles.

## Page and Component Changes

### `index.html`

Replace the current success-only block at `index.html:730-735` with:

1. Build the concise success state from the submitted payload and selected ticket plan.
2. Save it under `workshop_registration_success`.
3. Navigate with `window.location.assign("./success.html")`.

Keep the existing error path and button reset logic. The form no longer needs to reset after success because navigation leaves the page.

### `success.html`

Add a self-contained static page with:

- the same color tokens, typography, logo treatment, card width, and responsive spacing as the form;
- the existing three-language switcher;
- a small local translation dictionary for success, summary labels, fallback text, and the return button;
- a success renderer for `register` and `notify`;
- a fallback renderer for missing or invalid state;
- semantic heading order, visible keyboard focus, and an `aria-live` region for rendered content;
- a relative return link to `./`, so it works under the GitHub Pages repository path.

The email copy must say the confirmation **will be sent** rather than claiming delivery has already happened.

## Error Handling

- Webhook errors continue to use the existing localized inline error message.
- Invalid JSON from the webhook remains handled by the existing empty-object fallback.
- Invalid or missing success state renders the fallback page.
- Optional registration summary values are hidden rather than rendered blank.
- The success page escapes all values by assigning through `textContent`; it does not inject stored values with `innerHTML`.

## Testing

### Automated checks

Extend the repository’s existing `node:test` style to verify that:

1. `index.html` writes the namespaced `sessionStorage` state only in the successful response path.
2. `index.html` navigates to `./success.html`.
3. The state contains only the approved concise fields.
4. `success.html` supports `register`, `notify`, and missing-state rendering.
5. Traditional Chinese, Simplified Chinese, and English strings exist.
6. The success page uses `textContent` for stored values and does not put email in its URL.

### Browser verification

Verify on desktop and mobile widths:

1. Successful registration navigates and shows workshop, ticket, seats, and email.
2. Successful notification navigates and hides ticket details.
3. All three languages are preserved and can be switched.
4. Refresh retains the result in the same tab.
5. Directly opening `success.html` shows the fallback state.
6. A mocked webhook failure stays on the form and preserves entered values.
7. The address bar never contains the email or other submitted personal data.

## Acceptance Criteria

- A successful registration or notification always leaves the form and opens `success.html`.
- A failed submission never opens `success.html`.
- The page matches the approved focused-confirmation layout.
- Registration and notification content differ appropriately.
- Language preference is preserved for all three supported languages.
- Personal data is absent from the URL.
- Missing success state never produces a false success claim.
- Existing catalog, ticket, intent, validation, and webhook behavior remain unchanged.
