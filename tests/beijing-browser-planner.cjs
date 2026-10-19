const assert = require('node:assert/strict');

async function chooseDirection(page, line, next) {
  await page.locator('#manual-line').selectOption(line);
  const value = await page.locator('#manual-direction option').evaluateAll((options, next) => options.find(option => option.dataset.next === next)?.value, next);
  assert.ok(value, `Direction ${line} towards next station ${next} is available`);
  await page.locator('#manual-direction').selectOption(value);
}
async function addLeg(page, line, next, end) {
  await chooseDirection(page, line, next);
  await page.locator('#manual-end').selectOption(end);
  const button = page.locator('[data-action="add-leg"]');
  if (await page.evaluate(() => navigator.maxTouchPoints > 0)) await button.tap(); else await button.click();
}
async function buildIntro(page) {
  await addLeg(page, '1-batong', 'tian-anmen-west', 'xidan');
  assert.equal(await page.locator('[data-action="board"]').isEnabled(), false, 'a partial leg cannot board');
  assert.match(await page.locator('.current-plan-station').textContent(), /西单/);
  await addLeg(page, '4-daxing', 'xuanwumen', 'beijing-south-railway-station');
}
async function buildRush(page) {
  await addLeg(page, '2', 'chegongzhuang', 'jianguomen');
  await addLeg(page, '1-batong', 'yonganli', 'guomao');
}
module.exports = { chooseDirection, addLeg, buildIntro, buildRush };
