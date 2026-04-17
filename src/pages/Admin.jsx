import { useState } from 'react';
import { getData, addMatch, addLeague, addTeam, saveData } from '../data/store';
import { Save, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const Admin = () => {
  const [data, setData] = useState(getData());
  const [activeTab, setActiveTab] = useState('match');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [matchForm, setMatchForm] = useState({
    leagueId: data.leagues[0]?.id || '',
    homeTeamId: '',
    awayTeamId: '',
    homeScore: 0,
    awayScore: 0,
    homeCorners: 0,
    awayCorners: 0,
    homeCorners1H: 0,
    awayCorners1H: 0,
    homeCorners2H: 0,
    awayCorners2H: 0,
    homePossession1H: 50,
    awayPossession1H: 50,
    homePossession2H: 50,
    awayPossession2H: 50,
    homeXG: 0,
    awayXG: 0,
    homeShotsInsideBox: 0,
    awayShotsInsideBox: 0,
    homeShotsOutsideBox: 0,
    awayShotsOutsideBox: 0,
    homeDangerousAttacks: 0,
    awayDangerousAttacks: 0,
    homeSaves: 0,
    awaySaves: 0,
    homeYellowCards: 0,
    awayYellowCards: 0,
    homePassAccuracyFinalThird: 0,
    awayPassAccuracyFinalThird: 0,
    date: new Date().toISOString().split('T')[0]
  });
  
  const [leagueForm, setLeagueForm] = useState({
    name: '',
    country: '',
    avgTotalCorners: 9,
    avgCornersHome: 5,
    avgCornersAway: 4,
    avgXG: 1.2,
    avgShotsInsideBox: 7
  });
  
  const [teamForm, setTeamForm] = useState({
    name: '',
    leagueId: data.leagues[0]?.id || ''
  });
  
  const [message, setMessage] = useState('');

  const refreshData = () => {
    setData(getData());
  };

  const handleMatchSubmit = async (e) => {
    e.preventDefault();
    
    const formData = { ...matchForm };
    
    if (!formData.homeCorners1H && !formData.awayCorners1H) {
      formData.homeCorners1H = Math.round(formData.homeCorners * 0.5);
      formData.awayCorners1H = Math.round(formData.awayCorners * 0.5);
      formData.homeCorners2H = formData.homeCorners - formData.homeCorners1H;
      formData.awayCorners2H = formData.awayCorners - formData.awayCorners1H;
    }
    
    await addMatch(formData);
    setMessage('✅ Матч добавлен! Данные отправлены в облако ☁️');
    refreshData();
    
    setMatchForm({
      ...matchForm,
      homeScore: 0, awayScore: 0,
      homeCorners: 0, awayCorners: 0,
      homeCorners1H: 0, awayCorners1H: 0,
      homeCorners2H: 0, awayCorners2H: 0,
      homeXG: 0, awayXG: 0,
      homeShotsInsideBox: 0, awayShotsInsideBox: 0,
      homeDangerousAttacks: 0, awayDangerousAttacks: 0,
      date: new Date().toISOString().split('T')[0]
    });
    
    setTimeout(() => setMessage(''), 3000);
  };

  const handleLeagueSubmit = async (e) => {
    e.preventDefault();
    await addLeague(leagueForm);
    setMessage('✅ Лига добавлена!');
    refreshData();
    setLeagueForm({ name: '', country: '', avgTotalCorners: 9, avgCornersHome: 5, avgCornersAway: 4, avgXG: 1.2, avgShotsInsideBox: 7 });
    setTimeout(() => setMessage(''), 3000);
  };

  const handleTeamSubmit = async (e) => {
    e.preventDefault();
    await addTeam(teamForm);
    setMessage('✅ Команда добавлена!');
    refreshData();
    setTeamForm({ name: '', leagueId: data.leagues[0]?.id || '' });
    setTimeout(() => setMessage(''), 3000);
  };

  const deleteMatch = (matchId) => {
    const updatedData = { ...data, matches: data.matches.filter(m => m.id !== matchId) };
    saveData(updatedData);
    refreshData();
    setMessage('🗑️ Матч удален');
    setTimeout(() => setMessage(''), 3000);
  };

  const deleteLeague = (leagueId) => {
    const hasTeams = data.teams.some(t => t.leagueId === leagueId);
    if (hasTeams) {
      setMessage('❌ Сначала удалите все команды из этой лиги');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    const updatedData = { 
      ...data, 
      leagues: data.leagues.filter(l => l.id !== leagueId),
      matches: data.matches.filter(m => m.leagueId !== leagueId)
    };
    saveData(updatedData);
    refreshData();
    setMessage('🗑️ Лига удалена');
    setTimeout(() => setMessage(''), 3000);
  };

  const deleteTeam = (teamId) => {
    const hasMatches = data.matches.some(m => m.homeTeamId === teamId || m.awayTeamId === teamId);
    if (hasMatches) {
      setMessage('❌ Сначала удалите все матчи с этой командой');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    const updatedData = { ...data, teams: data.teams.filter(t => t.id !== teamId) };
    saveData(updatedData);
    refreshData();
    setMessage('🗑️ Команда удалена');
    setTimeout(() => setMessage(''), 3000);
  };

  const teamsInLeague = data.teams.filter(t => t.leagueId === matchForm.leagueId);

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Админ панель 2.0 🚀</h2>
        <p className="text-gray-400">Расширенные метрики + синхронизация с облаком ☁️</p>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg mb-6 ${
          message.includes('❌') 
            ? 'bg-red-600/20 border border-red-600 text-red-400'
            : 'bg-green-600/20 border border-green-600 text-green-400'
        }`}>
          {message}
        </div>
      )}

      <div className="flex space-x-2 mb-6">
        <TabButton active={activeTab === 'match'} onClick={() => setActiveTab('match')}>
          Матчи
        </TabButton>
        <TabButton active={activeTab === 'league'} onClick={() => setActiveTab('league')}>
          Лиги
        </TabButton>
        <TabButton active={activeTab === 'team'} onClick={() => setActiveTab('team')}>
          Команды
        </TabButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {activeTab === 'match' && (
            <form onSubmit={handleMatchSubmit} className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-6">
              <h3 className="text-xl font-bold mb-4">Добавить матч</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Лига</label>
                  <select value={matchForm.leagueId} onChange={(e) => setMatchForm({...matchForm, leagueId: e.target.value, homeTeamId: '', awayTeamId: ''})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" required>
                    {data.leagues.map(league => (
                      <option key={league.id} value={league.id}>{league.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Дата</label>
                  <input type="date" value={matchForm.date} onChange={(e) => setMatchForm({...matchForm, date: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Хозяева</label>
                  <select value={matchForm.homeTeamId} onChange={(e) => setMatchForm({...matchForm, homeTeamId: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" required>
                    <option value="">Выберите команду</option>
                    {teamsInLeague.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Гости</label>
                  <select value={matchForm.awayTeamId} onChange={(e) => setMatchForm({...matchForm, awayTeamId: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" required>
                    <option value="">Выберите команду</option>
                    {teamsInLeague.filter(t => t.id !== matchForm.homeTeamId).map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Голы Х</label>
                  <input type="number" min="0" value={matchForm.homeScore} 
                    onChange={(e) => setMatchForm({...matchForm, homeScore: parseInt(e.target.value) || 0})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Голы Г</label>
                  <input type="number" min="0" value={matchForm.awayScore}
                    onChange={(e) => setMatchForm({...matchForm, awayScore: parseInt(e.target.value) || 0})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Угловые Х</label>
                  <input type="number" min="0" value={matchForm.homeCorners}
                    onChange={(e) => setMatchForm({...matchForm, homeCorners: parseInt(e.target.value) || 0})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Угловые Г</label>
                  <input type="number" min="0" value={matchForm.awayCorners}
                    onChange={(e) => setMatchForm({...matchForm, awayCorners: parseInt(e.target.value) || 0})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition"
              >
                <span className="font-medium">🔥 Расширенные метрики (xG, владение, удары)</span>
                {showAdvanced ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {showAdvanced && (
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">xG Хозяев</label>
                      <input type="number" step="0.01" min="0" value={matchForm.homeXG}
                        onChange={(e) => setMatchForm({...matchForm, homeXG: parseFloat(e.target.value) || 0})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">xG Гостей</label>
                      <input type="number" step="0.01" min="0" value={matchForm.awayXG}
                        onChange={(e) => setMatchForm({...matchForm, awayXG: parseFloat(e.target.value) || 0})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Удары из штрафной Х</label>
                      <input type="number" min="0" value={matchForm.homeShotsInsideBox}
                        onChange={(e) => setMatchForm({...matchForm, homeShotsInsideBox: parseInt(e.target.value) || 0})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Удары из штрафной Г</label>
                      <input type="number" min="0" value={matchForm.awayShotsInsideBox}
                        onChange={(e) => setMatchForm({...matchForm, awayShotsInsideBox: parseInt(e.target.value) || 0})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Владение 1-й тайм Х (%)</label>
                      <input type="number" min="0" max="100" value={matchForm.homePossession1H}
                        onChange={(e) => setMatchForm({...matchForm, homePossession1H: parseInt(e.target.value) || 50})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Владение 2-й тайм Х (%)</label>
                      <input type="number" min="0" max="100" value={matchForm.homePossession2H}
                        onChange={(e) => setMatchForm({...matchForm, homePossession2H: parseInt(e.target.value) || 50})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" />
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2">
                <Save size={20} />
                Добавить матч и синхронизировать ☁️
              </button>
            </form>
          )}

          {activeTab === 'league' && (
            <form onSubmit={handleLeagueSubmit} className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-6">
              <h3 className="text-xl font-bold mb-4">Добавить лигу</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Название лиги</label>
                <input type="text" value={leagueForm.name} required
                  onChange={(e) => setLeagueForm({...leagueForm, name: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Страна</label>
                <input type="text" value={leagueForm.country} required
                  onChange={(e) => setLeagueForm({...leagueForm, country: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Тотал угловых</label>
                  <input type="number" step="0.1" value={leagueForm.avgTotalCorners}
                    onChange={(e) => setLeagueForm({...leagueForm, avgTotalCorners: parseFloat(e.target.value)})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Средний xG</label>
                  <input type="number" step="0.01" value={leagueForm.avgXG}
                    onChange={(e) => setLeagueForm({...leagueForm, avgXG: parseFloat(e.target.value)})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Удары из штрафной</label>
                  <input type="number" step="0.1" value={leagueForm.avgShotsInsideBox}
                    onChange={(e) => setLeagueForm({...leagueForm, avgShotsInsideBox: parseFloat(e.target.value)})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" />
                </div>
              </div>
              <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition">
                Добавить лигу
              </button>
            </form>
          )}

          {activeTab === 'team' && (
            <form onSubmit={handleTeamSubmit} className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-6">
              <h3 className="text-xl font-bold mb-4">Добавить команду</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Название команды</label>
                <input type="text" value={teamForm.name} required
                  onChange={(e) => setTeamForm({...teamForm, name: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Лига</label>
                <select value={teamForm.leagueId}
                  onChange={(e) => setTeamForm({...teamForm, leagueId: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3">
                  {data.leagues.map(league => (
                    <option key={league.id} value={league.id}>{league.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition">
                Добавить команду
              </button>
            </form>
          )}
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          {activeTab === 'match' && (
            <>
              <h3 className="text-xl font-bold mb-4">Последние матчи</h3>
              <div className="space-y-2 max-h-96 overflow-auto">
                {data.matches.slice().reverse().slice(0, 10).map(match => {
                  const homeTeam = data.teams.find(t => t.id === match.homeTeamId);
                  const awayTeam = data.teams.find(t => t.id === match.awayTeamId);
                  const league = data.leagues.find(l => l.id === match.leagueId);
                  
                  return (
                    <div key={match.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <div className="flex-1">
                        <div className="text-sm">{homeTeam?.name} vs {awayTeam?.name}</div>
                        <div className="text-xs text-gray-400">{league?.name} • {match.date}</div>
                      </div>
                      <button
                        onClick={() => deleteMatch(match.id)}
                        className="p-2 text-red-400 hover:bg-red-600/20 rounded-lg transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === 'league' && (
            <>
              <h3 className="text-xl font-bold mb-4">Все лиги</h3>
              <div className="space-y-2">
                {data.leagues.map(league => (
                  <div key={league.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div>
                      <div className="text-sm">{league.name}</div>
                      <div className="text-xs text-gray-400">{league.country}</div>
                    </div>
                    <button
                      onClick={() => deleteLeague(league.id)}
                      className="p-2 text-red-400 hover:bg-red-600/20 rounded-lg transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'team' && (
            <>
              <h3 className="text-xl font-bold mb-4">Все команды</h3>
              <div className="space-y-2">
                {data.leagues.map(league => (
                  <div key={league.id} className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-400 mb-2">{league.name}</h4>
                    {data.teams.filter(t => t.leagueId === league.id).map(team => (
                      <div key={team.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg mb-2">
                        <span className="text-sm">{team.name}</span>
                        <button
                          onClick={() => deleteTeam(team.id)}
                          className="p-2 text-red-400 hover:bg-red-600/20 rounded-lg transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, children }) => (
  <button onClick={onClick} className={`px-6 py-2 rounded-lg transition ${
    active ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
  }`}>
    {children}
  </button>
);

export default Admin;