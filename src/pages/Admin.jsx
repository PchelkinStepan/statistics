import { useState, useEffect } from 'react';
import { getData, addMatch, addLeague, addTeam, deleteMatch, deleteLeague, deleteTeam, subscribe } from '../data/store';
import { Save, Trash2, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';

const Admin = () => {
  const [data, setData] = useState(getData());
  const [activeTab, setActiveTab] = useState('match');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showByHalf, setShowByHalf] = useState(false);
  const [showMobileForm, setShowMobileForm] = useState(false);
  const isMobile = window.innerWidth < 768;
  
  const [matchForm, setMatchForm] = useState({
    leagueId: 'rpl',
    homeTeamId: '',
    awayTeamId: '',
    date: new Date().toISOString().split('T')[0],
    
    // Счёт
    homeScore: 0,
    awayScore: 0,
    
    // Угловые
    homeCorners: 0,
    awayCorners: 0,
    homeCorners1H: 0,
    awayCorners1H: 0,
    homeCorners2H: 0,
    awayCorners2H: 0,
    
    // xG
    homeXG: 0,
    awayXG: 0,
    homeXG1H: 0,
    awayXG1H: 0,
    homeXG2H: 0,
    awayXG2H: 0,
    
    // Удары из штрафной
    homeShotsInsideBox: 0,
    awayShotsInsideBox: 0,
    homeShotsInsideBox1H: 0,
    awayShotsInsideBox1H: 0,
    homeShotsInsideBox2H: 0,
    awayShotsInsideBox2H: 0,
    
    // Всего ударов
    homeTotalShots: 0,
    awayTotalShots: 0,
    homeTotalShots1H: 0,
    awayTotalShots1H: 0,
    homeTotalShots2H: 0,
    awayTotalShots2H: 0,
    
    // Удары в створ
    homeShotsOnTarget: 0,
    awayShotsOnTarget: 0,
    homeShotsOnTarget1H: 0,
    awayShotsOnTarget1H: 0,
    homeShotsOnTarget2H: 0,
    awayShotsOnTarget2H: 0,
    
    // Владение
    homePossession: 50,
    awayPossession: 50,
    homePossession1H: 50,
    awayPossession1H: 50,
    homePossession2H: 50,
    awayPossession2H: 50,
    
    // Сейвы
    homeSaves: 0,
    awaySaves: 0,
    homeSaves1H: 0,
    awaySaves1H: 0,
    homeSaves2H: 0,
    awaySaves2H: 0,
    
    // Жёлтые карточки
    homeYellowCards: 0,
    awayYellowCards: 0,
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
    leagueId: 'rpl'
  });
  
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsubscribe = subscribe((newData) => {
      setData(newData);
    });
    return () => unsubscribe();
  }, []);

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
    setMessage('✅ Матч добавлен!');
    refreshData();
    setShowMobileForm(false);
    
    setMatchForm({
      ...matchForm,
      homeScore: 0, awayScore: 0,
      homeCorners: 0, awayCorners: 0,
      homeCorners1H: 0, awayCorners1H: 0,
      homeCorners2H: 0, awayCorners2H: 0,
      homeXG: 0, awayXG: 0,
      homeShotsInsideBox: 0, awayShotsInsideBox: 0,
      homeTotalShots: 0, awayTotalShots: 0,
      homeShotsOnTarget: 0, awayShotsOnTarget: 0,
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
    setTeamForm({ name: '', leagueId: 'rpl' });
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDeleteMatch = async (matchId) => {
    await deleteMatch(matchId);
    refreshData();
    setMessage('🗑️ Матч удален');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDeleteLeague = async (leagueId) => {
    const hasTeams = data.teams.some(t => t.leagueId === leagueId);
    if (hasTeams) {
      setMessage('❌ Сначала удалите все команды из этой лиги');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    await deleteLeague(leagueId);
    refreshData();
    setMessage('🗑️ Лига удалена');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDeleteTeam = async (teamId) => {
    const hasMatches = data.matches.some(m => m.homeTeamId === teamId || m.awayTeamId === teamId);
    if (hasMatches) {
      setMessage('❌ Сначала удалите все матчи с этой командой');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    await deleteTeam(teamId);
    refreshData();
    setMessage('🗑️ Команда удалена');
    setTimeout(() => setMessage(''), 3000);
  };

  const teamsInLeague = data.teams.filter(t => t.leagueId === matchForm.leagueId);

  return (
    <div className="max-w-7xl">
      <div className="mb-4 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Админ панель 3.0 🔥</h2>
        <p className="text-sm md:text-base text-gray-400">Полная статистика по таймам + синхронизация ☁️</p>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg mb-4 md:mb-6 text-sm md:text-base ${
          message.includes('❌') 
            ? 'bg-red-600/20 border border-red-600 text-red-400'
            : 'bg-green-600/20 border border-green-600 text-green-400'
        }`}>
          {message}
        </div>
      )}

      <div className="flex space-x-1 md:space-x-2 mb-4 md:mb-6 overflow-x-auto pb-2">
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

      {isMobile && activeTab === 'match' && (
        <button
          onClick={() => setShowMobileForm(true)}
          className="fixed bottom-6 right-6 z-20 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg"
        >
          <Plus size={28} />
        </button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {(!isMobile || showMobileForm) && (
          <div className={`${isMobile ? 'fixed inset-0 z-50 bg-gray-900 overflow-auto p-4' : 'lg:col-span-2'}`}>
            {isMobile && (
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Добавить матч</h3>
                <button onClick={() => setShowMobileForm(false)} className="p-2 text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
            )}
            
            {activeTab === 'match' && (
              <form onSubmit={handleMatchSubmit} className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Лига</label>
                    <select value={matchForm.leagueId} onChange={(e) => setMatchForm({...matchForm, leagueId: e.target.value, homeTeamId: '', awayTeamId: ''})}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm">
                      {data.leagues.map(league => (
                        <option key={league.id} value={league.id}>{league.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Дата</label>
                    <input type="date" value={matchForm.date} onChange={(e) => setMatchForm({...matchForm, date: e.target.value})}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Хозяева</label>
                    <select value={matchForm.homeTeamId} onChange={(e) => setMatchForm({...matchForm, homeTeamId: e.target.value})}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm">
                      <option value="">Выберите команду</option>
                      {teamsInLeague.map(team => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Гости</label>
                    <select value={matchForm.awayTeamId} onChange={(e) => setMatchForm({...matchForm, awayTeamId: e.target.value})}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm">
                      <option value="">Выберите команду</option>
                      {teamsInLeague.filter(t => t.id !== matchForm.homeTeamId).map(team => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Голы Х</label>
                    <input type="number" min="0" value={matchForm.homeScore} 
                      onChange={(e) => setMatchForm({...matchForm, homeScore: parseInt(e.target.value) || 0})}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Голы Г</label>
                    <input type="number" min="0" value={matchForm.awayScore}
                      onChange={(e) => setMatchForm({...matchForm, awayScore: parseInt(e.target.value) || 0})}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Угл Х</label>
                    <input type="number" min="0" value={matchForm.homeCorners}
                      onChange={(e) => setMatchForm({...matchForm, homeCorners: parseInt(e.target.value) || 0})}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Угл Г</label>
                    <input type="number" min="0" value={matchForm.awayCorners}
                      onChange={(e) => setMatchForm({...matchForm, awayCorners: parseInt(e.target.value) || 0})}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-sm" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowByHalf(!showByHalf)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-purple-600/30 hover:bg-purple-600/50 rounded-lg text-sm border border-purple-700"
                >
                  <span>⏱️ Разбивка по таймам</span>
                  {showByHalf ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                {showByHalf && (
                  <div className="space-y-3 p-3 bg-gray-700/30 rounded-lg">
                    <p className="text-xs text-purple-400 font-medium mb-2">1-й тайм</p>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Угл Х 1Т</label>
                        <input type="number" min="0" value={matchForm.homeCorners1H}
                          onChange={(e) => setMatchForm({...matchForm, homeCorners1H: parseInt(e.target.value) || 0})}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Угл Г 1Т</label>
                        <input type="number" min="0" value={matchForm.awayCorners1H}
                          onChange={(e) => setMatchForm({...matchForm, awayCorners1H: parseInt(e.target.value) || 0})}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">xG Х 1Т</label>
                        <input type="number" step="0.01" min="0" value={matchForm.homeXG1H}
                          onChange={(e) => setMatchForm({...matchForm, homeXG1H: parseFloat(e.target.value) || 0})}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">xG Г 1Т</label>
                        <input type="number" step="0.01" min="0" value={matchForm.awayXG1H}
                          onChange={(e) => setMatchForm({...matchForm, awayXG1H: parseFloat(e.target.value) || 0})}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-sm" />
                      </div>
                    </div>
                    
                    <p className="text-xs text-purple-400 font-medium mb-2 mt-3">2-й тайм</p>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Угл Х 2Т</label>
                        <input type="number" min="0" value={matchForm.homeCorners2H}
                          onChange={(e) => setMatchForm({...matchForm, homeCorners2H: parseInt(e.target.value) || 0})}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Угл Г 2Т</label>
                        <input type="number" min="0" value={matchForm.awayCorners2H}
                          onChange={(e) => setMatchForm({...matchForm, awayCorners2H: parseInt(e.target.value) || 0})}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">xG Х 2Т</label>
                        <input type="number" step="0.01" min="0" value={matchForm.homeXG2H}
                          onChange={(e) => setMatchForm({...matchForm, homeXG2H: parseFloat(e.target.value) || 0})}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">xG Г 2Т</label>
                        <input type="number" step="0.01" min="0" value={matchForm.awayXG2H}
                          onChange={(e) => setMatchForm({...matchForm, awayXG2H: parseFloat(e.target.value) || 0})}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-sm" />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-700/50 rounded-lg text-sm"
                >
                  <span>🔥 Расширенные метрики</span>
                  {showAdvanced ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                {showAdvanced && (
                  <div className="space-y-3 p-3 bg-gray-700/30 rounded-lg">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">xG Хозяев</label>
                        <input type="number" step="0.01" min="0" value={matchForm.homeXG}
                          onChange={(e) => setMatchForm({...matchForm, homeXG: parseFloat(e.target.value) || 0})}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">xG Гостей</label>
                        <input type="number" step="0.01" min="0" value={matchForm.awayXG}
                          onChange={(e) => setMatchForm({...matchForm, awayXG: parseFloat(e.target.value) || 0})}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Удары из штрафной Х</label>
                        <input type="number" min="0" value={matchForm.homeShotsInsideBox}
                          onChange={(e) => setMatchForm({...matchForm, homeShotsInsideBox: parseInt(e.target.value) || 0})}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Удары из штрафной Г</label>
                        <input type="number" min="0" value={matchForm.awayShotsInsideBox}
                          onChange={(e) => setMatchForm({...matchForm, awayShotsInsideBox: parseInt(e.target.value) || 0})}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Всего ударов Х</label>
                        <input type="number" min="0" value={matchForm.homeTotalShots}
                          onChange={(e) => setMatchForm({...matchForm, homeTotalShots: parseInt(e.target.value) || 0})}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Всего ударов Г</label>
                        <input type="number" min="0" value={matchForm.awayTotalShots}
                          onChange={(e) => setMatchForm({...matchForm, awayTotalShots: parseInt(e.target.value) || 0})}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Удары в створ Х</label>
                        <input type="number" min="0" value={matchForm.homeShotsOnTarget}
                          onChange={(e) => setMatchForm({...matchForm, homeShotsOnTarget: parseInt(e.target.value) || 0})}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Удары в створ Г</label>
                        <input type="number" min="0" value={matchForm.awayShotsOnTarget}
                          onChange={(e) => setMatchForm({...matchForm, awayShotsOnTarget: parseInt(e.target.value) || 0})}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Владение Х (%)</label>
                        <input type="number" min="0" max="100" value={matchForm.homePossession}
                          onChange={(e) => setMatchForm({...matchForm, homePossession: parseInt(e.target.value) || 50})}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Владение Г (%)</label>
                        <input type="number" min="0" max="100" value={matchForm.awayPossession}
                          onChange={(e) => setMatchForm({...matchForm, awayPossession: parseInt(e.target.value) || 50})}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Сейвы Х</label>
                        <input type="number" min="0" value={matchForm.homeSaves}
                          onChange={(e) => setMatchForm({...matchForm, homeSaves: parseInt(e.target.value) || 0})}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Сейвы Г</label>
                        <input type="number" min="0" value={matchForm.awaySaves}
                          onChange={(e) => setMatchForm({...matchForm, awaySaves: parseInt(e.target.value) || 0})}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Жёлтые Х</label>
                        <input type="number" min="0" value={matchForm.homeYellowCards}
                          onChange={(e) => setMatchForm({...matchForm, homeYellowCards: parseInt(e.target.value) || 0})}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Жёлтые Г</label>
                        <input type="number" min="0" value={matchForm.awayYellowCards}
                          onChange={(e) => setMatchForm({...matchForm, awayYellowCards: parseInt(e.target.value) || 0})}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </div>
                  </div>
                )}

                <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-lg text-sm flex items-center justify-center gap-2">
                  <Save size={18} />
                  Добавить матч
                </button>
                
                {isMobile && (
                  <button type="button" onClick={() => setShowMobileForm(false)}
                    className="w-full bg-gray-700 text-white font-semibold py-3 rounded-lg text-sm">
                    Отмена
                  </button>
                )}
              </form>
            )}

            {activeTab === 'league' && (
              <form onSubmit={handleLeagueSubmit} className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-4">
                <h3 className="text-lg font-bold">Добавить лигу</h3>
                <input type="text" value={leagueForm.name} placeholder="Название" required
                  onChange={(e) => setLeagueForm({...leagueForm, name: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" />
                <input type="text" value={leagueForm.country} placeholder="Страна" required
                  onChange={(e) => setLeagueForm({...leagueForm, country: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" />
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" step="0.1" value={leagueForm.avgTotalCorners} placeholder="Тотал"
                    onChange={(e) => setLeagueForm({...leagueForm, avgTotalCorners: parseFloat(e.target.value)})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" />
                  <input type="number" step="0.1" value={leagueForm.avgCornersHome} placeholder="Дома"
                    onChange={(e) => setLeagueForm({...leagueForm, avgCornersHome: parseFloat(e.target.value)})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" />
                  <input type="number" step="0.1" value={leagueForm.avgCornersAway} placeholder="В гостях"
                    onChange={(e) => setLeagueForm({...leagueForm, avgCornersAway: parseFloat(e.target.value)})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" />
                </div>
                <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg">
                  Добавить лигу
                </button>
              </form>
            )}

            {activeTab === 'team' && (
              <form onSubmit={handleTeamSubmit} className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-4">
                <h3 className="text-lg font-bold">Добавить команду</h3>
                <input type="text" value={teamForm.name} placeholder="Название" required
                  onChange={(e) => setTeamForm({...teamForm, name: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" />
                <select value={teamForm.leagueId} onChange={(e) => setTeamForm({...teamForm, leagueId: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3">
                  {data.leagues.map(league => (
                    <option key={league.id} value={league.id}>{league.name}</option>
                  ))}
                </select>
                <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg">
                  Добавить команду
                </button>
              </form>
            )}
          </div>
        )}

        {/* Список элементов */}
        <div className={`bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700 ${isMobile && activeTab === 'match' ? '' : 'lg:col-span-1'}`}>
          {activeTab === 'match' && (
            <>
              <h3 className="text-lg font-bold mb-3">Последние матчи</h3>
              <div className="space-y-2 max-h-96 overflow-auto">
                {data.matches.slice().reverse().slice(0, 10).map(match => {
                  const homeTeam = data.teams.find(t => t.id === match.homeTeamId);
                  const awayTeam = data.teams.find(t => t.id === match.awayTeamId);
                  const league = data.leagues.find(l => l.id === match.leagueId);
                  
                  return (
                    <div key={match.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{homeTeam?.name} vs {awayTeam?.name}</div>
                        <div className="text-xs text-gray-400">{league?.name} • {match.date}</div>
                      </div>
                      <button
                        onClick={() => handleDeleteMatch(match.id)}
                        className="p-2 text-red-400 hover:bg-red-600/20 rounded-lg ml-2"
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
              <h3 className="text-lg font-bold mb-3">Все лиги</h3>
              <div className="space-y-2">
                {data.leagues.map(league => (
                  <div key={league.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div>
                      <div className="text-sm">{league.name}</div>
                      <div className="text-xs text-gray-400">{league.country}</div>
                    </div>
                    <button
                      onClick={() => handleDeleteLeague(league.id)}
                      className="p-2 text-red-400 hover:bg-red-600/20 rounded-lg"
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
              <h3 className="text-lg font-bold mb-3">Все команды</h3>
              <div className="space-y-2">
                {data.leagues.map(league => (
                  <div key={league.id} className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-400 mb-2">{league.name}</h4>
                    {data.teams.filter(t => t.leagueId === league.id).map(team => (
                      <div key={team.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg mb-2">
                        <span className="text-sm">{team.name}</span>
                        <button
                          onClick={() => handleDeleteTeam(team.id)}
                          className="p-2 text-red-400 hover:bg-red-600/20 rounded-lg"
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
  <button 
    onClick={onClick} 
    className={`px-4 md:px-6 py-2 rounded-lg text-sm md:text-base whitespace-nowrap transition ${
      active 
        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
    }`}
  >
    {children}
  </button>
);

export default Admin;