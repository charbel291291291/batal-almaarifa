/**
 * محرك اللعبة — آلة حالات نقية (reducer) منفصلة تماماً عن الواجهة.
 * خمس جولات كاملة: الانطلاقة، من يسبق؟، السلسلة الذهبية، المواجهة، النهائي.
 * كل جولة قابلة للضبط من GameSettings، وكل تغيير نقاط يسجَّل كحدث.
 */
import type {
  AnswerResult,
  CategoryId,
  GameAction,
  GameSettings,
  GameState,
  HostTone,
  Phase,
  PlayerState,
  Question,
} from '../types';
import { ALL_CATEGORIES } from '../types';
import { isAnswerCorrect } from '../lib/answerNormalizer';
import { pickQuestions, shuffle } from '../lib/questionPicker';
import {
  alivePlayersAscending,
  applyScore,
  chainStepValue,
  rankPlayers,
  recordAnswerStats,
  SCORING,
} from '../lib/scoreEngine';

const BUZZ_KEYS = ['1', '2', '3', '4', '5', '6'];

/* ---------- تعليقات المقدّم حسب النبرة ---------- */

const HOST_LINES: Record<HostTone, Record<'correct' | 'wrong' | 'timeout' | 'nobody', string[]>> = {
  fusha: {
    correct: [
      'إجابة صحيحة! 👏',
      'أحسنت! إجابة موفقة',
      'ممتاز! معلومة في مكانها',
      'رائع! استمر على هذا المستوى',
    ],
    wrong: ['إجابة خاطئة!', 'للأسف، ليست الإجابة الصحيحة', 'قريبة... ولكن غير صحيحة'],
    timeout: ['انتهى الوقت! ⏱️', 'الوقت أسرع منك هذه المرة ⏱️'],
    nobody: ['لم يجب أحد! السؤال سقط 🕊️', 'الجرس بقي صامتاً... ننتقل'],
  },
  lebanese: {
    correct: [
      'إجابة صحيحة! 👏',
      'عاش يا بطل! 💪',
      'هيدي هي بالزبط 😎',
      'ولا أروع! 🔥',
      'ممتاز! السرعة والدقة معاً',
    ],
    wrong: ['إجابة خاطئة!', 'أوووه! قريبة بس مش هي', 'ولا يهمك، الجاي أحلى', 'معلش، بتعوّضها'],
    timeout: ['انتهى الوقت! ⏱️', 'الوقت خانك هالمرة ⏱️'],
    nobody: ['ما حدا جاوب! السؤال طار 🕊️', 'الجرس بقي صامتاً... ننتقل'],
  },
};

function pickLine(tone: HostTone, kind: 'correct' | 'wrong' | 'timeout' | 'nobody'): string {
  const lines = HOST_LINES[tone][kind];
  return lines[Math.floor(Math.random() * lines.length)];
}

export function createGame(settings: GameSettings): GameState {
  const players: PlayerState[] = settings.players.map((p, i) => ({
    id: `p${i + 1}`,
    name: p.name.trim() || `لاعب ${i + 1}`,
    avatar: p.avatar,
    buzzKey: BUZZ_KEYS[i],
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    correctByDifficulty: { easy: 0, medium: 0, hard: 0, expert: 0 },
    bestStreak: 0,
    currentStreak: 0,
    fastestAnswerMs: null,
    eliminated: false,
  }));

  return {
    settings,
    players,
    phase: { kind: 'intro', round: 'r1' },
    scoreEvents: [],
    usedQuestionIds: [],
    finalWinnerId: null,
    startedAt: Date.now(),
  };
}

/* ---------- بناء الجولات ---------- */

function markUsed(state: GameState, questions: Question[]): GameState {
  return { ...state, usedQuestionIds: [...state.usedQuestionIds, ...questions.map((q) => q.id)] };
}

function startRound1(state: GameState, bank: Question[]): GameState {
  const count = state.players.length * state.settings.r1QuestionsPerPlayer;
  const questions = pickQuestions(bank, {
    categories: state.settings.categories,
    difficulties: state.settings.difficulties,
    count,
    excludeIds: state.usedQuestionIds,
    requireDistractors: state.settings.answerMode === 'options',
  });
  const queue = questions.map((question, k) => ({
    playerId: state.players[k % state.players.length].id,
    question,
  }));
  const phase: Phase = { kind: 'r1', stage: 'question', queue, index: 0, lastResult: null };
  return { ...markUsed(state, questions), phase };
}

