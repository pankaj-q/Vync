# Vync — Real-Time Chat Application

A full-stack real-time messaging app with message reactions, edit/delete/reply/forward, voice messages, message search, typing indicators, read receipts, online presence, media sharing (local disk or S3), Google OAuth, email verification, and profile editing.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, JSX, Vite, React Router 7, framer-motion, lucide-react |
| **Backend** | Node.js, Express 5, Socket.io 4 |
| **Database** | MongoDB Atlas (Mongoose 9) |
| **Cache** | Redis (ioredis) — typing presence, online status, rate limiting |
| **Auth** | JWT (jsonwebtoken, HS256) + bcryptjs + Passport (Google OAuth 2.0) |
| **Email** | nodemailer (Gmail SMTP) — verification emails |
| **Media** | Multer → local `public/uploads/` OR AWS S3 (`multer-s3`) |
| **Security** | helmet, CORS allowlist, Redis rate limiting, input validation |

---

## Project Structure

```
chatting/
├── backend/
│   ├── src/
│   │   ├── app.js                  # Express app, CORS, helmet, routes, static serving
│   │   ├── server.js               # Entry point — loads env, connects DB, starts HTTP + Socket.io
│   │   ├── config/
│   │   │   ├── db.js               # MongoDB connection
│   │   │   ├── redis.js            # Redis client (supports REDIS_URL for cloud Redis)
│   │   │   ├── socket.js           # Socket.io — JWT auth, rooms, events
│   │   │   └── passport.js         # Google OAuth strategy (find-or-create user)
│   │   ├── controller/
│   │   │   ├── user.controller.js  # register, login, verifyEmail, resendVerification, searchUsers, getMe, updateProfile
│   │   │   ├── message.controller.js # send, get, edit, delete, forward, react, search, markAsRead
│   │   │   └── conversation.controller.js # createOrGet, list
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js   # JWT verification → req.user
│   │   │   ├── multer.middleware.js # File upload (local disk with S3 fallback)
│   │   │   ├── rateLimit.js        # Redis-based rate limiter
│   │   │   └── errorHandler.js     # Central error handler (hides internals in production)
│   │   ├── model/
│   │   │   ├── user.model.js       # User schema (name, email, password, bio, avatarUrl, googleId, isVerified...)
│   │   │   ├── message.model.js    # Message schema (conversation, sender, content, reactions, media...)
│   │   │   └── conversation.model.js # Conversation schema (participants, lastMessage)
│   │   ├── routes/
│   │   │   ├── auth.routes.js      # GET /google, /google/callback
│   │   │   ├── userRoutes.js       # /register, /login, /verify-email, /resend-verification, /profile, /me, /search
│   │   │   ├── message.routes.js   # POST /, GET /:conversationId, PUT /:id, DELETE /:id, /:id/react, /:conversationId/search, /forward, /read
│   │   │   ├── conversation.routes.js # POST /, GET /
│   │   │   └── file.js             # POST /upload (auth required)
│   │   └── utils/
│   │       ├── catchAsync.js       # Wrap async route handlers
│   │       ├── AppError.js         # Error class with statusCode
│   │       └── email.js            # Nodemailer transporter + verification email
│   ├── public/uploads/             # Local media storage (when S3 not configured)
│   ├── .env                        # Environment variables (NOT committed)
│   ├── .env.example                # Template for all env vars
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.jsx                # React DOM entry point
│   │   ├── App.jsx                 # Router (/, /login, /verify-email, /oauth-callback, /dashboard)
│   │   ├── index.css               # White + light green theme, responsive
│   │   └── pages/
│   │       ├── Dashboard.jsx       # Parent — socket logic, state, API calls
│   │       ├── Sidebar.jsx         # Profile, search, conversation list, profile modal
│   │       ├── ChatWindow.jsx      # Messages, reactions, search bar, voice recorder, input
│   │       ├── Register.jsx        # Registration + "Continue with Google"
│   │       ├── login.jsx           # Login + resend verification
│   │       ├── VerifyEmail.jsx     # Email verification status page
│   │       └── OAuthCallback.jsx   # Handles Google OAuth redirect (stores token)
│   ├── dist/                       # Production build (served by backend)
│   ├── vite.config.js              # Dev proxy: /api, /socket.io, /uploads → localhost:5005
│   └── package.json
└── README.md
```

---

## API Endpoints

