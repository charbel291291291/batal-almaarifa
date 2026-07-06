import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import type { CategoryId } from '../types';
import { categoryLabel } from '../lib/i18n';
import { useI18n } from '../lib/useI18n';
import {
  advanceOnlineQuestion,
  createOnlineRoom,
  getOnlineQuestion,
  getOnlineRoom,
  joinOnlineRoom,
  onlineErrorMessage,
  startOnlineGame,
  submitOnlineAnswer,
  subscribeToOnlineRoom,
  unsubscribeFromOnlineRoom,
  type OnlineAnswerResult,
  type OnlineQuestion,
  type OnlineRoom,
} from '../lib/onlineGame';
import { isSupabaseConfigured } from '../lib/supabase';
import { MuteButton } from '../components/MuteButton';
import { localizeQuestionBank } from '../lib/localizeQuestions';

const AVATARS = ['🦁', '🦅', '🐺', '🦊', '🐯', '🦉'];

export function Online() {
  const { locale, t } = useI18n();
  const goHome = useGameStore((state) => state.goHome);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [joinCode, setJoinCode] = useState('');
  const [code, setCode] = useState('');
  const [room, setRoom] = useState<OnlineRoom | null>(null);
  const [question, setQuestion] = useState<OnlineQuestion | null>(null);
  const [answerResult, setAnswerResult] = useState<OnlineAnswerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!code) return;
    try {
      const nextRoom = await getOnlineRoom(code);
      setRoom(nextRoom);
      if (nextRoom.status === 'playing') {
        const nextQuestion = await getOnlineQuestion(code);
        setQuestion(nextQuestion);
        if (nextQuestion?.id !== question?.id) setAnswerResult(null);
      } else {
        setQuestion(null);
      }
    } catch (cause) {
      setError(onlineErrorMessage(cause, locale));
    }
  }, [code, locale, question?.id]);

  useEffect(() => {
    if (!room?.id) return;
    const channel = subscribeToOnlineRoom(room.id, () => void refresh());
    return () => {
      void unsubscribeFromOnlineRoom(channel);
    };
  }, [room?.id, refresh]);

  const enterRoom = async (kind: 'create' | 'join') => {
    if (!name.trim()) {
      setError(t('enterNameFirst'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result =
        kind === 'create'
          ? await createOnlineRoom(name.trim(), avatar)
          : await joinOnlineRoom(joinCode.trim().toUpperCase(), name.trim(), avatar);
      setCode(result.code);
      setRoom(await getOnlineRoom(result.code));
    } catch (cause) {
      setError(onlineErrorMessage(cause, locale));
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const { QUESTION_BANK } = await import('../data/questions');
      await startOnlineGame(code, localizeQuestionBank(QUESTION_BANK, locale));
      await refresh();
    } catch (cause) {
      setError(onlineErrorMessage(cause, locale));
    } finally {
      setBusy(false);
    }
  };

  const answer = async (value: string) => {
    if (!question || question.answered || answerResult) return;
    setBusy(true);
    setError(null);
    try {
      const result = await submitOnlineAnswer(code, value);
      setAnswerResult(result);
      setQuestion({ ...question, answered: true, was_correct: result.correct, points_awarded: result.points_awarded });
      await refresh();
    } catch (cause) {
      setError(onlineErrorMessage(cause, locale));
    } finally {
      setBusy(false);
    }
  };

  const advance = async () => {
    setBusy(true);
    try {
      await advanceOnlineQuestion(code);
      setAnswerResult(null);
      await refresh();
    } catch (cause) {
      setError(onlineErrorMessage(cause, locale));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative z-10 mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-5 px-5 py-6">
      <header className="flex items-center justify-between">
        <button type="button" className="btn-ghost !min-h-11 !px-3 !py-2" onClick={goHome}>{t('back')}</button>
        <h1 className="text-2xl font-black text-gold-2">{t('onlineChallenge')}</h1>
        <MuteButton />
      </header>

      {!isSupabaseConfigured && (
        <div className="glass border-danger/50 p-5 text-center" role="alert">
          <h2 className="mb-2 text-xl font-black text-danger">{t('onlineNeedsSetup')}</h2>
          <p className="text-ink-dim">
            {t('onlineSetupHelp')}
          </p>
        </div>
      )}

      {error && <p className="rounded-xl border border-danger/50 bg-danger/10 p-3 text-center font-bold text-danger" role="alert">{error}</p>}

      {!room && isSupabaseConfigured && (
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass flex flex-col gap-5 p-5">
          <label className="flex flex-col gap-2 font-bold">
            {t('yourName')}
            <input className="text-input" maxLength={24} value={name} onChange={(event) => setName(event.target.value)} placeholder={t('playerNamePlaceholder')} />
          </label>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('chooseAvatar')}>
            {AVATARS.map((item) => (
              <button key={item} type="button" className="chip text-2xl" data-active={avatar === item} aria-pressed={avatar === item} onClick={() => setAvatar(item)}>
                {item}
              </button>
            ))}
          </div>
          <button type="button" className="btn-primary text-lg" disabled={busy} onClick={() => void enterRoom('create')}>
            {t('createRoom')}
          </button>
          <div className="flex items-center gap-3 text-ink-dim"><span className="h-px flex-1 bg-white/15" /><span>{t('or')}</span><span className="h-px flex-1 bg-white/15" /></div>
          <label className="flex flex-col gap-2 font-bold">
            {t('roomCode')}
            <input
              className="text-input text-center text-2xl tracking-[0.3em] uppercase"
              maxLength={6}
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.replace(/[^a-zA-Z2-9]/g, '').toUpperCase())}
              placeholder="ABC234"
              dir="ltr"
            />
          </label>
          <button type="button" className="btn-ghost text-lg" disabled={busy || joinCode.length !== 6} onClick={() => void enterRoom('join')}>
            {t('joinRoom')}
          </button>
        </motion.section>
      )}

      {room?.status === 'lobby' && (
        <section className="flex flex-col gap-5">
          <div className="glass p-6 text-center">
            <p className="text-sm text-ink-dim">{t('shareCode')}</p>
            <p className="my-2 text-5xl font-black tracking-[0.18em] text-gold-2" dir="ltr">{room.code}</p>
            <p className="text-sm text-ink-dim">{t('joinHelp')}</p>
          </div>
          <PlayerList room={room} />
          {room.is_host ? (
            <button type="button" className="btn-primary text-xl" disabled={busy || room.players.length < 2} onClick={() => void start()}>
              {t('startTenQuestions')}
            </button>
          ) : (
            <p className="text-center font-bold text-ink-dim">{t('waitingHost')}</p>
          )}
        </section>
      )}

      {room?.status === 'playing' && question && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="chip" data-active="true">{t('questionProgress', { current: question.position + 1, total: room.question_count })}</span>
            <span className="chip">{categoryLabel(question.category as CategoryId, locale) ?? question.category}</span>
          </div>
          <div className="glass p-6">
            <h2 className="mb-5 text-center text-2xl leading-relaxed font-black">{question.question_text}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {question.options.map((option) => (
                <button key={option} type="button" className="option-btn" disabled={busy || question.answered} onClick={() => void answer(option)}>
                  {option}
                </button>
              ))}
            </div>
            {question.answered && (
              <p className={`mt-5 text-center text-xl font-black ${question.was_correct ? 'text-emerald' : 'text-danger'}`} role="status">
                {question.was_correct ? t('correctPoints', { points: question.points_awarded ?? 0 }) : t('wrongAnswer')}
              </p>
            )}
          </div>
          <PlayerList room={room} />
          {room.is_host ? (
            <button type="button" className="btn-primary" disabled={busy} onClick={() => void advance()}>
              {room.current_index + 1 >= room.question_count ? t('finishChallenge') : t('nextQuestion')}
            </button>
          ) : (
            question.answered && <p className="text-center text-ink-dim">{t('waitingNext')}</p>
          )}
        </section>
      )}

      {room?.status === 'finished' && (
        <section className="flex flex-col items-center gap-5 text-center">
          <span className="text-7xl" aria-hidden>🏆</span>
          <h2 className="text-3xl font-black text-gold-2">{t('challengeFinished')}</h2>
          <PlayerList room={room} />
          <button type="button" className="btn-primary w-full max-w-xs" onClick={goHome}>{t('home')}</button>
        </section>
      )}
    </main>
  );
}

function PlayerList({ room }: { room: OnlineRoom }) {
  const { t } = useI18n();
  const ranked = [...room.players].sort((a, b) => b.score - a.score);
  return (
    <div className="glass p-4">
      <h2 className="mb-3 text-lg font-black">{t('onlinePlayers', { count: ranked.length })}</h2>
      <ul className="flex flex-col gap-2">
        {ranked.map((player, index) => (
          <li key={player.id} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
            <span className="w-6 font-black text-gold-2">{index + 1}</span>
            <span className="text-2xl" aria-hidden>{player.avatar}</span>
            <span className="flex-1 font-bold">{player.name}</span>
            <span className="text-xl font-black tabular-nums text-gold-2">{player.score}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