function startRound2(state: GameState, bank: Question[]): GameState {
  const questions = pickQuestions(bank, {
    categories: state.settings.categories,
    difficulties: state.settings.difficulties,
    count: state.settings.r2Questions,
    excludeIds: state.usedQuestionIds,
    requireDistractors: true,
    excludeTypes: ['clues'],
  });
  const phase: Phase = {
    kind: 'r2',
    stage: 'reveal',
    questions,
    index: 0,
    wordsRevealed: 1,
    lockedOut: [],
    buzzedPlayerId: null,
    lastResult: null,
  };
  return { ...markUsed(state, questions), phase };
}

function startRound3(state: GameState, bank: Question[]): GameState {
  // الأدنى نقاطاً يبدأ أولاً — فرصة للعودة ودراما أكثر
  const order = alivePlayersAscending(state.players).map((p) => p.id);
  return startRound3Turn(state, bank, order, 0);
}

function startRound3Turn(
  state: GameState,
  bank: Question[],
  playerOrder: string[],
  turnIndex: number,
): GameState {
  const chain = pickQuestions(bank, {
    categories: state.settings.categories,
    difficulties: state.settings.difficulties,
    count: state.settings.r3ChainLength,
    excludeIds: state.usedQuestionIds,
    requireDistractors: state.settings.answerMode === 'options',
  });
  const phase: Phase = {
    kind: 'r3',
    stage: 'turn-intro',
    playerOrder,
    turnIndex,
    chain,
    chainIndex: 0,
    pot: 0,
    banked: false,
    lastResult: null,
    turnSummary: null,
  };
  return { ...markUsed(state, chain), phase };
}

function startRound4(state: GameState, bank: Question[]): GameState {
  const ascending = alivePlayersAscending(state.players);
  const duelists: [string, string] = [ascending[0].id, ascending[1].id];
  // 5 أسئلة أساسية + احتياط للموت المفاجئ
  const questions = pickQuestions(bank, {
    categories: state.settings.categories,
    difficulties: state.settings.difficulties,
    count: SCORING.r4.duelQuestions + 4,
    excludeIds: state.usedQuestionIds,
    requireDistractors: true,
    excludeTypes: ['clues'],
  });
  const phase: Phase = {
    kind: 'r4',
    stage: 'duel-intro',
    duelists,
    questions,
    index: 0,
    wins: { [duelists[0]]: 0, [duelists[1]]: 0 },
    lockedOut: [],
    buzzedPlayerId: null,
    suddenDeath: false,
    lastResult: null,
    duelSummary: null,
    eliminatedId: null,
  };
  return { ...markUsed(state, questions), phase };
}

function startRound5(state: GameState): GameState {
  const topTwo = rankPlayers(state.players.filter((p) => !p.eliminated)).slice(0, 2);
  const finalists: [string, string] = [topTwo[0].id, topTwo[1].id];

  // 3 فئات معروضة للاختيار — من فئات اللعبة، وتُكمَّل من الكل عند الحاجة
  let offered = shuffle(state.settings.categories).slice(0, 3);
  if (offered.length < 3) {
    const pad = shuffle(ALL_CATEGORIES.filter((c) => !offered.includes(c)));
    offered = [...offered, ...pad].slice(0, 3);
  }

  const phase: Phase = {
    kind: 'r5',
    stage: 'category-pick',
    finalists,
    offered,
    pickTurn: 0,
    picks: { [finalists[0]]: {}, [finalists[1]]: {} },
    finalScores: { [finalists[0]]: 0, [finalists[1]]: 0 },
    questionCount: 0,
    question: null,
    stealerId: null,
    lastResult: null,
    doneSummary: null,
  };
  return { ...state, phase };
}

/* ---------- المُخفّض الرئيسي ---------- */

