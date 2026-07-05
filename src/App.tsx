import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react';
import { useGameStore } from './store/gameStore';
import { Home } from './screens/Home';

const Setup = lazy(() => import('./screens/Setup').then((module) => ({ default: module.Setup })));
const Game = lazy(() => import('./screens/Game').then((module) => ({ default: module.Game })));
const Solo = lazy(() => import('./screens/Solo').then((module) => ({ default: module.Solo })));
const Online = lazy(() => import('./screens/Online').then((module) => ({ default: module.Online })));
const Stats = lazy(() => import('./screens/Stats').then((module) => ({ default: module.Stats })));

class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application render failed', error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-5 text-center">
          <h1 className="text-2xl font-black text-gold-2">يتوفر تحديث جديد</h1>
          <p className="text-ink-dim">حدّث الصفحة لتحميل أحدث نسخة من اللعبة.</p>
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
            تحديث التطبيق
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const screen = useGameStore((s) => s.screen);

  return (
    <AppErrorBoundary>
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
    </AppErrorBoundary>
  );
}
