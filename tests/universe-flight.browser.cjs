// Run with: node tests\universe-flight.browser.cjs (Playwright and Chromium/Edge required).
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const { createServer } = await import('vite');
  const server = await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'});
  server.middlewares.use('/universe-flight-check',(_request,response) => {response.setHeader('Content-Type','text/html');response.end('<!doctype html><title>Cosmic flight fixture</title>');});
  let browser;
  try {
    await server.listen();
    const url = `http://127.0.0.1:${server.httpServer.address().port}`;
    try {browser = await chromium.launch({headless:true});}
    catch {browser = await chromium.launch({headless:true,channel:'msedge'});}
    const page = await browser.newPage({viewport:{width:1280,height:1000}}), errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${url}/universe.html?view=2d`);
    await page.locator('.cosmic-scene>svg').waitFor();
    await page.locator('#language').selectOption('en');
    const sample = async (view,progress,epoch='present',arrived=false) => {
      await page.goto(`${url}/universe-flight-check`);
      await page.evaluate(async ({progress,epoch,arrived}) => {
        const {createJourney,beginJump,tickJourney,writeJourney} = await import('/src/universe/model.ts');
        const flight = tickJourney(beginJump({...createJourney(),beta:.999},epoch==='present'?'moon':'earth',epoch),7*progress);
        if (!writeJourney(localStorage,{...flight,progress,paused:!arrived})) throw Error(`Cannot save the flight fixture at ${progress}`);
      },{progress,epoch,arrived});
      await page.goto(`${url}/universe.html?view=${view}`);
      await page.locator(view==='2d'?'.cosmic-scene>svg':'.cosmic-scene canvas').waitFor();
      await page.waitForTimeout(120);
      return page.locator('.cosmic-scene').screenshot({style:'.window-caption,.crew-portrait,.scene-toolbar,.window-footnote{visibility:hidden!important}'});
    };
    const screenshots=[];
    for (const view of ['2d','3d']) {
      const departure=await sample(view,0), middle=await sample(view,.5), approach=await sample(view,.9), arrival=await sample(view,1,'present',true);
      assert.equal(departure.equals(arrival),false,`${view}: departure must not display the destination`);
      assert.equal(middle.equals(departure),false,`${view}: the journey must visually advance`);
      assert.equal(middle.equals(arrival),false,`${view}: cruise must not immediately display arrival`);
      assert.equal(approach.equals(middle),false,`${view}: approach must visibly develop`);
      const paused=await sample(view,.42);
      await page.waitForTimeout(350);
      const still=await page.locator('.cosmic-scene').screenshot({style:'.window-caption,.crew-portrait,.scene-toolbar,.window-footnote{visibility:hidden!important}'});
      assert.equal(still.equals(paused),true,`${view}: paused travel must not drift`);
      const timeDeparture=await sample(view,0,'bang'), timeMiddle=await sample(view,.5,'bang'), timeArrival=await sample(view,1,'bang',true);
      assert.notDeepEqual(timeDeparture,timeArrival,`${view}: time travel must retain the departure era initially`);
      assert.notDeepEqual(timeMiddle,timeDeparture,`${view}: intermediate cosmic history must evolve`);
      assert.notDeepEqual(timeMiddle,timeArrival,`${view}: time travel must not immediately become the target era`);
      screenshots.push(view);
    }
    await sample('3d',.42);
    await page.evaluate(() => {
      const canvas=document.querySelector('.cosmic-scene canvas');
      const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');
      const extension=gl&&gl.getExtension('WEBGL_lose_context');
      if(!extension)throw Error('Actual context loss extension unavailable');
      extension.loseContext();
    });
    await page.locator('.cosmic-scene>svg').waitFor();
    const fallback=await page.evaluate(async () => {const {readJourney}=await import('/src/universe/model.ts');return readJourney(localStorage);});
    assert.equal(fallback.departureDestinationId,'earth');assert.equal(fallback.destinationId,'moon');assert.equal(fallback.progress,.42);assert.equal(fallback.paused,true);
    await page.emulateMedia({reducedMotion:'reduce'});
    await sample('2d',.5,'bang');
    assert.equal(await page.locator('.cosmic-scene>svg').count(),1);
    assert.deepEqual(errors,[]);
    console.log(`Progress-driven space/time travel, paused pixels, reduced motion and midway WebGL fallback passed in ${screenshots.join(' and ')}.`);
  } finally {if(browser)await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
