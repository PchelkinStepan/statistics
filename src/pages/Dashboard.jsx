import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Calendar, TrendingUp, Target } from 'lucide-react';
import { getData, subscribe } from '../data/store';

const Dashboard = () => {
  // 🔧 ИСПРАВЛЕНО: теперь данные обновляются реактивно
  const [data, setData] = useState(getData());
  
  useEffect(() => {
    const unsubscribe = subscribe((newData) => {
      setData(newData);
    });
    return () => unsubscribe();
  }, []);
  
  const totalMatches = data.matches.length;
  const totalLeagues = data.leagues.length;
  const totalTeams = data.teams.length;
  const totalBets = data.bets?.length || 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold mb-2">Дашборд</h2>
        <p className="text-gray-400">Обзор футбольной статистики</p>
      </div>

      {/* Статистические карточки */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <Trophy className="text-yellow-500 mb-4" size={32} />
          <h3 className="text-lg text-gray-400 mb-1">Лиг</h3>
          <p className="text-4xl font-bold">{totalLeagues}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <Target className="text-blue-500 mb-4" size={32} />
          <h3 className="text-lg text-gray-400 mb-1">Команд</h3>
          <p className="text-4xl font-bold">{totalTeams}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <Calendar className="text-green-500 mb-4" size={32} />
          <h3 className="text-lg text-gray-400 mb-1">Матчей</h3>
          <p className="text-4xl font-bold">{totalMatches}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <Target className="text-purple-500 mb-4" size={32} />
          <h3 className="text-lg text-gray-400 mb-1">Ставок</h3>
          <p className="text-4xl font-bold">{totalBets}</p>
        </div>
      </div>

      {/* Ссылки на инструменты */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/poisson"
          className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border border-blue-700 rounded-xl p-6 hover:scale-[1.02] transition"
        >
          <div className="flex items-center space-x-4">
            <div className="bg-blue-600 p-4 rounded-xl">
              <TrendingUp size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">Калькулятор Пуассона</h3>
              <p className="text-gray-300">Расчет вероятностей по угловым →</p>
            </div>
          </div>
        </Link>

        <Link
          to="/bets"
          className="bg-gradient-to-br from-green-900/50 to-green-800/50 border border-green-700 rounded-xl p-6 hover:scale-[1.02] transition"
        >
          <div className="flex items-center space-x-4">
            <div className="bg-green-600 p-4 rounded-xl">
              <Target size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">Трекер ставок</h3>
              <p className="text-gray-300">Учёт ставок и банкролла →</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Быстрый переход к лигам */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Лиги</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.leagues.map(league => (
  <Link
    key={league.id}
    to={`/table/${league.id}`}
    className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-700 transition"
  >
    <p className="font-semibold">{league.name}</p>
    <p className="text-sm text-gray-400">{league.country}</p>
  </Link>
))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;