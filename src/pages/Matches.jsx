import { useState, useEffect } from 'react';
import { getData, getSeasons, getTeamsForSeason, getMatchesForSeason, getActiveSeason, subscribe } from '../data/store';
import { Calendar, X, ChevronRight, Trophy, Target } from 'lucide-react';

const Matches = () => {
  const [data, setData] = useState(getData());
  
  useEffect(() => {
    const unsubscribe = subscribe((newData) => {
      setData(newData);
    });
    return () => unsubscribe();
  }, []);
  
  const defaultLeagueId = data.leagues?.[0]?.id || 'rpl';
  
  const [selectedLeague, setSelectedLeague] = useState(defaultLeagueId);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [modalTab, setModalTab] = useState('match');

  useEffect(() => {
    const activeSeason = getActiveSeason(selectedLeague);
    if (activeSeason) setSelectedSeason(activeSeason.id);
  }, [selectedLeague, data]);

  const seasons = getSeasons(selectedLeague);
  const matches = getMatchesForSeason(selectedLeague, selectedSeason);
  const teams = getTeamsForSeason(selectedLeague, selectedSeason);
  
  const getTeamName = (id) => teams.find(t => t.id === id)?.name || '—';
  const getLeagueName = (id) => data.leagues?.find(l => l.id === id)?.name || '—';

  const groupMatchesByRound = () => {
    const groups = {};
    matches.forEach(match => {
      const round = match.round || '?';
      if (!groups[round]) groups[round] = [];
      groups[round].push(match);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => { const na = parseInt(a) || 999; const nb = parseInt(b) || 999; return na - nb; })
      .map(([round, roundMatches]) => ({ round, matches: roundMatches.sort((a, b) => new Date(a.date) - new Date(b.date)) }));
  };

  const rounds = groupMatchesByRound();

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  const formatDateRange = (matches) => {
    const dates = matches.map(m => m.date).sort();
    const first = dates[0], last = dates[dates.length - 1];
    return first === last ? formatDate(first) : `${formatDate(first)} — ${formatDate(last)}`;
  };

  // Компонент строки статистики (фикс: 0 отображается как 0, а не как —)
  const StatLine = ({ label, home, away, suffix = '' }) => {
    const formatVal = (val) => val != null && val !== '' ? val : '—';
    return (
      <div className="flex items-center justify-between py-1.5 border-b border-gray-700/50 text-sm">
        <span className="text-gray-400 w-40">{label}</span>
        <span className="font-medium text-blue-400 text-center w-12">{formatVal(home)}{suffix}</span>
        <span className="text-gray-500 text-xs">vs</span>
        <span className="font-medium text-red-400 text-center w-12">{formatVal(away)}{suffix}</span>
      </div>
    );
  };

  const renderStats = (suffix) => {
    const s = suffix || '';
    
    return (
      <div className="space-y-0">
        <StatLine label="Голы" home={selectedMatch?.[`homeScore${s}`]} away={selectedMatch?.[`awayScore${s}`]} />
        <StatLine label="xG (ожидаемые голы)" home={selectedMatch?.[`homeXG${s}`]?.toFixed(2)} away={selectedMatch?.[`awayXG${s}`]?.toFixed(2)} />
        <StatLine label="Владение (%)" home={selectedMatch?.[`homePossession${s}`]} away={selectedMatch?.[`awayPossession${s}`]} suffix="%" />
        <StatLine label="Всего ударов" home={selectedMatch?.[`homeTotalShots${s}`]} away={selectedMatch?.[`awayTotalShots${s}`]} />
        <StatLine label="Удары в створ" home={selectedMatch?.[`homeShotsOnTarget${s}`]} away={selectedMatch?.[`awayShotsOnTarget${s}`]} />
        <StatLine label="Угловые" home={selectedMatch?.[`homeCorners${s}`]} away={selectedMatch?.[`awayCorners${s}`]} />
        <StatLine label="Жёлтые карточки" home={selectedMatch?.[`homeYellowCards${s}`]} away={selectedMatch?.[`awayYellowCards${s}`]} />
        <StatLine label="Красные карточки" home={selectedMatch?.[`homeRedCards${s}`]} away={selectedMatch?.[`awayRedCards${s}`]} />
        <StatLine label="xG в створ" home={selectedMatch?.[`homeXGOT${s}`]?.toFixed(2)} away={selectedMatch?.[`awayXGOT${s}`]?.toFixed(2)} />
        <StatLine label="Ударов заблокировано" home={selectedMatch?.[`homeBlockedShots${s}`]} away={selectedMatch?.[`awayBlockedShots${s}`]} />
        <StatLine label="Удары из штрафной" home={selectedMatch?.[`homeShotsInsideBox${s}`]} away={selectedMatch?.[`awayShotsInsideBox${s}`]} />
        <StatLine label="Удары из-за штрафной" home={selectedMatch?.[`homeShotsOutsideBox${s}`]} away={selectedMatch?.[`awayShotsOutsideBox${s}`]} />
        <StatLine label="Касания в штрафной" home={selectedMatch?.[`homeTouchesBox${s}`]} away={selectedMatch?.[`awayTouchesBox${s}`]} />
        <StatLine label="Длинные передачи (точные)" home={selectedMatch?.[`homeLongPassesAcc${s}`]} away={selectedMatch?.[`awayLongPassesAcc${s}`]} />
        <StatLine label="Длинные передачи (всего)" home={selectedMatch?.[`homeLongPasses${s}`]} away={selectedMatch?.[`awayLongPasses${s}`]} />
        <StatLine label="Передачи в посл. трети (точные)" home={selectedMatch?.[`homeFinalThirdAcc${s}`]} away={selectedMatch?.[`awayFinalThirdAcc${s}`]} />
        <StatLine label="Передачи в посл. трети (всего)" home={selectedMatch?.[`homeFinalThirdPasses${s}`]} away={selectedMatch?.[`awayFinalThirdPasses${s}`]} />
        <StatLine label="Навесы (точные)" home={selectedMatch?.[`homeCrossesAcc${s}`]} away={selectedMatch?.[`awayCrossesAcc${s}`]} />
        <StatLine label="Навесы (всего)" home={selectedMatch?.[`homeCrosses${s}`]} away={selectedMatch?.[`awayCrosses${s}`]} />
        <StatLine label="xA (ожидаемые ассисты)" home={selectedMatch?.[`homeXA${s}`]?.toFixed(2)} away={selectedMatch?.[`awayXA${s}`]?.toFixed(2)} />
        <StatLine label="Фолы" home={selectedMatch?.[`homeFouls${s}`]} away={selectedMatch?.[`awayFouls${s}`]} />
        <StatLine label="Выиграно дуэлей" home={selectedMatch?.[`homeDuelsWon${s}`]} away={selectedMatch?.[`awayDuelsWon${s}`]} />
        <StatLine label="Сейвы" home={selectedMatch?.[`homeSaves${s}`]} away={selectedMatch?.[`awaySaves${s}`]} />
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
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
          rounds.map(({ round, matches: roundMatches }) => (
            <div key={round} className="bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 px-5 py-2.5 border-b border-gray-700 flex items-center gap-2">
                <Trophy size={16} className="text-yellow-400" />
                <span className="font-semibold text-white">{round === '?' ? 'Без тура' : `${round} тур`}</span>
                <span className="text-xs text-gray-400 ml-auto flex items-center gap-1"><Calendar size={12} />{formatDateRange(roundMatches)}</span>
              </div>
              <div className="divide-y divide-gray-700/50">
                {roundMatches.map(match => (
                  <div key={match.id} onClick={() => { setSelectedMatch(match); setModalTab('match'); }} className="hover:bg-gray-700/30 px-5 py-3 transition cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-[70px] flex items-center gap-1.5 flex-shrink-0"><Calendar size={12} className="text-gray-500" /><span className="text-xs text-gray-300">{formatDate(match.date)}</span></div>
                      <div className="flex-1 flex items-center justify-center gap-4">
                        <div className="w-[160px] text-right"><span className="text-sm font-medium truncate block hover:text-blue-400 transition">{getTeamName(match.homeTeamId)}</span></div>
                        <div className="w-[80px] flex-shrink-0 text-center"><span className="text-base font-bold text-white bg-gradient-to-r from-gray-700/50 to-gray-700/30 py-1 px-3 rounded-lg border border-gray-600/30 inline-block">{match.homeScore}:{match.awayScore}</span></div>
                        <div className="w-[160px] text-left"><span className="text-sm font-medium truncate block hover:text-red-400 transition">{getTeamName(match.awayTeamId)}</span></div>
                      </div>
                      <div className="w-[100px] flex-shrink-0 flex items-center justify-end gap-2">
                        <span className="text-[10px] text-gray-400 whitespace-nowrap bg-gray-700/30 px-2 py-1 rounded-full flex items-center gap-1"><Target size={10} className="text-blue-400" />{match.homeCorners}-{match.awayCorners}</span>
                        <ChevronRight size={14} className="text-gray-500 group-hover:text-white transition" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* МОДАЛЬНОЕ ОКНО С ВКЛАДКАМИ */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3" onClick={() => setSelectedMatch(null)}>
          <div className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{getTeamName(selectedMatch.homeTeamId)} {selectedMatch.homeScore}:{selectedMatch.awayScore} {getTeamName(selectedMatch.awayTeamId)}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">{getLeagueName(selectedMatch.leagueId)} • {selectedMatch.date}</p>
              </div>
              <button onClick={() => setSelectedMatch(null)} className="p-1.5 hover:bg-gray-700 rounded-lg"><X size={18} /></button>
            </div>

            <div className="flex gap-1 bg-gray-700/30 rounded-lg m-3 p-1">
              <button onClick={() => setModalTab('match')} className={`flex-1 py-1.5 rounded text-xs font-medium transition ${modalTab === 'match' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>📋 Матч</button>
              <button onClick={() => setModalTab('half1')} className={`flex-1 py-1.5 rounded text-xs font-medium transition ${modalTab === 'half1' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>⏱️ 1-й тайм</button>
              <button onClick={() => setModalTab('half2')} className={`flex-1 py-1.5 rounded text-xs font-medium transition ${modalTab === 'half2' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>⏱️ 2-й тайм</button>
            </div>

            <div className="px-4 pb-4">
              <div className="bg-gray-700/30 rounded-lg p-3">
                {modalTab === 'match' && renderStats('')}
                {modalTab === 'half1' && renderStats('1H')}
                {modalTab === 'half2' && renderStats('2H')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Matches;