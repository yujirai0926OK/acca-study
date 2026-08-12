const fs = require('fs');
const path = require('path');
const d = require('docx');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, LevelFormat, PageBreak
} = d;

const SHOTS = path.join(__dirname, 'shots');
const OUT = process.argv[2] || path.join(__dirname, 'manual.docx');

const FONT = 'Yu Gothic';
const USABLE = 9026;               // A4・余白2.54cmの本文幅(DXA)
const MAXPX = 600;                 // 図の最大幅(px)

function pngSize(file) {           // PNGのIHDRから幅・高さを読む
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

function fig(name, caption, maxPx) {
  const file = path.join(SHOTS, name);
  const { w, h } = pngSize(file);
  const cap = maxPx || MAXPX;
  const width = Math.min(cap, w);
  const height = Math.round((h / w) * width);
  const out = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
      children: [new ImageRun({ type: 'png', data: fs.readFileSync(file), transformation: { width, height } })],
    }),
  ];
  if (caption) {
    out.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: caption, size: 18, color: '5B6B6E', font: FONT })],
    }));
  }
  return out;
}

const P = (text, opt = {}) => new Paragraph({
  spacing: { after: opt.after === undefined ? 120 : opt.after, line: 300 },
  alignment: opt.align,
  children: [new TextRun({ text, font: FONT, size: opt.size || 21, bold: opt.bold, color: opt.color })],
});

// 太字混じりの段落
const RICH = (parts, opt = {}) => new Paragraph({
  spacing: { after: opt.after === undefined ? 120 : opt.after, line: 300 },
  children: parts.map(p => new TextRun({
    text: typeof p === 'string' ? p : p.t,
    bold: typeof p === 'string' ? false : p.b,
    color: typeof p === 'string' ? undefined : p.c,
    font: FONT, size: opt.size || 21,
  })),
});

const H1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160 },
  children: [new TextRun({ text, font: FONT, size: 30, bold: true, color: '0F766E' })],
});
const H2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 120 },
  children: [new TextRun({ text, font: FONT, size: 24, bold: true, color: '1C2526' })],
});

const BULLET = (text, opt = {}) => new Paragraph({
  numbering: { reference: 'dot', level: 0 },
  spacing: { after: 80, line: 300 },
  children: [new TextRun({ text, font: FONT, size: 21, bold: opt.bold, color: opt.color })],
});
const STEP = (text) => new Paragraph({
  numbering: { reference: 'steps', level: 0 },
  spacing: { after: 100, line: 300 },
  children: [new TextRun({ text, font: FONT, size: 21 })],
});

// 注意ボックス（1セルの表）
function box(title, lines, fill, edge) {
  return new Table({
    columnWidths: [USABLE],
    width: { size: USABLE, type: WidthType.DXA },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 6, color: edge },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: edge },
      left:   { style: BorderStyle.SINGLE, size: 18, color: edge },
      right:  { style: BorderStyle.SINGLE, size: 6, color: edge },
      insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
    },
    rows: [new TableRow({
      children: [new TableCell({
        width: { size: USABLE, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill },
        margins: { top: 160, bottom: 160, left: 200, right: 200 },
        children: [
          new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: title, bold: true, font: FONT, size: 21, color: edge })] }),
          ...lines.map((l, i) => new Paragraph({
            spacing: { after: i === lines.length - 1 ? 0 : 60, line: 300 },
            children: [new TextRun({ text: l, font: FONT, size: 20 })],
          })),
        ],
      })],
    })],
  });
}

// 比較表
function table(head, rows, widths) {
  const cell = (t, o = {}) => new TableCell({
    width: { size: o.w, type: WidthType.DXA },
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill } : undefined,
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    children: [new Paragraph({ children: [new TextRun({ text: t, bold: o.bold, font: FONT, size: 20, color: o.color })] })],
  });
  return new Table({
    columnWidths: widths,
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    rows: [
      new TableRow({
        tableHeader: true,
        children: head.map((t, i) => cell(t, { w: widths[i], bold: true, fill: 'E6F2F0' })),
      }),
      ...rows.map(r => new TableRow({ children: r.map((t, i) => cell(t, { w: widths[i], bold: i === 0 })) })),
    ],
  });
}

