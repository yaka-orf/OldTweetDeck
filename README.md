# OldTweetDeck (fork)

昔の TweetDeck を取り戻します。本家に残っていた issue を修正し、列を2種類足したフォークです。

Returns old TweetDeck — with the remaining open issues fixed and two extra column types.

本家 [dimdenGD/OldTweetDeck](https://github.com/dimdenGD/OldTweetDeck) の個人フォークです。変更は本家へ送っていません。本家が原本で、このフォークはその上に修正と機能を足しただけです。

This is a personal fork of [dimdenGD/OldTweetDeck](https://github.com/dimdenGD/OldTweetDeck). Changes are not sent upstream. Upstream is the original work; this fork only adds fixes and features on top of it.

![スクリーンショット / Screenshot](https://lune.dimden.dev/9713d947d56.png)

## 追加した機能 / What's new

- **For you 列**: X のおすすめ（ranked ホームタイムライン）を単独の列として表示します。
  - **For you column** — X's ranked home timeline (the "For you" feed) as a column of its own.
- **トピック別タイムライン**: X のトピックフィード72種から選んで列に追加できます。ピッカーには検索欄があります。
  - **Topic timelines** — 72 of X's topic feeds can be added as columns. The picker has a search box.
- **アカウント選択**: これらの列を追加するとき、ログイン済みのどのアカウントのフィードを使うか選べます。
  - **Account picker** — when adding one of those columns, choose which signed-in account it belongs to.
- **更新ボタン**: For you 列とトピック列のヘッダに付きます。カーソルを捨てて先頭から取得し直すので、次のポーリングを待たずに更新できます。
  - **Refresh button** — on the For you and topic columns. It drops the cursor and fetches the top of the feed again, instead of waiting for the next poll.

## 修正した issue / Fixed issues

いずれもこのフォークを始めた時点で本家に未解決だったものです。まず再現してから修正しました。

All of these were open upstream when this fork started. Each one was reproduced first, then fixed.

| issue | 内容 | What was wrong |
|---|---|---|
| [#537](https://github.com/dimdenGD/OldTweetDeck/issues/537) | チャレンジソルバを拡張に同梱し、外部読み込みの失敗を避けました | The challenge solver was loaded from a page outside the repository, so a change there broke the extension with nothing to fix locally. It ships with the extension now. |
| [#547](https://github.com/dimdenGD/OldTweetDeck/issues/547) | コールドスタートでログイン画面へ落ちる問題を直しました。署名を再試行し、ソルバの初期化待ちを延ばし、チャレンジデータを2時間キャッシュします | A cold start sometimes landed on the login screen. The signature is retried, the solver gets longer to initialise, and the challenge data is cached for two hours. |
| [#563](https://github.com/dimdenGD/OldTweetDeck/issues/563) | 動画が再生されない問題を直しました。同梱したプレイヤーで再生します | Videos did not play, because the legacy player is gone. A player is bundled. |
| [#545](https://github.com/dimdenGD/OldTweetDeck/issues/545) | ブックマーク列を複数アカウントで使うと状態が混ざる問題を直しました。カーソルと既読をアカウントごとに分けています | Bookmark state was shared between accounts. Cursors and read marks are keyed per account now. |
| [#531](https://github.com/dimdenGD/OldTweetDeck/issues/531) | ツイートIDが桁落ちする問題を直しました。安全な整数だけを Number にします | Tweet ids lost their last digits. Only safe integers are turned into `Number`. |
| [#530](https://github.com/dimdenGD/OldTweetDeck/issues/530) | バックグラウンドタブが古い表示のままになる問題を直しました。タブを再表示したときに各フィードを取り直します | A background tab kept showing old tweets. Every feed refetches when the tab becomes visible again. |
| [#549](https://github.com/dimdenGD/OldTweetDeck/issues/549) | 通知が表示されない問題を直しました。現在の応答形式を読み取ります | Notifications did not render. The shape X sends now is read. |
| [#548](https://github.com/dimdenGD/OldTweetDeck/issues/548) | リストのメンバー編集が「Loading List members...」で止まる問題を直しました。GraphQL でメンバーを読み、セッションの認証方式を明示します | Editing a list's members stayed on "Loading List members...". Members are read through GraphQL, with the session auth type stated. |
| [#552](https://github.com/dimdenGD/OldTweetDeck/issues/552) | メンションがホーム列に出ない問題を直しました。ホーム列に戻して表示します | Mentions did not appear in the home column. They are folded back in. |

計測した中身と未検証の点は [FORK_NOTES.md](docs/FORK_NOTES.md) にまとめています。

Details, including what was measured and what is still unverified, are in [docs/FORK_NOTES.md](docs/FORK_NOTES.md).

## インストール / Installation

インストールしたあと、拡張のファイル（Chromium は展開したフォルダ、Firefox は zip）を削除しないでください。ブラウザがそこから読み込んでいます。

Do not delete the extension files (the unzipped folder for Chromium, the zip for Firefox) after installing — the browser reads them from there.

### Chromium（Chrome, Edge, Opera, Brave など） / Chromium (Chrome, Edge, Opera, Brave, etc.)

1. [このフォークのリリースページ](https://github.com/yaka-orf/OldTweetDeck/releases) から `OldTweetDeckChrome.zip` をダウンロードします
   - Download `OldTweetDeckChrome.zip` from [this fork's releases](https://github.com/yaka-orf/OldTweetDeck/releases).
2. zip を展開します
   - Unzip it.
3. `chrome://extensions` を開きます
   - Open `chrome://extensions`.
4. デベロッパーモードを有効にします
   - Turn on developer mode.
5. 「パッケージ化されていない拡張機能を読み込む」を押し、展開したフォルダを選びます
   - Press "Load unpacked" and pick the unzipped folder.
6. <https://x.com/i/tweetdeck> を開きます
   - Open <https://x.com/i/tweetdeck>.

### Firefox

Nightly / Developer Edition をおすすめします。 / Nightly / Developer Edition is recommended.

1. [このフォークのリリースページ](https://github.com/yaka-orf/OldTweetDeck/releases) から `OldTweetDeckFirefox.zip` をダウンロードします
   - Download `OldTweetDeckFirefox.zip` from [this fork's releases](https://github.com/yaka-orf/OldTweetDeck/releases).
2. `about:config` を開き、`xpinstall.signatures.required` を false にします
   - Open `about:config` and set `xpinstall.signatures.required` to false.
3. `about:addons` を開き、「ファイルからアドオンをインストール...」で zip を選びます
   - Open `about:addons`, press "Install Add-on From File..." and pick the zip.
4. <https://x.com/i/tweetdeck> を開きます
   - Open <https://x.com/i/tweetdeck>.

Firefox Stable では `about:debugging#/runtime/this-firefox` の「一時的なアドオンを読み込む」で読み込んでください。この方法で入れたものはブラウザを閉じると消えます。

On Firefox Stable, load it from `about:debugging#/runtime/this-firefox` with "Load Temporary Add-on". That build is removed when the browser closes.

### Safari

対応していません。 / Not supported.

## ビルド / Building

```sh
npm install
npm run build
```

`build/` に zip が出ます。`OldTweetDeckChrome.zip` と `OldTweetDeckFirefox.zip` です。Firefox 版では、MV3 が対応しない Chromium 固有の `sandbox` エントリを落とします。

The zips land in `build/`: `OldTweetDeckChrome.zip` and `OldTweetDeckFirefox.zip`. The Firefox build drops the Chromium `sandbox` entry that MV3 does not support.

## 注意点と制限 / Notes and limits

- For you 列は ranked タイムラインを X に要求します。その列のアカウントで X が `403` を返すと、列は空のままです。拡張側の不具合ではありません。
  - The For you column asks X for the ranked timeline. If X answers `403` for the account behind a column, that column stays empty; it is not a bug in the extension.
- 更新1回で40件のエントリを要求します。X が返すのはツイートが約28件で、残りはプロモとカーソルが埋めるため、見える増え幅は要求数より小さくなります。ranked フィードはその場で変わらないこともあり、続けて押しても同じツイートが見えることがあります。
  - Each refresh asks for 40 entries. X returns roughly 28 tweets plus promoted posts and cursors, so the visible gain is smaller than the number requested. The ranked feed does not change every minute, so pressing refresh twice in a row often shows the same tweets.
- いいねタブとアクティビティ列は復元できません。その背後にあった API がなくなっています。
  - The Likes tab and the Activity column cannot be restored — the APIs behind them are gone.
- `localStorage.OTDalwaysUseLocalFiles = '1'` を設定すると、TweetDeck の更新アセットを取らず、拡張と同梱したファイルのまま使います。
  - `localStorage.OTDalwaysUseLocalFiles = '1'` keeps the extension on the files it shipped with instead of fetching TweetDeck's updated assets.

## クレジット / Credits

本家 [dimdenGD/OldTweetDeck](https://github.com/dimdenGD/OldTweetDeck)。MIT ライセンスです（[LICENSE](LICENSE) を参照）。このフォークも同じライセンスを保っています。

Upstream: [dimdenGD/OldTweetDeck](https://github.com/dimdenGD/OldTweetDeck), MIT licensed (see [LICENSE](LICENSE)). This fork keeps the same licence.
