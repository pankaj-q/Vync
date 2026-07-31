# Vync — Real-Time Chat Application

A full-stack real-time messaging app with message edit/delete/reply/forward, typing indicators, read receipts, online presence, media sharing, and profile editing.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, JSX, Vite, React Router 7 |
| **Backend** | Node.js, Express 5, Socket.io 4 |
| **Database** | MongoDB (Mongoose 9) |
| **Cache** | Redis (ioredis) |
| **Auth** | JWT (jsonwebtoken) + bcryptjs |
| **Media** | Multer (local `public/uploads/`) |
| **Animations** | framer-motion |
| **Icons** | lucide-react |

---

## Project Structure

```
chatting/
├── backend/
│   ├── src/
│   │   ├── app.js                  # Express app setup, routes, static serving
│   │   ├── server.js               # Entry point — connects DB, starts HTTP + Socket.io
│   │   ├── config/
│   │   │   ├── redis.js            # Redis client (ioredis) — typing presence, rate limiting
│   │   │   └── socket.js           # Socket.io server setup — auth, rooms, events
│   │   ├── controller/
│   │   │   ├── user.controller.js  # register, login, searchUsers, getMe, updateProfile
│   │   │   ├── message.controller.js # CRUD, forward, markAsRead
│   │   │   └── conversation.controller.js # createOrGet, list
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js   # JWT verification → req.user
│   │   │   ├── multer.middleware.js # File upload config (local disk)
│   │   │   └── rateLimit.js        # Redis-based rate limiter
│   │   ├── model/
│   │   │   ├── user.model.js       # User schema (name, email, password, bio, avatarUrl)
│   │   │   ├── message.model.js    # Message schema (conversation, sender, content, media...)
│   │   │   └── conversation.model.js # Conversation schema (participants, lastMessage)
│   │   └── routes/
│   │       ├── userRoutes.js       # POST /login, /register, PUT /profile, GET /me, /search
│   │       ├── message.routes.js   # POST /, GET /:id, PUT /:id, DELETE /:id, /forward, /read
│   │       ├── conversation.routes.js # POST /, GET /
│   │       └── file.js             # POST /upload
│   ├── public/
│   │   └── uploads/                # Uploaded media files
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.jsx                # React DOM entry point
│   │   ├── App.jsx                 # Router setup (/ → Register, /login → Login, /dashboard → Dashboard)
│   │   ├── index.css               # Full application styles (white + light green theme, responsive)
│   │   └── pages/
│   │       ├── Dashboard.jsx       # Parent component — state, socket logic, API calls
│   │       ├── Sidebar.jsx         # User profile, search, conversation list, profile modal
│   │       ├── ChatWindow.jsx      # Messages list, input area, typing/forward/reply modals
│   │       ├── login.jsx           # Login form
│   │       └── Register.jsx        # Registration form
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
| POST | `/api/users/register` | No | Register new user |
| POST | `/api/users/login` | No | Login, returns JWT + user object |
| GET | `/api/users/me` | Yes | Get current user profile |
| GET | `/api/users/search?q=` | Yes | Search users by name/email |
| PUT | `/api/users/profile` | Yes | Update name/bio/avatar (multipart) |

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
| POST | `/api/messages/forward` | Yes | Forward message to another conversation |
| POST | `/api/messages/read` | Yes | Mark conversation messages as read |

### Files

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/files/upload` | Yes | Upload file (image/video/audio), returns URL |

---

## Socket.io Events

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `join-conversation` | `conversationId` | Join Socket.io room for real-time updates |
| `leave-conversation` | `conversationId` | Leave room |
| `typing` | `{ conversationId, isTyping }` | Typing indicator on/off |

### Server → Client

| Event | Payload | Sent To |
|---|---|---|
| `new-message` | `Message` (populated) | All participants **except** sender (`user:${id}`) |
| `message-edited` | `Message` (populated) | All participants except editor |
| `message-deleted` | `{ _id, content, isDeleted }` | All participants except deleter |
| `user-typing` | `{ userId, conversationId, isTyping }` | Conversation room (`conversation:${id}`) except typer |
| `user-status` | `{ userId, status }` | All connected clients |
| `messages-read` | `{ conversationId }` | Conversation room |

