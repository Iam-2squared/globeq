import {writeFile} from 'node:fs/promises';
const targets=[
['luna-new-1','https://www.mofa.go.jp/mofaj/press/release/pressit_000001_04213.html','科学技術外交推進会議'],
['luna-new-2','https://www.mhlw.go.jp/stf/newpage_76305.html','困難な問題'],
['women-alternative','https://www.mhlw.go.jp/stf/newpage_76344.html','困難な問題'],
['luna-old-1','https://www.mlit.go.jp/report/press/sogo17_hh_000215.html','SkyDrive'],
['luna-old-2','https://www.mlit.go.jp/report/press/tochi_fudousan_kensetsugyo14_hh_000001_00380.html','均衡'],
['baseline1','https://www.fsa.go.jp/news/r8/sonota/20260928/20260928.html','10月'],
['baseline2','https://www.env.go.jp/press/press_05606.html','富山'],
['baseline3','https://www.env.go.jp/press/press_05613.html','海域'],
['baseline4','https://www.fsa.go.jp/news/r8/singi/20260925-2.html','開催'],
['baseline5','https://www.env.go.jp/press/press_05616.html','40'],
['baseline6','https://www.mlit.go.jp/report/press/kouku03_hh_000303.html','スロベニア'],
['baseline7','https://www.mlit.go.jp/report/press/kaiji05_hh_000349.html','強化'],
['baseline8','https://www.fsa.go.jp/news/r8/ginkou/20260924/20260924.html','エムット'],
['baseline9','https://www.mhlw.go.jp/stf/newpage_76360.html','令和'],
['baseline10','https://www.env.go.jp/press/press_05612.html','シンガポール'],
['baseline11','https://www.env.go.jp/press/press_05569.html','無料'],
['baseline12','https://www.env.go.jp/press/press_05484.html','JCM'],
['baseline13','https://www.env.go.jp/press/106098_00002.html','ゼロ'],
['baseline14','https://www.fsa.go.jp/news/r8/ginkou/20260924.html','千葉'],
['baseline15','https://www.mlit.go.jp/report/press/kaiji06_hh_000403.html','エタノール'],
['baseline16','https://www.mhlw.go.jp/stf/newpage_76354.html','150'],
['mofa-rights','https://www.mofa.go.jp/mofaj/annai/honsho/joho/','著作権'],
['mlit-rights','https://www.mlit.go.jp/link.html','著作権'],
['mhlw-rights','https://www.mhlw.go.jp/chosakuken/index.html','著作権']
];
const domains=['mofa.go.jp','mhlw.go.jp','mlit.go.jp','fsa.go.jp','env.go.jp'];
function safe(u){const x=new URL(u);return x.protocol==='https:'&&domains.some(d=>x.hostname===d||x.hostname.endsWith('.'+d))&&!x.username&&!x.password;}
function text(s){return s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();}
async function check([id,url,needle]){const row={id,url,observed_at:new Date().toISOString()};try{let r,current=url;for(let n=0;n<4;n++){if(!safe(current))throw new Error('BLOCKED');r=await fetch(current,{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{'user-agent':'GlobeQ-SourceReview/1.0'}});if(r.status>=300&&r.status<400){const loc=r.headers.get('location');await r.body?.cancel();if(!loc)throw new Error('REDIRECT');current=new URL(loc,current).href;continue;}break;}row.final_url=current;row.status=r.status;if(!r.ok){await r.body?.cancel();return row;}if(!(r.headers.get('content-type')??'').includes('text/html')){await r.body?.cancel();row.non_html=true;return row;}const reader=r.body.getReader();let size=0,parts=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>512000){await reader.cancel();row.truncated=true;break;}parts.push(value);}const raw=Buffer.concat(parts).toString('utf8');row.title=text(raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]??'');row.headings=[...raw.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)].slice(0,10).map(m=>text(m[1]));const body=text(raw);const index=body.indexOf(needle);row.needle_found=index>=0;row.excerpt=index>=0?body.slice(Math.max(0,index-140),index+1650):'';row.rights_links=[...raw.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].filter(m=>/著作権|利用規約|リンクについて/.test(text(m[2]))).slice(0,8).map(m=>({label:text(m[2]),url:new URL(m[1],current).href}));}catch{row.error='FETCH_NOT_VERIFIED';}return row;}
const rows=[];for(let i=0;i<targets.length;i+=3)rows.push(...await Promise.all(targets.slice(i,i+3).map(check)));const report={observed_at:new Date().toISOString(),model_requests:0,db_writes:0,rows};await writeFile('source-read-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(rows.map(({id,status,error,title})=>({id,status,error,title})),null,2));
