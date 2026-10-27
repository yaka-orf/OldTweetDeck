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

### Solver init on a cold start

The solver iframe is created before it has loaded, so the first `init` message was
posted into a frame that was still loading and was dropped. There was one retry at
2.5 s, which is not enough on a cold start, so the solver never answered, the
challenge for `verify_credentials` timed out, and the deck fell back to the login
screen. `src/challenge.js` now re-sends `init` every second until the solver answers
(capped at 20 tries) and only falls back to the hosted solver after 20 s instead of 8.

Measured on the same profile: 0 of 6 cold starts loaded before the change, then 5 of 5
after it (the first measurement right after the change gave 3 of 5; the difference was
the launch harness failing to bring the debug port up, not the page).

### ChunkLoadError is noise

`ChunkLoadError: Loading chunk N failed. (missing: ...)` appears on most loads, including
loads that work. It comes from X's own app, not from this extension:
`src/destroyer.js` deletes `window.webpackChunk_twitter_responsive_web` every 50 ms for
the first 5 s, so when X's still-running client lazy-loads a chunk, the chunk file
re-creates that array and pushes into it, while X's runtime keeps a reference to the
deleted one and never sees the chunk. The chunk files themselves are fine (HTTP 200, and
`icons.5.4d856421ee8431c5a.js` pushes chunk 11408 as expected). Nothing to fix here.

## Videos do not play (#563)

TweetDeck embeds its player as an iframe pointing at `x.com/i/videos/tweet/<id>` (and
`x.com/i/videos/static?video_url=...` for cards). Both URLs now answer `200` with an
empty body, so the frame stays blank.

- `video.html` / `video.js`: a small player that takes the original URL as `?orig=` and
  plays the tweet's best `video/mp4` variant. For `/i/videos/tweet/<id>` it looks the
  tweet up through `TweetDetail` with the account's cookies; for `/i/videos/static` it
  uses the `video_url` parameter directly.
- `src/interception.js`: a MutationObserver rewrites any `i/videos/` iframe to the
  bundled player (`VIDEO_PAGE_URL`, substituted by `injection.js`).
- `manifest.json`: `video.html` added to `web_accessible_resources`.

The page must load `video.js` from a file: MV3 blocks inline scripts in extension pages.

## Bookmarks column with several accounts (#545)

`/1.1/statuses/bookmarks.json` was answered with cursor and receive-time state keyed only
by tweet id, and the handler never set `xhr.storage.user_id`. With more than one account
feeding the same Bookmarks column the accounts therefore shared one cursor and one set of
times, and the `profile-conversation` branch compared `tweet.user.id_str` against
`undefined`, so those entries were dropped.

- the handler now resolves the account (`x-act-as-user-id`, else the current account) and
  stores it in `xhr.storage.user_id`
- cursor and `bookmarkTimes` keys include that account id
- `parseTweet` is wrapped per entry, so one malformed bookmark no longer empties the
  column (the `Cannot read properties of undefined (reading 'legacy')` report)

## Tweet ids lose their last digits (#531)

`parseTweet` built the numeric fields with `+id_str`, and the v1.1 compat path with
`parseInt`. Tweet ids have been above 2^53 since 2016, so two neighbouring tweets can
round onto the same number; anything that uses the number as an identity then treats them
as one tweet. The fork's own `files/bundle.js` already prefers the string
(`this.id = e.id_str || e.id`), so keeping the exact digits as a string is compatible.

- new `exactId(value)`: returns a Number only when the value is a safe integer, otherwise
  the original digits as a string
- applied to every `+..._id_str` coercion (12) and every `parseInt(...id_str)` / `parseInt(id)`
  in the v1.1 path (4)

Not verified against live data. To confirm: follow an account with a busy timeline and
compare the deck's tweet count against `x.com/home`; the truncation shows up as tweets
that never appear.

## A background tab keeps showing old tweets (#530)

While the tab is hidden Chrome throttles its timers, and the deck's own catch-up on focus
is not dependable, so the columns sit on whatever they held when the tab was last looked
at (an hour old is the usual report).

