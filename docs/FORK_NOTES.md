# Fork notes

This fork is maintained for personal use. Changes are not sent upstream.

## Bundled solver (issue #537)

`challenge.js` used to load the challenge solver from
`https://tweetdeck.dimden.dev/solver.html?4`, a file that is not part of this
repository. A change on that page, or on X's bundle, breaks the extension with
no way to fix it here.

The fork now ships its own copy:

- `solver.html` — sandboxed page (`manifest.json` → `sandbox.pages`), based on
  the hosted copy as of 2026-10-23. The challenge module is looked up in the
  chunk that actually holds it instead of a hardcoded chunk index.
- `src/challenge.js` — the iframe points at `SOLVER_URL`, which `injection.js`
  replaces with the extension's own URL. Firefox keeps the hosted solver because
  Firefox has no sandbox page support. If the bundled solver never answers within
  8 seconds, the session switches to the hosted solver instead of leaving the
  extension without one.
- `src/injection.js` — no longer replaces `challenge.js` with the upstream copy,
  which would point the iframe back at the hosted solver.

### Checking the solver without an X session

```bash
node tests/make-solver-harness.js prop     # also: array, assign, broken
python -m http.server 8124 -d build
# open http://localhost:8124/solver-test-prop.html
```

The page posts a synthetic challenge to itself and records the message flow in
`window.__log`. A working extraction ends with `solved:<path>|<method>`; the
`broken` case ends with `initError` and is the signal that makes the extension
fall back to the hosted solver.

### Checking the extension in Chrome

1. `chrome://extensions` → developer mode → Load unpacked → the repository root.
2. Open <https://x.com/i/tweetdeck> with a test account.
3. In the console, run `localStorage.OTDalwaysUseLocalFiles = '1'` and reload the
   tab. Without it the extension downloads `challenge.js` and `interception.js`
   from GitHub and the local edits are not used.
4. Console should show `[OTD solver] local solver loaded` and
   `Solver initialized successfully`. If it shows
   `local solver did not initialize, falling back to the hosted solver`, the
   sandbox iframe did not come up (check for a CSP error on the frame).

## Cold-start stall (#547)

On a cold start TweetDeck asks for its initial state (`/1.1/tweetdeck/clients/blackbird/all`)
while account verification is still running. The state handler built the default
settings from `verifiedUser.id_str`, so before verification finished it threw
`TypeError: Cannot read properties of undefined (reading 'id_str')`, the state was
never answered, and the deck stayed on the loading spinner. Reloading the tab fixed it.

Changes in `src/interception.js`:

- `feeds` and `columns` start as `{}`. They were `undefined`, and `JSON.stringify`
  of that wrote the literal string `"undefined"` into localStorage, which then failed
  to parse on the next start and left `settings` empty.
- The state handler waits up to 8 seconds for `verifiedUser.id_str`, then answers
  anyway with a guarded fallback (`account_whitelist: []`, `default_account: null`),
  so the login screen can appear instead of a spinner that never resolves.
- `emulateResponse` keeps a status a handler already set (`xhr._status ?? 200`).

`src/injection.js` no longer replaces `interception.js` with the upstream copy for the
same reason as `challenge.js`: the upstream copy would undo the fix above.

Note: a missing lazy chunk (`ChunkLoadError`) can still block verification and leave
the deck at the login screen. That is a separate problem from the crash above.
