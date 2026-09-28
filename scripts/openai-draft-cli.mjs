import { readFileSync,writeFileSync,existsSync } from 'node:fs';import { z } from 'zod';import { generateDraft,sourceSchema } from './openai-draft.mjs';
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
const args=process.argv.slice(2),flags=Object.fromEntries(args.filter(v=>v.startsWith('--')).map(v=>[v.slice(2),args[args.indexOf(v)+1]]));
const input=z.object({date:z.iso.date(),region:z.literal('japan'),sources:z.array(sourceSchema).min(1).max(200)}).parse(JSON.parse(readFileSync(flags.file,'utf8')));
const items=[];for(const source of input.sources)items.push(await generateDraft(source));
const out=JSON.stringify({date:input.date,region:input.region,items},null,2);
if(flags.out){writeFileSync(flags.out,out+'\n');console.log(JSON.stringify({drafts:items.length,out:flags.out}));}else console.log(out);
