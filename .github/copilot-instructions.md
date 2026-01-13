# Bolha Social - AI Coding Agent Instructions

## Project Overview

**Bolha** is a privacy-focused, invite-only social network built as a **React 19 PWA** with **Firebase Realtime Database** backend. Core mission: users control *exactly* who they see ("A Mesa" - hidden users) in an invite-only, link-free environment.

## Architecture Essentials

### Stack
- **Frontend**: React 19 + Vite + React Router 7 + Material-UI v7 (@emotion)
- **Backend**: Firebase (Auth, RTDB, Cloud Functions v2), Cloudinary, Nodemailer
- **Media**: Client-side compression (Canvas for images, FFmpeg.wasm for videos >100MB)

### Data Schema (RTDB)
```
posts/{postId}/
  authorId, authorNickname, authorPhotoURL
  textContent, mediaURL, mediaType
  createdAt, lastActivityAt (for sorting)
  likes/{uid}, comments/{commentId}
  comments/{commentId}/
    authorId, authorNickname, textContent, createdAt
    likes/{uid}

profiles/{userId}/
  nickname, photoURL, verified

users/{userId}/
  hiddenUsers/{targetUserId}: true  // Silent filtering
```

### Critical Data Flows

**Post Creation** (`CreatePostForm.jsx` → `UploadContext.createPost()`):
1. Validate: no links allowed (`containsLink()` regex)
2. Compress: images/videos client-side (async, non-blocking UI)
3. Upload to Cloudinary (track progress via `UploadContext`)
4. Save post to RTDB with `serverTimestamp()` + `lastActivityAt` for real-time reordering

**Feed Rendering** (`Feed.jsx`):
- Dual listeners: `onValue()` for reordering + `onChildAdded()` for new posts after mount
- Pagination: load 5 posts at a time, reorder by `lastActivityAt` (activity > creation time)
- Filter: remove posts from hidden users client-side before rendering

**Hidden Users**: AuthContext loads `users/{userId}/hiddenUsers`, Feed filters before render

## Code Patterns

### Firebase RTDB (Always)
```javascript
// Import pattern
import { ref, onValue, set, update, serverTimestamp, onChildAdded } from 'firebase/database';
import { rtdb } from '../firebase/config';

// Subscriptions: MUST unsubscribe in cleanup
useEffect(() => {
  const unsubscribe = onValue(ref(rtdb, 'path'), snapshot => { /* */ });
  return unsubscribe;
}, []);

// Writes: use serverTimestamp() for consistency
const postObj = { createdAt: serverTimestamp(), lastActivityAt: serverTimestamp(), /* */ };
```

### Upload State Management
- **UploadContext**: `{ id, fileName, status, progress, error }` 
- **Status flow**: `'uploading'` → `'saving'` → `'completed'` (or `'error'`)
- Call `addUpload()` immediately (shows UI), process async in background
- Video large-file handling: detect `size > 100MB`, show `'processing'` status during FFmpeg

### Component Patterns
- **Modals**: MUI `Dialog` (forms, comments) - non-blocking
- **Destructive actions**: Use `ConfirmDialog` (reusable, avoids accidents)
- **Edit/Delete**: Only post author can; update `lastActivityAt` on edits to bubble to top
- **Real-time sync**: `Post.jsx` monitors own post via `onValue()` for edits by author

### Post Editing
- Only author can edit `textContent`
- Update `editedAt` timestamp (optional, for history)
- Update `lastActivityAt` to bubble post to feed top
- Comments: only author can edit `textContent`

## Moderation & Validation

**Link Detection** (strict):
```javascript
const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])|(\bwww\.[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/ig;
// Blocks ALL URLs in post text (checked in `CreatePostForm.handleSubmit()`)
```

**Toxicity/NSFWJS models** mentioned in README but NOT currently implemented - safe to add if needed.

## Development Workflows

### Local Setup
```bash
npm install
npm run dev  # http://localhost:5173, auto-opens browser
firebase emulators:start  # http://localhost:4000 for console
```

### Build & Deploy
```bash
npm run build        # dist/ for Vercel (frontend)
npm run lint         # ESLint
firebase deploy --only functions  # Cloud Functions v2 (us-central1)
```

### Environment (`.env` local or Firebase Console)
- `VITE_*`: Firebase config (`API_KEY`, `PROJECT_ID`, etc.)
- `VITE_CLOUDINARY_*`: Cloudinary credentials
- `EMAIL_USER`, `EMAIL_PASSWORD`: Cloud Functions (Gmail app password)

## Routing (All Protected Except Auth)

- `/` → HomePage (feed, post creation, invite generation)
- `/configuracoes` → SettingsPage (profile edit, hidden users, account deletion)
- `/login`, `/cadastro` → Auth pages
- `/convite/{token}` → Invite-based signup
- `/privacy-policy`, `/report-abuse` → Static pages

## Cloud Functions (Backend Tasks)

**deleteUserAccount**: Callable, removes profile + all posts + auth user
**sendVerificationEmail**: HTTP endpoint (CORS-enabled), for email verification (setup_email.py helper)
**generateInvite**: Create unique token → `invites/{token}` in RTDB

All functions in `functions/index.js` (Node.js v18+), region `us-central1`.

## Key Files

| File | Purpose |
|------|---------|
| `src/firebase/config.js` | Firebase init (auth, rtdb, functions, storage) |
| `src/contexts/AuthContext.jsx` | Auth state + `hideUser()`/`showUser()` + hidden users list |
| `src/contexts/UploadContext.jsx` | Upload tracking + Cloudinary integration |
| `src/components/Feed.jsx` | Pagination + real-time listeners + hidden user filtering |
| `src/components/CreatePostForm.jsx` | Post creation + compression + link validation |
| `src/components/Post.jsx` | Post card + likes/comments + edit (authors only) |
| `src/pages/HomePage.jsx` | Invite generation + user list + drawer nav |
| `src/pages/SettingsPage.jsx` | Profile edit + hidden users manager + account delete |
| `database.rules.json` | RTDB security (auth required, author-only edits) |
| `functions/index.js` | Cloud Functions (deleteUserAccount, sendVerificationEmail) |

## Common Pitfalls

- **Not unsubscribing RTDB listeners** → memory leaks, duplicate events
- **Ignoring `lastActivityAt`** → feed doesn't re-sort on comments/likes
- **Uploading to RTDB before Cloudinary** → broken media URLs
- **Not using `serverTimestamp()`** → client clock skew breaks sorting
- **Forgetting `authorPhotoURL` in posts** → photos don't show offline
- **Allowing links in `textContent`** → breaks privacy-focused mission
