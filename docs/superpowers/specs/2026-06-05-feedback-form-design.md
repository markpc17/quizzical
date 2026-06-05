# Feedback Form Design

**Date:** 2026-06-05
**Status:** Approved

---

## Overview

A floating "Feedback" button pinned to the bottom-right of every page opens a centered modal form. The form collects an emoji rating (5 options) and a free-text message, then submits directly to Formspree. No backend changes required.

---

## Components

### `components/feedback/FeedbackButton.tsx`

- Fixed position, bottom-right corner (`fixed bottom-6 right-6 z-50`)
- Styled with `bg-brand-purple`, `font-fredoka`, rounded pill shape
- Label: "Feedback"
- Manages `isOpen` boolean state; passes it and a setter to `FeedbackModal`
- Hides itself when the modal is open (avoids visual overlap)

### `components/feedback/FeedbackModal.tsx`

Receives `isOpen` and `onClose` props.

**Three internal states:**
1. **Form** — default; shows rating + message + submit
2. **Success** — replaces form content with "Thanks for your feedback! ⚡"; auto-closes after 3 seconds
3. **Error** — shows an inline error message below the submit button; form remains editable

**Form fields:**
- Emoji rating row: `😞 😐 🙂 😄 🤩` — each is a button; selected emoji gets `ring-2 ring-brand-yellow` highlight. Rating is required before submission.
- Message textarea: placeholder "Tell us what you think…", no character limit enforced client-side, not required.
- Submit button: disabled while submitting; shows "Sending…" during the fetch.

**Submission:**
```
POST https://formspree.io/f/xgobvprb
Content-Type: application/json
Body: { "rating": "😄", "message": "Great game!" }
```

Formspree returns 200 on success, 4xx/5xx on error. Any non-ok response triggers the error state.

**Overlay:** Semi-transparent backdrop (`bg-black/60`) closes the modal on click. ESC key also closes.

**Visual style:**
- Modal card: `bg-brand-card border border-white/10 rounded-2xl p-6`
- Title: `font-fredoka text-2xl text-white`
- Consistent with existing lobby/results card patterns

---

## Integration

Mounted once in `app/layout.tsx` so it appears on every route without touching individual pages:

```tsx
// app/layout.tsx
import { FeedbackButton } from '@/components/feedback/FeedbackButton'

// Inside <body>:
<FeedbackButton />
```

No Supabase changes. No new API routes. No new dependencies (plain `fetch` to Formspree).

---

## File Map

| File | Action |
|------|--------|
| `components/feedback/FeedbackButton.tsx` | Create |
| `components/feedback/FeedbackModal.tsx` | Create |
| `app/layout.tsx` | Modify — add `<FeedbackButton />` |

---

## Out of Scope

- Formspree spam filtering configuration (handled in Formspree dashboard)
- Storing feedback in Supabase
- Showing past feedback to the organiser