### Socket Rooms

- `user:${userId}` — Each user gets their own room on connect. Used for private message delivery.
- `conversation:${conversationId}` — Both participants join on conversation open. Used for typing indicators.

---

## Data Flow

### User Registration / Login

```
[Register/Login Form]
  → POST /api/users/register | /login
  → Backend validates, hashes password (bcrypt), saves to MongoDB
  → Returns JWT accessToken + user object { id, name, email, bio, avatarUrl }
  → Frontend stores token + user in localStorage
  → Redirects to /dashboard
```

### Sending a Message

```
[User types + clicks Send]
  → POST /api/messages { conversationId, content, mediaUrl?, messageType?, replyTo? }
  → Auth middleware decodes JWT → req.user
  → Backend creates Message with sender: req.user._id
  → Populates sender (name, email, avatar)
  → Returns populated message to sender (HTTP 201)
  → Emits 'new-message' to all conversation participants EXCEPT sender (Socket.io)
  → Sender adds message from HTTP response
  → Recipient adds message from socket event
```

### Receiving a Message (Real-Time)

```
[Other user sends message]
  → Backend emits 'new-message' to user:${recipientId} room
  → Recipient's socket.on('new-message') fires
  → addMessages([msg]) updates state (dedup via seenMessageIds Set)
  → If conversation is active, also calls markAsRead()
  → Always refreshes conversation list
```

### Typing Indicator

```
[User types in input]
  → handleTyping() sets messageText, emits socket 'typing' { conversationId, isTyping: true }
  → After 1.5s idle, emits { isTyping: false }
  → Backend broadcasts 'user-typing' to conversation room (excludes sender)
  → Recipient updates typingUsers state with key `${conversationId}:${userId}`
  → getTypingText() checks if other user is typing → shows indicator
```

### Read Receipts

```
[User opens a conversation or receives a message]
  → POST /api/messages/read { conversationId }
  → Backend updates messages status from 'sent' → 'read' (where sender !== current user)
  → Backend emits 'messages-read' to conversation room
  → Recipient updates messages' status to 'read' in UI
```

### Online Presence

```
[User connects via Socket.io]
  → Backend sets Redis key online:${userId} (TTL: 300s)
  → Emits 'user-status' { userId, status: 'online' } to all clients

[User disconnects]
  → Backend deletes Redis key
  → Emits 'user-status' { userId, status: 'offline' } to all clients
```

---

## Component Architecture

```
App (BrowserRouter)
├── / → Register.jsx
├── /login → login.jsx
└── /dashboard → Dashboard.jsx
                    ├── Sidebar.jsx
                    │   ├── User profile (avatar, name, bio, status)
                    │   ├── Search users (dropdown with outside-click close)
                    │   ├── Conversation list (animated with framer-motion)
                    │   └── Profile edit modal (name, bio, avatar upload)
                    └── ChatWindow.jsx
                        ├── Chat header (back button, avatar, name, online/offline)
                        ├── Messages list (scrollable, animated bubbles)
                        │   ├── Message bubble (reply preview, media, text, footer)
                        │   ├── Edit mode (inline text input)
                        │   └── Action buttons (edit, delete, reply, forward)
                        ├── Typing indicator
                        ├── Reply bar
                        ├── Input area (text, camera, attach, send)
                        ├── Media preview
                        └── Forward modal (select conversation)
```

### State Management (Dashboard.jsx)

All shared state lives in `Dashboard.jsx` and is passed down as props:

| State | Used By | Description |
|---|---|---|
| `user` | Sidebar | Current user profile |
| `conversations` | Sidebar, ChatWindow | List of conversations |
| `activeChat` | Sidebar, ChatWindow | Currently selected conversation |
| `messages` | ChatWindow | Messages for active conversation |
| `messageText` | ChatWindow | Input text |
| `searchQuery`, `users` | Sidebar | Search state |
| `replyTo` | ChatWindow | Reply context |
| `editingMsg`, `editText` | ChatWindow | Edit context |
| `showForward` | ChatWindow | Forward modal |
| `typingUsers` | Dashboard → `getTypingText()` | Typing state per conversation:user |
| `onlineUsers` | Sidebar, ChatWindow | Online presence map |
| `mediaPreview` | ChatWindow | Attached media before send |
| `showSidebar` | Sidebar | Mobile sidebar toggle |

