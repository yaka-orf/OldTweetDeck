# OldTweetDeck (fork)

Returns old TweetDeck — with the remaining open issues fixed and a couple of extra columns.

This is a personal fork of [dimdenGD/OldTweetDeck](https://github.com/dimdenGD/OldTweetDeck).
Changes are not sent upstream. The upstream project is the original work; this fork only adds
fixes and features on top of it.

[日本語の説明はこちら / Japanese README](docs/README_JA.md)

## What this fork adds

- **For you column** — X's ranked home timeline (the "For you" feed) as a column of its own.
- **Topic timelines** — 72 of X's topic feeds can be added as columns. The picker has a search box.
- **Account picker** — when adding one of those columns, choose which signed-in account it belongs to.
- **Refresh button** — on the For you and topic columns. It drops the cursor and fetches the top of
  the feed again, instead of waiting for the next poll.

## Fixed issues

These were open upstream when this fork started. Each one was reproduced first, then fixed.

| Issue | What was wrong |
|---|---|
| [#537](https://github.com/dimdenGD/OldTweetDeck/issues/537) | The challenge solver was loaded from a page outside the repository, so a change there broke the extension with nothing to fix locally. It ships with the extension now. |
| [#547](https://github.com/dimdenGD/OldTweetDeck/issues/547) | A cold start sometimes landed on the login screen. The signature is retried, the solver gets longer to initialise, and the challenge data is cached for two hours. |
| [#563](https://github.com/dimdenGD/OldTweetDeck/issues/563) | Videos did not play, because the legacy player is gone. A player is bundled. |
| [#545](https://github.com/dimdenGD/OldTweetDeck/issues/545) | Bookmark state was shared between accounts. Cursors and read marks are keyed per account now. |
| [#531](https://github.com/dimdenGD/OldTweetDeck/issues/531) | Tweet ids lost their last digits. Only safe integers are turned into `Number`. |
| [#530](https://github.com/dimdenGD/OldTweetDeck/issues/530) | A background tab kept showing old tweets. Every feed refetches when the tab becomes visible again. |
| [#549](https://github.com/dimdenGD/OldTweetDeck/issues/549) | Notifications did not render. The shape X sends now is read. |
| [#548](https://github.com/dimdenGD/OldTweetDeck/issues/548) | Editing a list's members stayed on "Loading List members...". Members are read through GraphQL, with the session auth type stated. |
| [#552](https://github.com/dimdenGD/OldTweetDeck/issues/552) | Mentions did not appear in the home column. They are folded back in. |

Details, including what was measured and what is still unverified, are in
[docs/FORK_NOTES.md](docs/FORK_NOTES.md).

## Installation

Do not delete the extension files (the unzipped folder for Chromium, the zip for Firefox) after
installing — the browser reads them from there.

### Chromium (Chrome, Edge, Opera, Brave, etc.)

1. Download `OldTweetDeckChrome.zip` from [this fork's releases](https://github.com/yaka-orf/OldTweetDeck/releases)
2. Unzip it
3. Open `chrome://extensions`
4. Turn on developer mode
5. Press "Load unpacked" and pick the unzipped folder
6. Open <https://x.com/i/tweetdeck>

### Firefox

Nightly / Developer Edition is recommended.

1. Download `OldTweetDeckFirefox.zip` from [this fork's releases](https://github.com/yaka-orf/OldTweetDeck/releases)
2. Open `about:config` and set `xpinstall.signatures.required` to false
3. Open `about:addons`, press "Install Add-on From File..." and pick the zip
4. Open <https://x.com/i/tweetdeck>

On Firefox Stable, load it from `about:debugging#/runtime/this-firefox` with "Load Temporary
Add-on". That build is removed when the browser closes.

### Safari

Not supported.

## Building

```sh
npm install
npm run build
```

The zips land in `build/`: `OldTweetDeckChrome.zip` and `OldTweetDeckFirefox.zip`. The Firefox
build drops the Chromium `sandbox` entry that MV3 does not support.

## Notes and limits

- The For you column asks X for the ranked timeline. If X answers `403` for the account behind a
  column, that column stays empty; it is not a bug in the extension.
- Each refresh asks for 40 entries. X returns roughly 28 tweets plus promoted posts and cursors,
  so the visible gain is smaller than the number requested. The ranked feed does not change every
  minute, so pressing refresh twice in a row often shows the same tweets.
- The Likes tab and the Activity column cannot be restored — the APIs behind them are gone.
- `localStorage.OTDalwaysUseLocalFiles = '1'` keeps the extension on the files it shipped with
  instead of fetching TweetDeck's updated assets.

## Credits

Upstream: [dimdenGD/OldTweetDeck](https://github.com/dimdenGD/OldTweetDeck), MIT licensed
(see [LICENSE](LICENSE)). This fork keeps the same licence.
