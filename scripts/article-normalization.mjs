export function canonicalArticleUrl(input) {
  const url=new URL(input);
  if(url.protocol!=='https:' || url.username || url.password) throw new Error('An HTTPS article URL without credentials is required');
  url.hash='';
  for(const key of Array.from(url.searchParams.keys())) {
    if(/^utm_/i.test(key) || ['fbclid','gclid','mc_cid','mc_eid'].includes(key.toLowerCase())) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  return url.toString();
}

const clean=(value)=>value.normalize('NFKC').trim().replace(/\s+/g,' ');
export function normalizeCandidate(item) {
  return {
    article:{
      ...item.article,
      title:clean(item.article.title),summary:clean(item.article.summary),
      sourceName:clean(item.article.sourceName),sourceUrl:canonicalArticleUrl(item.article.sourceUrl),
      publishedAt:new Date(item.article.publishedAt).toISOString(),
      category:clean(item.article.category),
      tags:Array.from(new Set(item.article.tags.map(clean))),
      eventKey:clean(item.article.eventKey).toLowerCase().replace(/\s+/g,'-'),
    },
    question:{
      ...item.question,prompt:clean(item.question.prompt),explanation:clean(item.question.explanation),
      options:item.question.options.map(option=>({...option,label:clean(option.label)})),
    },
  };
}
