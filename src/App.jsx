import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import LeagueTable from './pages/LeagueTable';
import Matches from './pages/Matches';
import Admin from './pages/Admin';
import PoissonCalculator from './pages/PoissonCalculator';
import { getDataAsync } from './data/store';

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getDataAsync().then(() => {
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-4">⚽</div>
          <h2 className="text-xl font-bold mb-2">Загрузка данных...</h2>
          <p className="text-gray-400">Синхронизация с облаком</p>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/table/:leagueId" element={<LeagueTable />} />
          <Route path="/table" element={<LeagueTable />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/poisson" element={<PoissonCalculator />} />
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