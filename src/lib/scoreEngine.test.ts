import { describe, expect, it } from 'vitest';
import type { GameSettings } from '../types';
import { createGame } from '../engine/gameEngine';
import {
  alivePlayersAscending,
  applyScore,
  chainStepValue,
  masteredDifficulty,
  rankPlayers,
  recordAnswerStats,
} from './scoreEngine';

export const TEST_SETTINGS: GameSettings = {
  players: [
    { name: 'أ', avatar: '🦁' },
    { name: 'ب', avatar: '🦅' },
    { name: 'ج', avatar: '🐬' },
  ],
  categories: ['general'],
  difficulties: ['easy'],
  r1QuestionsPerPlayer: 2,
  r2Questions: 2,
  r3ChainLength: 3,
  timerSpeed: 1,
  answerMode: 'auto',
  tone: 'fusha',
  includeCustom: false,
  soundOn: false,
};

describe('chainStepValue', () => {
  it('يتدرج 10 20 30 40 ويثبت عند آخر درجة', () => {
    expect(chainStepValue(0)).toBe(10);
    expect(chainStepValue(3)).toBe(40);
    expect(chainStepValue(99)).toBe(60);
  });
});

describe('applyScore', () => {
  it('يسجل حدثاً متسق الدلتا مع أرضية الصفر', () => {
    const g = createGame(TEST_SETTINGS);
    const after = applyScore(g, 'r2', {
      playerId: 'p1',
      delta: -5,
      reason: 'wrong_penalty',
      questionId: 'q1',
    });
    const ev = after.scoreEvents[0];
    expect(after.players[0].score).toBe(0);
    expect(ev.score_delta).toBe(0); // الدلتا المسجلة = المطبقة فعلياً
    expect(ev.new_score - ev.old_score).toBe(ev.score_delta);
  });

  it('يجمع النقاط ويوثق القيم القديمة والجديدة', () => {
    let g = createGame(TEST_SETTINGS);
    g = applyScore(g, 'r1', { playerId: 'p2', delta: 15, reason: 'correct', questionId: 'q1' });
    g = applyScore(g, 'r1', { playerId: 'p2', delta: 10, reason: 'correct', questionId: 'q2' });
    expect(g.players[1].score).toBe(25);
    expect(g.scoreEvents[1].old_score).toBe(15);
    expect(g.scoreEvents[1].new_score).toBe(25);
  });
});

describe('recordAnswerStats', () => {
  it('يتتبع السلسلة وأسرع إجابة والصعوبة المتقنة', () => {
    let g = createGame(TEST_SETTINGS);
    g = recordAnswerStats(g, 'p1', true, 2500, 'hard');
    g = recordAnswerStats(g, 'p1', true, 1200, 'easy');
    g = recordAnswerStats(g, 'p1', false, null, 'medium');
    g = recordAnswerStats(g, 'p1', true, 3000, 'expert');

    const p = g.players[0];
    expect(p.correctCount).toBe(3);
    expect(p.wrongCount).toBe(1);
    expect(p.bestStreak).toBe(2);
    expect(p.currentStreak).toBe(1);
    expect(p.fastestAnswerMs).toBe(1200);
    expect(masteredDifficulty(p)).toBe('expert');
  });
});

describe('rankPlayers / alivePlayersAscending', () => {
  it('يرتب بالنقاط ثم السلسلة، والمُقصَون خارج الترتيب الصاعد', () => {
    let g = createGame(TEST_SETTINGS);
    g = applyScore(g, 'r1', { playerId: 'p2', delta: 30, reason: 'correct', questionId: 'q' });
    g = applyScore(g, 'r1', { playerId: 'p3', delta: 10, reason: 'correct', questionId: 'q' });

    expect(rankPlayers(g.players).map((p) => p.id)).toEqual(['p2', 'p3', 'p1']);

    const withElimination = {
      ...g,
      players: g.players.map((p) => (p.id === 'p1' ? { ...p, eliminated: true } : p)),
    };
    expect(alivePlayersAscending(withElimination.players).map((p) => p.id)).toEqual(['p3', 'p2']);
  });
});
