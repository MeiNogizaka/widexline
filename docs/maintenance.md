# メンテナンス

[日本語](maintenance.md) · [English](maintenance.en.md)

X のフロントエンドはよく変わります。Widexline の不具合の多くは「セレクタが当たらなくなった」か「padding-bottom の箱の外側に新しいラッパが付いた」です。このファイルは、同じ失敗を繰り返さないためのチェックリストです。

## 作業の進め方

1. 展開済み拡張を入れた状態で、実際の x.com で再現する。
2. 見本が必要なら投稿 HTML を **ローカルに** 保存する。場所は `スクリーンショット/`（gitignore 済み）。タイムラインのダンプはコミットしない。ログイン中のアカウント UI が入る。
3. `r-*` クラスより `data-testid` を優先する。testid が無い、または広すぎるときだけクラスを足す。
4. 挙動を変えたら `manifest.json` の `version` を上げる（いまは `1.7.0`）。
5. `content.js` と `popup.js` の `DEFAULTS` を同じに保つ。

単体テストはありません。「テスト」は次の表をホームで手で確認することです。

## 回帰確認

flatten、高さ、CSS を触ったら、次を確認します。

| ケース | 期待 |
| --- | --- |
| 静止画 1 枚 | 高さはスライダー（オフなら原寸）。切れない。クリックで X のライトボックス。戻ってもホームのまま。 |
| 静止画 2–4 枚（カルーセル） | 横 1 行、パック、2×2 ではない。本文の下に大きな隙間が無い。 |
| 引用の静止画 4 枚 | 引用の中も同じ 1 行。ネイティブのコラージュが残らない。幅がちらつかない。 |
| リンクカード | 画像 / 動画がスライダーに従う。 |
| 動画 / GIF | 再生できる。コントロールが見える。左に寄ってから中央へ戻らない。 |
| 画像と動画の混在 | flatten しない。高さは制限。動画は再生できる。 |
| センシティブ / 成人向け、ぼかしたまま | 「表示」の **前から** オーバーレイもコラージュもスライダー以下。ぼかしは残る。 |
| センシティブ、「表示」のあと | 同じ高さで画像が出る。 |
| 右カラムオフ | 420px の空洞が無い。 |
| 右カラムオン | トレンドが実際に描画される（空欄にならない）。 |
| 高さスライダーをライブで動かす | 再読み込みなしで既存の投稿が変わる。スクロール位置は保つ。 |
| インストール直後の初回表示 | 1 フレームだけ高いぼかしから縮まない。キャッシュと `#widex-early-cap` で防ぐ。 |
| アバター / 返信欄 | アバターが 300px にならない（`.r-13qz1uu` 除外）。 |

確認時の目安: 幅 1200、右カラム表示、高さ制限オン、上限 300。

## 過去の不具合から残している約束

新しい理由が無いなら、外さないでください。

- **再生できる投稿、センシティブ、混在は flatten しない。** プレイヤーが消えたり、ぼかしが外れたりした。
- **`sidebarColumn` に `display: none` を付けない。** 再表示するとトレンドが空のままになる。
- **内側の `videoPlayer` に `max-height` を付けない。** コントロールが欠け、ちらつく。
- **`/photo/N` へ遷移しない。** 隠した元の `<a>` をクリックし、X の SPA ライトボックスを開く。
- **`zoom` や `getBoundingClientRect` で縮小しない。** zoom が積もって約 1e-88 になった。
- **すべての `[style*=padding-bottom]` に `padding-bottom: 0` を付けない。** `.r-13qz1uu` は除外する。
- **padding-bottom のアスペクト箱を `max-height` だけに頼らない。** `%` パディングは **親の幅** 基準で、`max-height` はパディングを含まない。パディングを 0 にして `height` を付ける。
- **オーバーレイの祖先まで制限する。** `r-1w2pmg` だけでは足りない。警告レイヤは `r-yfv4eo` / `r-l3hqri` を覆う兄弟。
- **毎フレーム `capPlayable` しない。** `data-widex-cap-width` / `data-widex-cap-height` で固定する。
- **画像に `naturalWidth` が付いたら `fitRow` を固定する。** そうしないと引用カルーセルの幅が振動する。

## どこを直すか

| 症状 | まず見る場所 |
| --- | --- |
| 最初の描画が高すぎる | `writeEarlyCapStyle`、`styles.css` の早期キャップ、`widex.cache.v1` |
| カルーセルが 2×2 のまま | `flattenCarousel`、`flattenPhotoList`、`ScrollSnap-*` / `testCondensedMedia` |
| 本文の下の大きな隙間 | flatten した箱に残った `padding-bottom`。`data-widex-hidden` で隠す |
| ぼかしが画像より高い | `capFrameAndShell` / `applyNativeCap`。オーバーレイが兄弟か確認 |
| 動画が再生できない | `isPlayableMedia`、`restorePlayableMedia`。flatten がプレイヤーを隠した |
| 動画のちらつき / コントロール欠け | `capPlayable`、`findMediaShell`。内側のノードは触らない |
| ライトボックスでホームが再読み込みされる | `bindNativePhotoClick` / `clickOriginalPhoto` |
| スクロールが跳ねる | `preserveScroll` |
| 右カラムが空白 | `syncSidebar`。`display: none` は使わない |
| 引用がはみ出す | `fitRow`、`rowAvailWidth`、`relocateQuoteSingles` |
| 幅が 600 のまま | `uncap600`（`r-1ye8kvj`）、`syncShell` |

## 実ページでの確認

DevTools で、壊れている投稿に対して:

```js
$0.closest("[data-testid='tweetPhoto']")
$0.closest("[style*='padding-bottom']")
$0.closest("[data-widex-native-cap], [data-widex-cap], .widex-row, .widex-single")
getComputedStyle($0).paddingBottom
getComputedStyle($0).height
```

Widexline が書く属性:

- `data-widex-hidden` — 置き換えたネイティブのコラージュ
- `data-widex-playable` — flatten しない
- `data-widex-native-cap` / `data-widex-sensitive-native` — flatten しない高さ制限
- `data-widex-cap` — 再生できる外側シェル
- `data-widex-fit-h` / `data-widex-fit-lock` — パックした行のキャッシュ
- `html.widex-limit-height`、`--widex-max-height`、`--widex-width`、`--widex-sidebar`

`#widex-early-cap` は `<html>` 上の `<style>` です。最初の描画で無ければ、キャッシュ経路が失敗しています。

## X の文言 / 言語が変わったとき

センシティブ判定は文字列一致です（`内容の警告`、`Content warning`、`センシティブな内容`、`Sensitive content`、および「表示」 / Show / View）。新しいロケールは `isSensitiveText` / `hasSensitiveWarning` に足します。再生の aria-label（`埋め込み動画`、`Play GIF`、…）も同じです。

## 公開

1. 回帰表を確認する。
2. `manifest.json` の `version` を上げる。
3. コミットするのはソースと docs だけ。`スクリーンショット/`、`logs/`、`*:Zone.Identifier`、保存した `ホーム _ X*.html` は入れない。
4. GitHub Releases を使うならタグを打つ。展開用 zip にも、それらのデバッグファイルは入れない。

Edge アドオン / Chrome ウェブストアの掲載は GitHub とは別で、プライバシー文が要ります。このリポジトリの `PRIVACY.md` が原典です。
