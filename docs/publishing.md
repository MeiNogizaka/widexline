# このリポジトリの公開

[日本語](publishing.md) · [English](publishing.en.md)

## GitHub に載せてよいもの

次のファイルにアカウント名、メール、トークン、タイムラインのダンプはありません。

- `manifest.json`
- `content.js`、`styles.css`
- `popup.html`、`popup.js`、`popup.css`
- `icons/*.png`
- `README.md`、`README.en.md`、`PRIVACY.md`、`LICENSE`
- `docs/`
- `.gitignore`

ソースを確認した範囲では、メール、X のハンドル、API キーはありません。拡張機能に認証情報は埋め込んでいません。

## ローカルに残すもの

| パス | 理由 |
| --- | --- |
| `スクリーンショット/` | ログイン中ホームの画面、アカウント UI、他ユーザーの投稿とアバター、保存した Edge の HTML（タイムライン全体の DOM）。 |
| `ホーム _ X*.html` と `*_files/` | 同じダンプに加え、ダウンロードした X の JS。 |
| `*:Zone.Identifier` | Windows のダウンロード ADS。git には不要。 |
| `logs/` | 作業メモ。いまは空の雛形。 |

`.gitignore` で除外済みです。`git push` の前に次を実行します。

```bash
git status
git ls-files
```

`スクリーンショット`、`ホーム _ X`、`Zone.Identifier` が出たら中止し、ステージから外します。

ログイン中アカウントの「修正前 / 修正後」スクリーンショットは足さないでください。README 用の画像が必要なら、捨てアカウントで撮るか、右カラム・表示名・アバターを切ります。

## GitHub リポジトリの作成

公開リポジトリは既にあります。新規クローンから出す場合:

```bash
git init
git add manifest.json content.js styles.css popup.html popup.js popup.css icons README.md README.en.md PRIVACY.md LICENSE docs .gitignore
git status   # インデックスを確認
git commit -m "Initial public snapshot of Widex"
```

続けて:

```bash
git remote add origin git@github.com:<you>/widex.git
git branch -M main
git push -u origin main
```

remote の URL は自分の GitHub アカウントにします。この文書ではユーザー名を書きません。

GitHub 側の目安: 説明は “Widen the x.com timeline and cap media height”、トピック `browser-extension`、ライセンス MIT。非公開のデバッグフォルダを Release の添付にしない。

## ストア掲載は別件

GitHub はソースの置き場です。Edge アドオンや Chrome ウェブストアにはプライバシー文が要ります。`PRIVACY.md` からコピーします。ホスト権限は `https://x.com/*` と `https://twitter.com/*` のままです。
