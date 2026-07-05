import { describe, expect, it } from 'vitest';
import type { GameSettings, GameState, Question } from '../types';
import { createGame, reduce } from './gameEngine';
import { SCORING } from '../lib/scoreEngine';

/** بنك اصطناعي حتمي — كل سؤال له 3 خيارات خاطئة ليصلح لكل الجولات */
function makeBank(count: number): Question[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `t-${i}`,
    type: 'mcq' as const,
    question_text: `سؤال اختبار رقم ${i} من البنك الاصطناعي؟`,
    answer: `جواب-${i}`,
    accepted_answers: [],
    wrong_answers: ['خطأ-أ', 'خطأ-ب', 'خطأ-ج'],
    category: 'general' as const,
    difficulty: (['easy', 'medium', 'hard', 'expert'] as const)[i % 4],
    time_limit_seconds: 10,
    points: 10,
    language: 'ar' as const,
    tags: [],
  }));
}

function settings(playerCount: number): GameSettings {
  return {
    players: Array.from({ length: playerCount }, (_, i) => ({
      name: `لاعب${i + 1}`,
      avatar: '🦁',
    })),
    categories: ['general'],
    difficulties: ['easy', 'medium', 'hard', 'expert'],
    r1QuestionsPerPlayer: 2,
    r2Questions: 2,
    r3ChainLength: 3,
    timerSpeed: 1,
    answerMode: 'options',
    tone: 'fusha',
    includeCustom: false,
    soundOn: false,
  };
}

/** يجيب اللاعب المحدد صحيحاً والبقية خطأ — حسب المرحلة الحالية */
function playUntil(
  state: GameState,
  bank: Question[],
  stopAt: (s: GameState) => boolean,
  strongPlayerId: string,
  maxSteps = 500,
): GameState {
  let s = state;
  let steps = 0;
  while (!stopAt(s) && steps++ < maxSteps) {
    const before = s;
    s = stepOnce(s, bank, strongPlayerId);
    if (s === before) throw new Error(`عالق في: ${JSON.stringify(s.phase.kind)}`);
  }
  if (steps >= maxSteps) throw new Error('تجاوز حد الخطوات');
  return s;
}

function stepOnce(s: GameState, bank: Question[], strong: string): GameState {
  const d = (a: Parameters<typeof reduce>[1]) => reduce(s, a, bank);
  const ph = s.phase;

  switch (ph.kind) {
    case 'intro':
    case 'results':
      return d({ type: 'ADVANCE' });
    case 'r1': {
      if (ph.stage === 'feedback') return d({ type: 'ADVANCE' });
      const item = ph.queue[ph.index];
      const correct = item.playerId === strong;
      return d({
        type: 'ANSWER',
        value: correct ? item.question.answer : 'خطأ متعمد',
        elapsedMs: 2000,
      });
    }
    case 'r2': {
      if (ph.stage === 'feedback') return d({ type: 'ADVANCE' });
      if (ph.stage === 'reveal') return d({ type: 'BUZZ', playerId: strong });
      return d({ type: 'ANSWER', value: ph.questions[ph.index].answer, elapsedMs: 2000 });
    }
    case 'r3': {
      if (ph.stage === 'turn-intro' || ph.stage === 'feedback' || ph.stage === 'turn-end')
        return d({ type: 'ADVANCE' });
      const pid = ph.playerOrder[ph.turnIndex];
      const q = ph.chain[ph.chainIndex];
      return d({
        type: 'ANSWER',
        value: pid === strong ? q.answer : 'خطأ متعمد',
        elapsedMs: 2000,
      });
    }
    case 'r4': {
      if (ph.stage === 'duel-intro' || ph.stage === 'feedback' || ph.stage === 'duel-end')
        return d({ type: 'ADVANCE' });
      if (ph.stage === 'buzz') {
        // القوي يسبق إن كان في المواجهة، وإلا الأول
        const buzzer = ph.duelists.includes(strong)
          ? strong
          : ph.duelists.find((id) => !ph.lockedOut.includes(id))!;
        return d({ type: 'BUZZ', playerId: buzzer });
      }
      const q = ph.questions[ph.index];
      return d({
        type: 'ANSWER',
        value: ph.buzzedPlayerId === strong || !ph.duelists.includes(strong) ? q.answer : 'خطأ',
        elapsedMs: 1500,
      });
    }
    case 'r5': {
      if (ph.stage === 'category-pick') return d({ type: 'PICK_CATEGORY', category: 'general' });
      if (ph.stage === 'feedback' || ph.stage === 'done') return d({ type: 'ADVANCE' });
      const answererId =
        ph.stage === 'steal' ? ph.stealerId! : ph.finalists[ph.questionCount % 2];
      return d({
        type: 'ANSWER',
        value: answererId === strong ? ph.question!.answer : 'خطأ متعمد',
        elapsedMs: 2000,
      });
    }
    case 'champion':
      return s;
  }
}

