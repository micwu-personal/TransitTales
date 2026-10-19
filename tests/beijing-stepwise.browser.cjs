const assert = require('node:assert/strict');
const { startServer } = require('.\\beijing-browser-server.cjs');
const { chromium } = require('playwright');
const { chooseDirection, addLeg } = require('.\\beijing-browser-planner.cjs');
const network = require('..\\src\\beijing\\network-data.json');
const id = name => network.stations.find(station => station.name === name).id;
const namedLeg = (page, line, next, end) => addLeg(page, line, id(next), id(end));

(async () => {
  const server = await startServer();
  let browser;
  try {
    const options = { headless: true };
    try { browser = await chromium.launch(options); }
    catch (error) { if (!error.message.includes("Executable doesn't exist")) throw error; browser = await chromium.launch({ ...options, channel: 'msedge' }); }
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: width === 1440 ? 1100 : 844 }, hasTouch: width === 390 });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => {
        localStorage.setItem('beijing-voice-muted', 'true');
        localStorage.setItem('beijing-tutorial-seen', 'true');
        window.fastTrip = false; let extra = 0;
        const raf = requestAnimationFrame.bind(window);
        window.requestAnimationFrame = callback => raf(now => { if (window.fastTrip) extra += 400; callback(now + extra); });
      });
      await page.goto(server.url);
      await page.locator('#manual-direction').waitFor();
      await page.locator('#language').selectOption('en');
      await page.locator('#dimension').evaluate(select => { select.value = '2d'; select.dispatchEvent(new Event('change', { bubbles: true })); });
      const press = locator => width === 390 ? locator.tap() : locator.click();

      // A transfer can be an explicit stationary step, and undo restores the previous service.
      await namedLeg(page, '1-batong', '天安门西', '西单');
      await page.locator('#manual-line').selectOption('4-daxing');
      assert.ok((await page.locator('.transfer-estimate').textContent()).length > 0);
      await press(page.locator('[data-action="transfer"]'));
      assert.equal(await page.locator('.route-plan li').count(), 2);
      assert.match(await page.locator('.current-plan-station').textContent(), /西单/);
      assert.equal(await page.locator('[data-action="board"]').isEnabled(), false);
      await press(page.locator('[data-action="undo"]'));
      assert.equal(await page.locator('.route-plan li').count(), 1);
      assert.equal(await page.locator('#manual-direction').inputValue(), '');

      // Reaching the destination without the round's required stop is not a complete plan.
      await page.locator('#round').selectOption('2');
      await namedLeg(page, '2', '建国门', '雍和宫');
      await namedLeg(page, '5', '和平里北街', '大屯路东');
      await namedLeg(page, '15', '安立路', '奥林匹克公园');
      assert.equal(await page.locator('[data-action="board"]').isEnabled(), false);
      assert.match(await page.locator('.remaining-destinations').textContent(), /南锣鼓巷/);
      assert.match(await page.locator('.route-validation').textContent(), /required/i);
      await press(page.locator('[data-action="clear"]'));
      await namedLeg(page, '2', '建国门', '雍和宫');
      await namedLeg(page, '5', '北新桥', '东四');
      await namedLeg(page, '6', '南锣鼓巷', '南锣鼓巷');
      assert.doesNotMatch(await page.locator('.remaining-destinations').textContent(), /南锣鼓巷/);
      await namedLeg(page, '8', '什刹海', '奥林匹克公园');
      assert.equal(await page.locator('[data-action="board"]').isEnabled(), true);

      // The Airport direction can revisit an alighting station; it must follow the terminal circuit.
      await page.locator('#round').selectOption('6');
      await page.locator('#origin').selectOption(id('东直门'));
      await page.locator('#destination').selectOption(id('三元桥'));
      await chooseDirection(page, 'capital-airport', id('三元桥'));
      const visits = await page.locator('#manual-end option').evaluateAll((options, station) => options.filter(option => option.dataset.station === station).map(option => option.value), id('三元桥'));
      assert.equal(visits.length, 2); assert.notEqual(visits[0], visits[1]);
      await page.locator('#manual-end').selectOption(visits[1]);
      await press(page.locator('[data-action="add-leg"]'));
      assert.equal(await page.locator('[data-action="board"]').isEnabled(), true);
      await press(page.locator('[data-action="clear"]'));
      await page.locator('#origin').selectOption(id('3号航站楼'));
      await chooseDirection(page, 'capital-airport', id('2号航站楼'));
      assert.equal(await page.locator('#manual-direction option:not([value=""])').count(), 1);
      assert.ok(await page.locator('#manual-end option[value="sanyuanqiao"]').count());

      // A map selection may offer a real external walk, never merge the two station nodes.
      const connection = network.externalTransfers[0];
      await page.locator('#origin').selectOption(connection.from);
      await page.locator('#destination').selectOption(connection.to);
      const sourceLine = network.lines.find(line => line.stops.includes(connection.from)).id;
      await page.locator('#manual-line').selectOption(sourceLine);
      assert.equal(await page.locator('#manual-line option').evaluateAll((options, targetLines) => options.some(option => targetLines.includes(option.value)), network.lines.filter(line => line.stops.includes(connection.to)).map(line => line.id)), false);
      await page.locator(`.map-station[data-station="${connection.to}"]`).focus(); await page.keyboard.press('Enter');
      assert.equal(await page.locator('.route-plan li').count(), 0);
      assert.equal(await page.locator('.external-walk.map-choice').count(), 1);
      await press(page.locator('.external-walk.map-choice'));
      assert.equal(await page.locator('[data-action="board"]').isEnabled(), true);
      assert.equal(await page.locator('.route-plan li').count(), 1);

      // An interruption unlocks construction only after choosing replan, at the reached station.
      await page.locator('#round').selectOption('5');
      await namedLeg(page, '4-daxing', '陶然亭', '西单');
      await namedLeg(page, '1-batong', '天安门西', '国贸');
      await namedLeg(page, '10', '金台夕照', '三元桥');
      await press(page.locator('[data-action="board"]'));
      await page.locator('.journey-svg').waitFor();
      await page.locator('#speed').selectOption('15');
      await page.evaluate(() => { window.fastTrip = true; });
      await page.locator('.event-decision').waitFor({ timeout: 30000 });
      await page.evaluate(() => { window.fastTrip = false; });
      assert.equal(await page.locator('.manual-route').isVisible(), false);
      await press(page.locator('[data-action="replan"]'));
      assert.match(await page.locator('.current-plan-station').textContent(), /菜市口/);
      assert.equal(await page.locator('.route-plan li').count(), 0);
      assert.equal(await page.locator('[data-action="board"]').isEnabled(), false);
      await page.locator('#manual-line').selectOption('4-daxing');
      assert.equal(await page.locator('#manual-direction option').evaluateAll((options, next) => options.some(option => option.dataset.next === next), id('宣武门')), false);
      await namedLeg(page, '7', '虎坊桥', '磁器口');
      await namedLeg(page, '5', '崇文门', '雍和宫');
      await namedLeg(page, '2', '东直门', '东直门');
      await namedLeg(page, 'capital-airport', '三元桥', '三元桥');
      assert.equal(await page.locator('[data-action="board"]').isEnabled(), true);
      await page.evaluate(() => { window.fastTrip = true; });
      await press(page.locator('[data-action="board"]'));
      await page.locator('.journey-postcard').waitFor({ timeout: 30000 });
      assert.deepEqual(errors, []);
      console.log(`PASS stepwise ${width}: explicit transfer/undo, unmet and satisfied via, Airport circuit, separate map-to-walk nodes, real disruption/replan/completion`);
      await page.close();
    }
  } finally { await browser?.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
