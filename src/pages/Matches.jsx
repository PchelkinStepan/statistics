import { useState, useEffect } from 'react';
import { getData, getSeasons, getTeamsForSeason, getMatchesForSeason, getActiveSeason } from '../data/store';
import { Calendar, X, ChevronRight } from 'lucide-react';

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

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl md:text-2xl font-bold mb-1">Матчи</h2>
        <p className="text-xs md:text-sm text-gray-400">Все матчи по сезонам</p>
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

      <div className="space-y-1.5">
        {matches.length === 0 ? (
          <div className="bg-gray-800/50 rounded-lg p-6 text-center text-gray-400 border border-gray-700/50">
            <Calendar size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Нет матчей</p>
          </div>
        ) : (
          matches.map(match => (
            <div key={match.id} onClick={() => setSelectedMatch(match)} className="bg-gray-800/50 hover:bg-gray-800 rounded-lg px-3 py-2 border border-gray-700/50 hover:border-gray-600 transition cursor-pointer group">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-[100px]">
                  <span className="text-xs text-gray-400">{match.date}</span>
                </div>
                <div className="flex items-center gap-2 flex-1 justify-center">
                  <span className="text-sm font-medium truncate max-w-[120px]">{getTeamName(match.homeTeamId)}</span>
                  <span className="text-sm font-bold text-white">{match.homeScore}:{match.awayScore}</span>
                  <span className="text-sm font-medium truncate max-w-[120px]">{getTeamName(match.awayTeamId)}</span>
                </div>
                <div className="flex items-center gap-1.5 min-w-[70px] justify-end">
                  <span className="text-[10px] text-gray-400">У: {match.homeCorners}-{match.awayCorners}</span>
                  <ChevronRight size={14} className="text-gray-500 group-hover:text-white transition" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedMatch && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3" onClick={() => setSelectedMatch(null)}>
          <div className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{getTeamName(selectedMatch.homeTeamId)} {selectedMatch.homeScore}:{selectedMatch.awayScore} {getTeamName(selectedMatch.awayTeamId)}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">{getLeagueName(selectedMatch.leagueId)} • {selectedMatch.date}</p>
              </div>
              <button onClick={() => setSelectedMatch(null)} className="p-1.5 hover:bg-gray-700 rounded-lg"><X size={18} /></button>
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