export function reduce(state: GameState, action: GameAction, bank: Question[]): GameState {
  const { phase } = state;

  switch (phase.kind) {
    case 'intro':
      if (action.type !== 'ADVANCE') return state;
      if (phase.round === 'r1') return startRound1(state, bank);
      if (phase.round === 'r2') return startRound2(state, bank);
      if (phase.round === 'r3') return startRound3(state, bank);
      if (phase.round === 'r4') return startRound4(state, bank);
      return startRound5(state);

    case 'r1':
      return reduceR1(state, phase, action);

    case 'r2':
      return reduceR2(state, phase, action);

    case 'r3':
      return reduceR3(state, phase, action, bank);

    case 'r4':
      return reduceR4(state, phase, action, bank);

    case 'r5':
      return reduceR5(state, phase, action, bank);

    case 'results': {
      if (action.type !== 'ADVANCE') return state;
      const alive = state.players.filter((p) => !p.eliminated).length;
      if (phase.roundJustEnded === 'r1') return { ...state, phase: { kind: 'intro', round: 'r2' } };
      if (phase.roundJustEnded === 'r2') return { ...state, phase: { kind: 'intro', round: 'r3' } };
      if (phase.roundJustEnded === 'r3')
        return { ...state, phase: { kind: 'intro', round: alive > 2 ? 'r4' : 'r5' } };
      if (phase.roundJustEnded === 'r4') return { ...state, phase: { kind: 'intro', round: 'r5' } };
      return { ...state, phase: { kind: 'champion' } };
    }

    case 'champion':
      return state;
  }
}

/* ---------- الجولة 1: الانطلاقة ---------- */

function reduceR1(
  state: GameState,
  phase: Extract<Phase, { kind: 'r1' }>,
  action: GameAction,
): GameState {
  const tone = state.settings.tone;

  if (phase.stage === 'question') {
    const item = phase.queue[phase.index];
    if (!item) return { ...state, phase: { kind: 'results', roundJustEnded: 'r1' } };

    if (action.type === 'ANSWER' || action.type === 'TIMEOUT') {
      const timedOut = action.type === 'TIMEOUT';
      const correct =
        !timedOut && isAnswerCorrect(action.value, item.question.answer, item.question.accepted_answers);
      const fast = !timedOut && correct && action.elapsedMs <= SCORING.r1.speedThresholdMs;
      const delta = correct ? SCORING.r1.correct + (fast ? SCORING.r1.speedBonus : 0) : 0;

      let next = recordAnswerStats(
        state,
        item.playerId,
        correct,
        timedOut ? null : action.elapsedMs,
        item.question.difficulty,
      );
      if (correct) {
        next = applyScore(next, 'r1', {
          playerId: item.playerId,
          delta: SCORING.r1.correct,
          reason: 'correct',
          questionId: item.question.id,
        });
        if (fast) {
          next = applyScore(next, 'r1', {
            playerId: item.playerId,
            delta: SCORING.r1.speedBonus,
            reason: 'speed_bonus',
            questionId: item.question.id,
          });
        }
      }

      const result: AnswerResult = {
        playerId: item.playerId,
        correct,
        timedOut,
        correctAnswer: item.question.answer,
        delta,
        explanation: item.question.explanation,
        hostLine: timedOut
          ? pickLine(tone, 'timeout')
          : correct
            ? fast
              ? `${pickLine(tone, 'correct')} ⚡ +5 سرعة`
              : pickLine(tone, 'correct')
            : pickLine(tone, 'wrong'),
      };
      return { ...next, phase: { ...phase, stage: 'feedback', lastResult: result } };
    }
    return state;
  }

  // feedback
  if (action.type === 'ADVANCE') {
    const nextIndex = phase.index + 1;
    if (nextIndex >= phase.queue.length) {
      return { ...state, phase: { kind: 'results', roundJustEnded: 'r1' } };
    }
    return { ...state, phase: { ...phase, stage: 'question', index: nextIndex, lastResult: null } };
  }
  return state;
}

/* ---------- الجولة 2: من يسبق؟ ---------- */

function r2NextQuestion(
  state: GameState,
  phase: Extract<Phase, { kind: 'r2' }>,
  result: AnswerResult,
): GameState {
  return { ...state, phase: { ...phase, stage: 'feedback', lastResult: result } };
}

