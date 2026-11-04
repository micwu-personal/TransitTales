const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');

(async () => {
  const { createServer } = await import('vite');
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  let browser;
  try {
    await server.listen();
    const executablePath = process.env.TRANSIT_BROWSER || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    const url = `http://127.0.0.1:${server.httpServer.address().port}/melody.html?view=2d`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.selectOption('#language', 'en');
    await page.click('#mode-studio');
    await page.click('#stop-0');
    await page.selectOption('#letter', 'C');
    await page.selectOption('#octave', '4');
    await page.click('#add-tone');
    assert.equal(await page.inputValue('#letter'), 'E', 'adding a diatonic third');
    await page.click('#add-tone');
    await page.selectOption('#letter', 'G');
    await page.selectOption('#tone', '0');
    await page.check('#tuplet');
    await page.selectOption('#meter', '3/4');
    await page.selectOption('#score-dynamic', 'p');
    await page.check('#repeat');
    for (const clef of ['bass', 'alto', 'tenor']) {
      await page.click('#add-part');
      await page.selectOption('#clef', clef);
      await page.uncheck('#rest');
    }
    assert.equal(await page.locator('#part option').count(), 4);
    assert.equal(await page.locator('#add-part').isDisabled(), true);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('transit-tales-melody-v1')).studio);
    assert.equal(saved.parts.length, 3);
    assert.equal(saved.events[0].chord.length, 2);
    assert.equal(saved.events[0].tuplet, 3);
    assert.equal(saved.repeat, true);
    assert.equal(saved.dynamic, 'p');
    await page.selectOption('#part', '0');
    assert.equal(await page.locator('#draft-staff .vf-clef').count(), 4);
    assert.equal(await page.locator('#draft-staff .vf-tuplet').count(), 4);
    const print = await page.locator('#draft-staff svg').innerHTML();
    await page.selectOption('#notation-style', 'handwritten');
    assert.notEqual(await page.locator('#draft-staff svg').innerHTML(), print, 'font selection changes engraved outlines');
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('#mode-studio');
    assert.equal(await page.inputValue('#notation-style'), 'handwritten');
    assert.equal(await page.locator('#part option').count(), 4, 'advanced score is restored');
    assert.equal(await page.isChecked('#repeat'), true);
    await page.selectOption('#part', '0');
    await page.click('#stop-0');
    await page.selectOption('#tone', '0');
    await page.fill('#tempo', '40');
    await page.locator('#tempo').dispatchEvent('change');
    await page.click('#play');
    await page.waitForFunction(() => document.querySelectorAll('.journey-scene svg g[data-midi]:not([data-midi=""])[visibility="visible"]').length >= 6);
    assert.equal(await page.locator('.journey-scene [data-route="repeat"]').count(), 4);
    await page.click('#stop');

    // A drag is one undo transaction, even with many pointer moves.
    const original = await page.evaluate(() => localStorage.getItem('transit-tales-melody-v1'));
    const note = page.locator('#score-note-0');
    await note.scrollIntoViewIfNeeded();
    const box = await note.boundingBox();
    assert(box);
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    const glyphBox = await page.locator('#score-glyph-0-0-0').boundingBox();
    const neighborBox = await page.locator('#score-glyph-0-0-1').boundingBox();
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y - 20, { steps: 8 });
    assert((await page.locator('#score-glyph-0-0-0').boundingBox()).y < glyphBox.y, 'actual engraved head follows the drag');
    assert.equal((await page.locator('#score-glyph-0-0-1').boundingBox()).y, neighborBox.y, 'other chord tones do not move');
    await page.mouse.up();
    assert.notEqual(await page.inputValue('#letter'), 'C', 'mouse drag changes actual pitch');
    await page.click('#undo');
    assert.equal(await page.inputValue('#letter'), 'C');
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('transit-tales-melody-v1'))), JSON.parse(original));
    await page.locator('#score-note-0').focus();
    await page.keyboard.press('Shift+F10');
    await page.waitForSelector('.note-context');
    await page.selectOption('#event-dynamic', 'ff');
    assert.equal(await page.inputValue('#event-dynamic'), 'ff');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.note-context').count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'score-note-0');
    await page.locator('#score-note-0').click({ button: 'right' });
    assert.equal(await page.locator('.note-context').count(), 1);
    await page.click('#close-context');
    assert.equal(await page.locator('.note-context').count(), 0);
    await page.selectOption('#part', '3');
    await page.click('#remove-part');
    assert.equal(await page.locator('#part option').count(), 3);
    await page.click('#undo');
    assert.equal(await page.locator('#part option').count(), 4);
    await page.selectOption('#part', '0');
    await page.click('#stop-0');
    await page.selectOption('#tone', '0');
    await page.locator('#score-note-0').click({ button: 'right' });
    await page.click('#undo');
    assert.equal(await page.locator('.note-context').count(), 0, 'outside click executes its action and closes the menu');
    const screenshotDir = process.env.TRANSIT_SCREENSHOTS;
    if (screenshotDir) {
      await fs.mkdir(screenshotDir, { recursive: true });
      await page.selectOption('#notation-style', 'print');
      await page.locator('#draft-staff').screenshot({ path: path.join(screenshotDir, 'ensemble-print-desktop.png') });
      await page.selectOption('#notation-style', 'handwritten');
      await page.locator('#draft-staff').screenshot({ path: path.join(screenshotDir, 'ensemble-handwritten-desktop.png') });
    }
    await page.selectOption('#part', '0');
    for (let count = await page.locator('[data-select]').count(); count > 0; count--) {
      await page.click('#stop-0');
      await page.click('#remove');
    }
    assert.equal(await page.locator('#play').isDisabled(), true, 'an empty primary staff cannot play an unaligned ensemble draft');
    assert.equal(await page.locator('.score-issue').isVisible(), true, 'incomplete ensemble drafts explain their validation issue');
    await page.click('#lesson-first');
    await page.selectOption('#letter', 'B');
    await page.selectOption('#octave', '8');
    assert.equal(await page.locator('#add-tone').isDisabled(), true, 'adding a chord tone never creates an unsupported octave');

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const touchPage = await mobile.newPage();
    touchPage.on('pageerror', error => errors.push(String(error)));
    await touchPage.goto(url, { waitUntil: 'networkidle' });
    await touchPage.selectOption('#language', 'en');
    const cdp = await mobile.newCDPSession(touchPage);
    async function touchDrag(hold, delta) {
      await touchPage.locator('#score-note-0').scrollIntoViewIfNeeded();
      const box = await touchPage.locator('#score-note-0').boundingBox();
      assert(box);
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
      await touchPage.waitForTimeout(hold);
      if (delta) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - delta, id: 1 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    await touchDrag(20, 30);
    assert.equal(await touchPage.inputValue('#letter'), 'D', 'early touch travel pans instead of editing');
    await touchDrag(470, 0);
    assert.equal(await touchPage.locator('.note-context').count(), 1, 'stationary hold opens note controls');
    const menuBox = await touchPage.locator('.note-context').boundingBox();
    assert(menuBox.x >= 0 && menuBox.x + menuBox.width <= 391, 'mobile context fits the viewport');
    await touchPage.click('#close-context');
    await touchDrag(470, 20);
    assert.notEqual(await touchPage.inputValue('#letter'), 'D', 'armed touch drag changes pitch');
    await touchPage.click('#undo');
    assert.equal(await touchPage.inputValue('#letter'), 'D');
    if (screenshotDir) {
      await touchPage.click('[data-group="ensemble"]');
      await touchPage.click('#lesson-ensemble');
      await touchPage.selectOption('#notation-style', 'handwritten');
      await touchPage.locator('#draft-staff').scrollIntoViewIfNeeded();
      await touchPage.screenshot({ path: path.join(screenshotDir, 'ensemble-mobile.png'), fullPage: true });
      await touchPage.click('#open-context');
      await touchPage.screenshot({ path: path.join(screenshotDir, 'context-mobile.png') });
    }
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: professional styles, four clefs, chords/tuplets/dynamics/repeat saves, music-derived routes, mouse/touch editing and contextual controls');
    await mobile.close();
    await context.close();
  } finally {
    await browser?.close();
    await server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
