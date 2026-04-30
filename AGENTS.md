<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data.
Follow the existing React Router v7 route-module patterns in `app/routes` and avoid introducing new Next.js wrappers.
Heed deprecation notices.

## RR7-first migration note

- Treat `app/routes` as the source of truth.
- Prefer native React Router v7 `ServerComponent` / `loader` / `action` route modules.
- Do not add new `handleResourceRoute` bridge wrappers for `api.*` routes.
<!-- END:nextjs-agent-rules -->
