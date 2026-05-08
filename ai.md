# PrepWise — AI Interview Practice Platform

## Overview

PrepWise is a full-stack web application that lets users practice job interviews with an AI voice interviewer powered by VAPI. Each session costs ₹10 (paid via Razorpay). After completing an interview the user receives a scored, categorised feedback report.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7, shadcn/ui |
| Backend | Node.js, Express 5, MongoDB (Mongoose 9), Cloudinary (file uploads) |
| AI Interviewer | VAPI (voice AI — `@vapi-ai/web` on frontend) |
| Payments | Razorpay (₹10 per interview session) |
| Auth | JWT (1-hour expiry), bcryptjs password hashing |
| File hosting | Cloudinary (profile pictures + resumes as raw PDFs) |

---

## Project Structure

```
fullstack/
├── backend/
│   └── src/
│       ├── server.js                 Express app entry point
│       ├── db/connect.js             MongoDB connection
│       ├── models/
│       │   ├── User.js               User schema
│       │   └── Interview.js          Interview + feedback schema
│       ├── routes/
│       │   ├── auth.routes.js        /api/auth/*
│       │   ├── interview.routes.js   /api/interviews/*  (all protected)
│       │   └── payment.routes.js     /api/payment/*     (all protected)
│       ├── controller/
│       │   ├── auth/auth.controller.js
│       │   ├── interview/interview.controller.js
│       │   └── payment/payment.controller.js
│       ├── services/
│       │   ├── auth.service.js
│       │   ├── interview.service.js  (PDF parsing, VAPI prompt, feedback scoring)
│       │   └── payment.service.js    (Razorpay order creation + signature verification)
│       ├── middleware/
│       │   ├── auth.middleware.js    JWT verification
│       │   └── upload.middleware.js  Multer (memory storage, 20 MB limit)
│       └── lib/cloudinary.js         Buffer → Cloudinary upload helper
│
└── frontend/
    └── src/
        ├── App.tsx                   Routes (public: /signin /signup, protected: / /interview/:id /feedback/:id)
        ├── context/AuthContext.tsx   Global auth state (user, token) stored in localStorage
        ├── services/api.ts           All fetch calls (auth, interviews, payment)
        ├── components/
        │   ├── ProtectedRoute.tsx    Redirects unauthenticated users to /signin
        │   └── ui/                   shadcn button, input, label, sonner
        └── Pages/
            ├── signin.tsx            Login form
            ├── signup.tsx            Registration (name, email, password, photo, resume)
            ├── dashboard.tsx         Past interviews (real DB data), Pick Interview grid, Account modal
            ├── interview.tsx         Live VAPI voice interview + transcript display
            └── feedback.tsx          Scored feedback breakdown + verdict
```

---

## API Endpoints

### Auth  (`/api/auth`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/signup` | No | Register with optional profile picture + PDF resume |
| POST | `/login` | No | Returns JWT + user object |
| GET | `/profile` | Yes | Fetch full profile including `resumePath` |
| PATCH | `/profile` | Yes | Update name, email, profile picture, resume |

### Interviews (`/api/interviews`) — all protected
| Method | Path | Description |
|---|---|---|
| POST | `/` | Create interview record (requires `paymentId` from Razorpay) |
| GET | `/` | Get current user's interview history |
| GET | `/:id` | Get single interview with feedback |
| POST | `/:id/feedback` | Save VAPI transcript + auto-generate feedback scores |
| GET | `/system-prompt` | Build VAPI system prompt (parses user resume via pdf-parse) |

### Payment (`/api/payment`) — all protected
| Method | Path | Description |
|---|---|---|
| POST | `/create-order` | Create Razorpay order for ₹10 (1000 paise) |
| POST | `/verify` | Verify Razorpay HMAC signature |

---

## MongoDB Schemas

### User
```
fullName, email (unique), password (bcrypt), profilePicturePath (Cloudinary URL), resumePath (Cloudinary URL)
```