function reduceR2(
  state: GameState,
  phase: Extract<Phase, { kind: 'r2' }>,
  action: GameAction,
): GameState {
  const tone = state.settings.tone;
  const question = phase.questions[phase.index];
  if (!question) return { ...state, phase: { kind: 'results', roundJustEnded: 'r2' } };
  const wordCount = question.question_text.split(/\s+/).length;

  if (phase.stage === 'reveal') {
    if (action.type === 'REVEAL_WORD') {
      return {
        ...state,
        phase: { ...phase, wordsRevealed: Math.min(phase.wordsRevealed + 1, wordCount) },
      };
    }
    if (action.type === 'BUZZ') {
      const player = state.players.find((candidate) => candidate.id === action.playerId);
      if (!player || player.eliminated || phase.lockedOut.includes(action.playerId)) return state;
      return { ...state, phase: { ...phase, stage: 'answering', buzzedPlayerId: action.playerId } };
    }
    if (action.type === 'TIMEOUT') {
      // لم يضغط أحد الجرس بعد اكتمال السؤال
      const result: AnswerResult = {
        playerId: null,
        correct: false,
        timedOut: true,
        correctAnswer: question.answer,
        delta: 0,
        explanation: question.explanation,
        hostLine: pickLine(tone, 'nobody'),
      };
      return r2NextQuestion(state, phase, result);
    }
    return state;
  }

  if (phase.stage === 'answering') {
    const playerId = phase.buzzedPlayerId;
    if (!playerId) return state;

    if (action.type === 'ANSWER' || action.type === 'TIMEOUT') {
      const timedOut = action.type === 'TIMEOUT';
      const correct =
        !timedOut && isAnswerCorrect(action.value, question.answer, question.accepted_answers);

      let next = recordAnswerStats(
        state,
        playerId,
        correct,
        timedOut ? null : action.elapsedMs,
        question.difficulty,
      );

      if (correct) {
        next = applyScore(next, 'r2', {
          playerId,
          delta: SCORING.r2.correct,
          reason: 'correct',
          questionId: question.id,
        });
        const result: AnswerResult = {
          playerId,
          correct: true,
          timedOut: false,
          correctAnswer: question.answer,
          delta: SCORING.r2.correct,
          explanation: question.explanation,
          hostLine: pickLine(tone, 'correct'),
        };
        return r2NextQuestion(next, phase, result);
      }

      // خطأ أو انتهى الوقت: -5، يُقفل جرسه، ويستمر السؤال للبقية
      next = applyScore(next, 'r2', {
        playerId,
        delta: SCORING.r2.wrongPenalty,
        reason: 'wrong_penalty',
        questionId: question.id,
      });
      const lockedOut = [...phase.lockedOut, playerId];

      if (lockedOut.length >= state.players.length) {
        const result: AnswerResult = {
          playerId,
          correct: false,
          timedOut,
          correctAnswer: question.answer,
          delta: SCORING.r2.wrongPenalty,
          explanation: question.explanation,
          hostLine: 'الكل جرّب... والإجابة كانت أمامكم!',
        };
        return r2NextQuestion(next, { ...phase, lockedOut }, result);
      }

      return {
        ...next,
        phase: { ...phase, stage: 'reveal', lockedOut, buzzedPlayerId: null },
      };
    }
    return state;
  }

  // feedback
  if (action.type === 'ADVANCE') {
    const nextIndex = phase.index + 1;
    if (nextIndex >= phase.questions.length) {
      return { ...state, phase: { kind: 'results', roundJustEnded: 'r2' } };
    }
    return {
      ...state,
      phase: {
        ...phase,
        stage: 'reveal',
        index: nextIndex,
        wordsRevealed: 1,
        lockedOut: [],
        buzzedPlayerId: null,
        lastResult: null,
      },
    };
  }
  return state;
}

/* ---------- الجولة 3: السلسلة الذهبية ---------- */

function endTurn(
  state: GameState,
  phase: Extract<Phase, { kind: 'r3' }>,
  summary: string,
  lastResult: AnswerResult | null,
): GameState {
  return {
    ...state,
    phase: { ...phase, stage: 'turn-end', turnSummary: summary, lastResult },
  };
}

