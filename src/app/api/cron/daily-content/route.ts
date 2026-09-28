import { runDailyContent } from '@/lib/daily-content';

export const runtime='nodejs';
export const maxDuration=300;
export const dynamic='force-dynamic';

export async function GET(request:Request){
  const secret=process.env.CRON_SECRET;
  if(!secret)return Response.json({ok:false,error:'CRON_SECRET is not configured'},{status:503});
  if(request.headers.get('authorization')!==`Bearer ${secret}`)
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
