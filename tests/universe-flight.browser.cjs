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
    // Rounded-border compositor pixels can vary even when paused scene pixels do not.
    const sceneStyle = '.window{border-radius:0!important}.window-caption,.crew-portrait,.scene-toolbar,.window-footnote,.cosmic-map{visibility:hidden!important}';
    await page.goto(`${url}/universe.html?view=2d`);
    await page.locator('.cosmic-scene>svg').waitFor();
    await page.locator('#language').selectOption('en');
    const sample = async (view,progress,epoch='present',arrived=false,destination=epoch==='present'?'moon':'earth') => {
      await page.goto(`${url}/universe-flight-check`);
      await page.evaluate(async ({progress,epoch,arrived,destination}) => {
        const {createJourney,beginJump,tickJourney,writeJourney} = await import('/src/universe/model.ts');
        const flight = tickJourney(beginJump({...createJourney(),beta:.65},destination,epoch),7*progress);
        if (!writeJourney(localStorage,{...flight,progress,paused:!arrived})) throw Error(`Cannot save the flight fixture at ${progress}`);
      },{progress,epoch,arrived,destination});
      await page.goto(`${url}/universe.html?view=${view}`);
      await page.locator(view==='2d'?'.cosmic-scene>svg':'#universe[data-renderer="3d-ready"]').waitFor();
      await page.waitForTimeout(120);
      return page.locator('.cosmic-scene').screenshot({style:sceneStyle});
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
            const still=await page.locator('.cosmic-scene').screenshot({style:sceneStyle});
      assert.equal(still.equals(paused),true,`${view}: paused travel must not drift`);
      if(view==='2d') {
        await page.evaluate(()=>{window.__routeSvg=document.querySelector('.cosmic-scene>svg');window.__routeEarth=document.querySelector('[data-route-body="earth"]');window.__routeTransform=window.__routeEarth.getAttribute('transform');});
        await page.locator('#pause').click(); await page.waitForTimeout(160); await page.locator('#pause').click();
        assert.equal(await page.evaluate(()=>document.querySelector('.cosmic-scene>svg')===window.__routeSvg&&document.querySelector('[data-route-body="earth"]')===window.__routeEarth),true,'SVG and full-opacity body geometry must persist while moving');
        assert.notEqual(await page.evaluate(()=>window.__routeEarth.getAttribute('transform')),await page.evaluate(()=>window.__routeTransform));
      }
      const timeDeparture=await sample(view,0,'bang'), timeMiddle=await sample(view,.5,'bang'), timeArrival=await sample(view,1,'bang',true);
      assert.notDeepEqual(timeDeparture,timeArrival,`${view}: time travel must retain the departure era initially`);
      assert.notDeepEqual(timeMiddle,timeDeparture,`${view}: intermediate cosmic history must evolve`);
      assert.notDeepEqual(timeMiddle,timeArrival,`${view}: time travel must not immediately become the target era`);
      const camera = () => page.locator(view==='2d'?'.cosmic-scene>svg':'.cosmic-scene canvas').getAttribute('data-camera-au');
      await sample(view,.1); const departureCamera = await camera();
      await sample(view,.8); const approachCamera = await camera();
      assert.ok(departureCamera && approachCamera,`${view}: rendered world coordinates must be inspectable`);
      assert.notEqual(departureCamera,approachCamera,`${view}: camera must translate through astronomical space`);
      await sample(view,.5,'bang');
      const age = Number(await page.locator(view==='2d'?'.cosmic-scene>svg':'.cosmic-scene canvas').getAttribute('data-age-gyr'));
      assert.ok(age>0 && age<13.8,`${view}: continuous intermediate cosmic age`);
      await sample(view,1/3,'present',false,'saturn');
      assert.deepEqual(await page.locator('[data-route-stop]').evaluateAll(nodes=>nodes.map(node=>node.dataset.routeStop)),['earth','mars','jupiter','saturn']);
      assert.equal(Number(await page.locator(view==='2d'?'.cosmic-scene>svg':'.cosmic-scene canvas').getAttribute('data-route-leg')),1);
      assert.ok((await page.locator('#route-readout').textContent()).includes('AU'));
      if(view==='2d') {
        const mars = await page.locator('[data-route-body="mars"]').getAttribute('data-distance-au');
        await sample(view,.5,'present',false,'saturn');
        assert.ok(Number(await page.locator('[data-route-body="mars"]').getAttribute('data-distance-au'))>Number(mars)*10,'Passed Mars must recede at its real route location');
      }
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
