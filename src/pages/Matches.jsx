import { useState } from 'react';
import { getData } from '../data/store';
import { Calendar, X, Target, Activity, BarChart3, Shield, Clock, ChevronRight } from 'lucide-react';

const Matches = () => {
  const data = getData();
  const [selectedLeague, setSelectedLeague] = useState('all');
  const [selectedMatch, setSelectedMatch] = useState(null);

  const filteredMatches = selectedLeague === 'all' 
    ? data.matches 
    : data.matches.filter(m => m.leagueId === selectedLeague);

  const sortedMatches = [...filteredMatches].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );

  const getTeamName = (id) => data.teams.find(t => t.id === id)?.name || '—';
  const getLeagueName = (id) => data.leagues.find(l => l.id === id)?.name || '—';
  const getLeagueById = (id) => data.leagues.find(l => l.id === id);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl md:text-2xl font-bold mb-1">Матчи</h2>
        <p className="text-xs md:text-sm text-gray-400">Все матчи и детальная статистика</p>
      </div>

      {/* Компактный фильтр */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setSelectedLeague('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            selectedLeague === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Все
        </button>
        {data.leagues.map(league => (
          <button
            key={league.id}
            onClick={() => setSelectedLeague(league.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              selectedLeague === league.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {league.name}
          </button>
        ))}
      </div>

      {/* Компактный список матчей */}
      <div className="space-y-1.5">
        {sortedMatches.length === 0 ? (
          <div className="bg-gray-800/50 rounded-lg p-6 text-center text-gray-400 border border-gray-700/50">
            <Calendar size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Нет матчей</p>
          </div>
        ) : (
          sortedMatches.map(match => {
            const league = getLeagueById(match.leagueId);
            
            return (
              <div
                key={match.id}
                onClick={() => setSelectedMatch(match)}
                className="bg-gray-800/50 hover:bg-gray-800 rounded-lg px-3 py-2 border border-gray-700/50 hover:border-gray-600 transition cursor-pointer group"
              >
                <div className="flex items-center justify-between gap-2">
                  {/* Дата и лига */}
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <span className="text-xs text-gray-400">{formatDate(match.date)}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">
                      {league?.name}
                    </span>
                  </div>
                  
                  {/* Счёт */}
                  <div className="flex items-center gap-2 flex-1 justify-center">
                    <span className="text-sm font-medium truncate max-w-[120px]">{getTeamName(match.homeTeamId)}</span>
                    <span className="text-sm font-bold text-white whitespace-nowrap">
                      {match.homeScore}:{match.awayScore}
                    </span>
                    <span className="text-sm font-medium truncate max-w-[120px]">{getTeamName(match.awayTeamId)}</span>
                  </div>
                  
                  {/* Угловые и стрелка */}
                  <div className="flex items-center gap-1.5 min-w-[70px] justify-end">
                    <span className="text-[10px] text-gray-400">
                      У: {match.homeCorners}-{match.awayCorners}
                    </span>
                    <ChevronRight size={14} className="text-gray-500 group-hover:text-white transition" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Модалка с детальной статистикой */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3" onClick={() => setSelectedMatch(null)}>
          <div className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            {/* Компактный хедер */}
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {getTeamName(selectedMatch.homeTeamId)} {selectedMatch.homeScore}:{selectedMatch.awayScore} {getTeamName(selectedMatch.awayTeamId)}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {getLeagueName(selectedMatch.leagueId)} • {formatDate(selectedMatch.date)}
                </p>
              </div>
              <button onClick={() => setSelectedMatch(null)} className="p-1.5 hover:bg-gray-700 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Угловые крупно */}
              <div className="bg-gray-700/30 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Угловые</p>
                <div className="flex items-center justify-center gap-6">
                  <span className="text-xl font-bold text-blue-400">{selectedMatch.homeCorners}</span>
                  <span className="text-gray-500">—</span>
                  <span className="text-xl font-bold text-red-400">{selectedMatch.awayCorners}</span>
                </div>
              </div>

              {/* Статистика в две колонки */}
              <div className="grid grid-cols-2 gap-2">
                <StatItem label="xG" home={selectedMatch.homeXG?.toFixed(2)} away={selectedMatch.awayXG?.toFixed(2)} />
                <StatItem label="Удары из штрафной" home={selectedMatch.homeShotsInsideBox} away={selectedMatch.awayShotsInsideBox} />
                <StatItem label="Всего ударов" home={selectedMatch.homeTotalShots} away={selectedMatch.awayTotalShots} />
                <StatItem label="Удары в створ" home={selectedMatch.homeShotsOnTarget} away={selectedMatch.awayShotsOnTarget} />
                <StatItem label="Владение %" home={selectedMatch.homePossession} away={selectedMatch.awayPossession} />
                <StatItem label="Сейвы" home={selectedMatch.homeSaves} away={selectedMatch.awaySaves} />
              </div>

              {/* По таймам */}
              <div className="bg-gray-700/30 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-300 mb-2 flex items-center gap-1">
                  <Clock size={12} /> По таймам
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-purple-400 mb-1.5">1-й тайм</p>
                    <div className="space-y-1">
                      <MiniRow label="Угловые" home={selectedMatch.homeCorners1H} away={selectedMatch.awayCorners1H} />
                      <MiniRow label="xG" home={selectedMatch.homeXG1H?.toFixed(2)} away={selectedMatch.awayXG1H?.toFixed(2)} />
                      <MiniRow label="Владение" home={selectedMatch.homePossession1H} away={selectedMatch.awayPossession1H} suffix="%" />
                    </div>
                  </div>
                  <div>
                    <p className="text-purple-400 mb-1.5">2-й тайм</p>
                    <div className="space-y-1">
                      <MiniRow label="Угловые" home={selectedMatch.homeCorners2H} away={selectedMatch.awayCorners2H} />
                      <MiniRow label="xG" home={selectedMatch.homeXG2H?.toFixed(2)} away={selectedMatch.awayXG2H?.toFixed(2)} />
                      <MiniRow label="Владение" home={selectedMatch.homePossession2H} away={selectedMatch.awayPossession2H} suffix="%" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Жёлтые */}
              {(selectedMatch.homeYellowCards > 0 || selectedMatch.awayYellowCards > 0) && (
                <div className="flex items-center justify-between text-xs bg-yellow-900/20 rounded-lg px-3 py-2">
                  <span className="text-gray-400">Жёлтые:</span>
                  <div className="flex gap-6">
                    <span>{selectedMatch.homeYellowCards || 0}</span>
                    <span className="text-gray-500">—</span>
                    <span>{selectedMatch.awayYellowCards || 0}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Компактный элемент статистики
const StatItem = ({ label, home, away }) => (
  <div className="bg-gray-700/30 rounded-lg px-3 py-2">
    <p className="text-[10px] text-gray-400 mb-1">{label}</p>
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-blue-400">{home || '—'}</span>
      <span className="text-gray-500 text-xs">vs</span>
      <span className="text-sm font-medium text-red-400">{away || '—'}</span>
    </div>
  </div>
);

const MiniRow = ({ label, home, away, suffix = '' }) => (
  <div className="flex items-center justify-between">
    <span className="text-gray-400 text-[10px]">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-blue-400 text-xs">{home || '—'}{suffix}</span>
      <span className="text-red-400 text-xs">{away || '—'}{suffix}</span>
    </div>
  </div>
);

export default Matches;