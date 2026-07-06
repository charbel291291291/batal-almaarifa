import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Question } from '../types';
import { buildOptions, pickQuestions } from './questionPicker';
import { supabase } from './supabase';
import { translate, type Locale } from './i18n';

export interface OnlinePlayer {
  id: string;
  user_id: string;
  name: string;
  avatar: string;
  score: number;
}

export interface OnlineRoom {
  id: string;
  code: string;
  status: 'lobby' | 'playing' | 'finished';
  current_index: number;
  question_count: number;
  question_started_at: string | null;
  is_host: boolean;
  players: OnlinePlayer[];
}

export interface OnlineQuestion {
  id: string;
  position: number;
  question_text: string;
  options: string[];
  category: string;
  time_limit_seconds: number;
  answered: boolean;
  was_correct: boolean | null;
  points_awarded: number | null;
}

export interface OnlineAnswerResult {
  correct: boolean;
  points_awarded: number;
}

interface RoomCreated {
  room_id: string;
  code: string;
}

function client() {
  if (!supabase) throw new Error('supabase_not_configured');
  return supabase;
}

async function rpc<T>(name: string, params: Record<string, unknown>): Promise<T> {
  const { data, error } = await client().rpc(name, params);
  if (error) throw error;
  return data as T;
}

export async function ensureOnlineIdentity(): Promise<void> {
  const api = client();
  const { data } = await api.auth.getSession();
  if (data.session) return;
  const { error } = await api.auth.signInAnonymously();
  if (error) throw error;
}

export async function createOnlineRoom(name: string, avatar: string): Promise<RoomCreated> {
  await ensureOnlineIdentity();
  return rpc<RoomCreated>('create_online_room', { player_name: name, player_avatar: avatar });
}

export async function joinOnlineRoom(code: string, name: string, avatar: string): Promise<RoomCreated> {
  await ensureOnlineIdentity();
  return rpc<RoomCreated>('join_online_room', {
    room_code: code,
    player_name: name,
    player_avatar: avatar,
  });
}

export function getOnlineRoom(code: string): Promise<OnlineRoom> {
  return rpc<OnlineRoom>('get_online_room', { room_code: code });
}

export function getOnlineQuestion(code: string): Promise<OnlineQuestion | null> {
  return rpc<OnlineQuestion | null>('get_online_question', { room_code: code });
}

export function submitOnlineAnswer(code: string, answer: string): Promise<OnlineAnswerResult> {
  return rpc<OnlineAnswerResult>('submit_online_answer', {
    room_code: code,
    submitted_answer: answer,
  });
}

export function advanceOnlineQuestion(code: string): Promise<{ finished: boolean }> {
  return rpc<{ finished: boolean }>('advance_online_question', { room_code: code });
}

export async function startOnlineGame(code: string, bank: Question[]): Promise<void> {
  const challenge = buildOnlineChallenge(bank);
  await rpc('start_online_game', { room_code: code, challenge_questions: challenge });
}

export function buildOnlineChallenge(bank: Question[]) {
  const selected = pickQuestions(bank, {
    categories: [...new Set(bank.map((question) => question.category))],
    difficulties: ['easy', 'medium', 'hard', 'expert'],
    count: 10,
    excludeIds: [],
    requireDistractors: true,
    excludeTypes: ['boolean', 'clues', 'audio', 'image'],
  });
  return selected.map((question) => ({
    question_text: question.question_text,
    answer: question.answer,
    options: buildOptions(question),
    category: question.category,
    time_limit_seconds: question.time_limit_seconds,
  }));
}

export function subscribeToOnlineRoom(roomId: string, onChange: () => void): RealtimeChannel {
  const api = client();
  const channel = api
    .channel(`online-room:${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'online_rooms', filter: `id=eq.${roomId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'online_players', filter: `room_id=eq.${roomId}` },
      onChange,
    )
    .subscribe();
  return channel;
}

export async function unsubscribeFromOnlineRoom(channel: RealtimeChannel): Promise<void> {
  if (supabase) await supabase.removeChannel(channel);
}

export function onlineErrorMessage(error: unknown, locale: Locale = 'ar'): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('room_not_found')) return translate(locale, 'roomMissing');
  if (message.includes('room_full')) return translate(locale, 'roomFull');
  if (message.includes('need_two_players')) return translate(locale, 'needTwoPlayers');
  if (message.includes('already_answered')) return translate(locale, 'alreadyAnswered');
  if (message.includes('Anonymous sign-ins are disabled'))
    return translate(locale, 'anonymousDisabled');
  if (message.includes('supabase_not_configured')) return translate(locale, 'onlineNotConfigured');
  return translate(locale, 'roomConnectionFailed');
}
