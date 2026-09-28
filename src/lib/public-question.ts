export type PublicQuestion = {
  id: string; prompt: string; difficulty: 'easy' | 'normal' | 'hard'; position: number;
  options: { id: string; label: string; position: number }[];
};

// Explicit allowlist: even if a query later joins answer columns, serialization stays answer-free.
export function publicQuestion(row: Record<string, unknown>): PublicQuestion {
  const options = row.options as Array<Record<string, unknown>>;
  return {
    id: String(row.id), prompt: String(row.prompt),
    difficulty: row.difficulty as PublicQuestion['difficulty'], position: Number(row.position),
    options: options.map(option => ({ id:String(option.id), label:String(option.label), position:Number(option.position) })),
  };
}
