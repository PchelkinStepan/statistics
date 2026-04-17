import { useState } from 'react';
import { getData } from '../data/store';

const Matches = () => {
  const data = getData();
  const [selectedLeague, setSelectedLeague] = useState('all');

  const filteredMatches = selectedLeague === 'all' 
    ? data.matches 
    : data.matches.filter(m => m.leagueId === selectedLeague);

  const getTeamName = (id) => data.teams.find(t => t.id === id)?.name || 'Unknown';
  const getLeagueName = (id) => data.leagues.find(l => l.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Матчи</h2>
        <p className="text-gray-400">Статистика по матчам и угловым</p>
      </div>

      {/* Фильтр по лигам */}
      <div className="flex space-x-2">
        <button
          onClick={() => setSelectedLeague('all')}
          className={`px-4 py-2 rounded-lg transition ${
            selectedLeague === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Все лиги
        </button>
        {data.leagues.map(league => (
          <button
            key={league.id}
            onClick={() => setSelectedLeague(league.id)}
            className={`px-4 py-2 rounded-lg transition ${
              selectedLeague === league.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {league.name}
          </button>
        ))}
      </div>

      {/* Список матчей */}
      <div className="space-y-3">
        {filteredMatches.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-8 text-center text-gray-400 border border-gray-700">
            Нет добавленных матчей. Добавьте их в админке.
          </div>
        ) : (
          filteredMatches.map(match => (
            <div key={match.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">{getLeagueName(match.leagueId)} • {match.date}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1 text-right">
                  <span className="text-xl font-semibold">{getTeamName(match.homeTeamId)}</span>
                </div>
                <div className="px-8 text-center">
                  <div className="text-3xl font-bold bg-gray-700 px-6 py-2 rounded-lg">
                    {match.homeScore} - {match.awayScore}
                  </div>
                </div>
                <div className="flex-1">
                  <span className="text-xl font-semibold">{getTeamName(match.awayTeamId)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                <div className="flex items-center space-x-8">
                  <div>
                    <span className="text-gray-400 text-sm">Угловые (Хозяева):</span>
                    <span className="ml-2 text-lg font-semibold text-yellow-500">{match.homeCorners}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Угловые (Гости):</span>
                    <span className="ml-2 text-lg font-semibold text-yellow-500">{match.awayCorners}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Всего угловых:</span>
                    <span className="ml-2 text-lg font-semibold text-yellow-500">{match.homeCorners + match.awayCorners}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Matches;