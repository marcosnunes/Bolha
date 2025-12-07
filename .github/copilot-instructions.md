# Bolha - AI Coding Agent Instructions

## Project Overview

**Bolha** is a privacy-first, invite-only social network built as a modern Progressive Web App. Core tenets:
- **Invitation-based access** (no public signups)
- **User-controlled visibility** ("A Mesa" - hiding users silently without notification)
- **Link-free content** (all links blocked at post creation)
- **Client-side moderation** (TensorFlow.js toxicity detection + banned word list)
- **Full data deletion** (users can completely purge their account and all posts)
- **Nested comments** (comments on posts with likes support)

**Tech Stack:**
- Frontend: React 19 + Vite + Material-UI (MUI 7)
- Backend: Firebase (Auth, Realtime Database, Cloud Functions v2)
- Media: Cloudinary (image/video optimization)
- Deploy: Vercel (frontend) + Firebase (backend, us-central1)

---

## Architecture & Data Flow

### Core Database Structure (Firebase RTDB)

```
/posts/{postId}
  - authorId, authorNickname, authorPhotoURL
  - textContent, mediaURL, mediaType, isNSFW
  - createdAt (timestamp - critical for pagination)
  - likes/{uid}: true
  - dislikes/{uid}: true
  - comments/{commentId}
    - authorId, authorNickname, textContent, createdAt
    - likes/{uid}: true

/profiles/{uid}
  - nickname, photoURL

/users/{uid}/hiddenUsers/{targetUid}: true
  - Silent blocklist (target user never notified)

/invites/{token}
  - invitedBy, status: "pending"|"completed"
  - usedBy, usedAt (when token is consumed)
```

### Key Data Flows

1. **User Registration**: Signup → Invite token validation → Create profile + consume invite → Redirect to home
2. **Post Creation**: Text/media → Toxicity classification + link detection → Cloudinary upload (if media) → RTDB commit with `update()`
3. **Feed Loading**: Initial `get()` with `limitToLast(5)` → Reverse array → Real-time `onChildAdded` for new posts → Pagination via `endAt(cursorTimestamp - 1)`
4. **Hidden Users**: `hideUser(uid)` creates `/users/{currentUser.uid}/hiddenUsers/{targetUid}` → Feed filters in-memory
5. **Comments**: Modal loads initial via `get()`, then `onChildAdded` with `startAt(mountTimeRef.current)` for real-time updates

### Real-time Patterns (Critical)

- **Feed initialization**: Uses `get()` for initial load, then separate `onChildAdded` listener with `startAt(mountTimeRef.current + 1)` to catch only NEW posts
- **Global deletion listener**: `onChildRemoved` on `/posts` (no filters) ensures deletions sync even for pre-loaded posts
- **Profile data**: `onValue` on `/profiles/{uid}` in `Post.jsx` overrides cached authorPhotoURL/authorNickname with live data
- **Likes**: `onValue` on `/posts/{postId}/likes` updates counts live
- **Comments**: Similar pattern to Feed - initial `get()`, then `onChildAdded/Changed/Removed` listeners for real-time sync
- **ALWAYS** use `serverTimestamp()` for `createdAt` fields to avoid clock skew in pagination

---

## Critical Developer Workflows

### Local Development
```powershell
npm install
npm run dev              # Starts Vite dev server on http://localhost:5173
npm run build           # Vite minified build with console.log dropped (terser config)
npm run lint            # ESLint check
```

### Environment Setup
- **Frontend**: Requires `.env.local` with Vite prefixed vars: `VITE_API_KEY`, `VITE_AUTH_DOMAIN`, etc. (pull via `vercel env pull .env.local`)
- **Cloudinary**: `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` (upload preset must be unsigned)
- **Firebase**: Config via `src/firebase/config.js` (exported services: `auth`, `rtdb`, `functions`, etc.)

### Firebase Functions Deployment
```powershell
cd functions
npm install
npm run deploy          # Deploy to Firebase (deleteUserAccount function)
npm run logs           # Stream function logs
```

### Key Commands for Backend
- `firebase emulators:start --only functions` (local testing)
- Deployed function: `deleteUserAccount` (Cloud Function v2, region: us-central1)

---

## Project-Specific Patterns & Conventions

### 1. **Toxicity Classification** (Client-Side)
- Hook: `useToxicityModel.jsx` loads TensorFlow toxicity model once (threshold 0.85)
- Pattern: Call `classifyText(text)` → returns `boolean`
- **Important**: Blocks posts AND marks as NSFW (`isNSFW: true`) if toxic
- Forbidden word list: hardcoded in `CreatePostForm.jsx` (Portuguese offensive terms)
- **Fail-open**: If AI fails, post succeeds (user not blocked)

### 2. **Post Creation & Moderation**
Location: `src/components/CreatePostForm.jsx`
- **Link blocking**: Regex checks for http/ftp/www patterns → error if found
- **File uploads**: Max 100MB, uploaded to Cloudinary with progress tracking via XHR
- **Moderation flow**: Text classification → File upload → DB commit (atomicity via `update()`)
- **NSFW marking**: Set at post creation time, cannot be changed later

### 3. **Pagination Strategy**
Location: `src/components/Feed.jsx`
- **Initial load**: Query `limitToLast(5)` posts → reverse array (oldest→newest)
- **"Load More"**: Query `endAt(cursorTimestamp - 1)` with `limitToLast(5)` to get next batch
- **Real-time**: Separate `onChildAdded` listener with `startAt(componentMountTime)` for live new posts
- **Hidden users**: Filter applied in-memory, not in query (for simplicity)

