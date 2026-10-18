// Requires Vite :5173 and duel-test-server.mjs :8787. Uses isolated test identities.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {CARD_CATALOG} from '../../../JSTools/Lggpt/cloudbase-proxy/awakened-cards.mjs';
import {newDuel,makeCard} from '../../../JSTools/Lggpt/cloudbase-proxy/awakened-rules.mjs';
import {duelView} from '../../../JSTools/Lggpt/cloudbase-proxy/duel-rooms.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const contexts=[];
try{
  await fetch('http://127.0.0.1:8787/test/reset',{method:'POST'});
  const pages=[];
  for(const user of ['alice','bob']){
    const context=await browser.newContext({viewport:{width:1440,height:900},hasTouch:true});contexts.push(context);const page=await context.newPage();pages.push(page);
    await page.goto('http://127.0.0.1:5173/tests/duel-login.html');await page.locator(`[data-user="${user}"]`).click();
    await page.getByRole('button',{name:'坐下 · 真人对战',exact:true}).click();
    await page.getByRole('button',{name:'坐下 · 真人对战',exact:true}).waitFor({state:'detached'});
  }
  const [a,b]=pages;
  const current=async()=>{
    for(const page of pages)if(await page.getByRole('button',{name:'叫注',exact:true}).isVisible())return page;
    throw Error('No betting player');
  };
  await a.waitForTimeout(400);
  await (await current()).getByRole('button',{name:'叫注',exact:true}).click();
  await a.waitForTimeout(300);
  const caller=await current();await caller.getByRole('button',{name:'确认 75',exact:true}).click();
  await a.waitForTimeout(400);
  for(let turn=0;turn<6;turn++){
    if(turn===1)for(const page of pages)await page.setViewportSize({width:844,height:390});
    const active=await Promise.any(pages.map(async page=>{await page.locator('.duel-deck:enabled').waitFor({timeout:5000});return page;}));
    assert.deepEqual(await active.locator('.duel-action-buttons button').allTextContents(),['停牌']);
    const deck=active.locator('.duel-deck:enabled');
    const before=Number(await deck.locator('b').textContent());
    if(turn===1)await deck.tap();else await deck.click();
    await active.locator('.duel-drawn').waitFor();
    assert.equal(await active.locator('.duel-deck:enabled').count(),0,'drawing locks the pile');
    assert.equal(Number(await active.locator('.is-self .duel-deck b').textContent()),before-1,'one click draws one card');
    if(turn===0){
      assert.ok(await active.locator('.duel-draw-flight').evaluate(el=>el.getAnimations().length>0),'draw starts at the pile with an animation');
      await active.waitForTimeout(480);
    }
    await active.getByRole('button',{name:/放入己方牌位/}).first().click();
    await active.getByRole('button',{name:'跳过技能',exact:true}).click();
    if(turn===1)for(const page of pages)await page.setViewportSize({width:1440,height:900});
    await a.waitForTimeout(250);
  }
  assert.ok(await a.locator('.duel-slot.is-filled').count()>0);
  assert.equal(await a.locator('.duel-slot.is-filled').count(),await b.locator('.duel-slot.is-filled').count());
  if(process.env.SCREENSHOT_DIR)await a.screenshot({path:`${process.env.SCREENSHOT_DIR}/duel-desktop.png`});
  for(const [width,height] of [[844,390],[667,375]]){
    await a.setViewportSize({width,height});
    assert.ok(await a.locator('.duel-table').evaluate(el=>el.scrollWidth<=el.clientWidth),'no horizontal overflow');
    const card=await a.locator('.duel-slot.is-filled .duel-card').first().evaluate(el=>({width:el.offsetWidth,height:el.offsetHeight}));
    assert.ok(Math.abs(card.width/card.height-.64)<.04,'cards preserve portrait aspect ratio');
    const actions=await a.locator('.duel-actions').boundingBox();assert.ok(actions.y+actions.height<=height+1,'actions remain on screen');
  }
  if(process.env.SCREENSHOT_DIR)await a.screenshot({path:`${process.env.SCREENSHOT_DIR}/duel-landscape.png`});
  await a.setViewportSize({width:390,height:844});assert.ok(await a.getByRole('heading',{name:'请旋转至横屏'}).isVisible());
  await a.setViewportSize({width:1440,height:900});
  for(const page of pages){await page.getByRole('button',{name:'← 大厅',exact:true}).click();await page.getByRole('button',{name:'确认离桌',exact:true}).click();}
  // Reuse the same authenticated test identities on the third row.
  for(const page of pages){await page.goto('http://127.0.0.1:5173/?table=table-11');await page.getByRole('button',{name:'坐下 · 真人对战',exact:true}).click();await page.getByRole('button',{name:'坐下 · 真人对战',exact:true}).waitFor({state:'detached'});}
  await a.waitForTimeout(300);await (await current()).getByRole('button',{name:'叫注',exact:true}).click();await a.waitForTimeout(300);await (await current()).getByRole('button',{name:'确认 10',exact:true}).click();await a.waitForTimeout(400);
  for(let step=0;step<20;step++){
    let acted=false;
    for(const page of pages){for(const label of ['不买保险','停牌','按庄家规则行动']){const button=page.getByRole('button',{name:label,exact:true});if(await button.isVisible()){await button.click();acted=true;await a.waitForTimeout(150);break;}}}
    if(!acted)break;
  }
  assert.ok(await a.getByRole('button',{name:'准备下一回合',exact:true}).isVisible(),'classic round finishes for both humans');
  if(process.env.SCREENSHOT_DIR)await a.screenshot({path:`${process.env.SCREENSHOT_DIR}/duel-classic.png`});
  console.log('Two-client UI: awakened turns, live sync, portrait gate, card proportions and classic settlement passed.');
  // Render every printed skill through the actual game component; mock transport only.
  const gallery=await browser.newContext({viewport:{width:1440,height:900}});
  const preview=await gallery.newPage();let fixture;
  await preview.routeWebSocket('**/ws/tables/**',socket=>socket.close());
  await preview.route('**/api/tables/*/state?*',route=>route.fulfill({json:fixture}));
  const cards=[...CARD_CATALOG.filter(c=>c.key==='diamond-9'),...CARD_CATALOG.filter(c=>c.key!=='diamond-9')];
  for(let offset=0;offset<cards.length;offset+=10){
    const state=newDuel('table-6');
    cards.slice(offset,offset+10).forEach((spec,i)=>{state.players[i<5?1:0].board[i%5]=[makeCard(spec,i<5?1:0)];});
    fixture=duelView(state,'spectator');
    fixture.players[1].score=[0,10,21,24,-4][offset/10%5];
    await preview.goto('http://127.0.0.1:5173/?table=table-6');
    await preview.locator('.duel-card').first().waitFor();
    assert.equal(await preview.locator('.duel-card__corners').count(),0);
    const ring=preview.locator('.duel-score').first(),score=fixture.players[1].score;
    assert.equal(await ring.getAttribute('aria-valuenow'),String(Math.max(0,Math.min(21,score))));
    assert.equal(await ring.evaluate(el=>el.classList.contains('is-bust')),score>21);
    assert.equal(await ring.evaluate(el=>el.classList.contains('is-perfect')),score===21);
    const expected=fixture.players[1].board.concat(fixture.players[0].board).flat();
    for(let i=0;i<expected.length;i++){
      const face=preview.locator('.duel-slot .duel-card').nth(i),card=expected[i];
      assert.equal(await face.locator('.duel-card__pips img').count(),Math.abs(card.points[card.activePoint]??0),card.key);
      assert.equal(await face.locator('.duel-card__name').textContent(),card.text.replace(/Hollow/g,'空壳').replace(/Whisper/g,'低语').replace(/Devour/g,'吞噬').replace(/Exploit/g,'剥夺').replace(/Insight/g,'洞察').replace(/Break/g,'破损'));
      assert.ok(await face.locator('.duel-card__name').evaluate(el=>el.scrollHeight<=el.clientHeight+1),`full skill fits: ${card.key}`);
      const pointStyle=await face.locator('.duel-point-cross i.is-active').evaluate(el=>{const s=getComputedStyle(el);return {weight:Number(s.fontWeight),border:s.borderTopWidth,background:s.backgroundColor};});
      assert.ok(pointStyle.weight>=700);assert.equal(pointStyle.border,'0px');assert.equal(pointStyle.background,'rgba(0, 0, 0, 0)');
      assert.equal(await face.evaluate(el=>el.classList.contains('is-stackable')),Boolean(card.hollow||card.devour));
    }
    if(offset===0&&process.env.SCREENSHOT_DIR)await preview.screenshot({path:`${process.env.SCREENSHOT_DIR}/duel-card-pips.png`});
    if(offset===0){
      await preview.emulateMedia({reducedMotion:'reduce'});
      assert.equal(await preview.locator('.duel-card.is-stackable').first().evaluate(el=>getComputedStyle(el).animationName),'none');
      await preview.emulateMedia({reducedMotion:'no-preference'});
    }
  }
  await gallery.close();
  console.log('All 80 card faces: pip counts, full text, bold unbadged values, stackability, reduced motion and score rings passed.');
}finally{await browser.close();}
