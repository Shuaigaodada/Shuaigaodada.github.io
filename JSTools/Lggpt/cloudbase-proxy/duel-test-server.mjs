// Test-only loopback server. Never imported by server.mjs or deployed.
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {WebSocketServer,WebSocket} from 'ws';
import {DuelRooms} from './duel-rooms.mjs';
const users=new Map(['alice','bob','carol'].map(id=>[id,{id,displayName:id,bankroll:10000}]));
const tickets=new Map(),saved=new Map();
const rooms=new DuelRooms({consumeTicket:async t=>{const u=tickets.get(t);tickets.delete(t);return u;},loadDuel:async id=>structuredClone(saved.get(id)),persistDuel:async(id,revision,state)=>{if((saved.get(id)?.revision??0)!==revision)throw Error('revision conflict');saved.set(id,structuredClone(state));}});
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:5173');res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  const reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  try{
    if(url.pathname==='/test/reset'){rooms.close();rooms.states.clear();saved.clear();return reply(200,{ok:true});}
    const user=users.get(req.headers.authorization?.replace('Bearer ',''));
    if(['/api/auth/sso','/api/auth/me'].includes(url.pathname)){if(!user)return reply(401,{message:'Test identity required'});return reply(200,{token:user.id,user});}
    if(url.pathname==='/api/auth/ws-ticket'){if(!user)return reply(401,{message:'Test identity required'});const t=randomUUID();tickets.set(t,user);return reply(200,{ticket:t});}
    if(url.pathname.endsWith('/join'))return reply(200,{status:'assigned',authority:'tencent',expiresAt:Date.now()+60000});
    const match=url.pathname.match(/^\/api\/tables\/(table-\d+)\/(state|command)$/);if(!match)return reply(404,{});
    const id=match[1],client=url.searchParams.get('client_id');
    if(match[2]==='state')return reply(200,await rooms.stateFor(id,client));
    let body='';for await(const chunk of req){body+=chunk; if(body.length>8192)throw Error('Command too large');}
    return reply(200,await rooms.command(id,client,JSON.parse(body),url.searchParams.get('ticket')));
  }catch(error){reply(400,{message:error.message});}
});
const ws=new WebSocketServer({noServer:true});
server.on('upgrade',(req,socket,head)=>{const url=new URL(req.url,'http://localhost'),match=url.pathname.match(/^\/ws\/tables\/(table-\d+)$/);if(!match){socket.destroy();return;}ws.handleUpgrade(req,socket,head,connection=>{const dispose=rooms.addConnection(match[1],url.searchParams.get('client_id'),event=>{if(connection.readyState===WebSocket.OPEN)connection.send(JSON.stringify(event));});connection.on('close',dispose);});});
server.listen(8787,'127.0.0.1',()=>console.log('Duel integration server: http://127.0.0.1:8787 (test identities only)'));
process.on('SIGTERM',()=>{rooms.close();server.close();process.exit(0);});
