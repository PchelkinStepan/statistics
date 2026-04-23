import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getData, getSeasons, getLeagueTable, getActiveSeason } from '../data/store';

const LeagueTable = () => {
  const { leagueId } = useParams();
  const data = getData();
  const defaultLeagueId = leagueId || data.leagues?.[0]?.id || 'rpl';
  
  const [selectedLeague, setSelectedLeague] = useState(defaultLeagueId);
  const [selectedSeason, setSelectedSeason] = useState('');

  useEffect(() => {
    if (leagueId) {
      setSelectedLeague(leagueId);
    }
  }, [leagueId]);

  useEffect(() => {
    const activeSeason = getActiveSeason(selectedLeague);
    if (activeSeason) setSelectedSeason(activeSeason.id);
  }, [selectedLeague]);

  const seasons = getSeasons(selectedLeague);
  const table = getLeagueTable(selectedLeague, selectedSeason);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl md:text-2xl font-bold mb-1">Турнирная таблица</h2>
        <p className="text-xs md:text-sm text-gray-400">По сезонам</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={selectedLeague} onChange={(e) => setSelectedLeague(e.target.value)} className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm">
          {data.leagues?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)} className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm">
          <option value="">Все сезоны</option>
          {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-700">
            <tr className="text-left text-gray-300">
              <th className="py-3 px-3">#</th>
              <th className="py-3 px-3">Команда</th>
              <th className="py-3 px-3 text-center">И</th>
              <th className="py-3 px-3 text-center">В</th>
              <th className="py-3 px-3 text-center">Н</th>
              <th className="py-3 px-3 text-center">П</th>
              <th className="py-3 px-3 text-center">ГЗ</th>
              <th className="py-3 px-3 text-center">ГП</th>
              <th className="py-3 px-3 text-center">±</th>
              <th className="py-3 px-3 text-center">О</th>
            </tr>
          </thead>
          <tbody>
            {table.length === 0 ? (
              <tr><td colSpan="10" className="py-8 text-center text-gray-400">Нет данных</td></tr>
            ) : (
              table.map((team, i) => (
                <tr key={team.id} className="border-t border-gray-700 hover:bg-gray-750">
                  <td className="py-3 px-3 text-gray-400">{i + 1}</td>
                  <td className="py-3 px-3 font-medium">{team.name}</td>
                  <td className="py-3 px-3 text-center">{team.played}</td>
                  <td className="py-3 px-3 text-center">{team.wins}</td>
                  <td className="py-3 px-3 text-center">{team.draws}</td>
                  <td className="py-3 px-3 text-center">{team.losses}</td>
                  <td className="py-3 px-3 text-center">{team.goalsFor}</td>
                  <td className="py-3 px-3 text-center">{team.goalsAgainst}</td>
                  <td className="py-3 px-3 text-center">{team.goalDiff}</td>
                  <td className="py-3 px-3 text-center font-bold">{team.points}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeagueTable;