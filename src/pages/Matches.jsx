import { useState, useEffect } from 'react';
import { getData, getSeasons, getTeamsForSeason, getMatchesForSeason, getActiveSeason } from '../data/store';
import { Calendar, X, ChevronRight, Trophy } from 'lucide-react';

const Matches = () => {
  const data = getData();
  const defaultLeagueId = data.leagues?.[0]?.id || 'rpl';
  
  const [selectedLeague, setSelectedLeague] = useState(defaultLeagueId);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedMatch, setSelectedMatch] = useState(null);

  useEffect(() => {
    const activeSeason = getActiveSeason(selectedLeague);
    if (activeSeason) setSelectedSeason(activeSeason.id);
  }, [selectedLeague]);

  const seasons = getSeasons(selectedLeague);
  const matches = getMatchesForSeason(selectedLeague, selectedSeason);
  const teams = getTeamsForSeason(selectedLeague, selectedSeason);
  
  const getTeamName = (id) => teams.find(t => t.id === id)?.name || '—';
  const getLeagueName = (id) => data.leagues?.find(l => l.id === id)?.name || '—';

  // Группировка матчей по турам (по дате)
  const groupMatchesByRound = () => {
    // Сортируем по дате
    const sorted = [...matches].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Группируем по дате (матчи одного тура обычно в 2-3 дня)
    const groups = [];
    let currentRound = [];
    let currentDates = new Set();
    
    sorted.forEach(match => {
      const matchDate = match.date;
      
      // Если в текущей группе уже есть матчи с этой датой или соседними (±2 дня)
      const isNearby = currentDates.size === 0 || 
        Array.from(currentDates).some(d => {
          const diff = Math.abs(new Date(d) - new Date(matchDate));
          return diff <= 2 * 24 * 60 * 60 * 1000; // 2 дня
        });
      
      if (isNearby || currentRound.length < 8) {
        currentRound.push(match);
        currentDates.add(matchDate);
      }
      
      // Если набрали 8 матчей или дата сильно отличается — закрываем тур
      if (currentRound.length >= 8 || (!isNearby && currentRound.length > 0)) {
        groups.push([...currentRound]);
        currentRound = [];
        currentDates.clear();
      }
    });
    
    // Добавляем оставшиеся матчи
    if (currentRound.length > 0) {
      groups.push(currentRound);
    }
    
    return groups;
  };

  const rounds = groupMatchesByRound();

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl md:text-2xl font-bold mb-1">Матчи</h2>
        <p className="text-xs md:text-sm text-gray-400">Группировка по турам</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <select value={selectedLeague} onChange={(e) => setSelectedLeague(e.target.value)} className="bg-gray-800 text-white rounded-lg px-3 py-1.5 text-xs">
          {data.leagues?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)} className="bg-gray-800 text-white rounded-lg px-3 py-1.5 text-xs">
          <option value="">Все сезоны</option>
          {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="space-y-4">
        {rounds.length === 0 ? (
          <div className="bg-gray-800/50 rounded-lg p-6 text-center text-gray-400 border border-gray-700/50">
            <Calendar size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Нет матчей</p>
          </div>
        ) : (
          rounds.map((roundMatches, roundIndex) => {
            // Определяем диапазон дат для тура
            const dates = roundMatches.map(m => m.date).sort();
            const firstDate = dates[0];
            const lastDate = dates[dates.length - 1];
            
            return (
              <div key={roundIndex} className="bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden">
                {/* Заголовок тура */}
                <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 px-4 py-2 border-b border-gray-700 flex items-center gap-2">
                  <Trophy size={16} className="text-yellow-400" />
                  <span className="font-semibold text-white">
                    {roundIndex + 1} тур
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {firstDate === lastDate 
                      ? new Date(firstDate).toLocaleDateString('ru-RU')
                      : `${new Date(firstDate).toLocaleDateString('ru-RU')} — ${new Date(lastDate).toLocaleDateString('ru-RU')}`
                    }
                  </span>
                </div>
                
                {/* Матчи тура */}
                <div className="divide-y divide-gray-700/50">
                  {roundMatches.map(match => (
                    <div 
                      key={match.id} 
                      onClick={() => setSelectedMatch(match)} 
                      className="hover:bg-gray-700/30 px-4 py-2.5 transition cursor-pointer group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 justify-center">
                          <span className="text-sm font-medium truncate max-w-[140px] text-right">{getTeamName(match.homeTeamId)}</span>
                          <span className="text-sm font-bold text-white min-w-[45px] text-center">
                            {match.homeScore}:{match.awayScore}
                          </span>
                          <span className="text-sm font-medium truncate max-w-[140px] text-left">{getTeamName(match.awayTeamId)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 whitespace-nowrap">
                            Угл: {match.homeCorners}-{match.awayCorners}
                          </span>
                          <ChevronRight size={14} className="text-gray-500 group-hover:text-white transition" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Модальное окно с деталями матча */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3" onClick={() => setSelectedMatch(null)}>
          <div className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {getTeamName(selectedMatch.homeTeamId)} {selectedMatch.homeScore}:{selectedMatch.awayScore} {getTeamName(selectedMatch.awayTeamId)}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {getLeagueName(selectedMatch.leagueId)} • {selectedMatch.date}
                </p>
              </div>
              <button onClick={() => setSelectedMatch(null)} className="p-1.5 hover:bg-gray-700 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-gray-700/30 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Угловые</p>
                <div className="flex items-center justify-center gap-6">
                  <span className="text-xl font-bold text-blue-400">{selectedMatch.homeCorners}</span>
                  <span className="text-gray-500">—</span>
                  <span className="text-xl font-bold text-red-400">{selectedMatch.awayCorners}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StatItem label="xG" home={selectedMatch.homeXG?.toFixed(2)} away={selectedMatch.awayXG?.toFixed(2)} />
                <StatItem label="Удары из штрафной" home={selectedMatch.homeShotsInsideBox} away={selectedMatch.awayShotsInsideBox} />
                <StatItem label="Всего ударов" home={selectedMatch.homeTotalShots} away={selectedMatch.awayTotalShots} />
                <StatItem label="Удары в створ" home={selectedMatch.homeShotsOnTarget} away={selectedMatch.awayShotsOnTarget} />
                <StatItem label="Владение %" home={selectedMatch.homePossession} away={selectedMatch.awayPossession} />
                <StatItem label="Сейвы" home={selectedMatch.homeSaves} away={selectedMatch.awaySaves} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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

export default Matches;