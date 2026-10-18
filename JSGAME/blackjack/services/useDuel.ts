import {useEffect, useRef, useState} from 'react';
import {getRegionalAuthToken, getUnifiedAuthToken, setRegionalAuthToken} from './authSession';
import {selectGameServer} from './serverConfig';

export interface DuelCard { id:string; key?:string; rank:string; suit:string; suitName?:string; points:number[]; activePoint:number; text?:string; hollow?:boolean; devour?:number; swallowed?:number; broken?:boolean; burned?:number; hidden?:boolean; forced?:boolean; }
export interface DuelPlayer { id:string; name:string; occupied:boolean; bankroll:number; chips:number; bet:number; stood:boolean; ready:boolean; played:boolean; score:number; board:DuelCard[][]; sleeve?:DuelCard[]; deckCount:number; discardCount:number; exhaustedCount:number; }
export interface DuelState { tableId:string; mode:'awakened'|'classic'; revision:number; round:number; phase:string; active:number; viewer:number; price:number; offer:number; pot:number; brokenChips:number; deadline:number|null; message:string; winner:number|null; players:DuelPlayer[]; logs:{id:string;message:string}[]; drawn?:DuelCard|null; pendingCard?:DuelCard|null; placements?:{seat:number;slot:number}[]; choices?:{kind:string;cards:DuelCard[]}; dealer?:number; dealerHand?:DuelCard[]; dealerScore?:number|null; handIndex?:number; shoeCount?:number; hands?:{score:number;cards:DuelCard[];bet:number;stood:boolean;split?:boolean;splitAce?:boolean;result?:string}[]; }
export type DuelCommand={type:string;[key:string]:unknown};
export function useDuel(tableId:string){
  const [state,setState]=useState<DuelState|null>(null),[error,setError]=useState(''),[online,setOnline]=useState(false),[busy,setBusy]=useState(false);
  const stateRef=useRef(state),socketRef=useRef<WebSocket|null>(null),serverRef=useRef(''),pendingRef=useRef(false);
  const [clientId]=useState(()=>{
    let id=sessionStorage.getItem('blackjack-duel-client');
    if(!id){const bytes=crypto.getRandomValues(new Uint8Array(16));id=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');sessionStorage.setItem('blackjack-duel-client',id);}
    return id;
  });
  const receive=(next:DuelState)=>{if(!stateRef.current || next.revision>=stateRef.current.revision){stateRef.current=next;setState(next);}};
  const ticket=async(server:string)=>{
    let token=getRegionalAuthToken(server);const shared=getUnifiedAuthToken();
    if(shared){const response=await fetch(`${server}/api/auth/sso`,{method:'POST',headers:{Authorization:`Bearer ${shared}`},signal:AbortSignal.timeout(6000)});if(!response.ok)throw Error('登录已过期，请返回大厅重新登录。');token=(await response.json()).token;setRegionalAuthToken(server,token!);}
    if(!token)throw Error('请先在大厅登录，再入座。');
    const response=await fetch(`${server}/api/auth/ws-ticket`,{method:'POST',headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(6000)});
    if(!response.ok)throw Error('无法获取入座凭证，请重新登录。');return String((await response.json()).ticket);
  };
  useEffect(()=>{
    let disposed=false,reconnect:ReturnType<typeof setTimeout>|undefined,poll:ReturnType<typeof setInterval>|undefined,inFlight=false;
    const refresh=async()=>{if(disposed||inFlight||!serverRef.current)return;inFlight=true;try{const response=await fetch(`${serverRef.current}/api/tables/${tableId}/state?client_id=${clientId}`,{cache:'no-store',signal:AbortSignal.timeout(6000)});if(!response.ok)throw Error('牌局服务暂不可用。');const next=await response.json();if(!disposed)receive(next);}catch(e){if(!disposed)setError((e as Error).message);}finally{inFlight=false;}};
    const connect=async()=>{
      try{
        const server=await selectGameServer(tableId);serverRef.current=server;
        const socket=new WebSocket(`${server.replace(/^http/,'ws')}/ws/tables/${tableId}?client_id=${clientId}`);
        if(disposed){socket.close();return;}socketRef.current=socket;
        socket.onopen=()=>{if(!disposed){setOnline(true);setError('');}};
        socket.onmessage=event=>{if(disposed)return;try{const result=JSON.parse(event.data);if(result.type==='TABLE_STATE')receive(result.payload);if(result.type==='ERROR')setError(result.payload.message);}catch{setError('收到无效牌局数据，正在重新同步。');}};
        socket.onclose=()=>{if(!disposed){setOnline(false);reconnect=setTimeout(()=>void connect(),3000);}};
        socket.onerror=()=>socket.close();
        await refresh();
      }catch(e){if(!disposed){setError((e as Error).message);reconnect=setTimeout(()=>void connect(),3000);}}
    };
    void connect();
    // Periodic snapshots also catch updates committed by another backend instance.
    poll=setInterval(()=>void refresh(),3000);
    return()=>{disposed=true;clearTimeout(reconnect);clearInterval(poll);socketRef.current?.close();socketRef.current=null;};
  },[tableId,clientId]);
  const send=async(command:DuelCommand)=>{
    if(pendingRef.current || !stateRef.current)return;
    pendingRef.current=true;setBusy(true);setError('');
    const server=serverRef.current;
    try{
      const query=new URLSearchParams({client_id:clientId});
      if(command.type==='SIT_DOWN')query.set('ticket',await ticket(server));
      const commandId=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
      const response=await fetch(`${server}/api/tables/${tableId}/command?${query}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...command,commandId,revision:stateRef.current.revision}),signal:AbortSignal.timeout(10000)});
      const data=await response.json();if(!response.ok)throw Error(data.message??'操作失败，请刷新牌局后重试。');receive(data);return true;
    }catch(e){setError((e as Error).message);return false;}finally{pendingRef.current=false;setBusy(false);}
  };
  return {state,error,online,busy,send};
}
