export const runtime='nodejs';
export const maxDuration=30;
export const dynamic='force-dynamic';

export async function GET(request:Request){
  const secret=process.env.CRON_SECRET;
  const auth=request.headers.get('authorization');
  const cronAgent=request.headers.get('user-agent')?.includes('vercel-cron/1.0')===true;
  if(secret ? auth!==`Bearer ${secret}` : !cronAgent)
    return Response.json({ok:false,error:'unauthorized'},{status:401});

  // 2026-10-02: paid OpenAI daily generation is intentionally paused.
  // Keep this endpoint authenticated, but never load DB/model code while GlobeQ is preparing.
  return Response.json({
    ok:true,
    status:'paused',
    serviceMode:'preparing',
    openAIDailyGeneration:false,
    published:0,
  },{headers:{'cache-control':'no-store'}});
}
