# Bolha Social - AI Coding Agent Instructions

## Project Overview

**Bolha** is a privacy-focused, invite-only social network built as a **React 19 PWA** with **Firebase Realtime Database** backend. The core mission is providing users complete control over their social experience through a unique "hidden users" system ("A Mesa") and intelligent content moderation.

## Architecture

### Frontend Stack
- **React 19** + **Vite** (build)
- **React Router 7** for page navigation
- **Material-UI (MUI) v7** for all UI components and styling (via @emotion/react, @emotion/styled)
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
1. **Upload Flow**: File → Client compression (images via Canvas API, videos via FFmpeg.wasm) → Cloudinary → Cloudinary URL stored in RTDB
2. **Real-time Feed**: `Feed.jsx` uses pagination (5 posts per page) + real-time listeners (`onChildAdded`, `onChildChanged`, `onChildRemoved`) for instant updates
3. **Hidden Users**: Posts from hidden users are filtered client-side in `Feed.jsx` before rendering (via `hiddenUsers` array from `AuthContext`)
4. **Content Moderation**: 
   - **TensorFlow.js toxicity** model (threshold: 0.85)
   - **Banned words** list in Portuguese (regex-based)
   - **Link detection** blocks URLs (checked client-side)
   - **NSFWJS** model for image content classification
   - **Fail-open policy**: Errors allow post to not block user uploads

## Critical Conventions

### State Management
- **AuthContext** stores: `currentUser` (Firebase user), `userProfile`, `hiddenUsers` array
- **UploadContext** manages file uploads: `uploads[]` with `{id, status, progress, error}`
- Access via hooks: `useAuth()`, `useUpload()`

### Firebase RTDB Patterns
- **Always use `ref()` + `onValue()` for subscriptions** - unsubscribe in cleanup
- **Real-time updates**: Use `onChildAdded()`, `onChildChanged()`, `onChildRemoved()` for collection listeners
- **Pagination**: Use `limitToLast()`, `endAt()`, `startAt()` with timestamps as cursor (see `Feed.jsx` for pattern)
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
3. **Link detection** blocks any URLs in both post text and metadata
4. **NSFWJS** model classifies images for adult content
5. **Fail-open policy**: If model errors, allow post to not block user uploads

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
4. **Real-time**: Use `useEffect()` + `onValue()` / `onChildAdded()` + cleanup for RTDB subscriptions
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

### Quick Start
```bash
npm install                 # Install dependencies
npm run dev                 # Start dev server on http://localhost:5173
npm run build               # Build for production
npm run lint                # Run ESLint checks
firebase emulators:start    # Run local Firebase emulator (Auth, RTDB, Functions)
firebase deploy --only functions  # Deploy Cloud Functions to Firebase
```

### Build
```bash
npm run build  # Creates optimized dist/ for Vercel
```

### Firebase Functions
```bash
firebase deploy --only functions  # Redeploy Cloud Functions v2
```

### Environment Variables
Configure in Firebase Console or local `.env`:
- **Firebase**: `VITE_API_KEY`, `VITE_AUTH_DOMAIN`, `VITE_PROJECT_ID`, `VITE_STORAGE_BUCKET`, `VITE_MESSAGING_SENDER_ID`, `VITE_APP_ID`
- **Cloudinary**: `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`
- **Email (Cloud Functions)**: `EMAIL_USER`, `EMAIL_PASSWORD` (Gmail with app password)

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
