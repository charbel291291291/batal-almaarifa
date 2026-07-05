import type { PlayerState } from '../types';
import { rankPlayers } from '../lib/scoreEngine';

interface Props {
  players: PlayerState[];
  activePlayerId?: string | null;
  compact?: boolean;
}

const MEDALS = ['🥇', '🥈', '🥉'];

/** لوحة النتائج — منصّة تتويج مصغّرة، الذهب للمتصدر، والمُقصَون بشارة رمادية */
export function Scoreboard({ players, activePlayerId, compact = false }: Props) {
  const alive = rankPlayers(players.filter((p) => !p.eliminated));
  const eliminated = rankPlayers(players.filter((p) => p.eliminated));
  const ranked = [...alive, ...eliminated];

  if (compact) {
    return (
      <div className="flex flex-wrap justify-center gap-2" aria-label="لوحة النتائج">
        {ranked.map((p, i) => (
          <div
            key={p.id}
            className={`glass flex items-center gap-2 px-3 py-1.5 text-sm ${
              p.id === activePlayerId ? 'outline-2 outline-gold' : ''
            } ${p.eliminated ? 'opacity-45' : ''}`}
          >
            <span aria-hidden>{p.avatar}</span>
            <span className="font-bold">{p.name}</span>
            {p.eliminated ? (
              <span className="text-xs text-danger">مُقصى</span>
            ) : (
              <span className={`font-black tabular-nums ${i === 0 ? 'text-gold-2' : 'text-ink-dim'}`}>
                {p.score}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <ol className="flex w-full flex-col gap-2" aria-label="لوحة النتائج">
      {ranked.map((p, i) => (
        <li
          key={p.id}
          className={`glass flex items-center gap-3 px-4 py-3 transition-all ${
            i === 0 && !p.eliminated ? 'border-gold/60 bg-gold/10' : ''
          } ${p.id === activePlayerId ? 'outline-2 outline-electric' : ''} ${
            p.eliminated ? 'opacity-45' : ''
          }`}
        >
          <span className="w-8 text-center text-xl" aria-hidden>
            {p.eliminated ? '⛔' : (MEDALS[i] ?? `${i + 1}`)}
          </span>
          <span className="text-2xl" aria-hidden>{p.avatar}</span>
          <span className="flex-1 truncate text-lg font-bold">{p.name}</span>
          {p.eliminated && <span className="chip !min-h-0 !py-1 text-xs text-danger">مُقصى</span>}
          {!p.eliminated && p.bestStreak >= 2 && (
            <span className="chip !min-h-0 !py-1 text-xs" title="أفضل سلسلة">
              🔗 {p.bestStreak}
            </span>
          )}
          <span className={`text-2xl font-black tabular-nums ${i === 0 && !p.eliminated ? 'text-gold-2' : ''}`}>
            {p.score}
          </span>
        </li>
      ))}
    </ol>
  );
}
