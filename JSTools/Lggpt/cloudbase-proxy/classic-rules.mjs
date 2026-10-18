import {randomUUID} from 'node:crypto';
import {requireRule, shuffled, setPhase, wallet, log} from './awakened-rules.mjs';

export const classicValue = cards => {
  let value=cards.reduce((n,c)=>n+(c.rank==='A'?11:['J','Q','K'].includes(c.rank)?10:Number(c.rank)),0);
  for(const card of cards){
    card.activePoint=card.rank==='A'?1:0;
    if(value>21 && card.rank==='A'){value-=10;card.activePoint=0;}
  }
  return value;
};
const natural=hand=>!hand.split && hand.cards.length===2 && classicValue(hand.cards)===21;
export function classicDeck(){return shuffled(['heart','diamond','club','spade'].flatMap(suit=>['A','2','3','4','5','6','7','8','9','10','J','Q','K'].map(rank=>({id:randomUUID(),suit,rank,points:rank==='A'?[1,11]:[['J','Q','K'].includes(rank)?10:Number(rank)],text:'',activePoint:0}))));}
function card(state){requireRule(state.shoe.length,'本副牌已用尽。');return state.shoe.shift();}
function reserve(state,amount){
  const player=1-state.dealer, dealer=state.dealer;
  requireRule(Number.isSafeInteger(amount) && amount>0 && amount%2===0,'下注必须为正偶数。');
  requireRule(state.players[player].bankroll>=amount && state.players[dealer].bankroll>=amount*1.5,'玩家余额或庄家赔付准备金不足。');
  wallet(state,player,-amount);wallet(state,dealer,-amount*1.5);
  state.escrow[player]+=amount;state.escrow[dealer]+=amount*1.5;
}
export function startClassic(state){
  state.dealer ??= state.first;
  reserve(state,state.offer);
  state.shoe=classicDeck();state.insurance=0;state.handIndex=0;
  state.hands=[{cards:[card(state),card(state)],bet:state.offer,stood:false,split:false}];
  state.dealerHand=[card(state),card(state)];
  if(state.dealerHand[0].rank==='A')setPhase(state,'insurance',1-state.dealer);
  else peek(state);
  log(state,'发牌完成，真人庄家依固定规则补牌。');
}
function peek(state){
  if(classicValue(state.dealerHand)===21 || natural(state.hands[0]))finishClassic(state);
  else setPhase(state,'player',1-state.dealer);
}
export function finishClassic(state){
  const dealerScore=classicValue(state.dealerHand), dealerNatural=state.dealerHand.length===2 && dealerScore===21;
  let payout=dealerNatural ? state.insurance*3 : 0;
  for(const hand of state.hands){
    const score=classicValue(hand.cards);
    let result, returned=0;
    if(hand.surrender){result='投降';returned=hand.bet/2;}
    else if(score>21){result='爆牌';}
    else if(dealerNatural){result=natural(hand)?'平局':'庄家黑杰克';returned=natural(hand)?hand.bet:0;}
    else if(natural(hand)){result='黑杰克 3:2';returned=hand.bet*2.5;}
    else if(dealerScore>21 || score>dealerScore){result='获胜';returned=hand.bet*2;}
    else if(score===dealerScore){result='平局';returned=hand.bet;}
    else result='落败';
    hand.result=result;hand.returned=returned;payout+=returned;
  }
  const total=state.escrow[0]+state.escrow[1];
  requireRule(payout<=total,'赔付准备金不足。');
  const player=1-state.dealer, net=payout-state.escrow[player];
  wallet(state,player,payout);wallet(state,state.dealer,total-payout);state.escrow=[0,0];
  state.winner=net===0?null:net>0?player:state.dealer;
  setPhase(state,'round-end');log(state,`本回合已结算：${state.hands.map(h=>h.result).join(' / ')}。`);
}
function nextHand(state){
  const index=state.hands.findIndex(h=>!h.stood);
  if(index>=0){state.handIndex=index;setPhase(state,'player',1-state.dealer);}
  else if(state.hands.every(h=>h.surrender || classicValue(h.cards)>21))finishClassic(state);
  else {setPhase(state,'dealer',state.dealer);log(state,'闲家行动结束，请庄家按固定规则补牌。');}
}
export function classicCommand(state,seat,command){
  requireRule(state.active===seat,'还没轮到你。');
  if(state.phase==='insurance'){
    requireRule(command.type==='INSURANCE' && typeof command.take==='boolean','请选择是否保险。');
    if(command.take){const value=state.offer/2;wallet(state,seat,-value);state.escrow[seat]+=value;state.insurance=value;}
    peek(state);return;
  }
  if(state.phase==='dealer'){
    requireRule(command.type==='DEALER_STEP','庄家必须按固定规则行动。');
    if(classicValue(state.dealerHand)<17)state.dealerHand.push(card(state));
    if(classicValue(state.dealerHand)>=17)finishClassic(state);
    return;
  }
  requireRule(state.phase==='player' && seat!==state.dealer,'当前不能操作手牌。');
  const hand=state.hands[state.handIndex];
  switch(command.type){
    case 'HIT':hand.cards.push(card(state));hand.stood=classicValue(hand.cards)>=21;break;
    case 'STAND':hand.stood=true;break;
    case 'DOUBLE':
      requireRule(hand.cards.length===2 && !hand.splitAce,'只能在前两张牌时加倍。');
      reserve(state,hand.bet);hand.bet*=2;hand.cards.push(card(state));hand.stood=true;break;
    case 'SPLIT': {
      const value=c=>c.rank==='A'?11:['J','Q','K'].includes(c.rank)?10:Number(c.rank);
      requireRule(hand.cards.length===2 && !hand.splitAce && state.hands.length<4 && value(hand.cards[0])===value(hand.cards[1]),'当前不能分牌，最多四手，A 不可再分。');
      reserve(state,hand.bet);
      const second=hand.cards.pop(),aces=second.rank==='A';
      hand.split=true;hand.splitAce=aces;hand.cards.push(card(state));hand.stood=aces || classicValue(hand.cards)===21;
      const next={cards:[second,card(state)],bet:hand.bet,stood:aces,split:true,splitAce:aces};
      next.stood ||= classicValue(next.cards)===21;
      state.hands.splice(state.handIndex+1,0,next);break;
    }
    case 'SURRENDER':requireRule(hand.cards.length===2 && !hand.split,'只能在初始两张牌且查验庄家后投降。');hand.surrender=true;hand.stood=true;break;
    default:requireRule(false,'不支持的传统规则命令。');
  }
  if(hand.stood)nextHand(state);
}
export function classicTimeout(state){
  if(state.phase==='insurance')classicCommand(state,state.active,{type:'INSURANCE',take:false});
  else if(state.phase==='player')classicCommand(state,state.active,{type:'STAND'});
  else if(state.phase==='dealer'){while(state.phase==='dealer')classicCommand(state,state.active,{type:'DEALER_STEP'});}
}
