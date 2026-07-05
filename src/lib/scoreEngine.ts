/**
 * محرك النقاط — دوال نقية. كل تعديل نقاط يمرّ من هنا وينتج ScoreEvent.
 */
import type { Difficulty, GameState, PlayerState, RoundId, ScoreEvent, ScoreReason } from '../types';

export const SCORING = {
  r1: { correct: 10, speedBonus: 5, speedThresholdMs: 3000 },
  r2: { correct: 20, wrongPenalty: -5, answerWindowSeconds: 7 },
  r3: { chainSteps: [10, 20, 30, 40, 50, 60] },
  r4: { questionWin: 10, duelQuestions: 5, answerWindowSeconds: 7 },
  r5: { correct: 30, steal: 15, target: 100, maxQuestions: 24, answerWindowSeconds: 7 },
} as const;

export function chainStepValue(chainIndex: number): number {
  const steps = SCORING.r3.chainSteps;
  return steps[Math.min(chainIndex, steps.length - 1)];
}

export interface ScoreChange {
  playerId: string;
  delta: number;
  reason: ScoreReason;
  questionId: string;
}

/** يطبّق تغيير نقاط على حالة اللعبة ويعيد حالة جديدة مع حدث مسجّل */
export function applyScore(
  state: GameState,
  roundId: RoundId,
  change: ScoreChange,
): GameState {
  const before = state.players.find((p) => p.id === change.playerId);
  if (!before) return state;

  // لا نقاط سالبة — والنقصان المسجَّل في الحدث هو المطبَّق فعلياً
  const newScore = Math.max(0, before.score + change.delta);
  const players = state.players.map((p): PlayerState =>
    p.id === change.playerId ? { ...p, score: newScore } : p,
  );

  const event: ScoreEvent = {
    player_id: change.playerId,
    round_id: roundId,
    question_id: change.questionId,
    old_score: before.score,
    score_delta: newScore - before.score,
    new_score: newScore,
    reason: change.reason,
    timestamp: Date.now(),
  };

  return { ...state, players, scoreEvents: [...state.scoreEvents, event] };
}

/** تحديث إحصاءات لاعب (عدد الصح/الخطأ، السلسلة، أسرع إجابة، الصعوبة المتقنة) */
export function recordAnswerStats(
  state: GameState,
  playerId: string,
  correct: boolean,
  elapsedMs: number | null,
  difficulty?: Difficulty,
): GameState {
  const players = state.players.map((p): PlayerState => {
    if (p.id !== playerId) return p;
    const currentStreak = correct ? p.currentStreak + 1 : 0;
    const correctByDifficulty =
      correct && difficulty
        ? { ...p.correctByDifficulty, [difficulty]: p.correctByDifficulty[difficulty] + 1 }
        : p.correctByDifficulty;
    return {
      ...p,
      correctCount: p.correctCount + (correct ? 1 : 0),
      wrongCount: p.wrongCount + (correct ? 0 : 1),
      correctByDifficulty,
      currentStreak,
      bestStreak: Math.max(p.bestStreak, currentStreak),
      fastestAnswerMs:
        correct && elapsedMs !== null
          ? p.fastestAnswerMs === null
            ? elapsedMs
            : Math.min(p.fastestAnswerMs, elapsedMs)
          : p.fastestAnswerMs,
    };
  });
  return { ...state, players };
}

/** أعلى مستوى صعوبة أتقنه اللاعب (إجابة صحيحة واحدة على الأقل) */
export function masteredDifficulty(p: PlayerState): Difficulty | null {
  const order: Difficulty[] = ['expert', 'hard', 'medium', 'easy'];
  for (const d of order) if (p.correctByDifficulty[d] > 0) return d;
  return null;
}

/** ترتيب اللاعبين: النقاط ثم أفضل سلسلة ثم أسرع إجابة */
export function rankPlayers(players: PlayerState[]): PlayerState[] {
  return [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
    const fa = a.fastestAnswerMs ?? Infinity;
    const fb = b.fastestAnswerMs ?? Infinity;
    return fa - fb;
  });
}

/** اللاعبون غير المُقصَين مرتبين تصاعدياً (الأدنى أولاً) — لاختيار المتواجهين */
export function alivePlayersAscending(players: PlayerState[]): PlayerState[] {
  return rankPlayers(players.filter((p) => !p.eliminated)).reverse();
}
