import {randomInt} from 'node:crypto';
import {newDuel,modeFor,requireRule,log,setPhase,wallet,startAwakened,awakenedCommand,awakenedTimeout,legalPlacements,scoreBoard} from './awakened-rules.mjs';
import {startClassic,classicCommand,classicTimeout,classicValue} from './classic-rules.mjs';

function publicCard(card){const {owner,basePoints,...view}=card;return view;}
export function duelView(state,clientId){
  const viewer=state.players.findIndex(p=>p.clientId===clientId && p.userId);
  const view={tableId:state.tableId,mode:state.mode,revision:state.revision,round:state.round,phase:state.phase,active:state.active,viewer,price:state.price,offer:state.offer,pot:state.pot,brokenChips:state.brokenChips,deadline:state.deadline,message:state.message??'等待两位真人入座。',winner:state.winner,logs:state.logs,players:state.players.map((p,i)=>({id:p.id,name:p.name,occupied:Boolean(p.userId),bankroll:p.bankroll,chips:p.chips,bet:p.bet,stood:p.stood,ready:p.ready,played:p.played,score:scoreBoard(p),board:p.board.map(stack=>stack.map(publicCard)),deckCount:p.deck.length,discardCount:p.discard.length,exhaustedCount:p.exhausted.length,...(i===viewer?{sleeve:p.sleeve.map(publicCard)}:{})}))};
  if(state.mode==='awakened'){
    view.drawn=viewer===state.active && state.drawn?publicCard(state.drawn):null;
    view.placements=viewer===state.active && state.phase==='place'?legalPlacements(state,viewer,state.drawn):[];
    const pending=state.players.flatMap(p=>p.board.flat()).find(c=>c.id===state.pending?.id);
    view.pendingCard=pending?publicCard(pending):null;
    if(state.choices?.owner===viewer){
      const choice=state.choices;
      const all=state.players.flatMap(p=>[...p.deck,...p.exhausted,...p.board.flat()]);
      view.choices={kind:choice.kind,cards:choice.cards.map(id=>all.find(c=>c.id===id)).filter(Boolean).map(publicCard)};
      // Retrieval may disclose candidates, never the uninspected deck order.
      if(choice.kind!=='insight')view.choices.cards.sort((a,b)=>a.key.localeCompare(b.key));
    }
  } else {
    view.dealer=state.dealer??state.first;view.handIndex=state.handIndex??0;
    view.hands=(state.hands??[]).map(hand=>({...hand,score:classicValue(hand.cards)}));
    const revealed=['dealer','round-end','match-end','waiting'].includes(state.phase);
    view.dealerHand=(state.dealerHand??[]).map((card,i)=>revealed?card:i===0?{...card,activePoint:0}:{id:'hole',hidden:true,rank:'?',suit:'spade',points:[]});
    view.dealerScore=revealed?classicValue(state.dealerHand??[]):null;
    view.shoeCount=state.shoe?.length??52;
  }
  return view;
}
export class DuelRooms {
  constructor({consumeTicket,loadDuel,persistDuel}={}){
    this.consumeTicket=consumeTicket??(async()=>null);
    this.loadDuel=loadDuel??(async()=>null);
    this.persistDuel=persistDuel??(async()=>{});
    this.states=new Map();this.queues=new Map();this.connections=new Map();this.timers=new Map();
  }
  // ponytail: per-room queue; PostgreSQL revision checks also protect multiple server instances.
  async serial(id,work){
    const previous=this.queues.get(id)??Promise.resolve();
    const next=previous.catch(()=>{}).then(work);this.queues.set(id,next);
    try{return await next;}finally{if(this.queues.get(id)===next)this.queues.delete(id);}
  }
  async load(id){
    requireRule(modeFor(id),'该牌桌尚未开放。');
    const saved=await this.loadDuel(id);
    if(saved && (!this.states.has(id)||saved.revision>=this.states.get(id).revision))this.states.set(id,saved);
    if(!this.states.has(id))this.states.set(id,newDuel(id));
    return this.states.get(id);
  }
  async stateFor(id,clientId){return this.serial(id,async()=>{const state=await this.load(id);this.schedule(id,state);return duelView(structuredClone(state),clientId);});}
  addConnection(id,clientId,send){
    const set=this.connections.get(id)??new Set();const connection={clientId,send};set.add(connection);this.connections.set(id,set);
    void this.stateFor(id,clientId).then(payload=>{if(set.has(connection))send({type:'TABLE_STATE',payload});}).catch(error=>send({type:'ERROR',payload:{message:error.message}}));
    // Leaving the transport does not forfeit a seat: reconnects restore the saved match.
    return ()=>{set.delete(connection);if(!set.size)this.connections.delete(id);};
  }
  broadcast(id,state){for(const c of this.connections.get(id)??[]){try{c.send({type:'TABLE_STATE',payload:duelView(structuredClone(state),c.clientId)});}catch{/* Socket close removes the listener. */}}} 
  async save(id,before,next){
    next.revision=before.revision+1;
    const deltas=next.walletDeltas;next.walletDeltas=[];
    const saved=await this.persistDuel(id,before.revision,next,deltas);
    if(saved)Object.assign(next,saved);
    this.states.set(id,next);this.broadcast(id,next);this.schedule(id,next);
  }
  schedule(id,state){
    clearTimeout(this.timers.get(id));this.timers.delete(id);
    if(!state.deadline)return;
    const timer=setTimeout(()=>void this.serial(id,async()=>{
      const current=await this.load(id);
      if(!current.deadline||current.deadline>Date.now()){this.schedule(id,current);return;}
      const next=structuredClone(current);next.walletDeltas=[];
      if(next.phase==='betting'){
        if(!next.offer){next.offer=next.mode==='awakened'?5:10;next.first=next.active;setPhase(next,'betting',1-next.active);}
        else this.accept(next,next.active,true);
      } else if(next.mode==='awakened')awakenedTimeout(next);else classicTimeout(next);
      await this.save(id,current,next);
    }).catch(error=>{
      for(const c of this.connections.get(id)??[])try{c.send({type:'ERROR',payload:{message:`结算暂停：${error.message}`}});}catch{}
      const retry=setTimeout(()=>{const latest=this.states.get(id);if(latest)this.schedule(id,latest);},5000);retry.unref?.();this.timers.set(id,retry);
    }),Math.max(25,state.deadline-Date.now()+10));
    timer.unref?.();this.timers.set(id,timer);
  }
  accept(state,seat,automatic=false){
    requireRule(state.phase==='betting' && state.active===seat && state.offer>0,'当前没有可确认的叫注。');
    if(state.mode==='awakened'){
      const originalOffer=state.offer;
      const affordable=Math.min(...state.players.map(p=>Math.floor(p.bankroll/15)));
      if(state.offer>affordable){
        requireRule(automatic || state.players[seat].bankroll<state.offer*15,'对方余额不足。');
        state.offer=affordable;
      }
      if(state.offer<1){setPhase(state,'match-end');log(state,'可用余额不足，对局取消。');return;}
      state.price=state.offer;
      state.players.forEach((p,i)=>{wallet(state,i,-(p.bankroll<originalOffer*15?p.bankroll:state.price*15));state.escrow[i]=state.price*15;});
      startAwakened(state);
    }else{
      state.dealer??=state.first;
      if(automatic && (state.players[1-state.dealer].bankroll<state.offer || state.players[state.dealer].bankroll<state.offer*1.5)){setPhase(state,'match-end');log(state,'余额不足，叫注取消。');return;}
      startClassic(state);
    }
  }
  async command(id,clientId,command,ticket){return this.serial(id,async()=>{
    requireRule(typeof clientId==='string' && clientId.length>=8 && clientId.length<=128,'无效客户端标识。');
    requireRule(command && typeof command.type==='string' && typeof command.commandId==='string' && command.commandId.length<=100,'无效命令。');
    const current=await this.load(id), key=`${clientId}:${command.commandId}`;
    if(current.commands.includes(key))return duelView(structuredClone(current),clientId);
    const state=structuredClone(current);state.walletDeltas=[];
    let seat=state.players.findIndex(p=>p.clientId===clientId && p.userId);
    if(command.type==='SIT_DOWN'){
      const user=await this.consumeTicket(ticket,id);requireRule(user?.id,'请登录后入座。');
      const existing=state.players.findIndex(p=>p.userId===user.id);
      if(existing>=0){state.players[existing].clientId=clientId;seat=existing;}
      else{
        requireRule(state.phase==='waiting' && state.players.some(p=>!p.userId),'牌桌已满，你可以观战。');
        seat=state.players.findIndex(p=>!p.userId);
        requireRule(Number.isSafeInteger(user.bankroll)&&user.bankroll>=0,'账户余额无效。');
        requireRule(state.mode!=='awakened'||user.bankroll>=75,'觉醒牌桌入座至少需要 75 赌资。');
        Object.assign(state.players[seat],{userId:user.id,clientId,name:String(user.displayName??'玩家').slice(0,20),bankroll:user.bankroll});
        if(state.players.every(p=>p.userId)){
          state.first=randomInt(2);state.dealer=state.first;
          setPhase(state,'betting',state.mode==='classic'?1-state.dealer:state.first);log(state,'两位真人已就座，请叫注。');
        }
      }
    } else {
      requireRule(seat>=0,'观战者不能操作牌局。');
      requireRule(command.revision===current.revision,'牌局已更新，请查看最新状态后再操作。');
      if(command.type!=='LEAVE_SEAT' && current.deadline && current.deadline<=Date.now()){
        this.schedule(id,current);
        requireRule(false,'行动已超时，正在等待服务器结算。');
      }
      if(command.type==='LEAVE_SEAT'){
        const other=1-seat;
        if(state.escrow.some(n=>n>0)){
          if(state.mode==='awakened'){
            const loser=state.players[seat],winner=state.players[other];
            const pot=Math.min(15,state.pot+loser.chips+loser.bet);
            wallet(state,other,(winner.chips+winner.bet+pot)*state.price);
          }else wallet(state,other,state.escrow[0]+state.escrow[1]);
        }
        const reset=newDuel(id);reset.revision=state.revision;reset.walletDeltas=state.walletDeltas;reset.commands=state.commands;
        for(let i=0;i<2;i++)if(i!==seat && state.players[i].userId){const p=state.players[i];Object.assign(reset.players[i],{userId:p.userId,clientId:p.clientId,name:p.name,bankroll:p.bankroll});}
        Object.assign(state,reset);log(state,'一位玩家已离桌，等待新的真人对手。');
      }else if(command.type==='OFFER'){
        requireRule(state.phase==='betting' && state.active===seat,'还没轮到你叫注。');
        const amount=command.amount;
        requireRule(Number.isSafeInteger(amount) && amount>state.offer && amount<=1000000,'请输入有效且更高的叫注。');
        if(state.mode==='awakened')requireRule(amount>=state.offer+5 && amount*15<=state.players[seat].bankroll,'至少加价 5，且须能支付 15 枚筹码。');
        else requireRule(amount%2===0 && amount<=state.players[1-state.dealer].bankroll && amount*1.5<=state.players[state.dealer].bankroll,'下注须为偶数，且双方须有足够余额。');
        if(!state.offer && state.mode==='awakened')state.first=seat;
        state.offer=amount;setPhase(state,'betting',1-seat);log(state,`叫注 ${amount}，等待对方确认。`);
      }else if(command.type==='ACCEPT'||command.type==='ALL_IN')this.accept(state,seat);
      else if(command.type==='FOLD'){
        requireRule(state.phase==='betting' && state.active===seat,'当前不能弃权。');setPhase(state,'match-end');log(state,'叫注取消，未扣除双方余额。');
      }else if(command.type==='NEXT_ROUND'){
        requireRule(['round-end','match-end'].includes(state.phase),'牌局尚未结束。');
        state.players[seat].ready=true;
        if(state.players.every(p=>p.ready)){
          state.players.forEach(p=>p.ready=false);state.round++;state.first=1-state.first;
          if(state.mode==='awakened' && state.phase==='round-end')startAwakened(state,false);
          else {state.offer=0;state.dealer=1-(state.dealer??1);state.hands=[];state.dealerHand=[];setPhase(state,'betting',state.mode==='classic'?1-state.dealer:state.first);}
        }
      }else if(state.mode==='awakened')awakenedCommand(state,seat,command);
      else classicCommand(state,seat,command);
    }
    state.commands=[...state.commands,key].slice(-256);
    await this.save(id,current,state);
    return duelView(structuredClone(state),clientId);
  });}
  close(){for(const timer of this.timers.values())clearTimeout(timer);this.timers.clear();}
}

