// マニュアル用のスクリーンショットを撮る
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const EXE = 'C:\\Users\\tadam\\AppData\\Local\\ms-playwright\\chromium-1217\\chrome-win64\\chrome.exe';
const APP = 'file:///C:/Dev/acca-study/index.html';
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });

// 本棚に見本データを入れた状態で撮る（空だと説明しづらいため）
const SEED = {
  passages: [
    { id: 'p1', title: '第1章 §1 会計の概観', en: 'Financial accounting records transactions...', ja: '財務会計は取引を記録し…' },
    { id: 'p2', title: '第1章 §3 事業体の種類', en: 'A sole trader has unlimited liability.', ja: '個人事業主は無限責任を負う。' },
  ],
};

async function shot(page, name, selector) {
  const el = await page.$(selector);
  if (!el) throw new Error('見つかりません: ' + selector);
  await el.screenshot({ path: path.join(OUT, name + '.png') });
  console.log('  ' + name + '.png');
}

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });

  // ---------- PC表示 ----------
  const pc = await browser.newContext({ viewport: { width: 1100, height: 950 }, deviceScaleFactor: 2 });
  const p = await pc.newPage();
  await p.goto(APP);
  await p.evaluate((seed) => {
    const s = JSON.parse(localStorage.getItem('accaStudy.v1') || '{}');
    s.passages = seed.passages;
    localStorage.setItem('accaStudy.v1', JSON.stringify(s));
  }, SEED);
  await p.reload();
  await p.waitForTimeout(800);

  console.log('PC:');
  // 図1 タブの位置
  await shot(p, '01_pc_nav', 'nav');

  // データタブへ
  await p.click('nav button[data-v="data"]');
  await p.waitForTimeout(500);

  // 図2 データタブ全体
  await p.screenshot({ path: path.join(OUT, '02_pc_data_tab.png') });
  console.log('  02_pc_data_tab.png');

  // 図3 本棚だけを移すカード
  await shot(p, '03_pc_bookshelf_card', '#passStat >> xpath=ancestor::div[contains(@class,"card")][1]');

  // 図4 まちがえやすい方（全データ置き換え）
  await shot(p, '04_pc_full_import_warning', '#exp >> xpath=ancestor::div[contains(@class,"card")][1]');

  // 図5 リーダータブの本棚（移した結果の確認場所）
  await p.click('nav button[data-v="reader"]');
  await p.waitForTimeout(400);
  await shot(p, '05_pc_bookshelf_result', '#passageList');

  await pc.close();

  // ---------- iPhone表示 ----------
  const ph = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const q = await ph.newPage();
  await q.goto(APP);
  await q.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('accaStudy.v1') || '{}');
    s.passages = [];               // iPhone側は「これから受け取る」状態
    localStorage.setItem('accaStudy.v1', JSON.stringify(s));
  });
  await q.reload();
  await q.waitForTimeout(800);

  console.log('iPhone:');
  await shot(q, '06_ip_nav', 'nav');
  await q.click('nav button[data-v="data"]');
  await q.waitForTimeout(500);
  await shot(q, '07_ip_bookshelf_card', '#passStat >> xpath=ancestor::div[contains(@class,"card")][1]');

  await ph.close();
  await browser.close();
  console.log('\n保存先: ' + OUT);
})().catch(e => { console.error('ERROR: ' + e.message); process.exit(1); });
