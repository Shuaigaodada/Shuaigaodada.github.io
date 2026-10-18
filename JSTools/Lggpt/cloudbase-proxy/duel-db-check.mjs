// PGLITE_MODULE points to a temporary @electric-sql/pglite installation; no production dependency.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db=new PGlite();
try{
  await db.exec('CREATE ROLE service_role; CREATE TABLE app_users(id TEXT PRIMARY KEY, blackjack_bankroll BIGINT NOT NULL); INSERT INTO app_users VALUES (\'alice\',500),(\'bob\',500);');
  await db.exec(await readFile(new URL('./migrations/0008_blackjack_duel_state.sql',import.meta.url),'utf8'));
  const state={tableId:'table-6',revision:1,players:[{userId:'alice',bankroll:500},{userId:'bob',bankroll:500}]};
  const commit=(revision,state,deltas)=>db.query('SELECT commit_blackjack_duel($1,$2,$3::jsonb,$4::jsonb) AS state',[state.tableId,revision,JSON.stringify(state),JSON.stringify(deltas)]);
  const result=await commit(0,state,[{userId:'alice',delta:-75},{userId:'bob',delta:-75}]);
  assert.equal(result.rows[0].state.players[0].bankroll,425);
  await assert.rejects(commit(0,state,[]),/revision/);
  await assert.rejects(commit(1,{...state,revision:2},[{userId:'alice',delta:20},{userId:'bob',delta:-1000}]),/balance/);
  assert.deepEqual((await db.query('SELECT blackjack_bankroll FROM app_users ORDER BY id')).rows.map(r=>Number(r.blackjack_bankroll)),[425,425]);
  assert.equal(Number((await db.query('SELECT revision FROM blackjack_duel_states')).rows[0].revision),1);
  assert.equal(Number((await db.query('SELECT count(*) AS n FROM blackjack_duel_ledger')).rows[0].n),2);
  await assert.rejects(commit(0,{...state,tableId:'table-7'},[]),/Already seated/);
  assert.equal(Number((await db.query('SELECT count(*) AS n FROM blackjack_duel_states')).rows[0].n),1);
  const legacy=(user,table,action,balance=null,owner='test-process-owner')=>db.query('SELECT blackjack_legacy_wallet($1,$2,$3,$4,$5)',[user,owner,table,action,balance]);
  await assert.rejects(legacy('alice','table-1','claim'),/真人对决/);
  await db.exec("INSERT INTO app_users VALUES ('carol',50);");
  await legacy('carol','table-1','claim');
  await assert.rejects(commit(0,{...state,tableId:'table-8',players:[{userId:'carol'},{userId:null}]},[]),/原规则/);
  await assert.rejects(legacy('carol','table-2','claim'),/其他牌桌/);
  await assert.rejects(legacy('carol','table-1','save',60,'other-process-owner'),/ownership/);
  await assert.rejects(db.query('SELECT claim_blackjack_bankroll($1)',['carol']),/离桌/);
  await legacy('carol','table-1','save',70);
  await legacy('carol','table-1','release');
  assert.equal(Number((await db.query('SELECT claim_blackjack_bankroll($1) AS balance',['carol'])).rows[0].balance),170);
  await assert.rejects(db.query('SELECT claim_blackjack_bankroll($1)',['carol']),/不少于/);
  console.log('PostgreSQL: migration, atomic wallet/state commit, revision conflicts, rollback and seat uniqueness passed.');
}finally{await db.close();}
