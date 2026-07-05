import { lazy, Suspense } from 'react';
import { useGameStore } from './store/gameStore';
import { Home } from './screens/Home';

const Setup = lazy(() => import('./screens/Setup').then((module) => ({ default: module.Setup })));
const Game = lazy(() => import('./screens/Game').then((module) => ({ default: module.Game })));
const Solo = lazy(() => import('./screens/Solo').then((module) => ({ default: module.Solo })));
const Online = lazy(() => import('./screens/Online').then((module) => ({ default: module.Online })));
const Stats = lazy(() => import('./screens/Stats').then((module) => ({ default: module.Stats })));

export default function App() {
  const screen = useGameStore((s) => s.screen);

  return (
    <div className="stage-beams min-h-svh">
      <Suspense fallback={<div className="flex min-h-svh items-center justify-center text-xl font-bold">جارٍ التحميل…</div>}>
        {screen === 'home' && <Home />}
        {screen === 'setup' && <Setup />}
        {screen === 'game' && <Game />}
        {screen === 'solo' && <Solo />}
        {screen === 'online' && <Online />}
        {screen === 'stats' && <Stats />}
      </Suspense>
    </div>
  );
}
