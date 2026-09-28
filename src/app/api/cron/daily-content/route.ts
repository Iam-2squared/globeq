import { runDailyContent } from '@/lib/daily-content';

export const runtime='nodejs';
export const maxDuration=300;
export const dynamic='force-dynamic';

export async function GET(request:Request){
  const secret=process.env.CRON_SECRET;
  const auth=request.headers.get('authorization');
  const cronAgent=request.headers.get('user-agent')?.includes('vercel-cron/1.0')===true;
  // CRON_SECRET is preferred. Until one is configured, accept only Vercel's cron user-agent.
  // The DB layer is idempotent and permits at most one active generation per Tokyo date.
  if(secret ? auth!==`Bearer ${secret}` : !cronAgent)
    return Response.json({ok:false,error:'unauthorized'},{status:401});
  try{
    const result=await runDailyContent();
    return Response.json(result,{headers:{'cache-control':'no-store'}});
  }catch(error){
    console.error('daily-content cron failed',error);
    return Response.json({ok:false,error:error instanceof Error?error.message:'daily content failed'},
      {status:500,headers:{'cache-control':'no-store'}});
  }
}
