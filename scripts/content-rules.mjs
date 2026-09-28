/** Pure publish gate shared by the operator CLI and integration tests. */
export function validatePublishRows(rows, date) {
  const issues = [];
  const active = rows.filter(row => row.status !== 'withdrawn');
  if (active.length < 20) issues.push(`At least 20 active questions are required; found ${active.length}`);
  const events = new Set();
  for (const row of active) {
    if (!['reviewed', 'published'].includes(row.status)) issues.push(`${row.id}: question is not reviewed`);
    if (Number(row.option_count) !== 4 || Number(row.correct_count) !== 1 || Number(row.distinct_labels) !== 4)
      issues.push(`${row.id}: requires four distinct options with exactly one correct`);
    if (!row.reviewer_id || !row.rights_checked || !row.neutrality_checked || !row.verification_note || row.verification_note.length < 12)
      issues.push(`${row.id}: source, rights and neutrality review required`);
    if (!String(row.source_url).startsWith('https://')) issues.push(`${row.id}: HTTPS source URL required`);
    if (events.has(row.event_key)) issues.push(`${row.id}: duplicate event`);
    events.add(row.event_key);
    const published = new Date(row.published_at);
    const min = new Date(`${date}T00:00:00+09:00`).getTime() - 2 * 86400000;
    const max = new Date(`${date}T23:59:59+09:00`).getTime();
    if (Number.isNaN(published.getTime()) || published.getTime() < min || published.getTime() > max || published.getTime() > Date.now())
      issues.push(`${row.id}: article publication date is outside reviewed news window`);
  }
  return issues;
}
