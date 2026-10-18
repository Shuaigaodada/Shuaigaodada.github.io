import test from 'node:test';
import assert from 'node:assert/strict';
import {CARD_CATALOG} from './awakened-cards.mjs';
import {newDuel,makeCard,balancedDecks,scoreCards,legalPlacements,awakenedCommand,startAwakened,finishAwakened} from './awakened-rules.mjs';
import {classicValue,classicDeck,classicCommand,finishClassic} from './classic-rules.mjs';
import {DuelRooms,duelView} from './duel-rooms.mjs';
const card=(key,owner=0)=>makeCard(CARD_CATALOG.find(c=>c.key===key),owner);
function playing(){const s=newDuel('table-6');s.phase='choose';s.active=0;s.players.forEach((p,i)=>Object.assign(p,{userId:`u${i}`,clientId:`client-${i}`,bankroll:500,deck:[card('heart-3',i),card('club-5',i)]}));return s;}
function resolve(s,key,slot=2){const c=card(key);s.players[0].board[slot].push(c);s.pending={id:c.id,under:null};s.active=0;s.phase='skill';s.players[0].played=true;awakenedCommand(s,0,{type:'SKILL',use:true});return c;}

test('all 80 cards are unique and fair allocation is 5 per suit per player',()=>{
  assert.equal(new Set(CARD_CATALOG.map(c=>c.key)).size,80);
  const decks=balancedDecks();assert.equal(new Set(decks.flat().map(c=>c.key)).size,80);
  for(const deck of decks)for(const suit of new Set(CARD_CATALOG.map(c=>c.suit)))assert.equal(deck.filter(c=>c.suit===suit).length,5);
});
test('each of the 80 printed abilities executes without corrupting state',()=>{
  for(const spec of CARD_CATALOG){
    const s=playing();s.players.forEach((p,i)=>{p.deck=CARD_CATALOG.map(c=>makeCard(c,i));p.board[1]=[card('club-5',i)];p.board[2]=[card('club-5',i)];p.board[3]=[card('club-5',i)];});s.players[0].board[2]=[];
    resolve(s,spec.key);
    while(s.choices){const c=s.choices;awakenedCommand(s,c.owner,c.kind==='insight'?{type:'CHOICE',top:c.cards,bottom:[]}:{type:'CHOICE',cardId:c.cards[0]});}
    assert.ok(s.players.every(p=>p.chips>=0&&p.bet>=0),spec.key);
    assert.ok(!s.effects.length,spec.key);
  }
});
test('multi-point score chooses the complete best combination including negatives',()=>{
  const cards=[{points:[11,1]},{points:[11,1]},{points:[9]},{points:[-4,0]}];
  assert.equal(scoreCards(cards),21);assert.deepEqual(cards.map(c=>c.points[c.activePoint]),[11,1,9,0]);
});
test('one action keeps its deadline and opponent Whisper returns control to the next player',()=>{
  const s=playing();s.deadline=Date.now()+12000;const deadline=s.deadline;
  awakenedCommand(s,0,{type:'DRAW'});awakenedCommand(s,0,{type:'HIDE'});awakenedCommand(s,0,{type:'DRAW'});
  assert.equal(s.deadline,deadline);
  s.drawn=card('heart-4');s.players[1].board[0]=[card('diamond-3',1)];
  awakenedCommand(s,0,{type:'PLACE',seat:1,slot:0});awakenedCommand(s,0,{type:'SKILL',use:false});
  assert.equal(s.phase,'choice');assert.equal(s.active,1);assert.equal(s.deadline,deadline);
  awakenedCommand(s,1,{type:'CHOICE',top:s.choices.cards,bottom:[]});
  assert.equal(s.active,1);assert.equal(s.phase,'choose');assert.ok(s.deadline>deadline);
});
test('a second card completing natural blackjack triggers the existing Ace once',()=>{
  const s=playing(),ace=card('club-A');s.players[0].board[0]=[ace];s.phase='place';s.drawn=card('club-10');
  awakenedCommand(s,0,{type:'PLACE',seat:0,slot:1});awakenedCommand(s,0,{type:'SKILL',use:false});
  assert.equal(s.players[1].bet,3);assert.equal(ace.naturalRound,s.round);
});
test('extraction adds a candidate value and decay can never become positive',()=>{
  const s=playing();s.players[1].board[2]=[card('club-5',1)];
  const extractor=resolve(s,'club-4');assert.deepEqual(extractor.points,[4,0,5]);assert.deepEqual(s.players[1].board[2][0].points,[0]);
  const t=playing();const decay=makeCard({key:'derived-decay',rank:'−6',points:[-6],suit:'spade',hollow:true,broken:true},0);
  t.players[0].board[1]=[decay];resolve(t,'heart-2');assert.deepEqual(decay.points,[0]);
});
test('complete awakened matches reach settlement without stalled choices or negative chips',()=>{
  for(let game=0;game<5;game++){
    const s=playing();startAwakened(s);s.escrow=[75,75];let steps=0;
    while(s.phase!=='match-end' && steps++<5000){
      if(s.phase==='round-end'){s.round++;s.first=1-s.first;startAwakened(s,false);continue;}
      const seat=s.active,p=s.players[seat];
      if(s.phase==='choose')awakenedCommand(s,seat,{type:p.played&&scoreCards(p.board.flat())>=15?'STAND':'DRAW'});
      else if(s.phase==='place'){
        const spot=legalPlacements(s,seat,s.drawn)[0];
        awakenedCommand(s,seat,spot?{type:'PLACE',...spot}:{type:'HIDE'});
      }else if(s.phase==='skill')awakenedCommand(s,seat,{type:'SKILL',use:true});
      else if(s.phase==='choice'){const c=s.choices;awakenedCommand(s,seat,c.kind==='insight'?{type:'CHOICE',top:c.cards,bottom:[]}:{type:'CHOICE',cardId:c.cards[0]});}
      else assert.fail(`Unexpected phase ${s.phase}`);
      assert.ok(s.players.every(p=>p.chips>=0&&p.bet>=0));
    }
    assert.equal(s.phase,'match-end',`game ${game} stalled after ${steps} commands`);
    assert.deepEqual(s.escrow,[0,0]);assert.ok(s.players[s.winner].bankroll>500);
  }
});
test('hollow can be devoured, but full devour blocks stacking even with Hollow',()=>{
  const s=playing();s.players[0].board[0]=[card('club-5')];s.players[0].board[1]=[card('heart-3')];s.players[0].board[2]=[card('tumor-5')];
  const spots=legalPlacements(s,0,card('heart-3'));
  assert.ok(!spots.some(x=>x.slot===0));assert.ok(spots.some(x=>x.slot===1));assert.ok(spots.some(x=>x.slot===2));
  const base=s.players[0].board[2][0];base.hollow=true;
  for(let i=0;i<2;i++){
    s.phase='place';s.active=0;s.drawn=card('heart-7');
    awakenedCommand(s,0,{type:'PLACE',seat:0,slot:2});awakenedCommand(s,0,{type:'SKILL',use:true});
  }
  assert.equal(base.swallowed,2);assert.equal(s.players[0].board[2].length,1);
  assert.equal(s.players[1].bet,2,'only the full-devour reward triggers; swallowed Exploit is suppressed');
  assert.equal(s.players[0].exhausted.filter(c=>c.key==='heart-7').length,2);
  assert.ok(!legalPlacements(s,0,card('heart-3')).some(x=>x.slot===2));
});
test('devour consumes the incoming card, suppresses its effect and persists across rounds',()=>{
  const s=playing(),base=card('tumor-5');s.players[0].board[0]=[base];
  for(let i=0;i<2;i++){const incoming=card('club-5');s.drawn=incoming;s.active=0;s.phase='place';awakenedCommand(s,0,{type:'PLACE',seat:0,slot:0});awakenedCommand(s,0,{type:'SKILL',use:true});}
  assert.equal(base.swallowed,2);assert.equal(base.points[0],15);assert.equal(s.players[1].bet,2);assert.equal(s.players[0].exhausted.length,2);
  startAwakened(s,false);assert.ok(s.players[0].discard.some(c=>c.id===base.id&&c.swallowed===2&&c.points[0]===15));
});
test('ignite twice removes a card and Break never toggles back to positive',()=>{
  const s=playing();const target=card('club-5',1);s.players[1].board[2]=[target];
  resolve(s,'heart-5');resolve(s,'heart-5');assert.deepEqual(target.points,[-5]);
  resolve(s,'flame-A');assert.equal(target.burned,1);resolve(s,'flame-A');assert.equal(s.players[1].board[2].length,0);
});
test('private decks, sleeve contents and choices never reach the opponent or spectators',()=>{
  const s=playing();s.players[0].sleeve=[card('spade-A')];s.drawn=card('club-3');s.choices={kind:'insight',owner:0,deckOwner:0,cards:s.players[0].deck.map(c=>c.id)};
  const opponent=duelView(s,'client-1');assert.equal(opponent.drawn,null);assert.equal(opponent.choices,undefined);assert.equal(opponent.players[0].sleeve,undefined);
  const text=JSON.stringify(opponent);assert.ok(!text.includes(s.players[0].sleeve[0].id));assert.ok(!text.includes(s.players[0].deck[0].id));assert.ok(!text.includes('client-0'));
});
test('classic uses 52 cards, face cards score ten and soft aces adjust',()=>{
  assert.equal(classicDeck().length,52);assert.equal(classicValue([{rank:'A'},{rank:'K'}]),21);assert.equal(classicValue([{rank:'A'},{rank:'A'},{rank:'9'}]),21);
  const cards=[{rank:'A',points:[1,11]},{rank:'A',points:[1,11]},{rank:'9',points:[9]}];
  assert.equal(classicValue(cards),cards.reduce((n,c)=>n+c.points[c.activePoint],0));
});
function classic(){const s=newDuel('table-11');s.dealer=1;s.active=0;s.phase='player';s.offer=20;s.players.forEach((p,i)=>Object.assign(p,{userId:`u${i}`,bankroll:500}));s.escrow=[20,30];s.hands=[{cards:[{rank:'A'},{rank:'K'}],bet:20,stood:false,split:false}];s.handIndex=0;s.dealerHand=[{rank:'10'},{rank:'9'}];s.shoe=classicDeck();return s;}
test('classic natural pays 3:2, equal totals push without high-card tiebreak',()=>{
  const s=classic();finishClassic(s);assert.equal(s.players[0].bankroll,550);assert.equal(s.players[1].bankroll,500);
  const t=classic();t.hands[0].cards=[{rank:'10'},{rank:'9'}];finishClassic(t);assert.equal(t.hands[0].returned,20);
});
test('classic soft 17 stands and split 21 is not a natural',()=>{
  const s=classic();s.phase='dealer';s.active=1;s.dealerHand=[{rank:'A'},{rank:'6'}];const count=s.shoe.length;classicCommand(s,1,{type:'DEALER_STEP'});assert.equal(s.shoe.length,count);
  const t=classic();t.hands[0].split=true;finishClassic(t);assert.equal(t.hands[0].returned,40);
});
test('room commands are atomic, duplicate-safe and survive a recreated service',async()=>{
  const saved=new Map();let fail=false;const options={consumeTicket:async t=>({id:t,displayName:t,bankroll:500}),loadDuel:async id=>structuredClone(saved.get(id)),persistDuel:async(id,revision,state)=>{if(fail)throw Error('storage down');assert.equal(saved.get(id)?.revision??0,revision);saved.set(id,structuredClone(state));}};
  const rooms=new DuelRooms(options);
  try{
    await rooms.command('table-6','client-0',{type:'SIT_DOWN',commandId:'s0'},'u0');
    await rooms.command('table-6','client-1',{type:'SIT_DOWN',commandId:'s1'},'u1');
    let s=saved.get('table-6'),client=`client-${s.active}`;
    await rooms.command('table-6',client,{type:'OFFER',amount:5,revision:s.revision,commandId:'offer'});
    s=saved.get('table-6');const cmd={type:'ACCEPT',revision:s.revision,commandId:'accept'};client=`client-${s.active}`;
    fail=true;await assert.rejects(rooms.command('table-6',client,cmd),/storage/);assert.equal(saved.get('table-6').phase,'betting');
    fail=false;await rooms.command('table-6',client,cmd);const after=saved.get('table-6').revision;
    await rooms.command('table-6',client,cmd);assert.equal(saved.get('table-6').revision,after);
    const restored=new DuelRooms(options);try{const view=await restored.stateFor('table-6','client-0');assert.equal(view.phase,'choose');assert.equal(view.players[0].deckCount,40);}finally{restored.close();}
    await assert.rejects(rooms.command('table-6','watcher-0',{type:'DRAW',revision:after,commandId:'hack'}),/观战/);
    await assert.rejects(rooms.command('table-6','client-0',{type:'DRAW',revision:0,commandId:'stale'}),/更新/);
    saved.get('table-6').deadline=Date.now()-1;
    await assert.rejects(rooms.command('table-6',`client-${saved.get('table-6').active}`,{type:'DRAW',revision:after,commandId:'late'}),/超时/);
  }finally{rooms.close();}
});
