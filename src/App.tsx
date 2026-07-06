import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react';
import { useGameStore } from './store/gameStore';
import { Home } from './screens/Home';
import { useI18n } from './lib/useI18n';

const Setup = lazy(() => import('./screens/Setup').then((module) => ({ default: module.Setup })));
const Game = lazy(() => import('./screens/Game').then((module) => ({ default: module.Game })));
const Solo = lazy(() => import('./screens/Solo').then((module) => ({ default: module.Solo })));
const Online = lazy(() => import('./screens/Online').then((module) => ({ default: module.Online })));
const Stats = lazy(() => import('./screens/Stats').then((module) => ({ default: module.Stats })));

class AppErrorBoundary extends Component<
  { children: ReactNode; copy: { title: string; help: string; action: string } },
  { failed: boolean }
> {
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
          <h1 className="text-2xl font-black text-gold-2">{this.props.copy.title}</h1>
          <p className="text-ink-dim">{this.props.copy.help}</p>
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
            {this.props.copy.action}
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const screen = useGameStore((s) => s.screen);
  const { t } = useI18n();

  return (
    <AppErrorBoundary copy={{ title: t('updateAvailable'), help: t('updateHelp'), action: t('updateApp') }}>
      <div className="stage-beams min-h-svh">
        <Suspense fallback={<div className="flex min-h-svh items-center justify-center text-xl font-bold">{t('loading')}</div>}>
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
