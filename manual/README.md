# 本棚データ移行マニュアルの再生成

アプリの画面を変更したら、マニュアルのスクリーンショットも作り直す。

## 使い方

```bash
npm install playwright-core docx
node shots.js      # index.html を実際に描画して shots/ に画像を保存
node makedoc.js 出力先.docx
```

- `shots.js` … Playwright（Chromium）で `C:\Dev\acca-study\index.html` を開き、PC表示（1100x950）と iPhone表示（390x844）でカードごとに切り出す。本棚には見本データを入れてから撮る。
- `makedoc.js` … `shots/` の画像を貼り込んで .docx を生成する。

Chromium は `%LOCALAPPDATA%\ms-playwright` のものを使う（`shots.js` の `EXE` を参照）。

## 出来上がりの確認

LibreOffice は未インストールなので、Word（COM）でPDF化して確認する。

```powershell
$w=New-Object -ComObject Word.Application; $w.Visible=$false
$d=$w.Documents.Open("$PWD\out.docx",$false,$true)
$d.ExportAsFixedFormat("$PWD\out.pdf",17)
$d.Close($false); $w.Quit()
```

## 完成品の置き場所

`C:\Users\tadam\OneDrive\Desktop\ACCA\ACCA学習アプリ_本棚データ移行マニュアル.docx`
（成果物なのでリポジトリには置かない）