### Key Refs

| Ref | Owner | Purpose |
|---|---|---|
| `activeChatRef` | Dashboard | Always-current activeChat for socket handlers |
| `typingTimeoutRef` | Dashboard | Debounce typing indicator stop |
| `sendingRef` | Dashboard | Prevent duplicate sends |
| `messagesEndRef` | ChatWindow | Auto-scroll to bottom |
| `editInputRef` | ChatWindow | Focus edit input |
| `fileInputRef` | ChatWindow | Hidden file picker |
| `cameraInputRef` | ChatWindow | Hidden camera capture |
| `searchRef` | Sidebar | Outside-click for search dropdown |
| `avatarInputRef` | Sidebar | Hidden avatar file picker |
| `seenMessageIds` | Module-level (Dashboard) | Deduplicate socket messages |

---

## Database Models

### User
```
{
  _id: ObjectId,
  name: String (uppercase),
  email: String (unique, lowercase),
  password: String (bcrypt hashed),
  bio: String (max 200),
  avatarUrl: String,
  provider: String (default: 'local'),
  googleId: String?,
  githubId: String?,
  createdAt, updatedAt (timestamps)
}
```

### Conversation
```
{
  _id: ObjectId,
  participants: [ObjectId → User],
  lastMessage: ObjectId → Message,
  lastMessageAt: Date,
  createdAt, updatedAt (timestamps)
}
```

### Message
```
{
  _id: ObjectId,
  conversation: ObjectId → Conversation,
  sender: ObjectId → User,
  content: String,
  messageType: enum('text','image','video','audio','document','voice'),
  mediaUrl: String?,
  status: enum('sent','delivered','read'),
  isEdited: Boolean,
  replyTo: ObjectId → Message?,
  forwardedFrom: ObjectId → Message?,
  isDeleted: Boolean,
  createdAt, updatedAt (timestamps)
}
```

---

## Setup & Run

### Prerequisites
- Node.js 18+
- MongoDB (running on `mongodb://localhost:27017` or set `MONGODB_URI`)
- Redis (running on `localhost:6379` or set `REDIS_HOST`/`REDIS_PORT`)

### Environment Variables (backend/.env)
```
PORT=5005
MONGODB_URI=mongodb://localhost:27017/chatting
JWT_SECRET=your_secret_here
REDIS_HOST=localhost
REDIS_PORT=6379
CLIENT_URL=http://localhost:5173
```

### Install & Run

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
npm run dev        # starts on port 5173, proxies API to 5005
```

**Production build:**
```bash
cd frontend
npm run build      # outputs to frontend/dist/
# Backend serves dist/ via express.static at port 5005
```

### Important Notes
- **Hard refresh (Cmd+Shift+R)** after each code change — the browser may cache the old JS bundle if a syntax error prevents module load.
- **Two different accounts required** to test message alignment (left vs right bubbles) and typing indicators. Log into two separate browser profiles or use regular + incognito windows.
- **CORS** is not an issue when running production mode (frontend served from backend). In dev mode, Vite proxies `/api`, `/socket.io`, and `/uploads` to the backend.

---

## Troubleshooting

| Issue | Likely Cause |
|---|---|
| All messages on the right (MINE) | Both users logged into the **same account** — need two different accounts |
| Typing indicator never shows | Same as above — no "other user" typing; or socket not connected to conversation room |
| Messages not appearing | Socket disconnected; refresh page or check server is running |
| "Failed to load messages" | Backend not running or MongoDB connection issue |
| Blank white screen | JS syntax error in build; check server console, hard refresh |
| Upload doesn't work | `public/uploads/` directory doesn't exist or permissions issue |
