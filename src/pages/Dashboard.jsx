import { Link } from 'react-router-dom';
import { Trophy, Calendar, TrendingUp, Target } from 'lucide-react';
import { getData } from '../data/store';

const Dashboard = () => {
  const data = getData();
  const totalMatches = data.matches.length;
  const totalLeagues = data.leagues.length;
  const totalTeams = data.teams.length;

  // Находим команду с лучшими средними угловыми
  const getBestCornerTeam = () => {
    const teamStats = {};
    data.matches.forEach(match => {
      if (!teamStats[match.homeTeamId]) teamStats[match.homeTeamId] = { corners: 0, matches: 0 };
      if (!teamStats[match.awayTeamId]) teamStats[match.awayTeamId] = { corners: 0, matches: 0 };
      
      teamStats[match.homeTeamId].corners += match.homeCorners;
      teamStats[match.homeTeamId].matches++;
      teamStats[match.awayTeamId].corners += match.awayCorners;
      teamStats[match.awayTeamId].matches++;
    });
    
    let bestTeam = null;
    let bestAvg = 0;
    
    Object.entries(teamStats).forEach(([teamId, stats]) => {
      const avg = stats.corners / stats.matches;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestTeam = data.teams.find(t => t.id === teamId);
      }
    });
    
    return { team: bestTeam, avg: bestAvg };
  };

  const bestCornerTeam = getBestCornerTeam();

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
          <TrendingUp className="text-purple-500 mb-4" size={32} />
          <h3 className="text-lg text-gray-400 mb-1">Лучшие угловые</h3>
          <p className="text-2xl font-bold truncate">{bestCornerTeam.team?.name || 'Нет данных'}</p>
          <p className="text-sm text-gray-400">{bestCornerTeam.avg.toFixed(1)} за матч</p>
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

        <a
          href="https://www.soccerstats.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 border border-purple-700 rounded-xl p-6 hover:scale-[1.02] transition"
        >
          <div className="flex items-center space-x-4">
            <div className="bg-purple-600 p-4 rounded-xl">
              <Target size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">Трекер ставок</h3>
              <p className="text-gray-300">Подробная статистика матчей →</p>
            </div>
          </div>
        </a>
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
              <p className="text-xs text-gray-500 mt-2">Тотал угловых: {league.avgTotalCorners}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;