function reduceR3(
  state: GameState,
  phase: Extract<Phase, { kind: 'r3' }>,
  action: GameAction,
  bank: Question[],
): GameState {
  const tone = state.settings.tone;
  const playerId = phase.playerOrder[phase.turnIndex];
  const player = state.players.find((p) => p.id === playerId);

  if (phase.stage === 'turn-intro') {
    if (action.type === 'ADVANCE') return { ...state, phase: { ...phase, stage: 'question' } };
    return state;
  }

  if (phase.stage === 'question') {
    const question = phase.chain[phase.chainIndex];
    if (!question || !player) return { ...state, phase: { kind: 'results', roundJustEnded: 'r3' } };

    if (action.type === 'BANK') {
      if (phase.banked || phase.pot <= 0) return state;
      const next = applyScore(state, 'r3', {
        playerId,
        delta: phase.pot,
        reason: 'chain_banked',
        questionId: question.id,
      });
      return { ...next, phase: { ...phase, banked: true, pot: 0 } };
    }

    if (action.type === 'ANSWER' || action.type === 'TIMEOUT') {
      const timedOut = action.type === 'TIMEOUT';
      const correct =
        !timedOut && isAnswerCorrect(action.value, question.answer, question.accepted_answers);

      let next = recordAnswerStats(
        state,
        playerId,
        correct,
        timedOut ? null : action.elapsedMs,
        question.difficulty,
      );

      if (!correct) {
        // انكسرت السلسلة — يخسر الرصيد غير المثبّت
        const lost = phase.pot;
        const result: AnswerResult = {
          playerId,
          correct: false,
          timedOut,
          correctAnswer: question.answer,
          delta: 0,
          explanation: question.explanation,
          hostLine: timedOut ? pickLine(tone, 'timeout') : pickLine(tone, 'wrong'),
        };
        const summary =
          lost > 0
            ? `انكسرت السلسلة! خسر ${player.name} ${lost} نقطة غير مثبّتة 💔`
            : `انكسرت السلسلة عند ${player.name}!`;
        return endTurn(next, { ...phase, pot: 0 }, summary, result);
      }

      const gained = chainStepValue(phase.chainIndex);
      const pot = phase.pot + gained;
      const isLast = phase.chainIndex + 1 >= phase.chain.length;

      if (isLast) {
        next = applyScore(next, 'r3', {
          playerId,
          delta: pot,
          reason: 'chain_completed',
          questionId: question.id,
        });
        const result: AnswerResult = {
          playerId,
          correct: true,
          timedOut: false,
          correctAnswer: question.answer,
          delta: pot,
          explanation: question.explanation,
          hostLine: 'السلسلة اكتملت! 🏆',
        };
        return endTurn(
          next,
          { ...phase, pot: 0 },
          `سلسلة كاملة! ${player.name} حصد ${pot} نقطة دفعة واحدة 🌟`,
          result,
        );
      }

      const result: AnswerResult = {
        playerId,
        correct: true,
        timedOut: false,
        correctAnswer: question.answer,
        delta: gained,
        explanation: question.explanation,
        hostLine: `السلسلة مستمرة! 🔗 +${gained} في الرصيد`,
      };
      return { ...next, phase: { ...phase, stage: 'feedback', pot, lastResult: result } };
    }
    return state;
  }

  if (phase.stage === 'feedback') {
    if (action.type === 'ADVANCE') {
      return {
        ...state,
        phase: { ...phase, stage: 'question', chainIndex: phase.chainIndex + 1, lastResult: null },
      };
    }
    return state;
  }

  // turn-end
  if (action.type === 'ADVANCE') {
    const nextTurn = phase.turnIndex + 1;
    if (nextTurn >= phase.playerOrder.length) {
      return { ...state, phase: { kind: 'results', roundJustEnded: 'r3' } };
    }
    return startRound3Turn(state, bank, phase.playerOrder, nextTurn);
  }
  return state;
}

/* ---------- الجولة 4: المواجهة ---------- */

type R4Phase = Extract<Phase, { kind: 'r4' }>;

/** حسم المبارزة: يحدد الخاسر ويقصيه ويجهّز ملخص المواجهة */
function endDuel(state: GameState, phase: R4Phase, forced: boolean): GameState {
  const [a, b] = phase.duelists;
  const wa = phase.wins[a];
  const wb = phase.wins[b];
  const pa = state.players.find((p) => p.id === a)!;
  const pb = state.players.find((p) => p.id === b)!;

  let loserId: string;
  if (wa !== wb) {
    loserId = wa > wb ? b : a;
  } else {
    // نفدت الأسئلة والتعادل قائم — يُحسم بالنقاط الإجمالية ثم أفضل سلسلة
    const ranked = rankPlayers([pa, pb]);
    loserId = ranked[1].id;
  }
  const winner = loserId === a ? pb : pa;
  const loser = loserId === a ? pa : pb;

  const players = state.players.map((p) =>
    p.id === loserId ? { ...p, eliminated: true } : p,
  );

  const summary = forced
    ? `تعادل حتى النهاية! ${winner.name} ينجو بفارق الترتيب... و${loser.name} يغادر المنافسة`
    : `${winner.name} يحسم المواجهة ${Math.max(wa, wb)} - ${Math.min(wa, wb)}! ${loser.name} يغادر المنافسة`;

  return {
    ...state,
    players,
    phase: { ...phase, stage: 'duel-end', duelSummary: summary, eliminatedId: loserId },
  };
}