### 4. **User Visibility Control ("A Mesa")**
- Method: `hideUser(uid)` → Creates `/users/{currentUser.uid}/hiddenUsers/{uid}`
- **Silent blocking**: No notification to hidden user
- **Immutable target**: Can hide/unhide same user multiple times
- **Feed filtering**: `posts.filter(p => !hiddenUsers.includes(p.authorId))`
- UI Pattern: `ProfileModal` + `ConfirmDialog` for hide/unhide actions

### 5. **Authentication & Protected Routes**
- Context: `src/contexts/AuthContext.jsx` wraps app (provides `currentUser`, `userProfile`, `hiddenUsers`)
- Protection: `ProtectedRoute` component checks `currentUser` → redirect to `/login` if null
- **Auth state syncing**: `onAuthStateChanged` → `onValue` on profile ref → renders only when loading complete

### 6. **Profile Picture & Media Upload**
- **Profile pics**: Uploaded to Cloudinary, stored in `/profiles/{uid}/photoURL`
- **Post media**: Uploaded with `resource_type` detection (image vs video)
- **Optimization**: URL rewrite adds `a_auto,q_auto,f_auto` for responsive delivery
- **Thumbnails**: Video thumbnails auto-generated by Cloudinary

### 7. **Account Deletion**
- **Flow**: User clicks "Delete Account" → Confirmation dialog → Cloud Function called
- **Function** (`deleteUserAccount`): Deletes profile, posts, hidden user lists, then Firebase Auth user
- **Why Cloud Function?** Solves permission issue (client cannot delete its own Auth user) + handles race conditions
- **Callback**: On success, redirect to `/cadastro`

---

## File Structure & Key Components

```
src/
├── pages/
│   ├── HomePage.jsx          # Main feed, sidebar menu, invite generation
│   ├── LoginPage.jsx          # Email/password form
│   ├── CadastroPage.jsx       # Registration + invite token validation
│   ├── ConvitePage.jsx        # Validates invite token before signup
│   ├── SettingsPage.jsx       # Hidden user manager, account deletion
│   ├── PrivacyPolicyPage.jsx
│   └── ReportAbusePage.jsx
├── components/
│   ├── Feed.jsx               # Paginated feed with real-time updates
│   ├── Post.jsx               # Individual post card, likes, delete
│   ├── CreatePostForm.jsx     # Text/media input, moderation, upload
│   ├── ProfileModal.jsx       # User profile view, hide/unhide button
│   ├── EditProfileModal.jsx   # Nickname, photo, password change
│   ├── ConfirmDialog.jsx      # Reusable confirmation dialog
│   ├── HiddenUsersManager.jsx # List of hidden users
│   ├── HiddenUserItem.jsx     # Individual hidden user row
│   ├── CommentModal.jsx       # Comments dialog with real-time sync
│   ├── CommentItem.jsx        # Individual comment with likes
│   └── ProtectedRoute.jsx     # Auth guard wrapper
├── contexts/
│   └── AuthContext.jsx        # Global auth state + hidden users list
├── hooks/
│   └── useToxicityModel.jsx   # TensorFlow.js toxicity model loader
├── firebase/
│   └── config.js              # Firebase service exports
└── main.jsx                   # React Router setup

functions/
└── index.js                   # deleteUserAccount Cloud Function
```

---

## Common Modifications & Patterns

### Adding a New Database Field
1. Add to appropriate `/path/{id}` in `database.rules.json` for access control
2. Update `Feed.jsx` or component that reads this path to handle the new field
3. Update `CreatePostForm.jsx` or write function if it's set during creation
4. Test in Firebase Emulator

### Modifying Toxicity Rules
- **Banned words**: Edit array in `CreatePostForm.jsx` (line ~50)
- **AI threshold**: Edit `useToxicityModel.jsx` line 13 (currently 0.85, higher = less strict)
- **Combination logic**: Posts are NSFW if `isToxic OR containsForbiddenWord`

### Adding New UI Components
- Use MUI components consistently (`Button`, `TextField`, `Dialog`, `Card`, etc.)
- Import from `@mui/material` and `@mui/icons-material`
- Responsive: Use `sx={{ xs: ..., sm: ..., md: ... }}` breakpoints, not media queries

### Database Queries
- Always use `orderByChild('createdAt')` for temporal data (indexed in `database.rules.json`)
- Combine queries with `limitToLast()` or `endAt()` for pagination
- Avoid N+1: Use batch `onValue` on parent paths when loading lists

---

## Deployment & CI/CD

- **Frontend**: Connected to Vercel (auto-deploys on push to main)
- **Backend Functions**: Deploy via `firebase deploy --only functions` (requires Firebase CLI auth)
- **Environment**: Vercel pulls env vars automatically; ensure Cloudinary preset is unsigned
- **Build output**: Minified dist folder (console logs stripped by terser)
- **Vercel routing**: `vercel.json` rewrites all routes to `/index.html` for SPA routing

---

## Testing & Debugging

- **Network logs**: Check Chrome DevTools Network tab for Cloudinary upload failures
- **Firebase emulator**: `firebase emulators:start` for local functions testing
- **Real-time listener issues**: Ensure `unsubscribe()` called in cleanup to prevent memory leaks
- **NSFW filtering**: Toggle switch in HomePage to test hidden post display

---

## Notes for AI Agents

- **Prefer `update()` over `set()`**: Partial updates are atomic and prevent overwrite races
- **Server timestamps**: Always use for temporal comparisons (client clocks unreliable)
- **Cloudinary async**: Wrap uploads in try/catch; handle timeout errors explicitly
- **Pagination UX**: Show loading state during fetch; disable "Load More" if `!hasMore`
- **Reusable dialogs**: `ConfirmDialog` component already exists—use it instead of custom dialogs
- **Session isolation**: Each hidden user list is per-user; no global allowlists/denylists