`src/interception.js` now listens for `visibilitychange`: when the tab becomes visible it

- clears every `timings` entry, so the cancel heuristic in `openHandler` cannot swallow
  the first poll
- calls `refresh({reset: true})` on every poller in `TD.controller.feedManager`, which is
  the deck's own full refresh

Not verified live. To confirm: hide the deck for ten minutes, come back, and the Home
column should fill immediately without an F5.

## A For you column starts empty (#547-adjacent)

Measured in the debug profile (`chrome-profile`, CDP 9444, @yorfx): the For you column
shows no items while its feed is `twitter:<user>:list:82e96338c1`, `requestsInFlight` is
0 and `refreshLock` is unset, so this is not the stuck-guard case from 8c4e759. Clicking
the refresh button sends `HomeTimeline` and X answers 200 with 28 tweet entries, yet the
column stays empty; a reload sometimes fills it with 20 items. A topic column in the same
reload behaves the same way, and `OTDalwaysUseLocalFiles = '0'` does not change it.

What changed: the For you request now carries `tag: "otd-foryou"`. For you and the Home
column used to send the same `HomeTimeline` variables, so the two shared one URL shape.
X ignores a tag it does not know and still returns the full ranked page (checked: 200 with
28 entries); a reserved list id as the tag returns 0 entries, so only the sentinel is used.

Measured after the change, three reloads with the tag in place: For you held 20 items
twice and stayed at 0 once. The tag separates the request but does not remove the empty
state on its own, so the auto-recovery below is still needed.

Still open. To confirm a fix: reload the deck ten times and check that the For you column
never stays at 0 while the poller is idle.



#
#
 
W
a
t
c
h
d
o
g
 
f
o
r
 
a
 
c
o
l
u
m
n
 
t
h
a
t
 
n
e
v
e
r
 
g
e
t
s
 
i
t
s
 
f
i
r
s
t
 
p
a
g
e






`
s
r
c
/
i
n
t
e
r
c
e
p
t
i
o
n
.
j
s
`
 
n
o
w
 
r
u
n
s
 
`
a
l
g
o
W
a
t
c
h
T
i
c
k
`
 
e
v
e
r
y
 
t
h
r
e
e
 
s
e
c
o
n
d
s
.
 
F
o
r
 
e
v
e
r
y
 
c
o
l
u
m
n
 
t
h
a
t



r
e
s
o
l
v
e
s
 
t
o
 
a
 
r
e
s
e
r
v
e
d
 
l
i
s
t
 
i
d
 
i
t
 
c
o
u
n
t
s
 
c
o
n
s
e
c
u
t
i
v
e
 
s
a
m
p
l
e
s
 
w
h
e
r
e
 
t
h
e
 
c
o
l
u
m
n
 
h
o
l
d
s
 
n
o



i
t
e
m
s
;
 
a
f
t
e
r
 
t
h
r
e
e
 
o
f
 
t
h
e
m
 
i
t
 
c
l
e
a
r
s
 
`
r
e
q
u
e
s
t
s
I
n
F
l
i
g
h
t
`
 
a
n
d
 
`
r
e
f
r
e
s
h
L
o
c
k
`
 
a
n
d
 
c
a
l
l
s
 
t
h
e



s
a
m
e
 
`
r
e
f
r
e
s
h
A
l
g
o
C
o
l
u
m
n
`
 
t
h
e
 
h
e
a
d
e
r
 
b
u
t
t
o
n
 
u
s
e
s
.
 
A
f
t
e
r
 
f
i
v
e
 
i
t
 
r
e
l
o
a
d
s
 
t
h
e
 
p
a
g
e
,
 
c
a
p
p
e
d
 
a
t



t
w
o
 
r
e
l
o
a
d
s
 
p
e
r
 
t
e
n
 
m
i
n
u
t
e
s
 
t
h
r
o
u
g
h
 
`
s
e
s
s
i
o
n
S
t
o
r
a
g
e
.
O
T
D
a
l
g
o
W
a
t
c
h
R
e
l
o
a
d
s
`
.






