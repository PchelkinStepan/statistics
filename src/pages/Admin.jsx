import { useState, useEffect } from 'react';
import { getData, addMatch, addLeague, addTeam, deleteMatch, deleteLeague, deleteTeam, subscribe, saveData, updateLeagueAverages } from '../data/store';
import { Save, Trash2, ChevronDown, ChevronUp, Plus, X, Edit, Search, RefreshCw } from 'lucide-react';

// Хук для определения мобильного устройства
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
};

const Admin = () => {
  const [data, setData] = useState(getData());
  const [activeTab, setActiveTab] = useState('match');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showByHalf, setShowByHalf] = useState(false);
  const [showMobileForm, setShowMobileForm] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [editingLeague, setEditingLeague] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeagueFilter, setSelectedLeagueFilter] = useState('all');
  const isMobile = useIsMobile();
  
  // Начальное состояние формы матча
  const getInitialMatchForm = () => ({
    leagueId: 'rpl',
    homeTeamId: '',
    awayTeamId: '',
    date: new Date().toISOString().split('T')[0],
    homeScore: '',
    awayScore: '',
    homeCorners: '',
    awayCorners: '',
    homeCorners1H: '',
    awayCorners1H: '',
    homeCorners2H: '',
    awayCorners2H: '',
    homeXG: '',
    awayXG: '',
    homeXG1H: '',
    awayXG1H: '',
    homeXG2H: '',
    awayXG2H: '',
    homeShotsInsideBox: '',
    awayShotsInsideBox: '',
    homeShotsInsideBox1H: '',
    awayShotsInsideBox1H: '',
    homeShotsInsideBox2H: '',
    awayShotsInsideBox2H: '',
    homeTotalShots: '',
    awayTotalShots: '',
    homeTotalShots1H: '',
    awayTotalShots1H: '',
    homeTotalShots2H: '',
    awayTotalShots2H: '',
    homeShotsOnTarget: '',
    awayShotsOnTarget: '',
    homeShotsOnTarget1H: '',
    awayShotsOnTarget1H: '',
    homeShotsOnTarget2H: '',
    awayShotsOnTarget2H: '',
    homePossession: '',
    awayPossession: '',
    homePossession1H: '',
    awayPossession1H: '',
    homePossession2H: '',
    awayPossession2H: '',
    homeSaves: '',
    awaySaves: '',
    homeSaves1H: '',
    awaySaves1H: '',
    homeSaves2H: '',
    awaySaves2H: '',
    homeYellowCards: '',
    awayYellowCards: '',
  });
  
  const [matchForm, setMatchForm] = useState(getInitialMatchForm());
  
  const [leagueForm, setLeagueForm] = useState({
    name: '',
    country: '',
    avgTotalCorners: '',
    avgCornersHome: '',
    avgCornersAway: '',
    avgXG: '',
    avgShotsInsideBox: ''
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

  // Загрузка матча в форму для редактирования
  const handleEditMatch = (match) => {
    setEditingMatch(match);
    setMatchForm({
      leagueId: match.leagueId || 'rpl',
      homeTeamId: match.homeTeamId || '',
      awayTeamId: match.awayTeamId || '',
      date: match.date || new Date().toISOString().split('T')[0],
      homeScore: match.homeScore?.toString() || '',
      awayScore: match.awayScore?.toString() || '',
      homeCorners: match.homeCorners?.toString() || '',
      awayCorners: match.awayCorners?.toString() || '',
      homeCorners1H: match.homeCorners1H?.toString() || '',
      awayCorners1H: match.awayCorners1H?.toString() || '',
      homeCorners2H: match.homeCorners2H?.toString() || '',
      awayCorners2H: match.awayCorners2H?.toString() || '',
      homeXG: match.homeXG?.toString() || '',
      awayXG: match.awayXG?.toString() || '',
      homeXG1H: match.homeXG1H?.toString() || '',
      awayXG1H: match.awayXG1H?.toString() || '',
      homeXG2H: match.homeXG2H?.toString() || '',
      awayXG2H: match.awayXG2H?.toString() || '',
      homeShotsInsideBox: match.homeShotsInsideBox?.toString() || '',
      awayShotsInsideBox: match.awayShotsInsideBox?.toString() || '',
      homeShotsInsideBox1H: match.homeShotsInsideBox1H?.toString() || '',
      awayShotsInsideBox1H: match.awayShotsInsideBox1H?.toString() || '',
      homeShotsInsideBox2H: match.homeShotsInsideBox2H?.toString() || '',
      awayShotsInsideBox2H: match.awayShotsInsideBox2H?.toString() || '',
      homeTotalShots: match.homeTotalShots?.toString() || '',
      awayTotalShots: match.awayTotalShots?.toString() || '',
      homeTotalShots1H: match.homeTotalShots1H?.toString() || '',
      awayTotalShots1H: match.awayTotalShots1H?.toString() || '',
      homeTotalShots2H: match.homeTotalShots2H?.toString() || '',
      awayTotalShots2H: match.awayTotalShots2H?.toString() || '',
      homeShotsOnTarget: match.homeShotsOnTarget?.toString() || '',
      awayShotsOnTarget: match.awayShotsOnTarget?.toString() || '',
      homeShotsOnTarget1H: match.homeShotsOnTarget1H?.toString() || '',
      awayShotsOnTarget1H: match.awayShotsOnTarget1H?.toString() || '',
      homeShotsOnTarget2H: match.homeShotsOnTarget2H?.toString() || '',
      awayShotsOnTarget2H: match.awayShotsOnTarget2H?.toString() || '',
      homePossession: match.homePossession?.toString() || '',
      awayPossession: match.awayPossession?.toString() || '',
      homePossession1H: match.homePossession1H?.toString() || '',
      awayPossession1H: match.awayPossession1H?.toString() || '',
      homePossession2H: match.homePossession2H?.toString() || '',
      awayPossession2H: match.awayPossession2H?.toString() || '',
      homeSaves: match.homeSaves?.toString() || '',
      awaySaves: match.awaySaves?.toString() || '',
      homeSaves1H: match.homeSaves1H?.toString() || '',
      awaySaves1H: match.awaySaves1H?.toString() || '',
      homeSaves2H: match.homeSaves2H?.toString() || '',
      awaySaves2H: match.awaySaves2H?.toString() || '',
      homeYellowCards: match.homeYellowCards?.toString() || '',
      awayYellowCards: match.awayYellowCards?.toString() || '',
    });
    setActiveTab('match');
    setShowMobileForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Универсальный обработчик для дробных чисел (xG)
  const handleFloatChange = (field, value) => {
    let val = value.replace(/,/g, '.');
    val = val.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
    setMatchForm({...matchForm, [field]: val});
  };

  // Обработчик для целых чисел
  const handleIntChange = (field, value) => {
    const val = value.replace(/[^0-9]/g, '');
    setMatchForm({...matchForm, [field]: val});
  };

  const handleMatchSubmit = async (e) => {
    e.preventDefault();
    
    const formData = { ...matchForm };
    Object.keys(formData).forEach(key => {
      if (typeof formData[key] === 'string') {
        if (key.includes('XG')) {
          formData[key] = formData[key] === '' ? 0 : parseFloat(formData[key]) || 0;
        } else if (key.includes('Possession')) {
          let val = parseInt(formData[key]) || 50;
          if (val > 100) val = 100;
          if (val < 0) val = 0;
          formData[key] = val;
        } else {
          formData[key] = formData[key] === '' ? 0 : parseInt(formData[key]) || 0;
        }
      }
    });
    
    if (!formData.homeCorners1H && !formData.awayCorners1H) {
      formData.homeCorners1H = Math.round(formData.homeCorners * 0.5);
      formData.awayCorners1H = Math.round(formData.awayCorners * 0.5);
      formData.homeCorners2H = formData.homeCorners - formData.homeCorners1H;
      formData.awayCorners2H = formData.awayCorners - formData.awayCorners1H;
    }
    
    if (editingMatch) {
      const updatedData = {
        ...data,
        matches: data.matches.map(m => 
          m.id === editingMatch.id ? { ...formData, id: editingMatch.id } : m
        )
      };
      await saveData(updatedData);
      setMessage('✅ Матч обновлен!');
    } else {
      await addMatch(formData);
      setMessage('✅ Матч добавлен!');
    }
    
    refreshData();
    setShowMobileForm(false);
    setEditingMatch(null);
    setMatchForm(getInitialMatchForm());
    
    setTimeout(() => setMessage(''), 3000);
  };

  const handleLeagueSubmit = async (e) => {
    e.preventDefault();
    
    const formData = { ...leagueForm };
    formData.avgTotalCorners = parseFloat(formData.avgTotalCorners) || 9;
    formData.avgCornersHome = parseFloat(formData.avgCornersHome) || 5;
    formData.avgCornersAway = parseFloat(formData.avgCornersAway) || 4;
    formData.avgXG = parseFloat(formData.avgXG) || 1.2;
    formData.avgShotsInsideBox = parseFloat(formData.avgShotsInsideBox) || 7;
    
    if (editingLeague) {
      const updatedData = {
        ...data,
        leagues: data.leagues.map(l => 
          l.id === editingLeague.id ? { ...formData, id: editingLeague.id } : l
        )
      };
      await saveData(updatedData);
      setMessage('✅ Лига обновлена!');
      setEditingLeague(null);
    } else {
      await addLeague(formData);
      setMessage('✅ Лига добавлена!');
    }
    
    refreshData();
    setLeagueForm({ name: '', country: '', avgTotalCorners: '', avgCornersHome: '', avgCornersAway: '', avgXG: '', avgShotsInsideBox: '' });
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
    if (window.confirm('Удалить матч?')) {
      await deleteMatch(matchId);
      refreshData();
      setMessage('🗑️ Матч удален');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDeleteLeague = async (leagueId) => {
    const hasTeams = data.teams.some(t => t.leagueId === leagueId);
    if (hasTeams) {
      setMessage('❌ Сначала удалите все команды из этой лиги');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    if (window.confirm('Удалить лигу?')) {
      await deleteLeague(leagueId);
      refreshData();
      setMessage('🗑️ Лига удалена');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    const hasMatches = data.matches.some(m => m.homeTeamId === teamId || m.awayTeamId === teamId);
    if (hasMatches) {
      setMessage('❌ Сначала удалите все матчи с этой командой');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    if (window.confirm('Удалить команду?')) {
      await deleteTeam(teamId);
      refreshData();
      setMessage('🗑️ Команда удалена');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const teamsInLeague = data.teams.filter(t => t.leagueId === matchForm.leagueId);

  const getFilteredMatches = () => {
    let matches = [...data.matches].reverse();
    if (selectedLeagueFilter !== 'all') {
      matches = matches.filter(m => m.leagueId === selectedLeagueFilter);
    }
    if (searchTerm) {
      matches = matches.filter(m => {
        const homeTeam = data.teams.find(t => t.id === m.homeTeamId)?.name || '';
        const awayTeam = data.teams.find(t => t.id === m.awayTeamId)?.name || '';
        return `${homeTeam} ${awayTeam}`.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }
    return matches;
  };

  const filteredMatches = getFilteredMatches();

  return (
    <div className="max-w-7xl">
      <div className="mb-4 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Админ панель 4.0 🔥</h2>
        <p className="text-sm md:text-base text-gray-400">xG с точкой/запятой — полностью рабочее!</p>
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
        <TabButton active={activeTab === 'match'} onClick={() => { setActiveTab('match'); setEditingMatch(null); }}>
          Матчи
        </TabButton>
        <TabButton active={activeTab === 'league'} onClick={() => setActiveTab('league')}>
          Лиги
        </TabButton>
        <TabButton active={activeTab === 'team'} onClick={() => setActiveTab('team')}>
          Команды
        </TabButton>
      </div>

      {isMobile && activeTab === 'match' && !showMobileForm && (
        <button
          onClick={() => setShowMobileForm(true)}
          className="fixed bottom-6 right-6 z-20 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg"
        >
          <Plus size={28} />
        </button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {(!isMobile || showMobileForm) && activeTab === 'match' && (
          <div className={`${isMobile ? 'fixed inset-0 z-50 bg-gray-900 overflow-auto p-4' : 'lg:col-span-2'}`}>
            {isMobile && (
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">{editingMatch ? 'Редактировать матч' : 'Добавить матч'}</h3>
                <button onClick={() => { setShowMobileForm(false); setEditingMatch(null); setMatchForm(getInitialMatchForm()); }} className="p-2 text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
            )}
            
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
                  <input type="text" inputMode="numeric" value={matchForm.homeScore} onFocus={(e) => e.target.select()}
                    onChange={(e) => handleIntChange('homeScore', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Голы Г</label>
                  <input type="text" inputMode="numeric" value={matchForm.awayScore} onFocus={(e) => e.target.select()}
                    onChange={(e) => handleIntChange('awayScore', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Угл Х</label>
                  <input type="text" inputMode="numeric" value={matchForm.homeCorners} onFocus={(e) => e.target.select()}
                    onChange={(e) => handleIntChange('homeCorners', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Угл Г</label>
                  <input type="text" inputMode="numeric" value={matchForm.awayCorners} onFocus={(e) => e.target.select()}
                    onChange={(e) => handleIntChange('awayCorners', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-sm" />
                </div>
              </div>

              <button type="button" onClick={() => setShowByHalf(!showByHalf)}
                className="w-full flex items-center justify-between px-3 py-2 bg-purple-600/30 hover:bg-purple-600/50 rounded-lg text-sm border border-purple-700">
                <span>⏱️ Разбивка по таймам</span>
                {showByHalf ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {showByHalf && (
                <div className="space-y-3 p-3 bg-gray-700/30 rounded-lg">
                  <p className="text-xs text-purple-400 font-medium mb-2">1-й тайм</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Угл Х</label>
                      <input type="text" inputMode="numeric" value={matchForm.homeCorners1H} onFocus={(e) => e.target.select()}
                        onChange={(e) => handleIntChange('homeCorners1H', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Угл Г</label>
                      <input type="text" inputMode="numeric" value={matchForm.awayCorners1H} onFocus={(e) => e.target.select()}
                        onChange={(e) => handleIntChange('awayCorners1H', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">xG Х</label>
                      <input type="text" inputMode="decimal" value={matchForm.homeXG1H} onFocus={(e) => e.target.select()}
                        onChange={(e) => handleFloatChange('homeXG1H', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">xG Г</label>
                      <input type="text" inputMode="decimal" value={matchForm.awayXG1H} onFocus={(e) => e.target.select()}
                        onChange={(e) => handleFloatChange('awayXG1H', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                  </div>
                  
                  <p className="text-xs text-purple-400 font-medium mb-2 mt-3">2-й тайм</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Угл Х</label>
                      <input type="text" inputMode="numeric" value={matchForm.homeCorners2H} onFocus={(e) => e.target.select()}
                        onChange={(e) => handleIntChange('homeCorners2H', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Угл Г</label>
                      <input type="text" inputMode="numeric" value={matchForm.awayCorners2H} onFocus={(e) => e.target.select()}
                        onChange={(e) => handleIntChange('awayCorners2H', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">xG Х</label>
                      <input type="text" inputMode="decimal" value={matchForm.homeXG2H} onFocus={(e) => e.target.select()}
                        onChange={(e) => handleFloatChange('homeXG2H', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">xG Г</label>
                      <input type="text" inputMode="decimal" value={matchForm.awayXG2H} onFocus={(e) => e.target.select()}
                        onChange={(e) => handleFloatChange('awayXG2H', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                  </div>
                </div>
              )}

              <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-700/50 rounded-lg text-sm">
                <span>🔥 Расширенные метрики</span>
                {showAdvanced ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {showAdvanced && (
                <div className="space-y-3 p-3 bg-gray-700/30 rounded-lg max-h-80 overflow-auto">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">xG Х</label>
                      <input type="text" inputMode="decimal" value={matchForm.homeXG} onFocus={(e) => e.target.select()}
                        onChange={(e) => handleFloatChange('homeXG', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">xG Г</label>
                      <input type="text" inputMode="decimal" value={matchForm.awayXG} onFocus={(e) => e.target.select()}
                        onChange={(e) => handleFloatChange('awayXG', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Удары из штрафной Х</label>
                      <input type="text" inputMode="numeric" value={matchForm.homeShotsInsideBox} onFocus={(e) => e.target.select()}
                        onChange={(e) => handleIntChange('homeShotsInsideBox', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Удары из штрафной Г</label>
                      <input type="text" inputMode="numeric" value={matchForm.awayShotsInsideBox} onFocus={(e) => e.target.select()}
                        onChange={(e) => handleIntChange('awayShotsInsideBox', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Всего ударов Х</label>
                      <input type="text" inputMode="numeric" value={matchForm.homeTotalShots} onFocus={(e) => e.target.select()}
                        onChange={(e) => handleIntChange('homeTotalShots', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Всего ударов Г</label>
                      <input type="text" inputMode="numeric" value={matchForm.awayTotalShots} onFocus={(e) => e.target.select()}
                        onChange={(e) => handleIntChange('awayTotalShots', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Удары в створ Х</label>
                      <input type="text" inputMode="numeric" value={matchForm.homeShotsOnTarget} onFocus={(e) => e.target.select()}
                        onChange={(e) => handleIntChange('homeShotsOnTarget', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Удары в створ Г</label>
                      <input type="text" inputMode="numeric" value={matchForm.awayShotsOnTarget} onFocus={(e) => e.target.select()}
                        onChange={(e) => handleIntChange('awayShotsOnTarget', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Владение Х (%)</label>
                      <input type="text" inputMode="numeric" value={matchForm.homePossession} onFocus={(e) => e.target.select()}
                        onChange={(e) => handleIntChange('homePossession', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Владение Г (%)</label>
                      <input type="text" inputMode="numeric" value={matchForm.awayPossession} onFocus={(e) => e.target.select()}
                        onChange={(e) => handleIntChange('awayPossession', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Сейвы Х</label>
                      <input type="text" inputMode="numeric" value={matchForm.homeSaves} onFocus={(e) => e.target.select()}
                        onChange={(e) => handleIntChange('homeSaves', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Сейвы Г</label>
                      <input type="text" inputMode="numeric" value={matchForm.awaySaves} onFocus={(e) => e.target.select()}
                        onChange={(e) => handleIntChange('awaySaves', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Жёлтые Х</label>
                      <input type="text" inputMode="numeric" value={matchForm.homeYellowCards} onFocus={(e) => e.target.select()}
                        onChange={(e) => handleIntChange('homeYellowCards', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Жёлтые Г</label>
                      <input type="text" inputMode="numeric" value={matchForm.awayYellowCards} onFocus={(e) => e.target.select()}
                        onChange={(e) => handleIntChange('awayYellowCards', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-lg text-sm flex items-center justify-center gap-2">
                <Save size={18} />
                {editingMatch ? 'Сохранить изменения' : 'Добавить матч'}
              </button>
              
              {editingMatch && (
                <button type="button" onClick={() => { setEditingMatch(null); setShowMobileForm(false); setMatchForm(getInitialMatchForm()); }}
                  className="w-full bg-gray-700 text-white font-semibold py-3 rounded-lg text-sm">
                  Отмена
                </button>
              )}
              
              {isMobile && !editingMatch && (
                <button type="button" onClick={() => { setShowMobileForm(false); setMatchForm(getInitialMatchForm()); }}
                  className="w-full bg-gray-700 text-white font-semibold py-3 rounded-lg text-sm">
                  Отмена
                </button>
              )}
            </form>
          </div>
        )}

        {/* Форма лиг */}
        {activeTab === 'league' && (
          <div className="lg:col-span-2 space-y-4">
            <form onSubmit={handleLeagueSubmit} className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-4">
              <h3 className="text-lg font-bold">{editingLeague ? 'Редактировать лигу' : 'Добавить лигу'}</h3>
              <input type="text" value={leagueForm.name} placeholder="Название" required
                onChange={(e) => setLeagueForm({...leagueForm, name: e.target.value})}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" />
              <input type="text" value={leagueForm.country} placeholder="Страна" required
                onChange={(e) => setLeagueForm({...leagueForm, country: e.target.value})}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Тотал</label>
                  <input type="text" inputMode="decimal" value={leagueForm.avgTotalCorners} 
                    onChange={(e) => {
                      let val = e.target.value.replace(/,/g, '.');
                      val = val.replace(/[^0-9.]/g, '');
                      const parts = val.split('.');
                      if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
                      setLeagueForm({...leagueForm, avgTotalCorners: val});
                    }}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Дома</label>
                  <input type="text" inputMode="decimal" value={leagueForm.avgCornersHome} 
                    onChange={(e) => {
                      let val = e.target.value.replace(/,/g, '.');
                      val = val.replace(/[^0-9.]/g, '');
                      const parts = val.split('.');
                      if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
                      setLeagueForm({...leagueForm, avgCornersHome: val});
                    }}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">В гостях</label>
                  <input type="text" inputMode="decimal" value={leagueForm.avgCornersAway} 
                    onChange={(e) => {
                      let val = e.target.value.replace(/,/g, '.');
                      val = val.replace(/[^0-9.]/g, '');
                      const parts = val.split('.');
                      if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
                      setLeagueForm({...leagueForm, avgCornersAway: val});
                    }}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg">
                  {editingLeague ? 'Сохранить' : 'Добавить лигу'}
                </button>
                {editingLeague && (
                  <button type="button" onClick={() => { setEditingLeague(null); setLeagueForm({ name: '', country: '', avgTotalCorners: '', avgCornersHome: '', avgCornersAway: '', avgXG: '', avgShotsInsideBox: '' }); }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg">
                    Отмена
                  </button>
                )}
              </div>
            </form>

            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h3 className="text-lg font-bold mb-3">Все лиги</h3>
              <div className="space-y-2">
                {data.leagues.map(league => (
                  <div key={league.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{league.name}</div>
                      <div className="text-xs text-gray-400">
                        {league.country} • Тотал: {league.avgTotalCorners?.toFixed(1)} • Дома: {league.avgCornersHome?.toFixed(1)} • В гостях: {league.avgCornersAway?.toFixed(1)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={async () => {
                          await updateLeagueAverages(league.id);
                          refreshData();
                          setMessage('✅ Средние обновлены по текущим матчам!');
                          setTimeout(() => setMessage(''), 3000);
                        }}
                        className="p-2 text-green-400 hover:bg-green-600/20 rounded-lg"
                        title="Обновить средние по матчам"
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingLeague(league);
                          setLeagueForm({
                            name: league.name,
                            country: league.country,
                            avgTotalCorners: league.avgTotalCorners?.toString() || '',
                            avgCornersHome: league.avgCornersHome?.toString() || '',
                            avgCornersAway: league.avgCornersAway?.toString() || '',
                            avgXG: league.avgXG?.toString() || '',
                            avgShotsInsideBox: league.avgShotsInsideBox?.toString() || ''
                          });
                        }}
                        className="p-2 text-blue-400 hover:bg-blue-600/20 rounded-lg"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteLeague(league.id)}
                        className="p-2 text-red-400 hover:bg-red-600/20 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Форма команд */}
        {activeTab === 'team' && (
          <div className="lg:col-span-2">
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
          </div>
        )}

        {/* Список матчей с поиском */}
        <div className={`bg-gray-800 rounded-xl p-4 border border-gray-700 ${activeTab === 'match' && !isMobile ? '' : 'lg:col-span-1'}`}>
          {activeTab === 'match' && (
            <>
              <h3 className="text-lg font-bold mb-3">Матчи ({filteredMatches.length})</h3>
              
              <div className="space-y-2 mb-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Поиск по командам..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm"
                  />
                </div>
                <select
                  value={selectedLeagueFilter}
                  onChange={(e) => setSelectedLeagueFilter(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">Все лиги</option>
                  {data.leagues.map(league => (
                    <option key={league.id} value={league.id}>{league.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 max-h-[500px] overflow-auto">
                {filteredMatches.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Нет матчей</p>
                ) : (
                  filteredMatches.map(match => {
                    const homeTeam = data.teams.find(t => t.id === match.homeTeamId);
                    const awayTeam = data.teams.find(t => t.id === match.awayTeamId);
                    const league = data.leagues.find(l => l.id === match.leagueId);
                    
                    return (
                      <div key={match.id} className="flex items-center justify-between p-2.5 bg-gray-700/50 rounded-lg group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs text-gray-400">{match.date}</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-600 rounded text-gray-300">
                              {league?.name}
                            </span>
                          </div>
                          <div className="text-sm truncate">
                            {homeTeam?.name} {match.homeScore}:{match.awayScore} {awayTeam?.name}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            Угл: {match.homeCorners}-{match.awayCorners}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => handleEditMatch(match)}
                            className="p-1.5 text-blue-400 hover:bg-blue-600/20 rounded-lg transition"
                            title="Редактировать"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteMatch(match.id)}
                            className="p-1.5 text-red-400 hover:bg-red-600/20 rounded-lg transition"
                            title="Удалить"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              {!isMobile && (
                <button
                  onClick={() => { setEditingMatch(null); setMatchForm(getInitialMatchForm()); setShowMobileForm(true); }}
                  className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Добавить матч
                </button>
              )}
            </>
          )}

          {activeTab === 'league' && (
            <div className="lg:col-span-1">
              <h3 className="text-lg font-bold mb-3">Статистика лиг</h3>
              <p className="text-sm text-gray-400">Выберите лигу слева для редактирования</p>
            </div>
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