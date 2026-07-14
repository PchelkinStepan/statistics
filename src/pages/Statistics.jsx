import { useState, useEffect } from 'react';
import { getData, subscribe } from '../data/store';
import { Activity, TrendingUp, Target, Trophy, Zap, Shield, Swords, Eye, BarChart3, ArrowUp, ArrowDown } from 'lucide-react';

const Statistics = () => {
  const [data, setData] = useState(getData());
  const [selectedLeague, setSelectedLeague] = useState(data.leagues?.[0]?.id || 'rpl');
  const [selectedSeason, setSelectedSeason] = useState('');

  useEffect(() => {
    const unsubscribe = subscribe((newData) => setData(newData));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const activeSeason = data.seasons?.find(s => s.leagueId === selectedLeague && s.isActive);
    if (activeSeason) setSelectedSeason(activeSeason.id);
  }, [selectedLeague, data]);

  const seasons = data.seasons?.filter(s => s.leagueId === selectedLeague) || [];
  const teams = data.teams?.filter(t => t.leagueId === selectedLeague && (!selectedSeason || t.seasonIds?.includes(selectedSeason))) || [];
  const matches = data.matches?.filter(m => m.leagueId === selectedLeague && (!selectedSeason || m.seasonId === selectedSeason)) || [];

  // Вычисляем статистику по командам
  const teamStats = teams.map(team => {
    const teamMatches = matches.filter(m => m.homeTeamId === team.id || m.awayTeamId === team.id);
    if (teamMatches.length === 0) return null;

    let stats = {
      teamId: team.id,
      teamName: team.name,
      matchesPlayed: teamMatches.length,
      totalCornersFor: 0,
      totalCornersAgainst: 0,
      totalGoalsFor: 0,
      totalGoalsAgainst: 0,
      totalXG: 0,
      totalXGA: 0,
      totalShots: 0,
      totalShotsOnTarget: 0,
      totalPossession: 0,
      totalFouls: 0,
      totalSaves: 0,
      totalYellowCards: 0,
      totalRedCards: 0,
      totalCorners1H: 0,
      totalCornersAgainst1H: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      recentCorners: [],
      recentGoals: [],
    };

    teamMatches.forEach(m => {
      const isHome = m.homeTeamId === team.id;
      const cornersFor = isHome ? (m.homeCorners || 0) : (m.awayCorners || 0);
      const cornersAgainst = isHome ? (m.awayCorners || 0) : (m.homeCorners || 0);
      const goalsFor = isHome ? (m.homeScore || 0) : (m.awayScore || 0);
      const goalsAgainst = isHome ? (m.awayScore || 0) : (m.homeScore || 0);
      const xG = isHome ? (m.homeXG || 0) : (m.awayXG || 0);
      const xGA = isHome ? (m.awayXG || 0) : (m.homeXG || 0);
      const shots = isHome ? (m.homeTotalShots || 0) : (m.awayTotalShots || 0);
      const shotsOnTarget = isHome ? (m.homeShotsOnTarget || 0) : (m.awayShotsOnTarget || 0);
      const possession = isHome ? (m.homePossession || 50) : (m.awayPossession || 50);
      const fouls = isHome ? (m.homeFouls || 0) : (m.awayFouls || 0);
      const saves = isHome ? (m.homeSaves || 0) : (m.awaySaves || 0);
      const yellowCards = isHome ? (m.homeYellowCards || 0) : (m.awayYellowCards || 0);
      const redCards = isHome ? (m.homeRedCards || 0) : (m.awayRedCards || 0);
      const corners1H = isHome ? (m.homeCorners1H || 0) : (m.awayCorners1H || 0);
      const cornersAgainst1H = isHome ? (m.awayCorners1H || 0) : (m.homeCorners1H || 0);

      stats.totalCornersFor += cornersFor;
      stats.totalCornersAgainst += cornersAgainst;
      stats.totalGoalsFor += goalsFor;
      stats.totalGoalsAgainst += goalsAgainst;
      stats.totalXG += xG;
      stats.totalXGA += xGA;
      stats.totalShots += shots;
      stats.totalShotsOnTarget += shotsOnTarget;
      stats.totalPossession += possession;
      stats.totalFouls += fouls;
      stats.totalSaves += saves;
      stats.totalYellowCards += yellowCards;
      stats.totalRedCards += redCards;
      stats.totalCorners1H += corners1H;
      stats.totalCornersAgainst1H += cornersAgainst1H;

      if (goalsFor > goalsAgainst) stats.wins++;
      else if (goalsFor === goalsAgainst) stats.draws++;
      else stats.losses++;

      stats.recentCorners.push(cornersFor);
      stats.recentGoals.push(goalsFor);
    });

    const n = stats.matchesPlayed;
    return {
      ...stats,
      avgCornersFor: (stats.totalCornersFor / n).toFixed(2),
      avgCornersAgainst: (stats.totalCornersAgainst / n).toFixed(2),
      avgGoalsFor: (stats.totalGoalsFor / n).toFixed(2),
      avgGoalsAgainst: (stats.totalGoalsAgainst / n).toFixed(2),
      avgXG: (stats.totalXG / n).toFixed(2),
      avgXGA: (stats.totalXGA / n).toFixed(2),
      avgShots: (stats.totalShots / n).toFixed(1),
      avgShotsOnTarget: (stats.totalShotsOnTarget / n).toFixed(1),
      avgPossession: (stats.totalPossession / n).toFixed(1),
      avgFouls: (stats.totalFouls / n).toFixed(1),
      avgSaves: (stats.totalSaves / n).toFixed(1),
      avgYellowCards: (stats.totalYellowCards / n).toFixed(1),
      avgRedCards: (stats.totalRedCards / n).toFixed(1),
      avgCorners1H: (stats.totalCorners1H / n).toFixed(2),
      avgCornersAgainst1H: (stats.totalCornersAgainst1H / n).toFixed(2),
      points: stats.wins * 3 + stats.draws,
      form: stats.recentCorners.slice(-5),
      goalsForm: stats.recentGoals.slice(-5),
    };
  }).filter(Boolean);

  // Топ-5 в каждой категории
  const getTop5 = (key, ascending = false) => {
    return [...teamStats]
      .sort((a, b) => ascending ? parseFloat(a[key]) - parseFloat(b[key]) : parseFloat(b[key]) - parseFloat(a[key]))
      .slice(0, 5);
  };

  const topCornersFor = getTop5('avgCornersFor');
  const topCornersAgainst = getTop5('avgCornersAgainst');
  const topGoalsFor = getTop5('avgGoalsFor');
  const topXG = getTop5('avgXG');
  const topShots = getTop5('avgShots');
  const topPossession = getTop5('avgPossession');
  const topFouls = getTop5('avgFouls');
  const topSaves = getTop5('avgSaves');
  const topCorners1H = getTop5('avgCorners1H');
  const topCornersAgainst1H = getTop5('avgCornersAgainst1H');

  const StatCard = ({ icon: Icon, title, data, color, suffix = '', dataKey }) => (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Icon size={16} className={color} /> {title}
      </h4>
      <div className="space-y-1.5">
        {data.map((team, i) => (
          <div key={team.teamId} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-5">{i + 1}.</span>
              <span className="font-medium truncate max-w-[150px]">{team.teamName}</span>
            </div>
            <span className="font-bold text-white">{team[dataKey]}{suffix}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-3">
          <Activity className="text-blue-400" /> Статистика
        </h2>
        <p className="text-sm md:text-base text-gray-400">
          Детальная статистика по лигам и сезонам
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={selectedLeague} onChange={(e) => setSelectedLeague(e.target.value)}
          className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm">
          {data.leagues?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)}
          className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm">
          <option value="">Все сезоны</option>
          {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Target} title="Самая подающая (угловые)" data={topCornersFor} color="text-blue-400" dataKey="avgCornersFor" />
        <StatCard icon={Shield} title="Больше всего даёт угловых" data={topCornersAgainst} color="text-red-400" dataKey="avgCornersAgainst" />
        <StatCard icon={Trophy} title="Самая результативная (голы)" data={topGoalsFor} color="text-green-400" dataKey="avgGoalsFor" />
        <StatCard icon={Activity} title="Наибольший xG" data={topXG} color="text-purple-400" dataKey="avgXG" />
        <StatCard icon={Zap} title="Больше всего ударов" data={topShots} color="text-yellow-400" dataKey="avgShots" />
        <StatCard icon={Eye} title="Наибольшее владение (%)" data={topPossession} color="text-cyan-400" dataKey="avgPossession" />
        <StatCard icon={Swords} title="Самая фолящая" data={topFouls} color="text-orange-400" dataKey="avgFouls" />
        <StatCard icon={Shield} title="Больше всего сейвов" data={topSaves} color="text-indigo-400" dataKey="avgSaves" />
        <StatCard icon={Target} title="Угловые в 1-м тайме" data={topCorners1H} color="text-blue-400" dataKey="avgCorners1H" />
        <StatCard icon={Shield} title="Угловые соперника в 1-м тайме" data={topCornersAgainst1H} color="text-red-400" dataKey="avgCornersAgainst1H" />
      </div>

      {/* Тренды последних 5 матчей */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-green-400" /> Тренды угловых (последние 5 матчей)
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-700">
              <tr className="text-left text-gray-300">
                <th className="py-2 px-3">Команда</th>
                <th className="py-2 px-3 text-center">Среднее</th>
                <th className="py-2 px-3 text-center" colSpan={5}>Последние 5 матчей</th>
                <th className="py-2 px-3 text-center">Тренд</th>
              </tr>
            </thead>
            <tbody>
              {teamStats.sort((a, b) => parseFloat(b.avgCornersFor) - parseFloat(a.avgCornersFor)).slice(0, 10).map(team => {
                const form = team.form;
                const trend = form.length >= 2 ? (form[form.length - 1] - form[0]) : 0;
                return (
                  <tr key={team.teamId} className="border-t border-gray-700">
                    <td className="py-2 px-3 font-medium">{team.teamName}</td>
                    <td className="py-2 px-3 text-center font-bold">{team.avgCornersFor}</td>
                    {[0,1,2,3,4].map(i => (
                      <td key={i} className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          form[i] >= parseFloat(team.avgCornersFor) ? 'bg-green-600/30 text-green-400' : 'bg-red-600/30 text-red-400'
                        }`}>
                          {form[i] || '—'}
                        </span>
                      </td>
                    ))}
                    <td className="py-2 px-3 text-center">
                      {trend > 0 ? <ArrowUp size={16} className="text-green-400 inline" /> : 
                       trend < 0 ? <ArrowDown size={16} className="text-red-400 inline" /> : 
                       <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
