import { DAILY_POLICY } from '../../../../lib/daily-generation-policy';

export const runtime='nodejs';
export const dynamic='force-dynamic';

/** Read-only deployment evidence. This route never loads a DB or calls a model. */
export async function GET(){
  return Response.json({
    ok:true,
    ...DAILY_POLICY,
    paused:true,
    serviceMode:'preparing',
    openAIDailyGeneration:false,
    deploymentCommit:process.env.VERCEL_GIT_COMMIT_SHA??null,
  },{headers:{'cache-control':'no-store'}});
}
