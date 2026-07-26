# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server (listens on all network interfaces)
npm run build      # Production build
npm run preview    # Preview production build locally
npm run lint       # Run ESLint (flat config, eslint.config.js)
```

No test runner is configured in this project.

## Environment

Copy `.env_example` to `.env` and set:
- `VITE_API_BASE_URL` — backend API base URL (e.g. `http://localhost:8000/api`)
- `VITE_NEED_PAYMENT` — feature flag for payment features (`true`/`false`)

## Architecture

**Stack:** React 19, Vite, React Router v7, Axios, Tailwind CSS, Lucide React

### Routing & Auth Guards (`src/App.jsx`)

Three types of route wrappers:
- **`<GuestRoute>`** — only accessible when logged out; redirects authenticated users to their role dashboard
- **`<ProtectedRoute allowedRoles={[...]}>`** — requires auth; enforces role-based access; redirects wrong-role users to their own dashboard
- **Profile completion gate** — candidates with `is_profile_complete === false` are redirected to `/candidate/profile`

Role is stored as `user.type`: either `'candidate'` or `'employer'`. Candidate routes live under `/candidate/*`, employer routes under `/employer/*`.

### Auth Flow (`src/context/AuthContext.jsx`)

Single context providing `user`, `loading`, `login()`, `register()`, `logout()`. On app mount, reads JWT from localStorage and fetches `/user` to restore session. Token is stored as the raw JWT (attached as `Authorization: Bearer <token>` by the axios interceptor).

### API Layer (`src/api/axios.js`)

Centralized axios instance with base URL from `VITE_API_BASE_URL`. A request interceptor automatically injects the JWT from localStorage into every request. All pages/components import and use this instance directly — no service layer abstraction.

### State Management

Only React Context (auth state) + local `useState`. No Redux or other global state library.

### Styling

Tailwind CSS with custom utilities defined in `tailwind.config.js`:
- `.btn-primary`, `.btn-secondary`, `.btn-ghost` — standard button variants
- `.input-field` — standard form input style
- `.shadow-soft`, `.shadow-cta` — custom shadow utilities
- Primary brand gradient: `linear-gradient(135deg, #00AEEF, #33BEF2)`

### Key Libraries

| Library | Purpose |
|---|---|
| `jodit-react` | Rich text editor (job descriptions) |
| `react-international-phone` | Phone input with country selector |
| `lucide-react` | Icon set used throughout |