A
 
s
e
c
o
n
d
 
p
a
s
s
,
 
`
a
l
g
o
W
a
t
c
h
E
m
p
t
y
C
o
l
u
m
n
s
`
,
 
w
o
r
k
s
 
f
r
o
m
 
t
h
e
 
D
O
M
 
a
l
o
n
e
:
 
a
 
F
o
r
 
y
o
u
 
c
o
l
u
m
n
 
w
h
o
s
e



t
i
t
l
e
 
m
a
t
c
h
e
s
 
a
n
d
 
w
h
i
c
h
 
h
a
s
 
h
e
l
d
 
z
e
r
o
 
i
t
e
m
s
 
f
o
r
 
t
w
e
l
v
e
 
s
e
c
o
n
d
s
 
i
s
 
r
e
l
o
a
d
e
d
 
w
i
t
h
 
t
h
e
 
s
a
m
e



b
u
d
g
e
t
.
 
I
t
 
e
x
i
s
t
s
 
b
e
c
a
u
s
e
 
t
h
e
 
e
n
t
r
y
 
l
o
o
k
u
p
 
n
e
e
d
s
 
t
h
e
 
c
o
l
u
m
n
'
s
 
l
i
s
t
 
m
e
t
a
d
a
t
a
,
 
w
h
i
c
h
 
i
s



e
x
a
c
t
l
y
 
w
h
a
t
 
i
s
 
m
i
s
s
i
n
g
 
w
h
i
l
e
 
t
h
e
 
c
o
l
u
m
n
 
i
s
 
e
m
p
t
y
.






M
e
a
s
u
r
e
d
:
 
t
h
e
 
t
i
c
k
 
c
o
u
n
t
e
r
 
a
d
v
a
n
c
e
s
 
a
n
d
 
n
o
 
e
r
r
o
r
 
i
s
 
r
e
c
o
r
d
e
d
,
 
a
n
d
 
t
h
e
 
c
o
l
u
m
n
 
f
i
l
l
s
 
i
n
 
t
h
e



r
u
n
s
 
s
a
m
p
l
e
d
 
s
o
 
f
a
r
.
 
N
o
t
 
v
e
r
i
f
i
e
d
:
 
a
n
 
a
c
t
u
a
l
 
r
e
s
c
u
e
.
 
I
n
 
f
o
u
r
 
f
r
o
n
t
-
t
a
b
 
r
e
l
o
a
d
 
c
y
c
l
e
s
 
t
h
e



c
o
l
u
m
n
 
c
a
m
e
 
u
p
 
p
o
p
u
l
a
t
e
d
 
e
v
e
r
y
 
t
i
m
e
,
 
s
o
 
t
h
e
 
r
e
s
c
u
e
 
p
a
t
h
 
h
a
d
 
n
o
t
h
i
n
g
 
t
o
 
d
o
;
 
t
h
e
 
e
m
p
t
y
 
c
a
s
e
s



s
e
e
n
 
e
a
r
l
i
e
r
 
h
a
p
p
e
n
e
d
 
w
i
t
h
 
t
h
e
 
w
i
n
d
o
w
 
i
n
 
t
h
e
 
b
a
c
k
g
r
o
u
n
d
,
 
w
h
e
r
e
 
C
h
r
o
m
e
 
t
h
r
o
t
t
l
e
s
 
t
h
e



t
i
m
e
r
.
 
T
o
 
c
o
n
f
i
r
m
:
 
l
e
a
v
e
 
t
h
e
 
d
e
c
k
 
i
n
 
f
r
o
n
t
,
 
r
e
l
o
a
d
 
u
n
t
i
l
 
a
 
F
o
r
 
y
o
u
 
c
o
l
u
m
n
 
s
t
a
r
t
s
 
e
m
p
t
y
,



a
n
d
 
c
h
e
c
k
 
t
h
a
t
 
i
t
 
f
i
l
l
s
 
w
i
t
h
i
n
 
a
b
o
u
t
 
f
i
f
t
e
e
n
 
s
e
c
o
n
d
s
.


