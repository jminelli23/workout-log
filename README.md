# Workout Log

A mobile-first workout log for iPhone, installable to the home screen as a PWA.
Plan a weekly program, log sets, time rest, and review past performance.

Live app: https://jminelli23.github.io/workout-log/

## Develop

```bash
npm install
npm run dev
```

Pushing to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml`.
All workout data is stored on-device (IndexedDB); nothing is sent to a server.
