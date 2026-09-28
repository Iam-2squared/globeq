// Isolated HTTP E2E: an in-memory PostgreSQL engine, synthetic news and temporary accounts.
// This never reads or writes a production database, project or real news feed.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import postgres from 'postgres';

const url = 'postgresql://postgres@127.0.0.1:54331/postgres';
const web = 'http://127.0.0.1:34301';
const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'})
  .format(new Date());
const fixtureDir = mkdtempSync(join(tmpdir(),'globeq-fixture-'));
const db = await PGlite.create();
const server = new PGLiteSocketServer({db,host:'127.0.0.1',port:54331,maxConnections:6});
let app;
let client;
const env = {...process.env,DATABASE_URL:url,DB_POOL_SIZE:'1',NEXT_TELEMETRY_DISABLED:'1'};

function run(args,extra={}) {
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,args,{env:{...env,...extra},stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    child.stdout.on('data',c=>stdout+=c);
    child.stderr.on('data',c=>stderr+=c);
    child.on('close',code=>code===0?resolve(stdout):reject(new Error(`${args.join(' ')}: ${stderr || stdout}`)));
  });
}

async function waitFor(url) {
  for(let i=0;i<80;i++){
    try{const r=await fetch(url);if(r.ok)return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,300));
  }
  throw new Error('HTTP app failed to start');
}

