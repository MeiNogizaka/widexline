# 方式

[日本語](architecture.md) · [English](architecture.en.md)

Widex は Manifest V3 のコンテンツスクリプトです。X の React ツリーは置き換えません。描画済みの DOM を後から直し、タイムラインを広く・メディアを低くします。再生、センシティブのぼかし、ネイティブの画像ライトボックスは壊さないことが前提です。

## ファイル

| ファイル | 役割 |
| --- | --- |
| `manifest.json` | MV3。対象は `x.com` / `twitter.com`。権限は `storage` のみ。`run_at: document_start`。 |
| `content.js` | 設定、早期キャップ、flatten と native-cap、Observer。 |
| `styles.css` | 幅の CSS 変数、右カラム隠し、`.widex-row` / `.widex-single`、native-cap の overflow。 |
| `popup.*` | `chrome.storage.local` の読み書きと、コンテンツスクリプトへの ping。 |

バックグラウンドの service worker もビルド手順もありません。

## 設定

キーは 4 つ。`content.js` と `popup.js` の初期値は同じです。

```js
{ width: 800, hideSidebar: true, limitHeight: false, maxHeight: 400 }
```

保存場所は 2 つです。

1. `chrome.storage.local` — 正本。ポップアップが書き、コンテンツスクリプトが `chrome.storage.onChanged` を聞く。
2. x.com 上の `localStorage["widex.cache.v1"]` — 直前の設定のコピー。`document_start` で **同期的に** 読み、最初の描画から高さを制限する。

`chrome.storage` は非同期です。キャッシュが無いと、最初のフレームは X の 510px / padding-bottom の箱のままになり、storage 到着後に跳ねます。キャッシュはその隙間を埋めるためだけにあります。

キャッシュが無い初回は、`content.js` がとりあえず `limitHeight: true`（400px）を当て、あとから `chrome.storage` で上書きします。

## 実行順

```
document_start
  localStorage キャッシュを読む
  CSS 変数を当て、#widex-early-cap を注入
  （キャッシュが無ければ楽観的にキャップ）
chrome.storage.local.get  →  applySettings → patchTimeline
MutationObserver (subtree)  →  schedulePatch (rAF)  →  patchTimeline
ポップアップからの widex-settings / widex-ping
```

全体を通す処理は `patchTimeline` だけです。高さ変更で画面上の投稿が跳ねないよう `preserveScroll` で包みます。

## メディア処理は二系統

X のメディアはアスペクト比ボックスです。`padding-bottom: N%` のスペーサーと、絶対配置のオーバーレイです。列幅 600px ではこれで足ります。列が 800–1200px になり、高さ上限を付けると足りません。理由は次です。

- `%` の padding-bottom は、要素自身ではなく **包含ブロックの幅** に対する割合です。
- content-box の `max-height` は、そのパディングを切りません。
- 「内容の警告 / 成人向けコンテンツ」のオーバーレイは、コラージュ箱（`r-1w2pmg`）の子ではなく、`position: absolute; inset: 0` の **兄弟** です。コラージュだけ制限しても、オーバーレイは高く残ります。

そのため Widex は次の二系統に分けます。

### Flatten（静止画だけ）

ネイティブのコラージュを隠して、自分のマークアップを入れてよいときだけ使います。

- `.widex-single` — 静止画 1 枚
- `.widex-row` — 静止画 2 枚以上を flex の 1 行

対象:

- カルーセル: `[data-testid="ScrollSnap-SwipeableList"]`
- 引用の 2×2: `[data-testid="testCondensedMedia"]`
- 同じ投稿 / 引用を共有する、それ以外の複数画像

ネイティブ側は `data-widex-hidden="1"` で隠します。画像は `object-fit: contain` と `max-height` です。高さ制限時の行は `fitRow` でパックします。各画像は同じ高さで縦横比を保ち、幅の合計が行を超えたら高さを下げ、等幅の隙間を作りません。

次のいずれかなら flatten **しません**。

- センシティブ / 内容の警告がある
- 再生できる（動画、GIF、`previewInterstitial`、`videoPlayer`、`playButton`、amplify / ext のサムネ）
- 同じ投稿に画像と動画が混在する
- `/photo/N` のリンクが無い（flatten するとライトボックスが壊れる）

