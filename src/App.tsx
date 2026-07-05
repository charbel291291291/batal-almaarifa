import { useGameStore } from './store/gameStore';
import { Home } from './screens/Home';
import { Setup } from './screens/Setup';
import { Game } from './screens/Game';
import { Solo } from './screens/Solo';
import { Editor } from './screens/Editor';
import { Stats } from './screens/Stats';

export default function App() {
  const screen = useGameStore((s) => s.screen);

  return (
    <div className="stage-beams min-h-svh">
      {screen === 'home' && <Home />}
      {screen === 'setup' && <Setup />}
      {screen === 'game' && <Game />}
      {screen === 'solo' && <Solo />}
      {screen === 'editor' && <Editor />}
      {screen === 'stats' && <Stats />}
    </div>
  );
}
