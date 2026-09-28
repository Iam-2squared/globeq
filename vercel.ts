export const config = {
  framework: 'nextjs',
  installCommand: 'npm ci',
  buildCommand: 'npm run build',
  regions: ['hnd1'],
  crons: [{ path: '/api/cron/daily-content', schedule: '15 20 * * *' }],
};
