import { randomInt, randomUUID } from 'node:crypto';
import { CARD_CATALOG } from './awakened-cards.mjs';

export const modeFor = id => /^table-(?:[6-9]|10)$/.test(id) ? 'awakened' : /^table-1[1-5]$/.test(id) ? 'classic' : null;
export function requireRule(ok, message) { if (!ok) throw Object.assign(new Error(message), {status: 400}); }
export function shuffled(cards) {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i--) { const j = randomInt(i + 1); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
const weights = [[120,105,90,100,110,105,125,105,110,120],[100,105,125,115,120,110,120,115,120,110],[100,130,115,120,125,110,95,110,115,105],[105,130,110,120,135,135,110,105,120,110],[110,125,110,125,115,125,95,110,100,115],[105,140,105,130,115,125,130,90,115,110],[95,105,125,120,125,130,115,130,115,120],[115,120,125,120,70,110,110,100,95,110]];
export function balancedDecks() {
  const candidates = [];
  for (let attempt = 0; attempt < 2000; attempt++) {
    const a = [], b = [];
    for (let s = 0; s < 8; s++) {
      const indices = shuffled(Array.from({length: 10}, (_, i) => s * 10 + i));
      a.push(...indices.slice(0, 5)); b.push(...indices.slice(5));
    }
    const score = indices => indices.reduce((n, i) => n + weights[Math.floor(i / 10)][i % 10], 0);
    const difference = Math.abs(score(a) - score(b));
    const tags = ['Hollow','Devour','Insight','Exploit','衍生','每张','所有'];
    const balanced = tags.every(tag => Math.abs(a.filter(i => CARD_CATALOG[i].text.includes(tag)).length - b.filter(i => CARD_CATALOG[i].text.includes(tag)).length) <= 2);
    if (difference <= 20 && balanced) candidates.push({a, b, difference});
  }
  requireRule(candidates.length, '公平分牌暂未生成，请重试。');
  candidates.sort((a,b) => a.difference - b.difference);
  const choice = candidates[randomInt(Math.max(1, Math.ceil(candidates.length / 10)))];
  return [choice.a, choice.b].map((indices, owner) => shuffled(indices.map(i => makeCard(CARD_CATALOG[i], owner))));
}
export function makeCard(spec, owner) {
  return {...structuredClone(spec), id: randomUUID(), owner, basePoints: [...spec.points], activePoint: 0, burned: 0, swallowed: 0, devouredPoints: 0, whisperRound: 0};
}
export function newDuel(tableId) {
  requireRule(modeFor(tableId), '该牌桌尚未开放。');
  return {tableId, mode: modeFor(tableId), revision: 0, round: 1, match: randomUUID(), phase: 'waiting', active: 0,
    players: [0,1].map(i => ({id: `player-${i}`, userId: null, clientId: null, name: `玩家 ${i+1}`, bankroll: 0, chips: 15, bet: 0, deck: [], discard: [], exhausted: [], board: [[],[],[],[],[]], sleeve: [], stood: false, played: false, skip: 0, ready: false})),
    price: 5, offer: 0, first: 0, pot: 0, brokenChips: 0, deadline: null, drawn: null, pending: null, choices: null, effects: [], exploitUsed: 0, logs: [], commands: [], walletDeltas: [], escrow: [0,0], winner: null};
}
export function log(state, message) { state.logs.push({id: `${state.revision}-${state.logs.length}-${randomUUID()}`, message}); state.logs = state.logs.slice(-60); state.message = message; }
export function wallet(state, seat, delta) {
  const p = state.players[seat];
  requireRule(Number.isSafeInteger(delta) && p.bankroll + delta >= 0, '账户余额不足。');
  p.bankroll += delta;
  if (delta) state.walletDeltas.push({userId: p.userId, delta});
}
export function setPhase(state, phase, active = state.active, now = Date.now()) {
  state.phase = phase; state.active = active;
  state.deadline = ['choose','place','skill','choice','player','insurance','dealer'].includes(phase) ? now + 180000 : phase === 'betting' ? now + 30000 : null;
}
export function findCard(state, id) {
  for (let seat = 0; seat < 2; seat++) for (let slot = 0; slot < 5; slot++) {
    const stack = state.players[seat].board[slot];
    const index = stack.findIndex(c => c.id === id);
    if (index >= 0) return {card: stack[index], seat, slot, index, stack};
  }
  return null;
}
export function scoreCards(cards) {
  let totals = new Map([[0, []]]);
  for (const card of cards) {
    const next = new Map();
    for (const [total, choices] of totals) for (let i = 0; i < Math.max(1, card.points.length); i++) {
      const value = total + (card.points[i] ?? 0);
      if (!next.has(value)) next.set(value, [...choices, i]);
    }
    totals = next;
  }
  const legal = [...totals.keys()].filter(v => v <= 21);
  const score = legal.length ? Math.max(...legal) : Math.min(...totals.keys());
  const choices = totals.get(score);
  cards.forEach((card,i) => { card.activePoint = choices[i]; });
  return score;
}
export const scoreBoard = player => scoreCards(player.board.flat());
export function legalPlacements(state, seat, card) {
  if (!card) return [];
  const result = [];
  for (let side = 0; side < 2; side++) for (let slot = 0; slot < 5; slot++) {
    if (side !== seat && card.key !== 'heart-4') continue;
    const stack = state.players[side].board[slot];
    const top = stack.at(-1);
    if (!top || (top.devour ? top.swallowed < top.devour : top.hollow)) result.push({seat: side, slot});
  }
  return result;
}
function resetCard(card) {
  card.points = [...new Set([...card.basePoints.map(v => v + card.devouredPoints),...(card.devourPermanent??[])])];
  card.burned = 0; card.broken = CARD_CATALOG.find(c => c.key === card.key)?.broken ?? card.broken;
  card.hollow = CARD_CATALOG.find(c => c.key === card.key)?.hollow ?? card.hollow;
}
function discardCard(state, location, exhausted = false) {
  if (!location) return;
  const {card, stack, index, seat} = location;
  stack.splice(index, 1);
  state.players[card.derived ? seat : card.owner][exhausted ? 'exhausted' : 'discard'].push(card);
}
function takeCard(state, seat) {
  const p = state.players[seat];
  if (!p.deck.length) { p.deck = shuffled(p.discard); p.discard = []; }
  return p.deck.shift() ?? null;
}
function payChips(state, seat, amount, exploit = false) {
  if (exploit) amount = Math.min(amount, 4 - state.exploitUsed);
  const p = state.players[seat], paid = Math.min(p.chips, Math.max(0, amount));
  p.chips -= paid; p.bet += paid;
  if (exploit) state.exploitUsed += paid;
}
function pool(state, amount) {
  state.brokenChips += Math.max(0, state.pot + amount - 15);
  state.pot = Math.min(15, state.pot + amount);
}
function derived(kind, owner) {
  const specs = {
    growth: {rank:'3',points:[3,0],hollow:true,text:'多重点数 · 空壳'},
    flame: {rank:'1',points:[1],hollow:true,text:'点燃正对面牌，然后耗尽自身'},
    lost: {rank:'∅',points:[],text:'无点数，占用牌位'},
    impulse: {rank:'∅',points:[],hollow:true,forced:true,text:'强制加注 1'},
    decay: {rank:'−6',points:[-6],hollow:true,broken:true,text:'破损 · 空壳'},
    betrayal: {rank:'∅',points:[],forced:true,text:'相邻两侧的牌减值 3'}
  };
  return {...makeCard({...specs[kind],key:`derived-${kind}`,suit:kind==='flame'?'flame':'spade',suitName:'衍生牌',devour:0}, owner), derived:true};
}
export function startAwakened(state, fresh = true) {
  if (fresh) {
    const decks = balancedDecks();
    state.players.forEach((p,i) => { p.deck = decks[i]; p.discard = []; p.exhausted = []; p.sleeve = []; p.board = [[],[],[],[],[]]; p.chips = 15; });
    state.pot = 0; state.brokenChips = 0;
  } else {
    for (const p of state.players) {
      for (const card of [...p.board.flat(), ...p.sleeve]) if (!card.derived) state.players[card.owner].discard.push(card);
      p.board = [[],[],[],[],[]]; p.sleeve = [];
    }
    for (const p of state.players) for (const zone of ['deck','discard','exhausted']) { p[zone] = p[zone].filter(c => !c.derived); p[zone].forEach(resetCard); }
  }
  state.players.forEach((p,i) => { p.bet = 0; p.stood = false; p.played = false; p.ready = false; p.skip = 0; payChips(state,i,2); });
  state.drawn = null; state.pending = null; state.effects = []; state.choices = null;
  setPhase(state,'choose',state.first); log(state,`第 ${state.round} 回合，${state.players[state.first].name} 先行动。`);
}
export function finishAwakened(state) {
  const scores = state.players.map(scoreBoard);
  const a = scores[0] > 21 ? -Infinity : scores[0], b = scores[1] > 21 ? -Infinity : scores[1];
  const winner = a === b ? null : a > b ? 0 : 1;
  for (let i=0;i<2;i++) {
    const p = state.players[i];
    if (winner === null || winner === i) p.chips += p.bet; else pool(state,p.bet);
    p.bet = 0;
  }
  state.winner = winner;
  log(state, winner === null ? '本回合平局，返还双方投入。' : `${state.players[winner].name} 赢得本回合，败方投入进入奖池。`);
  setPhase(state, 'round-end');
  if (state.players.some(p => p.chips === 0)) {
    const matchWinner = state.players[0].chips > 0 ? 0 : state.players[1].chips > 0 ? 1 : winner;
    if (matchWinner !== null) wallet(state,matchWinner,(state.players[matchWinner].chips + state.pot)*state.price);
    state.escrow = [0,0]; state.winner = matchWinner; setPhase(state,'match-end');
    log(state, matchWinner === null ? '对局结束。' : `${state.players[matchWinner].name} 赢得对局，筹码已兑换。`);
  }
}
function nextAwakened(state) {
  state.active = state.actionSeat ?? state.active;
  state.actionSeat = null;
  state.pending = null; state.drawn = null; state.choices = null; state.effects = [];
  state.players.forEach(p => { scoreBoard(p); });
  let next = 1 - state.active;
  // At most four skipped actions exist (two per player); do not busy-wait on the clock.
  for (let i=0; i<8; i++, next=1-next) {
    const p = state.players[next];
    if (p.stood) continue;
    if (p.skip) { p.skip--; log(state,`${p.name} 跳过一次行动。`); continue; }
    const available = [...p.deck,...p.discard,...p.sleeve].some(card => legalPlacements(state,next,card).length);
    if (!available) { p.stood = true; continue; }
    setPhase(state,'choose',next); log(state,`轮到 ${p.name}。`); return;
  }
  finishAwakened(state);
}
function targetsAt(state, side, slots) { return slots.filter(i => i >= 0 && i < 5).flatMap(i => state.players[side].board[i].map(c => c.id)); }
function ability(state, event) {
  const location = findCard(state,event.id); if (!location) return;
  const {card:c, seat, slot} = location, enemy = 1-seat, n = c.rank === 'A' ? 1 : Number(c.rank);
  const self = [c.id], adjacent = targetsAt(state,seat,[slot-1,slot+1]), opposite = targetsAt(state,enemy,[slot]);
  const nearby = targetsAt(state,seat,[slot-1,slot,slot+1]);
  const all = state.players.flatMap(p => p.board.flat().map(c => c.id));
  const enemyAll = targetsAt(state,enemy,[0,1,2,3,4]);
  const attack = id => { const loc = findCard(state,id); if(loc && loc.seat !== seat) state.players[loc.seat].stood = false; };
  const change = (ids, fn, hostile = true) => ids.forEach(id => { const loc = findCard(state,id); if(!loc) return; if(hostile) attack(id); if(loc.card.points.length){const values=fn(loc.card.points,loc.card);loc.card.points=loc.card.key==='derived-decay'?[...new Set(values.map(v=>Math.min(0,v)))]:values;} });
  const reduce = (ids, value) => change(ids,(points,card) => points.map(v => card.broken ? v-value : Math.max(0,v-value)));
  const gain = (ids, value) => change(ids, points => [...new Set([...points,value])], false);
  const breakCards = ids => { change(ids,points => points.map(v => -Math.abs(v))); ids.forEach(id => {const loc=findCard(state,id);if(loc)loc.card.broken=true;}); };
  const repair = ids => { change(ids,points => points.map(Math.abs),false); ids.forEach(id=>{const loc=findCard(state,id);if(loc)loc.card.broken=false;}); };
  const remove = (ids, exhaust=false) => ids.forEach(id => {attack(id);discardCard(state,findCard(state,id),exhaust);});
  const ignite = ids => [...new Set(ids)].forEach(id=>{const loc=findCard(state,id);if(loc && ++loc.card.burned>=2)discardCard(state,loc,true);});
  const exploit = amount => payChips(state,enemy,amount,true);
  const insight = (who,count) => {
    const cards = state.players[who].deck.slice(0,count);
    if(cards.length) state.choices={kind:'insight',owner:seat,deckOwner:who,cards:cards.map(c=>c.id),source:c.id};
  };
  const fetchToSleeve = (predicate, zone='deck', random=false) => {
    if(state.players[seat].sleeve.length>=3) return;
    const options=state.players[seat][zone].filter(predicate);
    if(!options.length)return;
    if(random) { const picked=options[randomInt(options.length)]; state.players[seat][zone]=state.players[seat][zone].filter(x=>x.id!==picked.id);state.players[seat].sleeve.push(picked); }
    else state.choices={kind:'fetch',owner:seat,zone,cards:options.map(x=>x.id),source:c.id};
  };
  const spawn = (kind,count,who,where='shuffle') => {
    const cards=Array.from({length:count},()=>derived(kind,who));
    if(where==='top')state.players[who].deck.unshift(...cards);
    else if(where==='bottom')state.players[who].deck.push(...cards);
    else state.players[who].deck=shuffled([...state.players[who].deck,...cards]);
  };
  const natural = () => {const cards=state.players[seat].board.flat();return cards.length===2 && cards.some(x=>x.rank==='A') && cards.some(x=>x.points.includes(10));};
  if(event.kind==='whisper') {
    if(c.whisperRound===state.round)return;
    c.whisperRound=state.round;
    if(n===3)insight(seat,2); if(n===5)gain([event.incoming],2); if(n===7)exploit(1); if(n===8)insight(seat,1); if(n===9)change([event.incoming],()=>[1],false);
    return;
  }
  if(event.kind==='devour') {
    const incoming=findCard(state,event.incoming);if(!incoming)return;
    scoreBoard(state.players[incoming.seat]);
    const points=incoming.card.points[incoming.card.activePoint]??0;
    c.swallowed++; c.devouredPoints+=points; c.points=c.points.map(v=>v+points);
    discardCard(state,incoming,true);
    if(c.swallowed<c.devour)return;
    if(n===3)insight(seat,2); if(n===4){gain(self,7);gain(self,0);c.devourPermanent=[7,0];} if(n===5)exploit(2);
    if(n===6)for(let j=0;j<2;j++){
      const growth=derived('growth',seat),spot=legalPlacements(state,seat,growth)[0];
      if(spot){const stack=state.players[spot.seat].board[spot.slot],base=stack.at(-1);stack.push(growth);if(base?.whisper)state.effects.push({kind:'whisper',id:base.id,incoming:growth.id});}
      else state.players[seat].discard.push(growth);
    }
    if(n===7)spawn('lost',1,enemy); if(n===8){remove(all.filter(id=>id!==c.id));remove(self,true);} if(n===9)change(enemyAll,points=>points.map(v=>v+2)); if(n===10){gain(self,9);c.devourPermanent=[9];}
    return;
  }
  log(state,`${state.players[seat].name} 使用 ${c.suitName} ${c.rank}。`);
  if(c.derived){
    if(c.key==='derived-flame'){ignite(opposite);remove(self,true);}
    if(c.key==='derived-impulse')payChips(state,seat,1);
    if(c.key==='derived-betrayal')reduce(adjacent,3);
    return;
  }
  switch(c.suit){
    case 'heart':
      if([1,5].includes(n))breakCards(opposite);
      if([2,9].includes(n))repair(nearby);
      if(n===6)adjacent.forEach(id=>{findCard(state,id).card.hollow=true;});
      if(n===7)exploit(2);
      if(n===8)reduce(enemyAll.filter(id=>findCard(state,id).card.broken),3);
      if(n===10)breakCards(targetsAt(state,enemy,[slot-1,slot+1]));
      break;
    case 'diamond':
      if(n===1 && natural()){c.naturalRound=state.round;insight(seat,3);}
      if(n===2){insight(seat,3);remove(self,true);}
      if([4,6].includes(n))insight(seat,2);
      if(n===10)insight(seat,1);
      break;
    case 'spade':
      if(n===1)insight(enemy,1);
      if(n===2){spawn('impulse',2,enemy,'top');remove(self,true);}
      if(n===3)insight(enemy,3);
      if(n===4)spawn('decay',1,enemy,'top');
      if(n===5)spawn('betrayal',1,enemy,'top');
      if(n===6)insight(enemy,2);
      if(n===7){state.players[enemy].deck=shuffled([...state.players[enemy].deck,...state.players[enemy].discard]);state.players[enemy].discard=[];}
      if(n===8)spawn('decay',1,enemy); if(n===9)spawn('betrayal',1,enemy); if(n===10)spawn('impulse',1,enemy,'bottom');
      break;
    case 'club':
      if(n===1 && natural()){c.naturalRound=state.round;exploit(3);}
      if(n===2){remove(enemyAll);remove(self,true);}
      if(n===3){payChips(state,seat,1);exploit(2);}
      if([4,6].includes(n)){
        const ids=n===4?opposite:adjacent;
        state.players.forEach(scoreBoard);
        const values=ids.map(id=>findCard(state,id)?.card).filter(card=>card?.points.length).map(card=>card.points[card.activePoint]);
        change(ids,()=>[0]);for(const value of values)gain(self,value);
        if(n===6)remove(ids);
      }
      if(n===5)exploit(4);
      if(n===7){[state.players[seat].board[slot],state.players[enemy].board[slot]]=[state.players[enemy].board[slot],state.players[seat].board[slot]];state.players[enemy].stood=false;}
      if(n===8){payChips(state,seat,1);exploit(1);} if(n===9)remove(opposite); if(n===10)exploit(1);
      break;
    case 'flame':
      if(n===1)ignite(opposite);
      if(n===2){ignite(all);remove(self,true);}
      if(n===3){ignite(targetsAt(state,enemy,[slot-1,slot,slot+1]));remove(self,true);}
      if(n===4){ignite(self);remove(opposite,true);}
      if(n===5){fetchToSleeve(()=>true,'exhausted',true);ignite(self);}
      if(n===6)ignite([...adjacent,...opposite]);
      if(n===7)spawn('flame',2,seat);
      if(n===8){exploit(2);ignite(self);}
      if(n===9)spawn('flame',1,seat,'top'); if(n===10)ignite(adjacent);
      break;
    case 'greed':
      if(n===1 && state.players[seat].sleeve.length<3){const bottom=state.players[seat].deck.pop();if(bottom)state.players[seat].sleeve.push(bottom);}
      if(n===2){fetchToSleeve(()=>true);remove(self,true);}
      if(n===3 && state.players[seat].sleeve.length<3)state.choices={kind:'sleeve',owner:seat,cards:targetsAt(state,seat,[0,1,2,3,4]),source:c.id};
      if(n===4)fetchToSleeve(card=>!card.derived);
      if(n===5)fetchToSleeve(card=>card.rank==='A');
      if(n===6)exploit(state.players[seat].sleeve.length);
      if(n===7)pool(state,2);
      if(n===8)state.players[seat].discard.push(...state.players[seat].deck.splice(0,3));
      if([9,10].includes(n))state.players[seat].sleeve.forEach(card=>{if(card.points.length)card.points=[...new Set([...card.points,n===9?2:0])];});
      break;
    case 'tumor':
      if(n===1){state.players.forEach(scoreBoard);remove(all.filter(id=>{const card=findCard(state,id)?.card;return (card?.points[card.activePoint]??0)>=12;}));}
      if(n===2){breakCards(self);gain(self,-10);}
      break;
    case 'teeth':
      if(n===1)reduce(all.filter(id=>findCard(state,id).card.rank!=='A'),2);
      if(n===2){reduce(opposite,11);remove(self,true);}
      if(n===3)reduce(enemyAll,2); if(n===4)reduce(targetsAt(state,enemy,[slot-1,slot,slot+1]),2);
      if(n===5)state.players[seat].skip+=2;
      if(n===6)change(all,()=>[0]); if(n===7)reduce(opposite,4);
      if(n===8){exploit(1);reduce(self,5);} if(n===9){remove(targetsAt(state,seat,[0,1,2,3,4]).filter(id=>id!==c.id));remove(self,true);} if(n===10)reduce(opposite,2);
      break;
  }
}
function drainEffects(state) {
  while(state.effects.length && !state.choices) ability(state,state.effects.shift());
  state.players.forEach(scoreBoard);
  if(state.choices){state.phase='choice';state.active=state.choices.owner;return;}
  for(const p of state.players){
    const cards=p.board.flat();
    const ace=cards.find(c=>c.rank==='A' && ['diamond','club'].includes(c.suit) && c.naturalRound!==state.round);
    if(ace && cards.length===2 && cards.some(c=>c.rank!=='A' && c.points.includes(10))){state.effects.push({kind:'skill',id:ace.id});}
  }
  if(state.effects.length){drainEffects(state);return;}
  nextAwakened(state);
}
export function awakenedCommand(state,seat,command) {
  requireRule(state.active===seat,'还没轮到你。');
  const p=state.players[seat];
  switch(command.type){
    case 'DRAW':
      requireRule(state.phase==='choose','请先完成当前行动。');
      state.drawn=takeCard(state,seat);requireRule(state.drawn,'牌堆已空，请从袖口出牌或停牌。');
      if(!legalPlacements(state,seat,state.drawn).length && p.sleeve.length>=3){p.discard.push(state.drawn);state.drawn=null;p.stood=true;nextAwakened(state);break;}
      state.phase='place';log(state,'已摸牌，请选择合法牌位或藏入袖口。');break;
    case 'SLEEVE_PLAY': {
      requireRule(state.phase==='choose','请先完成当前行动。');
      const index=p.sleeve.findIndex(c=>c.id===command.cardId);requireRule(index>=0,'袖口没有此牌。');
      requireRule(legalPlacements(state,seat,p.sleeve[index]).length,'没有合法牌位。');
      state.drawn=p.sleeve.splice(index,1)[0];state.phase='place';break;
    }
    case 'HIDE':
      requireRule(state.phase==='place' && state.drawn && p.sleeve.length<3,'袖口已满或没有待出牌。');
      p.sleeve.push(state.drawn);state.drawn=null;state.phase='choose';log(state,'已藏入袖口，仍由你行动。');break;
    case 'PLACE': {
      requireRule(state.phase==='place' && state.drawn,'请先摸牌。');
      requireRule(legalPlacements(state,seat,state.drawn).some(x=>x.seat===command.seat && x.slot===command.slot),'不是合法牌位。');
      const stack=state.players[command.seat].board[command.slot],under=stack.at(-1),card=state.drawn;
      state.actionSeat=seat;
      state.pending={id:card.id,under:under?.id??null};
      stack.push(card);state.drawn=null;p.played=true;state.exploitUsed=0;state.phase='skill';
      log(state,`已打出 ${card.suitName} ${card.rank}，请确认技能。`);
      if(card.forced)awakenedCommand(state,seat,{type:'SKILL',use:true});
      break;
    }
    case 'SKILL': {
      requireRule(state.phase==='skill' && state.pending && typeof command.use==='boolean','无待确认技能。');
      const {id,under}=state.pending,card=findCard(state,id)?.card,base=findCard(state,under)?.card;
      requireRule(!card?.forced || command.use,'强制技能不能跳过。');
      if(base?.whisper)state.effects.push({kind:'whisper',id:under,incoming:id});
      if(base?.devour && base.swallowed<base.devour)state.effects.push({kind:'devour',id:under,incoming:id});
      else if(command.use)state.effects.push({kind:'skill',id});
      drainEffects(state);break;
    }
    case 'CHOICE': {
      const choice=state.choices;requireRule(state.phase==='choice' && choice?.owner===seat,'没有可操作的技能选择。');
      if(choice.kind==='insight'){
        const top=command.top,bottom=command.bottom;
        requireRule(Array.isArray(top)&&Array.isArray(bottom),'提交查看牌的顺序。');
        const ids=[...top,...bottom];requireRule(ids.length===choice.cards.length && new Set(ids).size===ids.length && ids.every(id=>choice.cards.includes(id)),'必须且只能排列查看到的牌。');
        const deck=state.players[choice.deckOwner].deck, lookup=new Map(deck.map(c=>[c.id,c]));
        state.players[choice.deckOwner].deck=[...top.map(id=>lookup.get(id)),...deck.filter(c=>!choice.cards.includes(c.id)),...bottom.map(id=>lookup.get(id))];
      } else {
        requireRule(choice.cards.includes(command.cardId),'请选择合法目标。');
        if(choice.kind==='fetch'){
          const zone=p[choice.zone],index=zone.findIndex(c=>c.id===command.cardId);requireRule(index>=0 && p.sleeve.length<3,'目标已失效。');p.sleeve.push(zone.splice(index,1)[0]);
        } else {const loc=findCard(state,command.cardId);requireRule(loc && loc.seat===seat && p.sleeve.length<3,'目标已失效。');p.sleeve.push(loc.stack.splice(loc.index,1)[0]);}
      }
      state.choices=null;drainEffects(state);break;
    }
    case 'STAND':
      requireRule(state.phase==='choose' && p.played,'首次行动必须出牌。');p.stood=true;nextAwakened(state);break;
    default: requireRule(false,'不支持的觉醒命令。');
  }
  state.players.forEach(scoreBoard);
}
export function awakenedTimeout(state) {
  const p=state.players[state.active];
  if(state.phase==='place'){
    const spots=legalPlacements(state,state.active,state.drawn);
    if(spots.length){awakenedCommand(state,state.active,{type:'PLACE',...spots[randomInt(spots.length)]});}
    else {if(state.drawn)p.discard.push(state.drawn);state.drawn=null;p.stood=true;nextAwakened(state);}
  }
  if(state.phase==='skill')awakenedCommand(state,state.active,{type:'SKILL',use:true});
  while(state.phase==='choice'){
    const c=state.choices;
    awakenedCommand(state,c.owner,c.kind==='insight'?{type:'CHOICE',top:c.cards,bottom:[]}:{type:'CHOICE',cardId:c.cards[0]});
  }
  if(state.phase==='choose' && state.deadline<=Date.now()){p.stood=true;nextAwakened(state);}
}
