# Bolha Social - AI Coding Agent Instructions

## Project Overview

**Bolha** is a privacy-focused, invite-only social network built as a **React 19 PWA** with **Firebase Realtime Database** backend. The core mission is providing users complete control over their social experience through a unique "hidden users" system ("A Mesa") and intelligent content moderation.

## Architecture

### Frontend Stack
- **React 19** + **Vite** (build), **TailwindCSS** via Material-UI v7
- **React Router 7** for page navigation
- **Material-UI (MUI)** for all UI components
- **Context API** for auth/upload state (no Redux)

### Data Layer
- **Firebase Realtime Database (RTDB)** for all data:
  - `profiles/{userId}` - user profiles (nickname, photoURL, verified flag)
  - `posts/{postId}` - posts with likes, comments, timestamps
  - `users/{userId}/hiddenUsers/{targetUserId}` - silent user filtering
- **Firebase Auth** for signup/login
- **Cloud Functions v2** (Node.js) for account deletion and invite generation
- **Cloudinary** for media hosting with client-side compression

### Key Data Flow
1. **Upload Flow**: File → Client compression (images via Canvas, videos via FFmpeg.wasm) → Cloudinary → Cloudinary URL stored in RTDB
2. **Real-time Feed**: `HomePage.jsx` listens to `profiles/` and `posts/` refs with `onValue()` hooks
3. **Hidden Users**: Posts from hidden users are filtered client-side in `Feed.jsx` before rendering
4. **Content Moderation**: TensorFlow.js toxicity model (threshold 0.85) + banned words list + link blocking all run client-side (fail-open policy - errors allow the post)

## Critical Conventions

### State Management
- **AuthContext** stores: `currentUser` (Firebase user), `userProfile`, `hiddenUsers` array
- **UploadContext** manages file uploads: `uploads[]` with `{id, status, progress, error}`
- Access via hooks: `useAuth()`, `useUpload()`

### Firebase RTDB Patterns
- **Always use `ref()` + `onValue()` for subscriptions** - unsubscribe in cleanup
- **Server timestamps**: Use `serverTimestamp()` from `firebase/database` for consistency
- **User-scoped data**: Paths like `users/{userId}/hiddenUsers/` prevent permission issues
- **Profile photo sync**: Update both `profiles/{userId}` AND include `authorPhotoURL` in posts for offline rendering

### Component Patterns
- **Posts/Comments**: Use `ConfirmDialog` (reusable) for destructive actions
- **Modals**: MUI `Dialog` for forms (`VerificationDialog`, `EditProfileModal`, `CommentModal`)
- **Real-time updates**: Wrap RTDB listeners in `useEffect` with proper cleanup
- **Error handling**: Use try/catch + console.error; show snackbars (via UploadNotifications) for UX

### Media Handling
- **Images**: Client-side Canvas compression before Cloudinary upload
- **Videos**: FFmpeg.wasm compresses files >100MB; critical for mobile users
- **URLs**: Store Cloudinary `secure_url` in RTDB, never embed raw file uploads

### Moderation Pipeline
1. **TensorFlow.js toxicity** model classifies text (threshold: 0.85)
2. **Banned words** list in Portuguese (checked via regex)
3. **Link detection** blocks any URLs
4. **NSFW flag** set on classified content
5. **Fail-open**: If model errors, allow post to not block user uploads

## Routing

Protected routes wrap all authenticated pages with `ProtectedRoute`:
- `/` → HomePage (feed + post creation)
- `/configuracoes` → SettingsPage (profile, hidden users manager, account deletion)
- `/login`, `/cadastro`, `/verificacao` → Auth pages
- `/convite/{token}` → Invite signup
- `/privacy-policy`, `/report-abuse` → Static pages

## Common Tasks

### Adding a Feature
1. **API**: Add RTDB path pattern in `functions/index.js` if new Cloud Function needed
2. **Context**: Extend `AuthContext` or `UploadContext` if cross-component state
3. **Component**: Build UI in `components/` or as a page in `pages/`
4. **Real-time**: Use `useEffect()` + `onValue()` + cleanup for RTDB subscriptions
5. **Testing**: Check Firebase Emulator (`firebase emulators:start`) locally

### Database Schema Changes
- RTDB is schemaless but document your path structure in README
- Always include `createdAt: serverTimestamp()` for sorting
- For user privacy, never store sensitive data outside user-scoped paths

### Handling File Uploads
- Use `UploadContext` hooks to track progress + errors
- Compress client-side **before** Cloudinary to reduce bandwidth
- Store Cloudinary metadata (URL, dimensions) in RTDB after upload completes

## Deployment

### Build
```bash
npm run build  # Creates optimized dist/ for Vercel
```

### Firebase Functions
```bash
firebase deploy --only functions  # Redeploy Cloud Functions
```

Environment variables (Firebase Console or local `.env`):
- `VITE_API_KEY`, `VITE_PROJECT_ID` (Firebase config)
- `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` (media hosting)
- `EMAIL_USER`, `EMAIL_PASSWORD` (Gmail for invites/notifications)

## Testing with Emulators
```bash
firebase emulators:start  # Runs Auth, RTDB, Functions locally
# Access UI at http://localhost:4000
```

## Key Files to Know
- [src/firebase/config.js](src/firebase/config.js) - Firebase initialization
- [src/contexts/AuthContext.jsx](src/contexts/AuthContext.jsx) - Auth + hidden users logic
- [src/components/Post.jsx](src/components/Post.jsx) - Post rendering + likes/comments
- [src/pages/HomePage.jsx](src/pages/HomePage.jsx) - Feed + invite generation
- [functions/index.js](functions/index.js) - Cloud Functions (deleteUserAccount, invites)
- [database.rules.json](database.rules.json) - RTDB security rules
