# OldTweetDeck（フォーク）

昔の TweetDeck を取り戻します。本家に残っていた issue を修正し、列を2種類足したフォークです。

本家 [dimdenGD/OldTweetDeck](https://github.com/dimdenGD/OldTweetDeck) の個人フォークです。変更は本家へ送っていません。本家が原本で、このフォークはその上に修正と機能を足しただけです。

![スクリーンショット](https://lune.dimden.dev/9713d947d56.png)

英語の説明は [README.md](../README.md) にあります。

## 追加した機能

- **For you 列**: X のおすすめ（ranked ホームタイムライン）を単独の列として表示します。
- **トピック別タイムライン**: X のトピックフィード72種から選んで列に追加できます。ピッカーには検索欄があります。
- **アカウント選択**: これらの列を追加するとき、ログイン済みのどのアカウントのフィードを使うか選べます。
- **更新ボタン**: For you 列とトピック列のヘッダに付きます。カーソルを捨てて先頭から取得し直すので、次のポーリングを待たずに更新できます。

## 修正した issue

いずれもこのフォークを始めた時点で本家に未解決だったものです。まず再現してから修正しました。

| issue | 内容 |
|---|---|
| [#537](https://github.com/dimdenGD/OldTweetDeck/issues/537) | チャレンジソルバを拡張に同梱し、外部読み込みの失敗を避けました |
| [#547](https://github.com/dimdenGD/OldTweetDeck/issues/547) | コールドスタートでログイン画面へ落ちる問題を直しました。署名を再試行し、ソルバの初期化待ちを延ばし、チャレンジデータを2時間キャッシュします |
| [#563](https://github.com/dimdenGD/OldTweetDeck/issues/563) | 動画が再生されない問題を直しました。同梱したプレイヤーで再生します |
| [#545](https://github.com/dimdenGD/OldTweetDeck/issues/545) | ブックマーク列を複数アカウントで使うと状態が混ざる問題を直しました。カーソルと既読をアカウントごとに分けています |
| [#531](https://github.com/dimdenGD/OldTweetDeck/issues/531) | ツイートIDが桁落ちする問題を直しました。安全な整数だけを Number にします |
| [#530](https://github.com/dimdenGD/OldTweetDeck/issues/530) | バックグラウンドタブが古い表示のままになる問題を直しました。タブを再表示したときに各フィードを取り直します |
| [#549](https://github.com/dimdenGD/OldTweetDeck/issues/549) | 通知が表示されない問題を直しました。現在の応答形式を読み取ります |
| [#548](https://github.com/dimdenGD/OldTweetDeck/issues/548) | リストのメンバー編集が「Loading List members...」で止まる問題を直しました。GraphQL でメンバーを読み、セッションの認証方式を明示します |
| [#552](https://github.com/dimdenGD/OldTweetDeck/issues/552) | メンションがホーム列に出ない問題を直しました。ホーム列に戻して表示します |

計測した中身と未検証の点は [FORK_NOTES.md](FORK_NOTES.md) にまとめています。

## インストール

インストールしたあと、拡張のファイル（Chromium は展開したフォルダ、Firefox は zip）を削除しないでください。ブラウザがそこから読み込んでいます。

### Chromium（Chrome, Edge, Opera, Brave など）

1. [このフォークのリリースページ](https://github.com/yaka-orf/OldTweetDeck/releases) から `OldTweetDeckChrome.zip` をダウンロードします
2. zip を展開します
3. `chrome://extensions` を開きます
4. デベロッパーモードを有効にします
5. 「パッケージ化されていない拡張機能を読み込む」を押し、展開したフォルダを選びます
6. <https://x.com/i/tweetdeck> を開きます

### Firefox

Nightly / Developer Edition をおすすめします。

1. [このフォークのリリースページ](https://github.com/yaka-orf/OldTweetDeck/releases) から `OldTweetDeckFirefox.zip` をダウンロードします
2. `about:config` を開き、`xpinstall.signatures.required` を false にします
3. `about:addons` を開き、「ファイルからアドオンをインストール...」で zip を選びます
4. <https://x.com/i/tweetdeck> を開きます

Firefox Stable では `about:debugging#/runtime/this-firefox` の「一時的なアドオンを読み込む」で読み込んでください。この方法で入れたものはブラウザを閉じると消えます。

### Safari

対応していません。

## ビルド

```sh
npm install
npm run build
```

`build/` に zip が出ます。`OldTweetDeckChrome.zip` と `OldTweetDeckFirefox.zip` です。Firefox 版では、MV3 が対応しない Chromium 固有の `sandbox` エントリを落とします。

## 注意点と制限

- For you 列は ranked タイムラインを X に要求します。その列のアカウントで X が `403` を返すと、列は空のままです。拡張側の不具合ではありません。
- 更新1回で40件のエントリを要求します。X が返すのはツイートが約28件で、残りはプロモとカーソルが埋めるため、見える増え幅は要求数より小さくなります。ranked フィードはその場で変わらないこともあり、続けて押しても同じツイートが見えることがあります。
- いいねタブとアクティビティ列は復元できません。その背後にあった API がなくなっています。
- `localStorage.OTDalwaysUseLocalFiles = '1'` を設定すると、TweetDeck の更新アセットを取らず、拡張と同梱したファイルのまま使います。
- 拡張が動かなくなったときは、まず拡張を入れ直してください。
- 「Manifest version 2 is deprecated」という警告が出たら、最新版に更新してください。
- 「Link another account you own」からアカウントを追加できないときは、本家 issue #259 のコメントを参照してください。
- ユーザー列や検索列が読み込まれないときは、API 制限に達しています。制限が解除されると戻ります。
- TweetDeck のファイルが更新されたときは、タブを再読み込みすると拡張を入れ直さずに更新を受け取れます。`localStorage.OTDalwaysUseLocalFiles = '1'` を設定している場合は除きます。拡張側のファイルが更新されたときは、拡張を入れ直してください。

## クレジット

本家 [dimdenGD/OldTweetDeck](https://github.com/dimdenGD/OldTweetDeck)。MIT ライセンスです（[LICENSE](../LICENSE) を参照）。このフォークも同じライセンスを保っています。

本家のバージョン履歴は本家の[リリースページ](https://github.com/dimdenGD/OldTweetDeck/releases)にあります。

2015〜2018年の Twitter に戻したいときは、同じ作者の [OldTwitter](https://github.com/dimdenGD/OldTwitter) も使えます。

Better TweetDeck の [fork](https://github.com/dimdenGD/BetterTweetDeck/releases) も公開しています。インストール方法はこの拡張と同じです。
