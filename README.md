# Widex

[日本語](README.md) · [English](README.en.md)

Microsoft Edge / Chromium 向けの非公式拡張機能です。x.com（旧 Twitter）のタイムライン幅を広げ、画像・動画・センシティブ警告の高さを揃えます。複数画像は 2×2 ではなく 1 行に並べます。

X / Twitter とは無関係です。サイトの DOM に依存するため、X 側の更新で壊れることがあります。

更新や不具合の修正は、作者の都合で進めます。対応の時期や範囲を約束するものではありません。

## できること

- タイムライン幅を 600–1200px に変更
- 右カラム（トレンド）の表示 / 非表示
- 画像・動画・リンクカード・引用の高さを上限 px で揃える（オフなら原寸）
- 複数画像を横一列にパック（余白で引き伸ばさない）
- ネイティブの画像ライトボックスを維持（戻る操作でタイムラインが再読み込みされない）
- センシティブ / 成人向けのぼかしを維持したまま高さを制限
- 動画・GIF は再生できる状態のまま高さを制限

## インストール（Edge、展開済み）

ビルド手順はありません。リポジトリをクローンして読み込みます。

1. このリポジトリをクローンする
2. `edge://extensions/` を開く
3. 「デベロッパー モード」をオンにする
4. 「展開して読み込む」で、クローンしたフォルダを選ぶ
5. x.com を再読み込みする

Chrome でも同じ手順です（`chrome://extensions/`）。

Windows にコピーして使う場合は、ソースだけを置けば足ります。例:

```text
%LOCALAPPDATA%\Widex
```

`スクリーンショット/` や `logs/` はデバッグ用で、公開リポジトリには含めません。

## 設定

ツールバーのアイコンからポップアップを開きます。

| 項目 | 初期値 | 内容 |
| --- | --- | --- |
| タイムライン幅 | 800px | 600–1200px |
| 右カラムを隠す | オン | オフにすると幅 420px の右カラムを残す |
| 画像の高さを制限する | オフ | オンにすると上限スライダーが効く |
| 上限 | 400px | 120–800px。スライダーを動かすと制限がオンになる |

設定は端末内の `chrome.storage.local` に保存されます。外部へは送られません。

## ファイル構成

```text
manifest.json   Manifest V3
content.js      タイムラインの加工（document_start）
styles.css      幅・高さ・flatten 行の見た目
popup.html/js/css
icons/
docs/           方式とメンテナンス（日本語 / 英語）
PRIVACY.md      収集しないことの説明
```

実装の理由と、X の DOM が変わったときの直し方は [docs/architecture.md](docs/architecture.md) と [docs/maintenance.md](docs/maintenance.md) です。英語は [docs/architecture.en.md](docs/architecture.en.md) と [docs/maintenance.en.md](docs/maintenance.en.md)。GitHub へ上げるときの注意は [docs/publishing.md](docs/publishing.md)（[English](docs/publishing.en.md)）です。

## プライバシー

個人情報は扱いません。詳細は [PRIVACY.md](PRIVACY.md) です。

この作業用フォルダには、ログイン中のタイムラインを保存した HTML とスクリーンショットが残っていることがあります。それらは `.gitignore` で除外しています。**GitHub に push しないでください。**

## ライセンス

[MIT](LICENSE)