function reduceR4(
  state: GameState,
  phase: R4Phase,
  action: GameAction,
  bank: Question[],
): GameState {
  const tone = state.settings.tone;
  const question = phase.questions[phase.index];

  if (phase.stage === 'duel-intro') {
    if (action.type === 'ADVANCE') return { ...state, phase: { ...phase, stage: 'buzz' } };
    return state;
  }

  if (phase.stage === 'buzz') {
    if (!question) return endDuel(state, phase, true);

    if (action.type === 'BUZZ') {
      if (!phase.duelists.includes(action.playerId) || phase.lockedOut.includes(action.playerId))
        return state;
      return { ...state, phase: { ...phase, stage: 'answering', buzzedPlayerId: action.playerId } };
    }
    if (action.type === 'TIMEOUT') {
      const result: AnswerResult = {
        playerId: null,
        correct: false,
        timedOut: true,
        correctAnswer: question.answer,
        delta: 0,
        explanation: question.explanation,
        hostLine: pickLine(tone, 'nobody'),
      };
      return { ...state, phase: { ...phase, stage: 'feedback', lastResult: result } };
    }
    return state;
  }

  if (phase.stage === 'answering') {
    const playerId = phase.buzzedPlayerId;
    if (!playerId || !question) return state;

    if (action.type === 'ANSWER' || action.type === 'TIMEOUT') {
      const timedOut = action.type === 'TIMEOUT';
      const correct =
        !timedOut && isAnswerCorrect(action.value, question.answer, question.accepted_answers);

      let next = recordAnswerStats(
        state,
        playerId,
        correct,
        timedOut ? null : action.elapsedMs,
        question.difficulty,
      );

      if (correct) {
        next = applyScore(next, 'r4', {
          playerId,
          delta: SCORING.r4.questionWin,
          reason: 'duel_win',
          questionId: question.id,
        });
        const result: AnswerResult = {
          playerId,
          correct: true,
          timedOut: false,
          correctAnswer: question.answer,
          delta: SCORING.r4.questionWin,
          explanation: question.explanation,
          hostLine: `${pickLine(tone, 'correct')} — نقطة المواجهة!`,
        };
        return {
          ...next,
          phase: {
            ...phase,
            stage: 'feedback',
            wins: { ...phase.wins, [playerId]: phase.wins[playerId] + 1 },
            lastResult: result,
          },
        };
      }

      // خطأ: يُقفل، والفرصة تنتقل للخصم
      const lockedOut = [...phase.lockedOut, playerId];
      if (lockedOut.length >= 2) {
        const result: AnswerResult = {
          playerId,
          correct: false,
          timedOut,
          correctAnswer: question.answer,
          delta: 0,
          explanation: question.explanation,
          hostLine: 'كلاكما أخطأ... لا نقطة في هذا السؤال!',
        };
        return { ...next, phase: { ...phase, stage: 'feedback', lockedOut, lastResult: result } };
      }
      return {
        ...next,
        phase: { ...phase, stage: 'buzz', lockedOut, buzzedPlayerId: null },
      };
    }
    return state;
  }

  if (phase.stage === 'feedback') {
    if (action.type !== 'ADVANCE') return state;

    const [a, b] = phase.duelists;
    const wa = phase.wins[a];
    const wb = phase.wins[b];
    const asked = phase.index + 1;
    const base = SCORING.r4.duelQuestions;
    const remaining = Math.max(0, base - asked);

    // حسم مبكر: الفارق أكبر من الأسئلة المتبقية
    const decidedEarly = !phase.suddenDeath && Math.abs(wa - wb) > remaining;
    const baseDone = asked >= base;

    if (decidedEarly || (baseDone && wa !== wb)) return endDuel(state, phase, false);

    const suddenDeath = phase.suddenDeath || (baseDone && wa === wb);
    if (asked >= phase.questions.length) return endDuel(state, phase, true);

    return {
      ...state,
      phase: {
        ...phase,
        stage: 'buzz',
        index: phase.index + 1,
        lockedOut: [],
        buzzedPlayerId: null,
        suddenDeath,
        lastResult: null,
      },
    };
  }

  // duel-end
  if (action.type === 'ADVANCE') {
    const alive = state.players.filter((p) => !p.eliminated).length;
    if (alive > 2) return startRound4(state, bank);
    return { ...state, phase: { kind: 'results', roundJustEnded: 'r4' } };
  }
  return state;
}

