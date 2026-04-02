import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router';
import { useState, useEffect } from 'react';
import { Layout } from './app/components/Layout';
import { TechniqueLibrary } from './app/pages/TechniqueLibrary';
import { VideoLibrary } from './app/pages/VideoLibrary';
import { Sets } from './app/pages/Sets';
import { SetDetail } from './app/pages/SetDetail';
import { GamePlan } from './app/pages/GamePlan';
import { Admin } from './app/pages/Admin';
import './styles/index.css';

function Root() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('bjj-theme');
    return (stored as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('bjj-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout theme={theme} onToggleTheme={toggleTheme} />}>
          <Route index element={<TechniqueLibrary theme={theme} onToggleTheme={toggleTheme} />} />
          <Route path="library" element={<VideoLibrary />} />
          <Route path="sets" element={<Sets />} />
          <Route path="sets/:id" element={<SetDetail />} />
          <Route path="gameplan" element={<GamePlan />} />
          <Route path="admin" element={<Admin />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);
