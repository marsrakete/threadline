# Explorer smoke-test references

Playwright selects `thread-explorer-footer-actions-{platform}.png` for the host
platform. Keep separate Linux and Windows references so native font and control
rendering is compared with the reviewed image from the same platform.

The Windows reference was captured with the configured Chromium/Edge test runner
and visually checked for readable identity, actions above counts and containment
inside the card. The Linux reference remains unchanged. Geometry assertions,
page-error collection and the existing 3% image-difference limit remain active.

Verify the reference without updating it:

```powershell
npm run test:browser -- tests/browser-smoke.test.cjs --grep "Thread Explorer keeps identity" --workers=1
```

Only update a platform reference after reviewing the corresponding visual change;
do not copy another platform's image or increase the tolerance to hide a failure.