### Native-cap（flatten できないものすべて）

X の DOM はそのままにします。`padding-bottom` を 0 にし、`height` / `max-height` をスライダー値、`overflow: hidden`、`box-sizing: border-box` にします。オーバーレイの兄弟も切るため、祖先を `r-l3hqri` まで辿ります。

印:

- `data-widex-native-cap` / `data-widex-sensitive-native` — コラージュ / 警告の枠
- `data-widex-cap` + `--widex-media-cap` — 再生できるシェルの外側幅だけ。内側のプレイヤーに inline の max-height は付けません。コントロールバーが欠け、左に寄ってから中央へ戻るちらつきの原因になったためです。

CSS と早期の `#widex-early-cap` が当てる対象は次です。

```css
[data-testid="primaryColumn"] [style*="padding-bottom"]:not(.r-13qz1uu)
```

`.r-13qz1uu` は内側スペーサー / アバターです。ここに height:300px を付けるとアバターと内側レイアウトが潰れます。この `:not()` は外さないでください。

一部の単画像には `height: 510px` が直書きされています。CSS と `applyAspectCap` の両方で `height: auto` / `max-height` に差し替えます。

## 幅と右カラム

X は atomic クラス `r-1ye8kvj`（`max-width: 600px`）で列を止めます。`uncap600` がそれを外します。`syncShell` は `primaryColumn` を `--widex-width` にし、`main > div` を `width + (hideSidebar ? 0 : 420)` にします。

右カラムは **`display: none` にしません**。そうすると 420px の空洞が残り、再表示したときにトレンドが描画されなくなりました。隠し方は width / opacity / overflow / pointer-events です。再表示ではそれらのプロパティを外し、仮想化用の大きな `margin-top` スペーサーを戻します。

## ライトボックス

flatten した `<a href="/status/.../photo/N">` で画面遷移してはいけません。`/photo/N` を本読み込みして戻ると、タイムラインが再読み込みされます。クリックは捕捉し、隠してある元のリンクへ `clickOriginalPhoto` で渡します。修飾キー付きクリック（新しいタブ）は href のままです。

## 再生できるメディア

`isPlayableMedia` / `looksLikePlayable` / `markPlayable`（`data-widex-playable="1"`）。一度印を付けたら flatten で隠しません。静止画のあとにプレイヤーが来る（X が後から hydrate する）場合は `restorePlayableMedia` が flatten を戻します。

制限するのは外側のシェル（`findMediaShell`）だけです。幅は `maxHeight * 100 / paddingBottomPct` です。

## スクロール

`preserveScroll` は画面内の先頭 `article[data-testid="tweet"]` の top を記録し、パッチ後に差分を `scrollTop` へ足します。高さ制限を変えると、そうしないとタイムラインがずれます。

## いずれ壊れるセレクタ

atomic クラスより `data-testid` を優先します。次のクラスは X 側のハッシュで変わります。

| クラス / testid | いまの X での意味 |
| --- | --- |
| `r-1ye8kvj` | max-width 600px |
| `r-1w2pmg` | コラージュの `padding-bottom` 箱 |
| `r-yfv4eo` / `r-l3hqri` | メディアのラッパ。オーバーレイはここ |
| `r-13qz1uu` | 内側スペーサー / アバター（キャップしない） |
| `r-1kqtdi0` + `r-1phboty` | 枠付きメディアカード |
| `r-14gqq1x` | メディアの束 |
| `r-16y2uox` | flex-grow |
| `tweetPhoto` | 静止画（動画シェルになることもある） |
| `ScrollSnap-*` | 画像カルーセル |
| `testCondensedMedia` | 引用投稿のコラージュ |
| `card.wrapper` | リンクカード |
| `videoPlayer` / `previewInterstitial` / `playButton` | プレイヤー |
| `sidebarColumn` / `primaryColumn` | レイアウト |

レイアウトが崩れたら、投稿 HTML を **ローカルに** 保存し（コミットしない）、新しいクラス名を足す前に、上のどれがまだ当たるかを確認してください。