const doc = new Document({
  creator: 'ACCA FA 学習アプリ',
  title: '本棚データの移行マニュアル',
  numbering: {
    config: [
      { reference: 'dot', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 420, hanging: 240 } } } }] },
      { reference: 'steps', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 420, hanging: 300 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    children: [
      // ── 表紙 ─────────────────────────────
      new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { before: 600, after: 80 },
        children: [new TextRun({ text: 'ACCA FA 学習アプリ', font: FONT, size: 24, color: '5B6B6E' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 120 },
        children: [new TextRun({ text: '本棚データの移行マニュアル', font: FONT, size: 44, bold: true, color: '0F766E' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 500 },
        children: [new TextRun({ text: '教科書の対訳を PC ⇄ iPhone で同じにする手順', font: FONT, size: 24, color: '5B6B6E' })],
      }),

      P('対象アプリ： https://yujirai0926ok.github.io/acca-study/', { align: AlignmentType.CENTER, size: 19, color: '5B6B6E' }),
      P('作成日：2026年8月12日', { align: AlignmentType.CENTER, size: 19, color: '5B6B6E', after: 400 }),

      box('このマニュアルの目的', [
        '進捗・単語・自作テストは、Googleログインさえすれば PC と iPhone で自動同期されます。',
        'ところが「本棚（教科書の対訳）」だけは、あえて同期していません。教科書の本文をクラウド（Google のサーバー）に置かないためです。',
        'そのため本棚は手動で移す必要があります。その手順が、このマニュアルです。',
      ], 'F5F7F8', '0F766E'),

      new Paragraph({ children: [new PageBreak()] }),

      // ── 1 ────────────────────────────────
      H1('1. 同期されるもの・されないもの'),
      P('まず、何が自動で、何が手動かを整理します。'),
      table(
        ['データ', '同期', '移し方'],
        [
          ['進捗（箱・要復習）', '自動', '何もしなくてよい'],
          ['単語', '自動', '何もしなくてよい'],
          ['🔖 後日フラグ', '自動', '何もしなくてよい'],
          ['自作テスト', '自動', '何もしなくてよい'],
          ['読み上げ設定', '自動', '何もしなくてよい'],
          ['📕 本棚（教科書の対訳）', 'されない', 'このマニュアルの手順'],
        ],
        [3400, 1600, 4026]
      ),
      P('', { after: 200 }),
      RICH([
        '本棚が同期されないのは不具合ではなく、',
        { t: '意図した設計', b: true },
        'です。教科書（Kaplan）の本文が自分の端末の外に出ないようにしています。',
      ]),

      // ── 2 ────────────────────────────────
      H1('2. 全体の流れ'),
      STEP('PC で「本棚だけ書き出し」を押して、ファイルを1つ作る'),
      STEP('そのファイルを iPhone に渡す（メール等）'),
      STEP('iPhone で「本棚を読み込み（追加）」を押して取り込む'),
      STEP('件数が同じになったか確認する'),
      P('所要時間は5分ほどです。章を追加するたびに、何度でも実行できます。', { after: 240 }),

      new Paragraph({ children: [new PageBreak()] }),

      // ── STEP1 ───────────────────────────
      H1('STEP 1　PC で本棚を書き出す'),

      H2('1-1. 「⚙️ データ」タブを開く'),
      P('アプリを開き、画面上部の一番右にある「⚙️ データ」をクリックします。'),
      ...fig('01_pc_nav.png', '図1：画面上部のタブ。一番右が「⚙️ データ」', 600),

      P('「⚙️ データ」タブを開くと、次のような画面になります。'),
      ...fig('02_pc_data_tab.png', '図2：「⚙️ データ」タブの全体。下の方に「📕 本棚だけを移す」があります', 560),

      new Paragraph({ children: [new PageBreak()] }),

      H2('1-2. 「⬇️ 本棚だけ書き出し」を押す'),
      P('下にスクロールし、「📕 本棚だけを移す」という項目を探します。左の濃い緑のボタンを押してください。'),
      ...fig('03_pc_bookshelf_card.png', '図3：「⬇️ 本棚だけ書き出し」（左の緑のボタン）を押す', 600),

      RICH([
        'ボタンを押すと ',
        { t: 'acca-bookshelf.json', b: true },
        ' というファイルがダウンロードされます（通常は「ダウンロード」フォルダに保存されます）。',
      ]),
      RICH([
        'このとき、カードの一番下に表示されている ',
        { t: '「この端末の本棚：◯件」', b: true },
        ' の数字を控えておいてください。あとで iPhone 側と見比べます。',
      ], { after: 240 }),

      box('うまくいかないとき', [
        '「本棚がまだ空です。」と出る → PC の本棚に対訳がまだ入っていません。先に「📖 リーダー」タブで対訳を保存してください。',
        'ボタンが見つからない → ページを再読み込み（Ctrl キーと Shift キーを押しながら R）してから、もう一度探してください。',
      ], 'FEF9E7', 'B45309'),

      new Paragraph({ children: [new PageBreak()] }),

      // ── STEP2 ───────────────────────────
      H1('STEP 2　ファイルを iPhone に渡す'),
      P('iPhone に OneDrive アプリが入っていないため、次のどちらかの方法が簡単です。'),

      H2('方法A：メールで送る（おすすめ）'),
      STEP('PC で自分宛にメールを作成する'),
      STEP('STEP 1 で作った acca-bookshelf.json を添付して送信する'),
      STEP('iPhone でそのメールを開き、添付ファイルをタップする'),
      STEP('共有ボタンから「"ファイル"に保存」を選び、保存する'),

      H2('方法B：Google ドライブを使う'),
      STEP('PC のブラウザで drive.google.com を開き、ファイルをアップロードする'),
      STEP('iPhone のブラウザで drive.google.com を開き、そのファイルをダウンロードする'),

      P('', { after: 120 }),
      box('確認', [
        'iPhone の「ファイル」アプリに acca-bookshelf.json が入っていれば、STEP 2 は完了です。',
      ], 'F5F7F8', '0F766E'),

      new Paragraph({ children: [new PageBreak()] }),

      // ── STEP3 ───────────────────────────
      H1('STEP 3　iPhone で読み込む'),

      H2('3-1. 「⚙️ データ」タブを開く'),
      P('iPhone で同じアプリを開き、上部のタブを右にスワイプして「⚙️ データ」をタップします。'),
      ...fig('06_ip_nav.png', '図4：iPhone での画面上部のタブ', 380),

      H2('3-2. 「⬆️ 本棚を読み込み（追加）」をタップ'),
      P('「📕 本棚だけを移す」の中にある、右側の「⬆️ 本棚を読み込み（追加）」をタップします。'),
      ...fig('07_ip_bookshelf_card.png', '図5：iPhone での「📕 本棚だけを移す」。右側（下側）をタップ', 330),

      P('ファイルを選ぶ画面が出るので、STEP 2 で保存した acca-bookshelf.json を選びます。'),
      RICH([
        '成功すると ',
        { t: '「本棚を読み込みました ✓ 新規 ◯件 ／ 同名を更新 ◯件」', b: true },
        ' と表示されます。',
      ], { after: 240 }),

      new Paragraph({ children: [new PageBreak()] }),

      // ── 間違えやすい点 ───────────────────
      H1('⚠️ 間違えやすい点（重要）'),

      box('似ているボタンが2つあります', [
        '同じ「⚙️ データ」タブの中に「⬆️ 読み込み」というボタンもありますが、そちらは全データを置き換えるボタンです。',
        '使うと、iPhone で覚えた単語の進捗まで PC の内容で上書きされてしまいます。',
        '本棚を移すときは、必ず「⬆️ 本棚を読み込み（追加）」の方を使ってください。',
      ], 'FDECEA', 'B91C1C'),

      P('', { after: 200 }),
      P('間違えやすいのは、こちらの上側のカードです（本棚の移行には使いません）。'),
      ...fig('04_pc_full_import_warning.png', '図6：こちらの「⬆️ 読み込み」は全データを置き換える。本棚の移行には使わない', 600),

      P('', { after: 120 }),
      P('本棚を移すときに使うのは、その下にある「📕 本棚だけを移す」の方です（図3・図5）。'),

      table(
        ['ボタン', '何が起きるか', '本棚の移行に'],
        [
          ['⬆️ 読み込み', '全データを置き換える（進捗も上書き）', '使わない'],
          ['⬆️ 本棚を読み込み（追加）', '本棚だけ追加・更新する', 'こちらを使う'],
        ],
        [2900, 4126, 2000]
      ),

      new Paragraph({ children: [new PageBreak()] }),

      // ── STEP4 ───────────────────────────
      H1('STEP 4　正しく移せたか確認する'),

      H2('4-1. 件数を見比べる'),
      RICH([
        '「⚙️ データ」タブの「📕 本棚だけを移す」の下に ',
        { t: '「この端末の本棚：◯件」', b: true },
        ' と出ています。PC と iPhone で同じ数になっていれば成功です。',
      ]),

      H2('4-2. 中身を見る'),
      P('「📖 リーダー」タブを開き、下の方の「📚 マイ対訳（保存した対訳の本棚）」に、移した対訳のタイトルが並んでいれば完了です。'),
      ...fig('05_pc_bookshelf_result.png', '図7：「📖 リーダー」タブの本棚。タイトルをタップすると中身が開きます', 600),

      // ── 逆方向 ───────────────────────────
      H1('5. iPhone から PC に移したいとき'),
      P('手順はまったく同じで、向きが逆になるだけです。'),
      STEP('iPhone で「⬇️ 本棚だけ書き出し」をタップ'),
      STEP('ファイルを PC に渡す（メール等）'),
      STEP('PC で「⬆️ 本棚を読み込み（追加）」を押す'),

      // ── FAQ ─────────────────────────────
      H1('6. よくある質問'),

      H2('Q. 何度もやると対訳が二重に増えませんか？'),
      P('増えません。同じタイトルの対訳がある場合は上書き更新され、ない場合だけ追加されます。章を足すたびに実行して大丈夫です。'),

      H2('Q. 単語の進捗は消えませんか？'),
      P('「本棚を読み込み（追加）」を使うかぎり消えません。このボタンは本棚だけを扱い、進捗・単語・自作テストには一切触れません。'),

      H2('Q. このファイルはインターネットに送られますか？'),
      P('送られません。あなたが自分でメール等に添付して運ぶだけです。教科書の本文がアプリのクラウド（Google のサーバー）に保存されることはありません。'),

      H2('Q. 本棚も自動同期にできませんか？'),
      P('技術的には可能ですが、教科書の本文がクラウドに保存されることになるため、あえて対象外にしています。方針を変えたい場合はご相談ください。'),

      H2('Q. ファイルをなくしてしまいました'),
      P('PC 側の本棚が残っていれば、いつでも「⬇️ 本棚だけ書き出し」で作り直せます。'),

      P('', { after: 300 }),
      box('バックアップのすすめ', [
        '本棚はその端末の中にしかありません。ブラウザの「履歴・サイトデータを消去」をすると消えてしまいます。',
        'ときどき「⬇️ 本棚だけ書き出し」でファイルを作り、OneDrive などに保管しておくと安心です。',
      ], 'F5F7F8', '0F766E'),
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUT, buf);
  console.log('作成: ' + OUT + ' (' + Math.round(buf.length / 1024) + ' KB)');
});