### Auth & Users

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/users/register` | No | Register new user (sends verification email) |
| POST | `/api/users/login` | No | Login; blocks unverified accounts when SMTP is configured |
| GET | `/api/users/verify-email?token=` | No | Verify email address |
| POST | `/api/users/resend-verification` | No | Resend verification email |
| GET | `/api/users/me` | Yes | Get current user profile |
| GET | `/api/users/search?q=` | Yes | Search users by name/email |
| PUT | `/api/users/profile` | Yes | Update name/bio/avatar (multipart) |
| GET | `/api/auth/google` | No | Initiate Google OAuth (redirects to Google) |
| GET | `/api/auth/google/callback` | No | OAuth callback → redirects to `/oauth-callback?token=...` |

### Conversations

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/conversations` | Yes | List user's conversations (populated) |
| POST | `/api/conversations` | Yes | Create or get existing 1-on-1 conversation |

### Messages

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/messages/:conversationId` | Yes | Fetch messages (paginated, 50 per page) |
| POST | `/api/messages` | Yes | Send a message |
| PUT | `/api/messages/:id` | Yes | Edit own message |
| DELETE | `/api/messages/:id` | Yes | Soft-delete own message |
| PUT | `/api/messages/:id/react` | Yes | Toggle reaction emoji on a message |
| GET | `/api/messages/:conversationId/search?q=` | Yes | Search messages in a conversation |
| POST | `/api/messages/forward` | Yes | Forward message to another conversation |
| POST | `/api/messages/read` | Yes | Mark conversation messages as read |

### Files

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/files/upload` | Yes | Upload file (image/video/audio/document), returns URL |

> **Authorization note:** Every conversation-scoped endpoint verifies the requesting user is a participant (returns 403 otherwise). Socket `join-conversation` is also membership-checked.

---

## Socket.io Events

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `join-conversation` | `conversationId` | Join room (verified against DB membership) |
| `leave-conversation` | `conversationId` | Leave room |
| `typing` | `{ conversationId, isTyping }` | Typing indicator on/off |

### Server → Client

| Event | Payload | Sent To |
|---|---|---|
| `new-message` | `Message` (populated) | All participants **except** sender (`user:${id}`) |
| `message-edited` | `Message` (populated) | All participants except editor |
| `message-deleted` | `{ _id, content, isDeleted }` | All participants except deleter |
| `message-reacted` | `{ messageId, conversationId, reactions }` | All participants except reactor |
| `user-typing` | `{ userId, conversationId, isTyping }` | Conversation room except typer |
| `user-status` | `{ userId, status }` | All connected clients |
| `messages-read` | `{ conversationId, userId }` | Conversation room |

### Socket Rooms

- `user:${userId}` — Each user gets their own room on connect. Used for private message delivery.
- `conversation:${conversationId}` — Participants join on conversation open. Used for typing indicators and read receipts.

---

## Setup & Run (Local Dev)

### Prerequisites
- Node.js 18+
- MongoDB Atlas (or local MongoDB)
- Redis — local (`redis-server`) or cloud (`REDIS_URL`)

### 1. Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in values:

```bash
cp backend/.env.example backend/.env
```

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | Backend port (default `5005`) |
| `MONGO_URI` | Yes | MongoDB connection string (Atlas) |
| `JWT_SECRET` | Yes | Access token secret — use `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | Yes | Refresh token secret — use `openssl rand -base64 48` |
| `CLIENT_URL` | Yes | Frontend URL (dev: `http://localhost:5005`) |
| `BACKEND_URL` | Yes | Backend URL (dev: `http://localhost:5005`) |
| `REDIS_URL` | Optional | Cloud Redis (Upstash/Redis Cloud). If empty, uses `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD` |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID (for "Continue with Google") |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret |
| `SMTP_HOST` | Optional | Gmail: `smtp.gmail.com`. If all SMTP vars empty → users auto-verified |
| `SMTP_PORT` | Optional | `587` |
| `SMTP_SECURE` | Optional | `false` |
| `SMTP_USER` | Optional | Gmail address |
| `SMTP_PASS` | Optional | Gmail app password (16-char, not your login password) |
| `AWS_REGION` | Optional | S3 bucket region. If AWS vars empty → files saved locally |
| `AWS_ACCESS_KEY` | Optional | S3 access key |
| `AWS_SECRET_KEY` | Optional | S3 secret key |
| `AWS_BUCKET_NAME` | Optional | S3 bucket name |

### 2. Install & Run

**Backend:**
```bash
cd backend
npm install
npm run dev        # starts on port 5005
```

**Frontend (dev mode):**
```bash
cd frontend
npm install
npm run dev        # starts on port 5173, proxies API/socket/uploads to 5005
```