### Interview
```
userId (ref User), title, type (Technical|Non-Technical), role, techStack, duration,
status (pending|active|completed), transcript [{role, content}],
feedback { overallScore, categories [{name,score,maxScore,bullets}], verdict, summary },
paymentId, razorpayOrderId
```

---

## User Flow

```
1. Sign up / Sign in
2. Dashboard — browse past interviews or pick a template
3. Click "Take interview" → Razorpay checkout (₹10)
4. Payment verified → Interview record created in DB
5. /interview/:id — VAPI voice call starts automatically
   - Backend builds system prompt from role + tech stack + resume PDF
   - VAPI streams AI voice questions
   - Transcript captured in real time
6. User clicks "Leave interview" (or AI says call complete)
7. Transcript posted to /api/interviews/:id/feedback
8. /feedback/:id — scored breakdown with verdict
```

---

## Environment Variables

### `backend/.env`
```
PORT=3001
MONGODB_URI=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
JWT_SECRET=...
VAPI_PRIVATE_KEY=8951efd6-0cf7-4bfe-b0bc-bd8b39ef041f
RAZORPAY_KEY_ID=...        # from Razorpay dashboard
RAZORPAY_KEY_SECRET=...    # from Razorpay dashboard
```

### `frontend/.env`
```
VITE_VAPI_PUBLIC_KEY=...        # from https://dashboard.vapi.ai → Account → Public Key
VITE_RAZORPAY_KEY_ID=...        # same key ID as backend (safe to expose)
```

---

## Key Implementation Notes

### Payment flow
- Payment is initiated on the dashboard before any interview record exists.
- After successful Razorpay verification the frontend calls `POST /api/interviews` with the `paymentId`.
- If `VITE_RAZORPAY_KEY_ID` is not set in frontend `.env`, payment is skipped (dev mode).

### VAPI interview
- Uses `@vapi-ai/web` SDK initialised with `VITE_VAPI_PUBLIC_KEY`.
- On mount, `GET /api/interviews/system-prompt` is called — the backend downloads the user's resume from Cloudinary, parses it with `pdf-parse`, and injects up to 3000 chars into the GPT-4o-mini system prompt.
- Transcript messages are accumulated in a `useRef` so none are lost on re-render.
- On `call-end`, transcript is POSTed to `/api/interviews/:id/feedback` and the user is navigated to `/feedback/:id`.

### Feedback scoring
- Automatic rule-based scoring (5 categories × 20 points = 100 total).
- Scoring is based on response count, average word count, and engagement.
- Verdict thresholds: ≥70 → Recommended, ≥50 → Maybe, <50 → Not Recommended.
- The service (`interview.service.js → generateFeedback`) can be replaced with an LLM call for richer analysis.

### Resume
- Uploaded at signup (optional) or updated in Account Details modal.
- If a resume exists, the Account Details modal shows a **Download** link (direct Cloudinary URL).
- The user can upload a replacement resume at any time from the Account Details modal.
- Backend reads the resume PDF at interview start to personalise AI questions.

### Protected routes
- `ProtectedRoute` component wraps all non-auth pages.
- Checks `auth.token` and `auth.user` from `AuthContext` (persisted in `localStorage`).
- Unauthenticated requests redirect to `/signin`.

---

## Running Locally

```bash
# Backend (port 3001)
cd backend && npm run dev

# Frontend (port 5173)
cd frontend && npm run dev
```

---

## Still Required from User

1. **VAPI Public Key** — add to `frontend/.env` as `VITE_VAPI_PUBLIC_KEY`
   - Get from: https://dashboard.vapi.ai → Account Settings → Public Key
2. **Razorpay Key ID + Secret** — add to both `.env` files
   - Get from: https://dashboard.razorpay.com → Settings → API Keys
   - `RAZORPAY_KEY_ID` goes in both backend and frontend `.env`
   - `RAZORPAY_KEY_SECRET` goes in backend `.env` only