/* ---------- الجولة 5: النهائي ---------- */

type R5Phase = Extract<Phase, { kind: 'r5' }>;

function r5Opponent(phase: R5Phase, playerId: string): string {
  return phase.finalists[0] === playerId ? phase.finalists[1] : phase.finalists[0];
}

/** فئتا اللاعب في النهائي: قوته + الفئة الصعبة التي اختارها له خصمه */
function r5CategoriesFor(phase: R5Phase, playerId: string): CategoryId[] {
  const own = phase.picks[playerId]?.self;
  const assigned = phase.picks[r5Opponent(phase, playerId)]?.forOpponent;
  const cats = [own, assigned].filter((c): c is CategoryId => Boolean(c));
  return cats.length > 0 ? cats : phase.offered;
}

function drawR5Question(
  state: GameState,
  phase: R5Phase,
  playerId: string,
  bank: Question[],
): [GameState, Question | null] {
  const picked = pickQuestions(bank, {
    categories: r5CategoriesFor(phase, playerId),
    difficulties: ['hard', 'expert'],
    count: 1,
    excludeIds: state.usedQuestionIds,
    requireDistractors: true,
    excludeTypes: ['clues'],
  });
  const q = picked[0] ?? null;
  return [q ? markUsed(state, [q]) : state, q];
}

/** حسم النهائي وإعلان بطل المعرفة */
function endFinal(state: GameState, phase: R5Phase, winnerId: string, byTarget: boolean): GameState {
  const winner = state.players.find((p) => p.id === winnerId)!;
  const summary = byTarget
    ? `${winner.name} يبلغ ${SCORING.r5.target} نقطة نهائية... لدينا بطل جديد! 👑`
    : `انتهت أسئلة النهائي — ${winner.name} يتقدم بالنقاط النهائية ويتوّج بطلاً! 👑`;
  return {
    ...state,
    finalWinnerId: winnerId,
    phase: { ...phase, stage: 'done', doneSummary: summary },
  };
}