**Production (single server):**
```bash
cd frontend
npm run build      # outputs to frontend/dist/
cd ../backend
node server.js     # serves API + frontend dist on port 5005
```

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → **Create credentials** → **OAuth client ID** (type: **Web application**)
2. Add to **Authorized JavaScript origins**: `http://localhost:5173` and `http://localhost:5005`
3. Add to **Authorized redirect URIs**: `http://localhost:5005/api/auth/google/callback`
4. Put the client ID + secret in `backend/.env`
5. Restart the backend. The "Continue with Google" button appears on Login/Register.

> If the button redirects but you get `redirect_uri_mismatch`, the callback URL in Google Cloud doesn't match `BACKEND_URL` — add the exact URL shown in the error.

---

## AWS S3 Setup (Media Storage)

Uploads use S3 when AWS credentials are configured; otherwise they fall back to local disk (`public/uploads/`).

1. Create an S3 bucket (e.g. `vyncchat`) and note its **region** (e.g. `eu-north-1`)
2. Create an IAM user and attach this **inline policy** (adjust bucket name/ARN):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:PutBucketPolicy",
        "s3:GetBucketPolicy"
      ],
      "Resource": [
        "arn:aws:s3:::vyncchat/*",
        "arn:aws:s3:::vyncchat"
      ]
    }
  ]
}
```

3. In the bucket's **Permissions → Block public access**, turn **off** "Block all public access" (and any account-level block).
4. Add a **bucket policy** for public reads of uploads:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::vyncchat/*"
    }
  ]
}
```

5. Fill `AWS_REGION` (must match the bucket's real region), `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, `AWS_BUCKET_NAME` in `.env`.

---

## Deployment (Production)

The app is a single Node.js server: it serves both the API and the built frontend. Deploy to Railway, Render, Fly.io, or a VPS.

1. **Push code to GitHub** (the repo is already initialized on `main`):
   ```bash
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. **Set env vars** on the platform (copy from `backend/.env.example`), with production values:
   - `CLIENT_URL` / `BACKEND_URL` → your real domain (e.g. `https://vync.com`)
   - `REDIS_URL` → a cloud Redis (Upstash free tier)
   - `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET` (fresh random values)
   - Google, SMTP, AWS vars
   - `NODE_ENV=production`
3. **Build & start**: `cd frontend && npm install && npm run build && cd ../backend && npm install && node server.js`
4. **Update Google Cloud** with your production URLs (JavaScript origin + redirect URI).
5. Behind a reverse proxy (Nginx), enable WebSocket upgrade for `/socket.io`.

---

## Feature Notes

- **Email verification:** with SMTP configured, new accounts must click the link in the email before logging in. Without SMTP, users are auto-verified (link printed to console).
- **Reactions:** double-click any message to open the emoji picker. One reaction per user; clicking the same emoji removes it, a different one replaces it.
- **Voice messages:** the mic button records audio in the browser and uploads it as `messageType: 'voice'`.
- **Message search:** the magnifying-glass icon in the chat header searches the active conversation.

---

## Troubleshooting

| Issue | Likely Cause |
|---|---|
| All messages on the right (MINE) | Both users logged into the **same account** — need two different accounts |
| Typing indicator never shows | No "other user" typing, or socket not connected to conversation room |
| Messages not appearing | Socket disconnected; refresh page or check server is running |
| "Failed to load messages" | Backend not running or MongoDB connection issue |
| Blank white screen | JS syntax error in build; check server console, hard refresh |
| Upload fails with `PermanentRedirect` | `AWS_REGION` doesn't match the bucket's actual region |
| Upload fails with `AccessDenied: s3:PutObject` | IAM policy missing `s3:PutObject` on the bucket ARN |
| Public URL returns 403 | Bucket policy missing or Block Public Access still on |
| `redirect_uri_mismatch` (Google) | Callback URL in Google Cloud ≠ `BACKEND_URL/api/auth/google/callback` |
| Verification email link "site can't be reached" | `CLIENT_URL` points to a port that isn't running |
| Port already in use | Kill the old process: `kill $(lsof -ti :5005)` |

---

## Security

- JWT signed with HS256 (algorithm pinned) — access tokens expire in 1h
- Conversation-scoped endpoints + socket rooms require participant membership (403 / rejected otherwise)
- File uploads require auth and restrict allowed MIME types + 10MB size limit
- Upload filenames sanitized against path traversal
- Rate limiting via Redis on all `/api` routes
- helmet security headers + CORS allowlist (`CLIENT_URL` + localhost)
- Error handler returns generic messages in production (`NODE_ENV=production`)
- `.env` is gitignored — secrets never committed; use `.env.example` as a template