describe('حلقة اللعب الكاملة — 3 لاعبين مع المواجهة والنهائي', () => {
  it('تصل إلى البطل عبر الجولات الخمس مع إقصاء وتتويج', () => {
    const bank = makeBank(80);
    let g = createGame(settings(3));

    g = playUntil(g, bank, (s) => s.phase.kind === 'champion', 'p1');

    // p1 أجاب كل شيء صحيحاً — هو البطل عبر النهائي
    expect(g.finalWinnerId).toBe('p1');
    // لاعب واحد أُقصي في المواجهة
    expect(g.players.filter((p) => p.eliminated)).toHaveLength(1);
    // المُقصى ليس البطل
    expect(g.players.find((p) => p.id === g.finalWinnerId)?.eliminated).toBe(false);
    // النهائي انتهى ببلوغ الهدف
    const p1 = g.players.find((p) => p.id === 'p1')!;
    expect(p1.correctCount).toBeGreaterThan(0);
    expect(g.scoreEvents.some((e) => e.round_id === 'r5' && e.reason === 'correct')).toBe(true);
    // كل أحداث النقاط متسقة
    for (const e of g.scoreEvents) {
      expect(e.new_score - e.old_score).toBe(e.score_delta);
    }
  });
});

describe('لعبة ثنائية — تتجاوز المواجهة إلى النهائي مباشرة', () => {
  it('لا إقصاء مع لاعبَين ويتوّج الأقوى', () => {
    const bank = makeBank(80);
    let g = createGame(settings(2));

    let sawR4 = false;
    g = playUntil(
      g,
      bank,
      (s) => {
        if (s.phase.kind === 'r4') sawR4 = true;
        return s.phase.kind === 'champion';
      },
      'p2',
    );

    expect(sawR4).toBe(false);
    expect(g.players.every((p) => !p.eliminated)).toBe(true);
    expect(g.finalWinnerId).toBe('p2');
  });
});

describe('آلية الخطف في النهائي', () => {
  it('الخطأ يفتح خطفاً بقيمة أقل للخصم', () => {
    const bank = makeBank(80);
    let g = createGame(settings(2));

    // الوصول إلى أول سؤال نهائي
    g = playUntil(g, bank, (s) => s.phase.kind === 'r5' && s.phase.stage === 'question', 'p1');
    expect(g.phase.kind).toBe('r5');
    if (g.phase.kind !== 'r5') return;

    const answerer = g.phase.finalists[0];
    const opponent = g.phase.finalists[1];

    // صاحب السؤال يخطئ
    g = reduce(g, { type: 'ANSWER', value: 'خطأ متعمد', elapsedMs: 1000 }, bank);
    expect(g.phase.kind === 'r5' && g.phase.stage).toBe('steal');
    if (g.phase.kind !== 'r5') return;
    expect(g.phase.stealerId).toBe(opponent);

    // الخصم يخطف
    g = reduce(g, { type: 'ANSWER', value: g.phase.question!.answer, elapsedMs: 1000 }, bank);
    if (g.phase.kind !== 'r5') return;
    expect(g.phase.finalScores[opponent]).toBe(SCORING.r5.steal);
    expect(g.phase.finalScores[answerer]).toBe(0);
    expect(g.scoreEvents.at(-1)?.reason).toBe('steal');
  });
});

describe('تثبيت النقاط في السلسلة الذهبية', () => {
  it('البنك يحفظ الرصيد والخطأ اللاحق لا يمسه', () => {
    const bank = makeBank(80);
    let g = createGame(settings(2));

    g = playUntil(g, bank, (s) => s.phase.kind === 'r3' && s.phase.stage === 'question', 'p_none');
    if (g.phase.kind !== 'r3') throw new Error('لم نصل للسلسلة');
    const playerId = g.phase.playerOrder[0];
    const scoreBefore = g.players.find((p) => p.id === playerId)!.score;

    // إجابة صحيحة (+10 رصيد) ثم تثبيت ثم خطأ
    g = reduce(g, { type: 'ANSWER', value: g.phase.chain[0].answer, elapsedMs: 1000 }, bank);
    g = reduce(g, { type: 'ADVANCE' }, bank);
    g = reduce(g, { type: 'BANK' }, bank);
    if (g.phase.kind !== 'r3') return;
    expect(g.phase.banked).toBe(true);
    expect(g.phase.pot).toBe(0);

    g = reduce(g, { type: 'ANSWER', value: 'خطأ متعمد', elapsedMs: 1000 }, bank);
    const scoreAfter = g.players.find((p) => p.id === playerId)!.score;
    expect(scoreAfter).toBe(scoreBefore + 10); // المثبّت نجا من كسر السلسلة
  });
});
