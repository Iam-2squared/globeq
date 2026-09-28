import { NextRequest } from 'next/server';
import { configured } from '@/lib/db';
import { publishedQuestions } from '@/lib/data';
import { japanDate, validQuizDate } from '@/lib/time';
import { noStore, problem } from '@/lib/security';

export async function GET(request: NextRequest) {
  if (!configured()) return Response.json({ date: japanDate(), questions: [] }, { headers: noStore });
  const value = request.nextUrl.searchParams.get('date') ?? japanDate();
  const date = validQuizDate(value);
  if (!date) return problem('日付が不正です。', 400);
  return Response.json({ date, questions: await publishedQuestions(date) }, { headers: noStore });
}
