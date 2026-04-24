import { useState, useEffect, memo } from 'react';
import { getData, addMatch, updateMatch, addLeague, addTeam, updateTeam, deleteMatch, deleteLeague, deleteTeam, subscribe, saveData, getSeasons, addSeason, updateSeason, deleteSeason, setActiveSeason, getTeamsForSeason, updateSeasonAverages, getActiveSeason } from '../data/store';
import { Save, Trash2, ChevronDown, ChevronUp, Plus, X, Edit, Search, RefreshCw, CheckCircle, Calendar, Download } from 'lucide-react';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
};

// Компонент поля с React.memo для предотвращения перерендера
const FieldRow = memo(({ label, fieldH, fieldA, isFloat, valueH, valueA, onChange }) => (
  <div className="grid grid-cols-2 gap-2">
    <div>
      <label className="block text-[11px] text-gray-400 mb-0.5">{label} Х</label>
      <input 
        type="text" 
        inputMode={isFloat ? 'decimal' : 'numeric'} 
        value={valueH} 
        onFocus={(e) => e.target.select()}
        onChange={(e) => onChange(fieldH, e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" 
      />
    </div>
    <div>
      <label className="block text-[11px] text-gray-400 mb-0.5">{label} Г</label>
      <input 
        type="text" 
        inputMode={isFloat ? 'decimal' : 'numeric'} 
        value={valueA} 
        onFocus={(e) => e.target.select()}
        onChange={(e) => onChange(fieldA, e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" 
      />
    </div>
  </div>
));

const Admin = () => {
  const [data, setData] = useState(getData());
  const defaultLeagueId = data.leagues?.[0]?.id || 'rpl';
  
  const [activeTab, setActiveTab] = useState('match');
  const [showMobileForm, setShowMobileForm] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [editingLeague, setEditingLeague] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeagueFilter, setSelectedLeagueFilter] = useState(defaultLeagueId);
  const [selectedSeasonFilter, setSelectedSeasonFilter] = useState('');
  const [selectedLeagueForSeasons, setSelectedLeagueForSeasons] = useState(defaultLeagueId);
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [editingSeason, setEditingSeason] = useState(null);
  const [message, setMessage] = useState('');
  const [formTab, setFormTab] = useState('match');
  
  const isMobile = useIsMobile();
  const activeSeason = getActiveSeason(selectedLeagueFilter);
  
  const getInitialMatchForm = () => ({
    leagueId: selectedLeagueFilter || defaultLeagueId,
    seasonId: activeSeason?.id || '',
    homeTeamId: '', awayTeamId: '',
    date: new Date().toISOString().split('T')[0], round: '',
    homeScore: '', awayScore: '',
    homeCorners: '', awayCorners: '',
    homeXG: '', awayXG: '',
    homePossession: '', awayPossession: '',
    homeTotalShots: '', awayTotalShots: '',
    homeShotsOnTarget: '', awayShotsOnTarget: '',
    homeYellowCards: '', awayYellowCards: '',
    homeRedCards: '', awayRedCards: '',
    homeShotsInsideBox: '', awayShotsInsideBox: '',
    homeSaves: '', awaySaves: '',
    homeFouls: '', awayFouls: '',
    homeScore1H: '', awayScore1H: '',
    homeCorners1H: '', awayCorners1H: '',
    homeXG1H: '', awayXG1H: '',
    homePossession1H: '', awayPossession1H: '',
    homeTotalShots1H: '', awayTotalShots1H: '',
    homeShotsOnTarget1H: '', awayShotsOnTarget1H: '',
    homeYellowCards1H: '', awayYellowCards1H: '',
    homeRedCards1H: '', awayRedCards1H: '',
    homeShotsInsideBox1H: '', awayShotsInsideBox1H: '',
    homeSaves1H: '', awaySaves1H: '',
    homeFouls1H: '', awayFouls1H: '',
    homeScore2H: '', awayScore2H: '',
    homeCorners2H: '', awayCorners2H: '',
    homeXG2H: '', awayXG2H: '',
    homePossession2H: '', awayPossession2H: '',
    homeTotalShots2H: '', awayTotalShots2H: '',
    homeShotsOnTarget2H: '', awayShotsOnTarget2H: '',
    homeYellowCards2H: '', awayYellowCards2H: '',
    homeRedCards2H: '', awayRedCards2H: '',
    homeShotsInsideBox2H: '', awayShotsInsideBox2H: '',
    homeSaves2H: '', awaySaves2H: '',
    homeFouls2H: '', awayFouls2H: '',
  });
  
  const [matchForm, setMatchForm] = useState(getInitialMatchForm());
  const [leagueForm, setLeagueForm] = useState({ name: '', country: '' });
  const [teamForm, setTeamForm] = useState({ name: '', leagueId: defaultLeagueId, seasonIds: [] });
  const [seasonForm, setSeasonForm] = useState({
    id: '', name: '', leagueId: defaultLeagueId,
    avgTotalCorners: '', avgCornersHome: '', avgCornersAway: '', avgXG: '', avgShotsInsideBox: ''
  });

  useEffect(() => { const unsubscribe = subscribe((newData) => setData(newData)); return () => unsubscribe(); }, []);
  useEffect(() => {
    if (activeSeason) { setSelectedSeasonFilter(activeSeason.id); setMatchForm(prev => ({ ...prev, seasonId: activeSeason.id, leagueId: selectedLeagueFilter })); }
  }, [selectedLeagueFilter, activeSeason]);

  const refreshData = () => setData(getData());
  const exportData = () => {
    const data = getData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `football-backup-${new Date().toISOString().split('T')[0]}.json`; a.click();
    URL.revokeObjectURL(url); setMessage('📥 База выгружена!'); setTimeout(() => setMessage(''), 3000);
  };

  const handleEditMatch = (match) => {
    setEditingMatch(match);
    const f = (v) => v?.toString() || '';
    setMatchForm({
      leagueId: match.leagueId || defaultLeagueId, seasonId: match.seasonId || activeSeason?.id || '',
      homeTeamId: match.homeTeamId || '', awayTeamId: match.awayTeamId || '',
      date: match.date || new Date().toISOString().split('T')[0], round: f(match.round),
      homeScore: f(match.homeScore), awayScore: f(match.awayScore),
      homeCorners: f(match.homeCorners), awayCorners: f(match.awayCorners),
      homeXG: f(match.homeXG), awayXG: f(match.awayXG),
      homePossession: f(match.homePossession), awayPossession: f(match.awayPossession),
      homeTotalShots: f(match.homeTotalShots), awayTotalShots: f(match.awayTotalShots),
      homeShotsOnTarget: f(match.homeShotsOnTarget), awayShotsOnTarget: f(match.awayShotsOnTarget),
      homeYellowCards: f(match.homeYellowCards), awayYellowCards: f(match.awayYellowCards),
      homeRedCards: f(match.homeRedCards), awayRedCards: f(match.awayRedCards),
      homeShotsInsideBox: f(match.homeShotsInsideBox), awayShotsInsideBox: f(match.awayShotsInsideBox),
      homeSaves: f(match.homeSaves), awaySaves: f(match.awaySaves),
      homeFouls: f(match.homeFouls), awayFouls: f(match.awayFouls),
      homeScore1H: f(match.homeScore1H), awayScore1H: f(match.awayScore1H),
      homeCorners1H: f(match.homeCorners1H), awayCorners1H: f(match.awayCorners1H),
      homeXG1H: f(match.homeXG1H), awayXG1H: f(match.awayXG1H),
      homePossession1H: f(match.homePossession1H), awayPossession1H: f(match.awayPossession1H),
      homeTotalShots1H: f(match.homeTotalShots1H), awayTotalShots1H: f(match.awayTotalShots1H),
      homeShotsOnTarget1H: f(match.homeShotsOnTarget1H), awayShotsOnTarget1H: f(match.awayShotsOnTarget1H),
      homeYellowCards1H: f(match.homeYellowCards1H), awayYellowCards1H: f(match.awayYellowCards1H),
      homeRedCards1H: f(match.homeRedCards1H), awayRedCards1H: f(match.awayRedCards1H),
      homeShotsInsideBox1H: f(match.homeShotsInsideBox1H), awayShotsInsideBox1H: f(match.awayShotsInsideBox1H),
      homeSaves1H: f(match.homeSaves1H), awaySaves1H: f(match.awaySaves1H),
      homeFouls1H: f(match.homeFouls1H), awayFouls1H: f(match.awayFouls1H),
      homeScore2H: f(match.homeScore2H), awayScore2H: f(match.awayScore2H),
      homeCorners2H: f(match.homeCorners2H), awayCorners2H: f(match.awayCorners2H),
      homeXG2H: f(match.homeXG2H), awayXG2H: f(match.awayXG2H),
      homePossession2H: f(match.homePossession2H), awayPossession2H: f(match.awayPossession2H),
      homeTotalShots2H: f(match.homeTotalShots2H), awayTotalShots2H: f(match.awayTotalShots2H),
      homeShotsOnTarget2H: f(match.homeShotsOnTarget2H), awayShotsOnTarget2H: f(match.awayShotsOnTarget2H),
      homeYellowCards2H: f(match.homeYellowCards2H), awayYellowCards2H: f(match.awayYellowCards2H),
      homeRedCards2H: f(match.homeRedCards2H), awayRedCards2H: f(match.awayRedCards2H),
      homeShotsInsideBox2H: f(match.homeShotsInsideBox2H), awayShotsInsideBox2H: f(match.awayShotsInsideBox2H),
      homeSaves2H: f(match.homeSaves2H), awaySaves2H: f(match.awaySaves2H),
      homeFouls2H: f(match.homeFouls2H), awayFouls2H: f(match.awayFouls2H),
    });
    setActiveTab('match'); setShowMobileForm(true);
  };

  // ИСПРАВЛЕННЫЕ ОБРАБОТЧИКИ (не пересоздают весь объект)
  const handleFloatChange = (field, value) => {
    let val = value.replace(/,/g, '.'); val = val.replace(/[^0-9.]/g, '');
    const parts = val.split('.'); if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
    setMatchForm(prev => ({ ...prev, [field]: val }));
  };
  
  const handleIntChange = (field, value) => {
    const val = value.replace(/[^0-9]/g, '');
    setMatchForm(prev => {
      if (field.toLowerCase().includes('possession') && val !== '') {
        const num = parseInt(val);
        if (num > 100) return { ...prev, [field]: '100' };
      }
      return { ...prev, [field]: val };
    });
  };

  const handleMatchSubmit = async (e) => {
    e.preventDefault(); const formData = { ...matchForm };
    if (!formData.seasonId || formData.seasonId === '') formData.seasonId = activeSeason?.id || '';
    if (!formData.leagueId) formData.leagueId = defaultLeagueId;
    Object.keys(formData).forEach(key => {
      if (typeof formData[key] === 'string' && key !== 'date' && key !== 'leagueId' && key !== 'seasonId' && key !== 'homeTeamId' && key !== 'awayTeamId') {
        if (key.includes('XG')) formData[key] = formData[key] === '' ? 0 : parseFloat(formData[key]) || 0;
        else if (key.toLowerCase().includes('possession')) { let v = parseInt(formData[key]) || 50; if (v > 100) v = 100; if (v < 0) v = 0; formData[key] = v; }
        else formData[key] = formData[key] === '' ? 0 : parseInt(formData[key]) || 0;
      }
    });
    if (!formData.homeCorners1H && !formData.awayCorners1H) {
      formData.homeCorners1H = Math.round(formData.homeCorners * 0.5); formData.awayCorners1H = Math.round(formData.awayCorners * 0.5);
      formData.homeCorners2H = formData.homeCorners - formData.homeCorners1H; formData.awayCorners2H = formData.awayCorners - formData.awayCorners1H;
    }
    if (editingMatch) { await updateMatch(editingMatch.id, formData); setMessage('✅ Матч обновлен!'); }
    else { await addMatch(formData); setMessage('✅ Матч добавлен!'); }
    refreshData(); setShowMobileForm(false); setEditingMatch(null); setMatchForm(getInitialMatchForm()); setTimeout(() => setMessage(''), 3000);
  };

  const handleLeagueSubmit = async (e) => {
    e.preventDefault();
    if (editingLeague) {
      const updatedData = { ...data, leagues: data.leagues.map(l => l.id === editingLeague.id ? { ...leagueForm, id: editingLeague.id } : l) };
      await saveData(updatedData); setMessage('✅ Лига обновлена!'); setEditingLeague(null);
    } else { await addLeague(leagueForm); setMessage('✅ Лига добавлена!'); }
    refreshData(); setLeagueForm({ name: '', country: '' }); setTimeout(() => setMessage(''), 3000);
  };

  const handleTeamSubmit = async (e) => {
    e.preventDefault();
    if (editingTeam) { await updateTeam(editingTeam.id, teamForm); setMessage('✅ Команда обновлена!'); setEditingTeam(null); }
    else { await addTeam(teamForm); setMessage('✅ Команда добавлена!'); }
    refreshData(); setTeamForm({ name: '', leagueId: defaultLeagueId, seasonIds: [] }); setTimeout(() => setMessage(''), 3000);
  };

  const handleSeasonSubmit = async (e) => {
    e.preventDefault(); const formData = { ...seasonForm };
    formData.avgTotalCorners = parseFloat(formData.avgTotalCorners) || 9; formData.avgCornersHome = parseFloat(formData.avgCornersHome) || 5;
    formData.avgCornersAway = parseFloat(formData.avgCornersAway) || 4; formData.avgXG = parseFloat(formData.avgXG) || 1.2;
    formData.avgShotsInsideBox = parseFloat(formData.avgShotsInsideBox) || 7; formData.isActive = editingSeason ? seasonForm.isActive : false;
    if (editingSeason) { await updateSeason(editingSeason.id, formData); setMessage('✅ Сезон обновлен!'); setEditingSeason(null); }
    else { await addSeason(formData); setMessage('✅ Сезон добавлен!'); }
    setSelectedLeagueForSeasons(formData.leagueId); refreshData(); setShowSeasonForm(false);
    setSeasonForm({ id: '', name: '', leagueId: formData.leagueId, avgTotalCorners: '', avgCornersHome: '', avgCornersAway: '', avgXG: '', avgShotsInsideBox: '' });
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDeleteMatch = async (matchId) => { if (window.confirm('Удалить матч?')) { await deleteMatch(matchId); refreshData(); setMessage('🗑️ Матч удален'); setTimeout(() => setMessage(''), 3000); } };
  const handleDeleteLeague = async (leagueId) => {
    if (data.teams?.some(t => t.leagueId === leagueId)) { setMessage('❌ Сначала удалите все команды'); setTimeout(() => setMessage(''), 3000); return; }
    if (window.confirm('Удалить лигу?')) { await deleteLeague(leagueId); refreshData(); setMessage('🗑️ Лига удалена'); setTimeout(() => setMessage(''), 3000); }
  };
  const handleDeleteTeam = async (teamId) => {
    if (data.matches?.some(m => m.homeTeamId === teamId || m.awayTeamId === teamId)) { setMessage('❌ Сначала удалите все матчи'); setTimeout(() => setMessage(''), 3000); return; }
    if (window.confirm('Удалить команду?')) { await deleteTeam(teamId); refreshData(); setMessage('🗑️ Команда удалена'); setTimeout(() => setMessage(''), 3000); }
  };
  const handleDeleteSeason = async (seasonId) => {
    if (data.matches?.some(m => m.seasonId === seasonId)) { setMessage('❌ Сначала удалите все матчи'); setTimeout(() => setMessage(''), 3000); return; }
    if (window.confirm('Удалить сезон?')) { await deleteSeason(seasonId); refreshData(); setMessage('🗑️ Сезон удален'); setTimeout(() => setMessage(''), 3000); }
  };

  const seasons = getSeasons(selectedLeagueFilter);
  const teamsForSeason = (() => {
    const teams = getTeamsForSeason(matchForm.leagueId, matchForm.seasonId);
    if (teams.length === 0 && activeSeason) return getTeamsForSeason(matchForm.leagueId, activeSeason.id);
    if (teams.length === 0) return data.teams?.filter(t => t.leagueId === matchForm.leagueId) || [];
    return teams;
  })();
  const allTeams = data.teams || [];
  const filteredMatches = (data.matches || []).filter(m => m.leagueId === selectedLeagueFilter).filter(m => !selectedSeasonFilter || m.seasonId === selectedSeasonFilter).filter(m => {
    if (!searchTerm) return true;
    const h = allTeams.find(t => t.id === m.homeTeamId)?.name || '', a = allTeams.find(t => t.id === m.awayTeamId)?.name || '';
    return `${h} ${a}`.toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const renderFields = (suffix) => {
    const s = suffix || '';
    const onChange = (field, value) => {
      if (field.includes('XG') || field.includes('xG')) handleFloatChange(field, value);
      else handleIntChange(field, value);
    };
    return (
      <div className="space-y-2">
        <FieldRow label="1. Голы" valueH={matchForm[`homeScore${s}`]} valueA={matchForm[`awayScore${s}`]} fieldH={`homeScore${s}`} fieldA={`awayScore${s}`} onChange={handleIntChange} />
        <FieldRow label="2. Угловые" valueH={matchForm[`homeCorners${s}`]} valueA={matchForm[`awayCorners${s}`]} fieldH={`homeCorners${s}`} fieldA={`awayCorners${s}`} onChange={handleIntChange} />
        <FieldRow label="3. xG" valueH={matchForm[`homeXG${s}`]} valueA={matchForm[`awayXG${s}`]} fieldH={`homeXG${s}`} fieldA={`awayXG${s}`} isFloat onChange={handleFloatChange} />
        <FieldRow label="4. Владение (%)" valueH={matchForm[`homePossession${s}`]} valueA={matchForm[`awayPossession${s}`]} fieldH={`homePossession${s}`} fieldA={`awayPossession${s}`} onChange={handleIntChange} />
        <FieldRow label="5. Всего ударов" valueH={matchForm[`homeTotalShots${s}`]} valueA={matchForm[`awayTotalShots${s}`]} fieldH={`homeTotalShots${s}`} fieldA={`awayTotalShots${s}`} onChange={handleIntChange} />
        <FieldRow label="6. Удары в створ" valueH={matchForm[`homeShotsOnTarget${s}`]} valueA={matchForm[`awayShotsOnTarget${s}`]} fieldH={`homeShotsOnTarget${s}`} fieldA={`awayShotsOnTarget${s}`} onChange={handleIntChange} />
        <FieldRow label="7. Жёлтые" valueH={matchForm[`homeYellowCards${s}`]} valueA={matchForm[`awayYellowCards${s}`]} fieldH={`homeYellowCards${s}`} fieldA={`awayYellowCards${s}`} onChange={handleIntChange} />
        <FieldRow label="8. Красные" valueH={matchForm[`homeRedCards${s}`]} valueA={matchForm[`awayRedCards${s}`]} fieldH={`homeRedCards${s}`} fieldA={`awayRedCards${s}`} onChange={handleIntChange} />
        <FieldRow label="9. Удары из штрафной" valueH={matchForm[`homeShotsInsideBox${s}`]} valueA={matchForm[`awayShotsInsideBox${s}`]} fieldH={`homeShotsInsideBox${s}`} fieldA={`awayShotsInsideBox${s}`} onChange={handleIntChange} />
        <FieldRow label="10. Сейвы" valueH={matchForm[`homeSaves${s}`]} valueA={matchForm[`awaySaves${s}`]} fieldH={`homeSaves${s}`} fieldA={`awaySaves${s}`} onChange={handleIntChange} />
        <FieldRow label="11. Фолы" valueH={matchForm[`homeFouls${s}`]} valueA={matchForm[`awayFouls${s}`]} fieldH={`homeFouls${s}`} fieldA={`awayFouls${s}`} onChange={handleIntChange} />
      </div>
    );
  };

  return (
    <div className="max-w-7xl">
      <div className="mb-4 md:mb-8 flex items-center justify-between">
        <div><h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Админ панель 9.0 🔥</h2><p className="text-sm md:text-base text-gray-400">Вкладки Матч / 1Т / 2Т</p></div>
        <button onClick={exportData} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition shadow-lg"><Download size={18} /><span className="hidden md:inline">Экспорт базы</span></button>
      </div>
      {message && (<div className={`px-4 py-3 rounded-lg mb-4 md:mb-6 text-sm md:text-base ${message.includes('❌') ? 'bg-red-600/20 border border-red-600 text-red-400' : 'bg-green-600/20 border border-green-600 text-green-400'}`}>{message}</div>)}
      <div className="flex space-x-1 md:space-x-2 mb-4 md:mb-6 overflow-x-auto pb-2">
        <TabButton active={activeTab === 'match'} onClick={() => { setActiveTab('match'); setEditingMatch(null); }}>Матчи</TabButton>
        <TabButton active={activeTab === 'league'} onClick={() => setActiveTab('league')}>Лиги</TabButton>
        <TabButton active={activeTab === 'team'} onClick={() => setActiveTab('team')}>Команды</TabButton>
        <TabButton active={activeTab === 'seasons'} onClick={() => setActiveTab('seasons')}>Сезоны</TabButton>
      </div>
      {isMobile && activeTab === 'match' && !showMobileForm && (<button onClick={() => setShowMobileForm(true)} className="fixed bottom-6 right-6 z-20 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg"><Plus size={28} /></button>)}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {(!isMobile || showMobileForm) && activeTab === 'match' && (
          <div className={`${isMobile ? 'fixed inset-0 z-50 bg-gray-900 overflow-auto p-4' : 'lg:col-span-2'}`}>
            {isMobile && (<div className="flex items-center justify-between mb-4"><h3 className="text-xl font-bold">{editingMatch ? 'Редактировать' : 'Добавить матч'}</h3><button onClick={() => { setShowMobileForm(false); setEditingMatch(null); setMatchForm(getInitialMatchForm()); }} className="p-2 text-gray-400 hover:text-white"><X size={24} /></button></div>)}
            <form onSubmit={handleMatchSubmit} className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-gray-400 mb-1">Лига</label><select value={matchForm.leagueId} onChange={(e) => { const nl = e.target.value; const ns = getActiveSeason(nl); setMatchForm({...matchForm, leagueId: nl, seasonId: ns?.id || '', homeTeamId: '', awayTeamId: ''}); setSelectedLeagueFilter(nl); }} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm">{data.leagues?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                <div><label className="block text-xs text-gray-400 mb-1">Сезон</label><select value={matchForm.seasonId} onChange={(e) => setMatchForm({...matchForm, seasonId: e.target.value, homeTeamId: '', awayTeamId: ''})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm"><option value="">Выберите сезон</option>{seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-gray-400 mb-1">Хозяева</label><select value={matchForm.homeTeamId} onChange={(e) => setMatchForm({...matchForm, homeTeamId: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm"><option value="">Выберите</option>{teamsForSeason.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                <div><label className="block text-xs text-gray-400 mb-1">Гости</label><select value={matchForm.awayTeamId} onChange={(e) => setMatchForm({...matchForm, awayTeamId: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm"><option value="">Выберите</option>{teamsForSeason.filter(t => t.id !== matchForm.homeTeamId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-gray-400 mb-1">Дата</label><input type="date" value={matchForm.date} onChange={(e) => setMatchForm({...matchForm, date: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm" /></div>
                <div><label className="block text-xs text-gray-400 mb-1">Тур</label><input type="text" inputMode="numeric" value={matchForm.round} onChange={(e) => handleIntChange('round', e.target.value)} placeholder="1" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm" /></div>
              </div>

              <div className="flex gap-1 bg-gray-700/30 rounded-lg p-1">
                <FormTabButton active={formTab === 'match'} onClick={() => setFormTab('match')}>📋 Матч</FormTabButton>
                <FormTabButton active={formTab === 'half1'} onClick={() => setFormTab('half1')}>⏱️ 1-й тайм</FormTabButton>
                <FormTabButton active={formTab === 'half2'} onClick={() => setFormTab('half2')}>⏱️ 2-й тайм</FormTabButton>
              </div>

              <div className="bg-gray-700/20 rounded-lg p-3">
                {formTab === 'match' && renderFields('')}
                {formTab === 'half1' && renderFields('1H')}
                {formTab === 'half2' && renderFields('2H')}
              </div>

              <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-lg text-sm flex items-center justify-center gap-2"><Save size={18} /> {editingMatch ? 'Сохранить' : 'Добавить матч'}</button>
              {(editingMatch || isMobile) && <button type="button" onClick={() => { setEditingMatch(null); setShowMobileForm(false); setMatchForm(getInitialMatchForm()); }} className="w-full bg-gray-700 text-white font-semibold py-3 rounded-lg text-sm">Отмена</button>}
            </form>
          </div>
        )}

        {activeTab === 'league' && (
          <div className="lg:col-span-2 space-y-4">
            <form onSubmit={handleLeagueSubmit} className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-4">
              <h3 className="text-lg font-bold">{editingLeague ? 'Редактировать лигу' : 'Добавить лигу'}</h3>
              <input type="text" value={leagueForm.name} placeholder="Название" required onChange={(e) => setLeagueForm({...leagueForm, name: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" />
              <input type="text" value={leagueForm.country} placeholder="Страна" required onChange={(e) => setLeagueForm({...leagueForm, country: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" />
              <div className="flex gap-2"><button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg">{editingLeague ? 'Сохранить' : 'Добавить'}</button>{editingLeague && <button type="button" onClick={() => { setEditingLeague(null); setLeagueForm({ name: '', country: '' }); }} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg">Отмена</button>}</div>
            </form>
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700"><h3 className="text-lg font-bold mb-3">Все лиги</h3><div className="space-y-2">{data.leagues?.map(league => (<div key={league.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"><div><div className="text-sm font-medium">{league.name}</div><div className="text-xs text-gray-400">{league.country}</div></div><div className="flex items-center gap-1"><button onClick={() => { setEditingLeague(league); setLeagueForm({ name: league.name, country: league.country }); }} className="p-2 text-blue-400 hover:bg-blue-600/20 rounded-lg"><Edit size={16} /></button><button onClick={() => handleDeleteLeague(league.id)} className="p-2 text-red-400 hover:bg-red-600/20 rounded-lg"><Trash2 size={16} /></button></div></div>))}</div></div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="lg:col-span-2 space-y-4">
            <form onSubmit={handleTeamSubmit} className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-4">
              <h3 className="text-lg font-bold">{editingTeam ? 'Редактировать команду' : 'Добавить команду'}</h3>
              <input type="text" value={teamForm.name} placeholder="Название" required onChange={(e) => setTeamForm({...teamForm, name: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" />
              <div><label className="block text-xs text-gray-400 mb-1">Лига</label><select value={teamForm.leagueId} onChange={(e) => setTeamForm({...teamForm, leagueId: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3">{data.leagues?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
              <div><label className="block text-xs text-gray-400 mb-2">Участвует в сезонах</label><div className="space-y-1 max-h-40 overflow-auto">{getSeasons(teamForm.leagueId).map(season => (<label key={season.id} className="flex items-center gap-2 p-2 bg-gray-700/30 rounded"><input type="checkbox" checked={teamForm.seasonIds?.includes(season.id)} onChange={(e) => { const newIds = e.target.checked ? [...(teamForm.seasonIds || []), season.id] : (teamForm.seasonIds || []).filter(id => id !== season.id); setTeamForm({...teamForm, seasonIds: newIds}); }} className="rounded bg-gray-900 border-gray-700" /><span className="text-sm">{season.name}</span></label>))}</div></div>
              <div className="flex gap-2"><button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg">{editingTeam ? 'Сохранить' : 'Добавить'}</button>{editingTeam && <button type="button" onClick={() => { setEditingTeam(null); setTeamForm({ name: '', leagueId: defaultLeagueId, seasonIds: [] }); }} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg">Отмена</button>}</div>
            </form>
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700"><h3 className="text-lg font-bold mb-3">Все команды</h3>{data.leagues?.map(league => (<div key={league.id} className="mb-4"><h4 className="text-sm font-semibold text-gray-400 mb-2">{league.name}</h4>{data.teams?.filter(t => t.leagueId === league.id).map(team => (<div key={team.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg mb-2"><div><span className="text-sm">{team.name}</span><div className="text-[10px] text-gray-400">{team.seasonIds?.join(', ')}</div></div><div className="flex gap-1"><button onClick={() => { setEditingTeam(team); setTeamForm({ name: team.name, leagueId: team.leagueId, seasonIds: team.seasonIds || [] }); }} className="p-2 text-blue-400 hover:bg-blue-600/20 rounded-lg"><Edit size={16} /></button><button onClick={() => handleDeleteTeam(team.id)} className="p-2 text-red-400 hover:bg-red-600/20 rounded-lg"><Trash2 size={16} /></button></div></div>))}</div>))}</div>
          </div>
        )}

        {activeTab === 'seasons' && (
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700"><label className="block text-xs text-gray-400 mb-2">Лига</label><select value={selectedLeagueForSeasons} onChange={(e) => setSelectedLeagueForSeasons(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3">{data.leagues?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
            {showSeasonForm && (<form onSubmit={handleSeasonSubmit} className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-4"><h3 className="text-lg font-bold">{editingSeason ? 'Редактировать' : 'Добавить сезон'}</h3><input type="text" value={seasonForm.id} placeholder="ID (2025/26)" required onChange={(e) => setSeasonForm({...seasonForm, id: e.target.value, name: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3" /><div><label className="block text-xs text-gray-400 mb-1">Лига</label><select value={seasonForm.leagueId} onChange={(e) => setSeasonForm({...seasonForm, leagueId: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3">{data.leagues?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div><div className="grid grid-cols-3 gap-2"><div><label className="block text-xs text-gray-400 mb-1">Тотал</label><input type="text" inputMode="decimal" value={seasonForm.avgTotalCorners} onChange={(e) => { let val = e.target.value.replace(/,/g, '.').replace(/[^0-9.]/g, ''); setSeasonForm({...seasonForm, avgTotalCorners: val}); }} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" /></div><div><label className="block text-xs text-gray-400 mb-1">Дома</label><input type="text" inputMode="decimal" value={seasonForm.avgCornersHome} onChange={(e) => { let val = e.target.value.replace(/,/g, '.').replace(/[^0-9.]/g, ''); setSeasonForm({...seasonForm, avgCornersHome: val}); }} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" /></div><div><label className="block text-xs text-gray-400 mb-1">В гостях</label><input type="text" inputMode="decimal" value={seasonForm.avgCornersAway} onChange={(e) => { let val = e.target.value.replace(/,/g, '.').replace(/[^0-9.]/g, ''); setSeasonForm({...seasonForm, avgCornersAway: val}); }} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" /></div></div><div className="flex gap-2"><button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg">{editingSeason ? 'Сохранить' : 'Добавить'}</button><button type="button" onClick={() => { setShowSeasonForm(false); setEditingSeason(null); }} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg">Отмена</button></div></form>)}
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700"><div className="flex items-center justify-between mb-3"><h3 className="text-lg font-bold">Сезоны</h3><button onClick={() => { setSeasonForm({ id: '', name: '', leagueId: selectedLeagueForSeasons, avgTotalCorners: '', avgCornersHome: '', avgCornersAway: '', avgXG: '', avgShotsInsideBox: '' }); setShowSeasonForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"><Plus size={14} /> Добавить</button></div><div className="space-y-2">{getSeasons(selectedLeagueForSeasons).map(season => (<div key={season.id} className={`flex items-center justify-between p-3 rounded-lg ${season.isActive ? 'bg-green-600/30 border border-green-600' : 'bg-gray-700/50'}`}><div className="flex-1"><div className="flex items-center gap-2"><span className="text-sm font-medium">{season.name}</span>{season.isActive && <span className="text-[10px] px-1.5 py-0.5 bg-green-600 rounded text-white flex items-center gap-1"><CheckCircle size={10} /> Активный</span>}</div><div className="text-xs text-gray-400">Тотал: {season.avgTotalCorners?.toFixed(1)} • Дома: {season.avgCornersHome?.toFixed(1)} • В гостях: {season.avgCornersAway?.toFixed(1)}</div></div><div className="flex items-center gap-1"><button onClick={async () => { await updateSeasonAverages(season.id); refreshData(); setMessage('✅ Средние обновлены!'); setTimeout(() => setMessage(''), 3000); }} className="p-2 text-green-400 hover:bg-green-600/20 rounded-lg"><RefreshCw size={16} /></button>{!season.isActive && <button onClick={async () => { await setActiveSeason(selectedLeagueForSeasons, season.id); refreshData(); setMessage(`✅ Сезон ${season.name} активирован!`); setTimeout(() => setMessage(''), 3000); }} className="p-2 text-green-400 hover:bg-green-600/20 rounded-lg"><CheckCircle size={16} /></button>}<button onClick={() => { setEditingSeason(season); setSeasonForm({ id: season.id, name: season.name, leagueId: season.leagueId, isActive: season.isActive, avgTotalCorners: season.avgTotalCorners?.toString() || '', avgCornersHome: season.avgCornersHome?.toString() || '', avgCornersAway: season.avgCornersAway?.toString() || '', avgXG: season.avgXG?.toString() || '', avgShotsInsideBox: season.avgShotsInsideBox?.toString() || '' }); setShowSeasonForm(true); }} className="p-2 text-blue-400 hover:bg-blue-600/20 rounded-lg"><Edit size={16} /></button><button onClick={() => handleDeleteSeason(season.id)} className="p-2 text-red-400 hover:bg-red-600/20 rounded-lg"><Trash2 size={16} /></button></div></div>))}</div></div>
          </div>
        )}

        <div className={`bg-gray-800 rounded-xl p-4 border border-gray-700 ${activeTab === 'match' && !isMobile ? '' : 'lg:col-span-1'}`}>
          {activeTab === 'match' && (<>
            <h3 className="text-lg font-bold mb-3">Матчи ({filteredMatches.length})</h3>
            <div className="space-y-2 mb-3"><div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Поиск..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm" /></div><select value={selectedSeasonFilter} onChange={(e) => setSelectedSeasonFilter(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"><option value="">Все сезоны</option>{seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div className="space-y-1.5 max-h-[500px] overflow-auto">{filteredMatches.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">Нет матчей</p> : filteredMatches.map(match => { const h = allTeams.find(t => t.id === match.homeTeamId), a = allTeams.find(t => t.id === match.awayTeamId), s = seasons.find(se => se.id === match.seasonId); return (<div key={match.id} className="flex items-center justify-between p-2.5 bg-gray-700/50 rounded-lg group"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-0.5"><span className="text-xs text-gray-400">{match.date}</span><span className="text-[10px] px-1.5 py-0.5 bg-gray-600 rounded text-gray-300">{s?.name}</span>{match.round && <span className="text-[10px] px-1.5 py-0.5 bg-blue-600/30 rounded text-blue-300">{match.round} тур</span>}</div><div className="text-sm truncate">{h?.name || '—'} {match.homeScore}:{match.awayScore} {a?.name || '—'}</div><div className="text-[10px] text-gray-400">Угл: {match.homeCorners}-{match.awayCorners}</div></div><div className="flex items-center gap-1 ml-2"><button onClick={() => handleEditMatch(match)} className="p-1.5 text-blue-400 hover:bg-blue-600/20 rounded-lg"><Edit size={14} /></button><button onClick={() => handleDeleteMatch(match.id)} className="p-1.5 text-red-400 hover:bg-red-600/20 rounded-lg"><Trash2 size={14} /></button></div></div>); })}</div>
            {!isMobile && <button onClick={() => { setEditingMatch(null); setMatchForm(getInitialMatchForm()); setShowMobileForm(true); }} className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm flex items-center justify-center gap-2"><Plus size={16} /> Добавить матч</button>}
          </>)}
          {activeTab === 'league' && <div className="lg:col-span-1"><h3 className="text-lg font-bold mb-3">Информация</h3><p className="text-sm text-gray-400">Лиги нужны для группировки.</p></div>}
          {activeTab === 'team' && <div className="lg:col-span-1"><h3 className="text-lg font-bold mb-3">Информация</h3><p className="text-sm text-gray-400">Отметьте сезоны.</p></div>}
          {activeTab === 'seasons' && (<div className="lg:col-span-1"><h3 className="text-lg font-bold mb-3">Информация</h3><div className="bg-gray-700/30 rounded-lg p-4"><p className="text-sm text-gray-300 mb-3"><Calendar size={16} className="inline mr-1" /> Сезоны:</p><ul className="text-xs text-gray-400 space-y-1 list-disc list-inside"><li>Создайте сезон перед добавлением матчей</li><li>Активный сезон по умолчанию</li><li>Команды привязываются отдельно</li></ul></div></div>)}
        </div>
      </div>
    </div>
  );
};

const FormTabButton = ({ active, onClick, children }) => (
  <button type="button" onClick={onClick} className={`flex-1 py-1.5 rounded text-xs font-medium transition ${active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>{children}</button>
);

const TabButton = ({ active, onClick, children }) => (
  <button onClick={onClick} className={`px-4 md:px-6 py-2 rounded-lg text-sm md:text-base whitespace-nowrap transition ${active ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>{children}</button>
);

export default Admin;