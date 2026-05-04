import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import LeagueTable from './pages/LeagueTable';
import Matches from './pages/Matches';
import Admin from './pages/Admin';
import PoissonCalculator from './pages/PoissonCalculator';
import BetTracker from './pages/BetTracker';
import { initStore } from './data/store';
import Neuro from './pages/Neuro';
import Analytics from './pages/Analytics';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    let timeout;
    let loaded = false;
    
    // Подписываемся на облако
    const unsubscribe = initStore((initialData) => {
      if (!loaded) {
        setData(initialData);
        setIsLoading(false);
        loaded = true;
      }
      if (timeout) clearTimeout(timeout);
    });
    
    // 🔧 Если через 3 секунды данные не загрузились — берём из кэша (для мобилок)
    timeout = setTimeout(() => {
      if (!loaded) {
        const cached = localStorage.getItem('football_cache');
        const autoBackup = localStorage.getItem('football_auto_backup');
        const fallbackData = cached ? JSON.parse(cached) : (autoBackup ? JSON.parse(autoBackup) : null);
        
        if (fallbackData) {
          console.log('📱 Загружено из кэша (offline/мобильное устройство)');
          setData(fallbackData);
          setIsLoading(false);
          loaded = true;
        }
      }
    }, 3000);
    
    return () => {
      unsubscribe();
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⚽</div>
          <h2 className="text-xl font-bold mb-2">Загрузка данных...</h2>
          <p className="text-gray-400">Синхронизация с облаком ☁️</p>
          <button 
            onClick={() => {
              const cached = localStorage.getItem('football_cache');
              const autoBackup = localStorage.getItem('football_auto_backup');
              const fallbackData = cached ? JSON.parse(cached) : (autoBackup ? JSON.parse(autoBackup) : null);
              if (fallbackData) {
                setData(fallbackData);
                setIsLoading(false);
              }
            }}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition"
          >
            Загрузить оффлайн 📱
          </button>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/neuro" element={<Neuro />} />
          <Route path="/table" element={<LeagueTable />} />
          <Route path="/table/:leagueId" element={<LeagueTable />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/bets" element={<BetTracker />} />
          <Route path="/poisson" element={<PoissonCalculator />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;