function reduceR5(
  state: GameState,
  phase: R5Phase,
  action: GameAction,
  bank: Question[],
): GameState {
  const tone = state.settings.tone;
  const currentPlayerId = phase.finalists[phase.questionCount % 2];

  if (phase.stage === 'category-pick') {
    if (action.type !== 'PICK_CATEGORY') return state;
    const pickerId = phase.pickTurn < 2 ? phase.finalists[0] : phase.finalists[1];
    const slot: 'self' | 'forOpponent' = phase.pickTurn % 2 === 0 ? 'self' : 'forOpponent';
    const picks = {
      ...phase.picks,
      [pickerId]: { ...phase.picks[pickerId], [slot]: action.category },
    };

    if (phase.pickTurn < 3) {
      return { ...state, phase: { ...phase, picks, pickTurn: phase.pickTurn + 1 } };
    }
    // اكتمل الاختيار — أول سؤال للمتصدر
    const readyPhase: R5Phase = { ...phase, picks, pickTurn: 4 };
    const [next, q] = drawR5Question(state, readyPhase, phase.finalists[0], bank);
    if (!q) return endFinal(next, readyPhase, phase.finalists[0], false);
    return { ...next, phase: { ...readyPhase, stage: 'question', question: q } };
  }

  if (phase.stage === 'question') {
    const question = phase.question;
    if (!question) return endFinal(state, phase, currentPlayerId, false);

    if (action.type === 'ANSWER' || action.type === 'TIMEOUT') {
      const timedOut = action.type === 'TIMEOUT';
      const correct =
        !timedOut && isAnswerCorrect(action.value, question.answer, question.accepted_answers);

      let next = recordAnswerStats(
        state,
        currentPlayerId,
        correct,
        timedOut ? null : action.elapsedMs,
        question.difficulty,
      );

      if (correct) {
        next = applyScore(next, 'r5', {
          playerId: currentPlayerId,
          delta: SCORING.r5.correct,
          reason: 'correct',
          questionId: question.id,
        });
        const finalScores = {
          ...phase.finalScores,
          [currentPlayerId]: phase.finalScores[currentPlayerId] + SCORING.r5.correct,
        };
        const updatedPhase: R5Phase = { ...phase, finalScores };
        if (finalScores[currentPlayerId] >= SCORING.r5.target) {
          return endFinal(next, updatedPhase, currentPlayerId, true);
        }
        const result: AnswerResult = {
          playerId: currentPlayerId,
          correct: true,
          timedOut: false,
          correctAnswer: question.answer,
          delta: SCORING.r5.correct,
          explanation: question.explanation,
          hostLine: `${pickLine(tone, 'correct')} +${SCORING.r5.correct} نهائية`,
        };
        return { ...next, phase: { ...updatedPhase, stage: 'feedback', lastResult: result } };
      }

      // خطأ — الفرصة تنتقل للخصم (خطف)
      return {
        ...next,
        phase: { ...phase, stage: 'steal', stealerId: r5Opponent(phase, currentPlayerId) },
      };
    }
    return state;
  }

  if (phase.stage === 'steal') {
    const question = phase.question;
    const stealerId = phase.stealerId;
    if (!question || !stealerId) return state;

    if (action.type === 'ANSWER' || action.type === 'TIMEOUT') {
      const timedOut = action.type === 'TIMEOUT';
      const correct =
        !timedOut && isAnswerCorrect(action.value, question.answer, question.accepted_answers);

      let next = recordAnswerStats(
        state,
        stealerId,
        correct,
        timedOut ? null : action.elapsedMs,
        question.difficulty,
      );

      if (correct) {
        next = applyScore(next, 'r5', {
          playerId: stealerId,
          delta: SCORING.r5.steal,
          reason: 'steal',
          questionId: question.id,
        });
        const finalScores = {
          ...phase.finalScores,
          [stealerId]: phase.finalScores[stealerId] + SCORING.r5.steal,
        };
        const updatedPhase: R5Phase = { ...phase, finalScores };
        if (finalScores[stealerId] >= SCORING.r5.target) {
          return endFinal(next, updatedPhase, stealerId, true);
        }
        const result: AnswerResult = {
          playerId: stealerId,
          correct: true,
          timedOut: false,
          correctAnswer: question.answer,
          delta: SCORING.r5.steal,
          explanation: question.explanation,
          hostLine: `خطف ناجح! 🔄 +${SCORING.r5.steal} نهائية`,
        };
        return { ...next, phase: { ...updatedPhase, stage: 'feedback', lastResult: result } };
      }

      const result: AnswerResult = {
        playerId: stealerId,
        correct: false,
        timedOut,
        correctAnswer: question.answer,
        delta: 0,
        explanation: question.explanation,
        hostLine: 'كلاكما أخطأ... السؤال التالي!',
      };
      return { ...next, phase: { ...phase, stage: 'feedback', lastResult: result } };
    }
    return state;
  }

  if (phase.stage === 'feedback') {
    if (action.type !== 'ADVANCE') return state;

    const nextCount = phase.questionCount + 1;
    if (nextCount >= SCORING.r5.maxQuestions) {
      // حد الأمان — الأعلى نقاطاً نهائية يفوز، والتعادل يُحسم بالمجموع ثم السلسلة
      const [a, b] = phase.finalists;
      const fa = phase.finalScores[a];
      const fb = phase.finalScores[b];
      const winnerId =
        fa !== fb
          ? fa > fb
            ? a
            : b
          : rankPlayers(state.players.filter((p) => phase.finalists.includes(p.id)))[0].id;
      return endFinal(state, phase, winnerId, false);
    }

    const nextPlayerId = phase.finalists[nextCount % 2];
    const nextPhase: R5Phase = {
      ...phase,
      questionCount: nextCount,
      stealerId: null,
      lastResult: null,
    };
    const [next, q] = drawR5Question(state, nextPhase, nextPlayerId, bank);
    if (!q) {
      const [a, b] = phase.finalists;
      const winnerId = phase.finalScores[a] >= phase.finalScores[b] ? a : b;
      return endFinal(next, nextPhase, winnerId, false);
    }
    return { ...next, phase: { ...nextPhase, stage: 'question', question: q } };
  }

  // done
  if (action.type === 'ADVANCE') {
    return { ...state, phase: { kind: 'results', roundJustEnded: 'r5' } };
  }
  return state;
}