try {
  await server.start();
  const migrated=await run(['scripts/migrate.mjs']);
  assert.match(migrated,/APPLIED 0001_japan_v1.sql/);
  client=postgres(url,{max:1,prepare:false,ssl:false});
  const [editor]=await client`insert into globeq.users(username,username_key,role)
    values('FixtureEditor','fixtureeditor','editor') returning id`;
  const items=Array.from({length:20},(_,i)=>({
    article:{
      title:`Synthetic story number ${i+1} for isolated testing`,
      summary:`A fictional summary for test case ${i+1}; this is not public news.`,
      sourceName:'Synthetic fixture',sourceUrl:`https://example.test/globeq/${i+1}`,
      publishedAt:new Date().toISOString(),category:'テスト',tags:['synthetic',`item-${i+1}`],eventKey:`synthetic-${i+1}`,
    },
    question:{
      prompt:`Which answer belongs to synthetic test case ${i+1}?`,
      explanation:`Only the isolated fixture defines the correct answer for item ${i+1}.`,
      difficulty:i<4?'hard':'normal',
      options:[{label:'Answer A',correct:true},{label:'Answer B',correct:false},{label:'Answer C',correct:false},{label:'Answer D',correct:false}],
    },
  }));
  const file=join(fixtureDir,'synthetic.json');
  writeFileSync(file,JSON.stringify({date:today,region:'japan',items}));
  const imported=JSON.parse(await run(['scripts/content.mjs','import','--file',file],{EDITOR_USER_ID:editor.id}));
  assert.equal(imported.createdQuestionIds.length,20);
  // Exercise the actual review command; the rest are isolated fixture review rows.
  await run(['scripts/content.mjs','review','--question',imported.createdQuestionIds[0],
    '--note','Synthetic fixture answer checked directly in the test package.',
    '--rights-confirmed','yes','--neutrality-confirmed','yes'],{EDITOR_USER_ID:editor.id});
  await client.begin(async tx=>{
    for(const q of imported.createdQuestionIds.slice(1)){
      await tx`insert into globeq.content_reviews(question_id,reviewer_id,verification_note,rights_checked,neutrality_checked)
        values(${q},${editor.id},'Synthetic fixture answer checked directly in test package.',true,true)`;
      await tx`update globeq.questions set status='reviewed' where id=${q}`;
    }
  });
  const published=await run(['scripts/content.mjs','publish','--date',today],{EDITOR_USER_ID:editor.id});
  assert.match(published,/20 questions/);

  app=spawn('./node_modules/.bin/next',['start','-H','127.0.0.1','-p','34301'],{env,stdio:['ignore','pipe','pipe']});
  let logs='';app.stderr.on('data',chunk=>logs+=chunk);
  await waitFor(web+'/');
  const noOrigin=await fetch(web+'/api/answers',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  assert.equal(noOrigin.status,403);
  const registration=await fetch(web+'/api/auth/register',{method:'POST',headers:{origin:web,'content-type':'application/json'},
    body:JSON.stringify({username:'FixtureLearner',password:'only-for-isolated-test'})});
  if(registration.status!==201) throw new Error(`Register ${registration.status}: ${await registration.text()}`);
  const cookie=registration.headers.get('set-cookie') ?? '';
  assert.match(cookie,/HttpOnly/i);assert.match(cookie,/SameSite=Lax/i);
  const session=cookie.split(';')[0];
  const [credential]=await client`select c.password_hash from globeq.auth_credentials c join globeq.users u on u.id=c.user_id
    where u.username_key='fixturelearner'`;
  assert.match(credential.password_hash,/^\$argon2id\$/);
  assert.notEqual(credential.password_hash,'only-for-isolated-test');
  const questionsResponse=await fetch(web+`/api/questions?date=${today}`);
  const quiz=await questionsResponse.json();
  assert.equal(quiz.questions.length,20);
  assert.equal(quiz.questions.every(q=>q.options.length===4),true);
  assert.equal(/is_correct|isCorrect|correctOption|explanation|sourceUrl/.test(JSON.stringify(quiz)),false);
  for(let i=0;i<20;i++){
    const q=quiz.questions[i];
    const result=await fetch(web+'/api/answers',{method:'POST',headers:{origin:web,'content-type':'application/json',cookie:session},
      body:JSON.stringify({questionId:q.id,optionId:q.options[0].id})});
    if(result.status!==200) throw new Error(`Answer ${i+1} ${result.status}: ${await result.text()}`);
    const body=await result.json();
    assert.equal(body.correct,true);assert.equal(body.eligible,true);
    assert.match(body.explanation,/isolated fixture/);assert.match(body.sourceUrl,/^https:\/\/example\.test/);
  }
  const retry=await fetch(web+'/api/answers',{method:'POST',headers:{origin:web,'content-type':'application/json',cookie:session},
    body:JSON.stringify({questionId:quiz.questions[0].id,optionId:quiz.questions[0].options[1].id})});
  assert.equal((await retry.json()).firstSubmit,false);
  const [score]=await client`select s.total_answers,s.all_time_hard,s.streak_current from globeq.user_scores s
    join globeq.users u on u.id=s.user_id where u.username_key='fixturelearner'`;
  assert.equal(score.total_answers,20);assert.equal(score.all_time_hard,4);assert.equal(score.streak_current,1);
  const homeResponse=await fetch(web+'/',{headers:{cookie:session}});
  const home=await homeResponse.text();
  if(homeResponse.status!==200) throw new Error(`Home ${homeResponse.status}: ${logs.slice(-1700)}`);
  if(!/20 \/ 20/.test(home)) throw new Error(`Home progress missing: ${home.slice(0,250)}`);
  const account=await (await fetch(web+'/account',{headers:{cookie:session}})).text();
  assert.match(account,/FixtureLearner/);
  const ranking=await (await fetch(web+'/ranking?type=weekly',{headers:{cookie:session}})).text();
  assert.match(ranking,/今あなたは 1 位です/);
  const news=await (await fetch(web+'/news?q=synthetic')).text();
  assert.match(news,/Synthetic story number 1/);
  console.log(JSON.stringify({migration:'PASS',fixtureQuestions:quiz.questions.length,answers:20,retry:'PASS',sourceReveal:'PASS',
    newsSearch:'PASS',ranking:'PASS',account:'PASS',httpRoutes:5,csrf:'PASS',passwordHash:'PASS',serverLogBytes:logs.length}));
} finally {
  if(app && app.exitCode===null){app.kill('SIGTERM');await new Promise(resolve=>app.once('close',resolve));}
  if(client)await client.end({timeout:1});
  await server.stop();await db.close();rmSync(fixtureDir,{recursive:true,force:true});
}
