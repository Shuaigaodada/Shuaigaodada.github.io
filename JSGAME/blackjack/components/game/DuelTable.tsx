import {type CSSProperties, useEffect, useRef, useState} from 'react';
import {type DuelCard, type DuelCommand, useDuel} from '../../services/useDuel';
import './DuelTable.css';
const icons=import.meta.glob('../../images/ui-icons/suits/*.svg',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
const iconFor=(suit:string)=>icons[`../../images/ui-icons/suits/${suit}.svg`];
const suitNames:Record<string,string>={heart:'红心',diamond:'方块',spade:'黑桃',club:'梅花',flame:'火焰',greed:'贪婪',tumor:'肿瘤',teeth:'牙齿'};
const phases:Record<string,string>={waiting:'等待真人入座',betting:'叫注',choose:'摸牌或停牌',place:'选择出牌位置',skill:'确认觉醒技能',choice:'选择技能结果',player:'闲家行动',dealer:'庄家行动',insurance:'保险选择','round-end':'回合结算','match-end':'对局结束'};
// Standard pip positions, ordered in pairs so the lower half can be inverted.
const pipLayouts:Record<number,number[][]>={
  1:[[50,50]],2:[[50,12],[50,88]],3:[[50,12],[50,50],[50,88]],
  4:[[22,12],[78,12],[22,88],[78,88]],
  5:[[22,12],[78,12],[50,50],[22,88],[78,88]],
  6:[[22,12],[78,12],[22,50],[78,50],[22,88],[78,88]],
  7:[[22,12],[78,12],[50,31],[22,50],[78,50],[22,88],[78,88]],
  8:[[22,12],[78,12],[50,31],[22,50],[78,50],[50,69],[22,88],[78,88]],
  9:[[22,12],[78,12],[22,37],[78,37],[50,50],[22,63],[78,63],[22,88],[78,88]],
  10:[[22,12],[78,12],[50,25],[22,37],[78,37],[22,63],[78,63],[50,75],[22,88],[78,88]],
};
function CardFace({card}:{card:DuelCard}){
  const count=Math.abs(card.points[card.activePoint]??card.points[0]??0);
  const columns=Math.ceil(Math.sqrt(count)),rows=Math.ceil(count/columns);
  const pips=pipLayouts[count]??Array.from({length:count},(_,i)=>[(i%columns+.5)*100/columns,(Math.floor(i/columns)+.5)*100/rows]);
  const stackable=card.devour?(card.swallowed??0)<card.devour:Boolean(card.hollow);
  return <span className={`duel-card ${card.hidden?'is-back':''} ${!card.hidden&&stackable?'is-stackable':''} suit-${card.suit}`}>
    {card.hidden?<span className="duel-card__back-mark">✦</span>:<>
      <span className="duel-card__suit-label">{suitNames[card.suit]}{['A','J','Q','K'].includes(card.rank)?` · ${card.rank}`:''}</span>
      <span className="duel-card__points" aria-label={`候选点数：${card.points.join('、')||'无点数'}`}>
        {Array.from({length:Math.max(1,Math.ceil(card.points.length/4))},(_,group)=><span className={`duel-point-cross ${card.points.length<=1?'is-single':''}`} key={group}>
          {(card.points.length?card.points.slice(group*4,group*4+4):['∅']).map((n,i)=><i key={i} className={`${i+group*4===card.activePoint?'is-active':''} point-${i}`} aria-label={`${n}${i+group*4===card.activePoint?'，当前采用':''}`}>{n}</i>)}
        </span>)}
      </span>
      <span className="duel-card__pips" role="img" aria-label={`${count} 个${suitNames[card.suit]}花色`}>
        {pips.map(([x,y],i)=><img src={iconFor(card.suit)} alt="" key={i} style={{left:`${x}%`,top:`${y}%`,width:`${count<=10?23:Math.min(23,80/columns)}%`,height:`${count<=10?23:Math.min(23,80/rows)}%`,transform:`translate(-50%,-50%) rotate(${y>50?180:0}deg)`}} />)}
      </span>
      <span className="duel-card__name">{card.text?.replace(/Hollow/g,'空壳').replace(/Whisper/g,'低语').replace(/Devour/g,'吞噬').replace(/Exploit/g,'剥夺').replace(/Insight/g,'洞察').replace(/Break/g,'破损') || '标准扑克牌 · 无特殊技能'}</span>
      <span className="duel-card__traits">{card.hollow&&<i title="空壳">◇</i>}{Boolean(card.devour)&&<i title="吞噬容量">{card.swallowed??0}/{card.devour}</i>}{card.broken&&<i title="破损">−</i>}{Boolean(card.burned)&&<i title="点燃">🔥{card.burned}</i>}{card.forced&&<i title="强制">!</i>}</span>
    </>}
  </span>;
}
function ScoreRing({score}:{score:number|null}){
  const progress=score===null?0:Math.max(0,Math.min(21,score));
  const status=score===null?'尚未揭牌':score>21?`爆牌 · 超出 ${score-21}`:score===21?'正好 21':`还差 ${21-score}`;
  return <span className="duel-score-meter"><span className={`duel-score ${score===21?'is-perfect':''} ${score!==null&&score>21?'is-bust':''}`} style={{'--score-progress':`${progress/21*100}%`} as CSSProperties} role="progressbar" aria-label="接近 21 点" aria-valuemin={0} aria-valuemax={21} aria-valuenow={score===null?undefined:progress} aria-valuetext={score===null?status:`${score} 点，${status}`}><b>{score??'?'}</b><small>/ 21</small></span><small>{status}</small></span>;
}
export function DuelTable({tableId,onExit}:{tableId:string;onExit:()=>void}){
  const {state,error,online,busy,send}=useDuel(tableId);
  const [inspect,setInspect]=useState<DuelCard[]|null>(null),[rules,setRules]=useState(false),[leave,setLeave]=useState(false),[amount,setAmount]=useState(5),[now,setNow]=useState(Date.now());
  const [ordered,setOrdered]=useState<string[]>([]),[bottom,setBottom]=useState<string[]>([]);
  const dialog=useRef<HTMLDialogElement>(null);
  const drawDeck=useRef<HTMLButtonElement>(null),drawnCard=useRef<HTMLButtonElement>(null),drawFlight=useRef<HTMLSpanElement>(null);
  useEffect(()=>{
    if(!state?.drawn||!drawDeck.current||!drawnCard.current||!drawFlight.current||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const from=drawDeck.current.getBoundingClientRect(),to=drawnCard.current.getBoundingClientRect();
    const flight=drawFlight.current.animate([
      {visibility:'visible',width:`${from.width}px`,height:`${from.height}px`,transform:`translate(${from.x}px,${from.y}px) rotate(-8deg)`,opacity:1},
      {visibility:'visible',width:'24px',height:'38px',transform:`translate(${to.x}px,${to.y}px) rotate(0deg)`,opacity:0}
    ],{duration:460,easing:'cubic-bezier(.2,.8,.2,1)'});
    return()=>flight.cancel();
  },[state?.drawn?.id]);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{if(inspect||rules||leave)dialog.current?.showModal();else dialog.current?.close();},[inspect,rules,leave]);
  const choiceKey=state?.choices?.cards.map(c=>c.id).join(',');
  useEffect(()=>{setOrdered(state?.choices?.cards.map(c=>c.id)??[]);setBottom([]);},[choiceKey]);
  useEffect(()=>{setAmount(state?.mode==='classic'?Math.max(10,(state.offer??0)+2):Math.max(5,(state?.offer??0)+5));},[state?.offer,state?.mode]);
  const close=()=>{setInspect(null);setRules(false);setLeave(false);};
  const action=(command:DuelCommand)=>void send(command);
  if(!state)return <main className="duel-table"><header className="duel-header"><button onClick={onExit}>← 大厅</button><h1>正在连接真人牌桌</h1></header><div className="duel-loading" role="status">{error||'正在读取服务器牌局…'}</div></main>;
  const self=state.viewer>=0?state.viewer:0,other=1-self,me=state.players[self],enemy=state.players[other],mine=state.viewer>=0&&state.active===self;
  const awakened=state.mode==='awakened',seconds=state.deadline?Math.min(state.phase==='betting'?30:180,Math.max(0,Math.ceil((state.deadline-now)/1000))):null;
  const ended=['round-end','match-end'].includes(state.phase);
  const title=awakened?'觉醒对决':'BLACKJACK';
  const cardsRow=(seat:number)=> <div className="duel-slots">{state.players[seat].board.map((stack,index)=>{
    const legal=mine&&state.placements?.some(p=>p.seat===seat&&p.slot===index);
    return <button className={`duel-slot ${legal?'is-target':''} ${stack.length?'is-filled':''}`} style={{'--tilt':`${(index-2)*3}deg`} as CSSProperties} key={index} disabled={busy||(!legal&&!stack.length)} aria-label={legal?`放入${seat===self?'己方':'对方'}牌位 ${index+1}`:`查看${seat===self?'己方':'对方'}牌位 ${index+1}，${stack.length} 张牌`}
      onDragOver={event=>{if(legal)event.preventDefault();}} onDrop={event=>{event.preventDefault();if(legal)action({type:'PLACE',seat,slot:index});}}
      onClick={()=>legal?action({type:'PLACE',seat,slot:index}):setInspect(stack)}>
      {stack.length>1&&<><span className="duel-stack-layer"/><span className="duel-stack-count">×{stack.length}</span></>}
      {stack.length?<CardFace card={stack.at(-1)!}/>:<span className="duel-slot__empty"><b>{String(index+1).padStart(2,'0')}</b><i>✧</i>{legal&&<small>出牌</small>}</span>}
    </button>;
  })}</div>;
  const classicRow=(seat:number)=>seat===state.dealer?<div className="duel-classic-hand">{state.dealerHand?.map(card=><button className="duel-plain-card" onClick={()=>!card.hidden&&setInspect([card])} key={card.id}><CardFace card={card}/></button>)}</div>:
    <div className="duel-hands">{state.hands?.map((hand,i)=><div className={`duel-hand ${i===state.handIndex&&state.phase==='player'?'is-active':''}`} key={i}><span>第 {i+1} 手 · {hand.bet} 筹码 {hand.result?`· ${hand.result}`:''}</span><div className="duel-classic-hand">{hand.cards.map(card=><button className="duel-plain-card" onClick={()=>setInspect(hand.cards)} key={card.id}><CardFace card={card}/></button>)}</div></div>)}</div>;
  const playerRow=(seat:number,opponent=false)=>{
    const p=state.players[seat];
    const scores=awakened?[p.score]:seat===state.dealer?[state.dealerScore??null]:state.hands?.map(h=>h.score)??[null];
    return <section className={`duel-player ${opponent?'is-opponent':'is-self'} ${state.active===seat&&!ended?'is-turn':''}`} aria-label={opponent?'对手牌区':'我的牌区'}>
      <div className="duel-player__identity"><span className="duel-avatar">{p.occupied?p.name.slice(0,1):'?'}</span><div><strong>{p.occupied?p.name:'等待对手'}</strong><small>{awakened?'真人玩家':seat===state.dealer?'真人庄家 · S17':'真人闲家'}{p.stood?' · 已停牌':''}</small></div></div>
      <div className="duel-player__layout"><div className="duel-deck-zone"><button ref={seat===self?drawDeck:undefined} className="duel-deck" disabled={busy||opponent||!mine||state.phase!=='choose'} onClick={()=>action({type:'DRAW'})} aria-label="从牌堆摸牌"><span>✦</span><b>{awakened?p.deckCount:state.shoeCount}</b></button><small>{awakened?`弃牌 ${p.discardCount}`:'52 张标准牌'}</small>{awakened&&!opponent&&mine&&state.phase==='choose'&&<small className="duel-deck-hint">点击牌堆摸牌</small>}</div>
      {awakened?cardsRow(seat):classicRow(seat)}
      <div className="duel-chips"><div className={`duel-scores ${scores.length>1?'has-splits':''}`}>{scores.map((score,i)=><ScoreRing key={i} score={score}/>)}</div><span className="duel-chip">{awakened?p.chips:p.bankroll} 筹码</span><small>{awakened?`投入 ${p.bet}`:'账户余额'}</small></div></div>
    </section>;
  };
  const hand=state.hands?.[state.handIndex??0];
  const canSplit=hand&&hand.cards.length===2&&!hand.splitAce&&(state.hands?.length??0)<4&&Math.max(...hand.cards[0].points)===Math.max(...hand.cards[1].points);
  return <main className={`duel-table ${awakened?'is-awakened':'is-classic'}`}>
    <header className="duel-header"><button onClick={()=>state.viewer<0?onExit():setLeave(true)}>← 大厅</button><div><span>PRIVATE TABLE · {tableId.slice(6).padStart(2,'0')}</span><h1>{title}</h1></div><div className="duel-header__meta"><span className={online?'is-online':''}>{online?'● 已连接':'○ 正在重连'}</span><b>第 {state.round} 回合</b></div><button onClick={()=>setRules(true)}>规则</button></header>
    <div className="duel-felt">
      {playerRow(other,true)}
      <section className="duel-midline"><span>{awakened?`对局奖池 ${state.pot} / 15 · 每枚 ${state.price}`:'52 张 · BLACKJACK 3:2 · SOFT 17 STANDS'}</span><strong>{mine?'你的行动':enemy.occupied?`${state.players[state.active].name} 的行动`:'等待另一位玩家'}</strong>{seconds!==null&&<span className={`duel-clock ${seconds<20?'is-urgent':''}`}>{seconds}<small> 秒</small></span>}</section>
      {playerRow(self)}
      {awakened&&<div className="duel-sleeve" onDragOver={event=>{if(mine&&state.phase==='place')event.preventDefault();}} onDrop={event=>{event.preventDefault();if(mine&&state.phase==='place')action({type:'HIDE'});}}>
        <span>袖口 <b>{me.sleeve?.length??0}/3</b></span>{me.sleeve?.map(card=><button title={`${card.suitName} ${card.rank}：${card.text}`} key={card.id} disabled={busy||!mine||state.phase!=='choose'} onClick={()=>action({type:'SLEEVE_PLAY',cardId:card.id})}>{card.rank}<img src={iconFor(card.suit)} alt={card.suitName}/></button>)}<small>只有你可见 · 点击出牌</small>
        {mine&&state.drawn&&<button ref={drawnCard} className="duel-drawn" draggable onDragStart={event=>event.dataTransfer.setData('text/plain',state.drawn!.id)} onClick={()=>setInspect([state.drawn!])}>待出牌 <b>{state.drawn.suitName} {state.drawn.rank}</b> · 查看 / 拖至牌位</button>}
      </div>}
    </div>
    <span ref={drawFlight} className="duel-draw-flight" aria-hidden="true"><CardFace card={{id:'draw-flight',rank:'?',suit:'spade',points:[],activePoint:0,hidden:true}}/></span>
    <footer className="duel-actions">
      <div className="duel-action-status" role="status"><span>{phases[state.phase]??state.phase}</span><p>{error||state.message}</p></div>
      <div className="duel-action-buttons">
        {state.viewer<0?<button className="primary" disabled={busy} onClick={()=>action({type:'SIT_DOWN'})}>坐下 · 真人对战</button>:<>
          {mine&&state.phase==='betting'&&<><form onSubmit={event=>{event.preventDefault();action({type:'OFFER',amount});}}><input aria-label={awakened?'每枚筹码价值':'下注筹码'} type="number" value={amount} min={awakened?state.offer+5:state.offer+2} step={awakened?5:2} onChange={event=>setAmount(Number(event.target.value))}/><button disabled={busy}>叫注</button></form>{state.offer>0&&<><button className="primary" disabled={busy} onClick={()=>action({type:'ACCEPT'})}>确认 {awakened?state.offer*15:state.offer}</button>{awakened&&me.bankroll<state.offer*15&&<button disabled={busy} onClick={()=>action({type:'ALL_IN'})}>All-in</button>}<button disabled={busy} onClick={()=>action({type:'FOLD'})}>弃权</button></>}</>}
          {mine&&state.phase==='choose'&&<button disabled={busy||!me.played} onClick={()=>action({type:'STAND'})}>停牌</button>}
          {mine&&state.phase==='place'&&<button disabled={busy||(me.sleeve?.length??0)>=3} onClick={()=>action({type:'HIDE'})}>藏入袖口</button>}
          {mine&&state.phase==='skill'&&<><button onClick={()=>setInspect(state.pendingCard?[state.pendingCard]:[])}>查看技能</button><button className="primary" disabled={busy} onClick={()=>action({type:'SKILL',use:true})}>发动技能</button><button disabled={busy||state.pendingCard?.forced} onClick={()=>action({type:'SKILL',use:false})}>跳过技能</button></>}
          {mine&&state.phase==='insurance'&&<><button disabled={busy||me.bankroll<state.offer/2} onClick={()=>action({type:'INSURANCE',take:true})}>保险 {state.offer/2}</button><button disabled={busy} onClick={()=>action({type:'INSURANCE',take:false})}>不买保险</button></>}
          {mine&&state.phase==='player'&&<><button className="primary" disabled={busy} onClick={()=>action({type:'HIT'})}>要牌</button><button disabled={busy} onClick={()=>action({type:'STAND'})}>停牌</button><button disabled={busy||hand?.cards.length!==2||hand?.splitAce} onClick={()=>action({type:'DOUBLE'})}>加倍</button><button disabled={busy||!canSplit} onClick={()=>action({type:'SPLIT'})}>分牌</button><button disabled={busy||hand?.cards.length!==2||hand?.split} onClick={()=>action({type:'SURRENDER'})}>投降</button></>}
          {mine&&state.phase==='dealer'&&<button className="primary" disabled={busy} onClick={()=>action({type:'DEALER_STEP'})}>按庄家规则行动</button>}
          {ended&&<button className="primary" disabled={busy||me.ready} onClick={()=>action({type:'NEXT_ROUND'})}>{me.ready?'已准备 · 等待对方':'准备下一回合'}</button>}
        </>}
      </div>
    </footer>
    {state.choices&&mine&&<section className="duel-choice" aria-label="技能选择"><h2>{state.choices.kind==='insight'?'洞察 · 调整牌堆':'选择一张牌'}</h2><p>{state.choices.kind==='insight'?'从左至右为抽牌顺序，可将牌移至最前或牌底。':'选择结果仅你可见。'}</p><div className="duel-choice-cards">{(state.choices.kind==='insight'?ordered:state.choices.cards.map(c=>c.id)).map(id=>{const card=state.choices!.cards.find(c=>c.id===id)!;return <div key={id}><CardFace card={card}/>{state.choices!.kind==='insight'?<><button onClick={()=>{setOrdered([id,...ordered.filter(x=>x!==id)]);setBottom(bottom.filter(x=>x!==id));}}>移至最前</button><button aria-pressed={bottom.includes(id)} onClick={()=>setBottom(bottom.includes(id)?bottom.filter(x=>x!==id):[...bottom,id])}>{bottom.includes(id)?'已放牌底':'放至牌底'}</button></>:<button disabled={busy} onClick={()=>action({type:'CHOICE',cardId:id})}>选择此牌</button>}</div>;})}</div>{state.choices.kind==='insight'&&<button className="primary" disabled={busy} onClick={()=>action({type:'CHOICE',top:ordered.filter(id=>!bottom.includes(id)),bottom})}>确认顺序</button>}</section>}
    <dialog ref={dialog} className="duel-dialog" onClose={close} onClick={event=>{if(event.target===dialog.current)close();}}><button className="duel-dialog__close" onClick={close} aria-label="关闭详情">×</button>
      {inspect&&<><h2>牌面详情 {inspect.length>1?`· 堆叠 ${inspect.length} 张`:''}</h2><div className="duel-inspect-cards">{inspect.map(card=><article key={card.id}><CardFace card={card}/><div><h3>{card.suitName??suitNames[card.suit]} {card.rank}</h3><p>{card.text||'标准扑克牌 · 无特殊技能'}</p><small>点数：{card.points.join(' / ')||'不计点数'}</small>{card.hollow&&<p>空壳：允许继续叠放。</p>}{Boolean(card.devour)&&<p>吞噬：{card.swallowed??0} / {card.devour}，跨回合保留。</p>}</div></article>)}</div></>}
      {rules&&<><h2>{title} · 桌规</h2>{awakened?<><p>80 张觉醒牌，双方各 40 张，每方 5 个牌位。摸牌 → 放牌或藏牌 → 技能结算 → 交换行动权。整次行动共用 180 秒。</p><p>空壳可以连续叠放；吞噬可以接收空壳牌，被吞噬牌不发动自身技能；满容量后不能继续叠放，容量与获得点数跨回合保留。洞察、袖口及抽牌顺序仅对应玩家可见。每次行动剥夺最多 4 枚筹码。</p><p>每人购买 15 枚对局筹码；叫注确认后统一扣款。每回合各投入 2 枚，胜者取回自身投入，败者投入进入奖池，最多 15 枚。有人筹码耗尽时结算整场。</p></>:<><p>两位真人轮流坐庄。每回合使用重新洗好的 52 张牌；A 取 1 或 11，J/Q/K 计 10。自然黑杰克赔 3:2，普通获胜 1:1，同点平局。</p><p>庄家不足 17 必须补牌，包含软 17 在内的 17 及以上必须停牌。可以加倍、分牌（最多四手，A 只补一张且不再分）、购买保险（2:1）、查验庄家后投降。分牌的 21 不是自然黑杰克。</p><p>下注使用偶数筹码，双方确认后扣款。庄家预留下注的 1.5 倍；加倍和分牌需双方都有对应余额。保险为原注的一半。</p></>}<p>离桌视为认输；断开网络不立即丢失座位。超时由服务端按桌规处理。手机必须横屏。</p></>}
      {leave&&<><h2>离开牌桌？</h2><p>进行中的对局会按认输结算。返回大厅后可重新入座。</p>{error&&<p role="alert">{error}</p>}<button disabled={busy} onClick={async()=>{if(await send({type:'LEAVE_SEAT'}))onExit();}}>确认离桌</button><button onClick={close}>继续对局</button></>}
    </dialog>
  </main>;
}
