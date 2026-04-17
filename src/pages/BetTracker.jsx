import { useState } from 'react';
import { getData, saveData } from '../data/store';
import { 
  TrendingUp, Wallet, Plus, Trash2, 
  Check, X, Target, ChevronDown,
  BarChart3, Trophy, Clock, Edit
} from 'lucide-react';

const BetTracker = () => {
  const [data, setData] = useState(() => {
    const d = getData();
    if (!d.bets) d.bets = [];
    if (!d.bankroll) d.bankroll = { initial: 10000, current: 10000 };
    return d;
  });
  
  const [bets, setBets] = useState(data.bets || []);
  const [bankroll, setBankroll] = useState(data.bankroll || { initial: 10000, current: 10000 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLeague, setFilterLeague] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [editingBankroll, setEditingBankroll] = useState(false);
  const [newBankroll, setNewBankroll] = useState(bankroll.current);
  
  const [betForm, setBetForm] = useState({
    date: new Date().toISOString().split('T')[0],
    leagueId: data.leagues[0]?.id || '',
    match: '',
    betType: 'total',
    selection: 'over',
    total: 9.5,
    odds: 1.85,
    stake: 1000,
    status: 'pending',
    profit: 0,
    notes: ''
  });

  const leagues = data.leagues;

  // Сохранение данных
  const saveBets = (newBets, newBankroll) => {
    const updatedData = { 
      ...data, 
      bets: newBets, 
      bankroll: newBankroll 
    };
    setData(updatedData);
    saveData(updatedData);
  };

  // Обновление банкролла
  const updateBankroll = (newValue) => {
    const updated = { 
      ...bankroll, 
      current: parseFloat(newValue),
      initial: bankroll.initial 
    };
    setBankroll(updated);
    saveBets(bets, updated);
    setEditingBankroll(false);
  };

  // Добавление ставки
  const handleAddBet = (e) => {
    e.preventDefault();
    
    const newBet = {
      ...betForm,
      id: Date.now().toString(),
      profit: betForm.status === 'won' ? betForm.stake * (betForm.odds - 1) : 
              betForm.status === 'lost' ? -betForm.stake : 0
    };
    
    const updatedBets = [...bets, newBet];
    setBets(updatedBets);
    
    const totalProfit = updatedBets.reduce((sum, bet) => sum + (bet.profit || 0), 0);
    const updatedBankroll = {
      ...bankroll,
      current: bankroll.initial + totalProfit
    };
    setBankroll(updatedBankroll);
    
    saveBets(updatedBets, updatedBankroll);
    
    setBetForm({
      ...betForm,
      match: '',
      odds: 1.85,
      stake: 1000,
      notes: ''
    });
    setShowAddForm(false);
  };

  // Обновление статуса ставки
  const updateBetStatus = (betId, newStatus) => {
    const updatedBets = bets.map(bet => {
      if (bet.id === betId) {
        const profit = newStatus === 'won' ? bet.stake * (bet.odds - 1) : 
                      newStatus === 'lost' ? -bet.stake : 0;
        return { ...bet, status: newStatus, profit };
      }
      return bet;
    });
    
    setBets(updatedBets);
    
    const totalProfit = updatedBets.reduce((sum, bet) => sum + (bet.profit || 0), 0);
    const updatedBankroll = {
      ...bankroll,
      current: bankroll.initial + totalProfit
    };
    setBankroll(updatedBankroll);
    
    saveBets(updatedBets, updatedBankroll);
  };

  // Удаление ставки
  const deleteBet = (betId) => {
    const updatedBets = bets.filter(bet => bet.id !== betId);
    setBets(updatedBets);
    
    const totalProfit = updatedBets.reduce((sum, bet) => sum + (bet.profit || 0), 0);
    const updatedBankroll = {
      ...bankroll,
      current: bankroll.initial + totalProfit
    };
    setBankroll(updatedBankroll);
    
    saveBets(updatedBets, updatedBankroll);
  };

  // Фильтрация и сортировка
  const filteredBets = bets
    .filter(bet => filterStatus === 'all' || bet.status === filterStatus)
    .filter(bet => filterLeague === 'all' || bet.leagueId === filterLeague)
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'profit') return b.profit - a.profit;
      if (sortBy === 'odds') return b.odds - a.odds;
      return 0;
    });

  // Статистика
  const totalStake = filteredBets.reduce((sum, b) => sum + b.stake, 0);
  const totalProfit = filteredBets.reduce((sum, b) => sum + (b.profit || 0), 0);
  
  const stats = {
    total: filteredBets.length,
    won: filteredBets.filter(b => b.status === 'won').length,
    lost: filteredBets.filter(b => b.status === 'lost').length,
    pending: filteredBets.filter(b => b.status === 'pending').length,
    totalStake: totalStake,
    totalProfit: totalProfit,
    winRate: filteredBets.filter(b => b.status !== 'pending').length > 0 
      ? (filteredBets.filter(b => b.status === 'won').length / 
         filteredBets.filter(b => b.status !== 'pending').length * 100).toFixed(1)
      : 0,
    roi: totalStake > 0 ? (totalProfit / totalStake * 100).toFixed(1) : 0,
    avgOdds: filteredBets.length > 0
      ? (filteredBets.reduce((sum, b) => sum + b.odds, 0) / filteredBets.length).toFixed(2)
      : 0
  };

  const overallProfit = bankroll.current - bankroll.initial;
  const roiTotal = ((bankroll.current - bankroll.initial) / bankroll.initial * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Заголовок и банкролл */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3">
            <Wallet className="text-green-400" />
            Трекер ставок
          </h2>
          <p className="text-sm md:text-base text-gray-400">
            Учёт ставок, банкролл и аналитика
          </p>
        </div>
        
        {/* Банкролл */}
        <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">Текущий банк</p>
              {editingBankroll ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={newBankroll}
                    onChange={(e) => setNewBankroll(e.target.value)}
                    className="w-32 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xl font-bold"
                    autoFocus
                  />
                  <button
                    onClick={() => updateBankroll(newBankroll)}
                    className="p-2 bg-green-600 hover:bg-green-700 rounded-lg"
                  >
                    <Check size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className={`text-2xl md:text-3xl font-bold ${overallProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {bankroll.current.toLocaleString()} ₽
                  </span>
                  <button
                    onClick={() => setEditingBankroll(true)}
                    className="p-1 text-gray-400 hover:text-white"
                  >
                    <Edit size={16} />
                  </button>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Прибыль</p>
              <p className={`text-xl font-bold ${overallProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {overallProfit >= 0 ? '+' : ''}{overallProfit.toLocaleString()} ₽
              </p>
              <p className={`text-sm ${roiTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ROI: {roiTotal}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard icon={Target} label="Всего ставок" value={stats.total} color="blue" />
        <StatCard icon={Check} label="Выиграно" value={stats.won} color="green" />
        <StatCard icon={X} label="Проиграно" value={stats.lost} color="red" />
        <StatCard icon={Clock} label="Ожидает" value={stats.pending} color="yellow" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <StatCard icon={BarChart3} label="Win Rate" value={`${stats.winRate}%`} color="purple" />
        <StatCard icon={TrendingUp} label="ROI" value={`${stats.roi}%`} color={parseFloat(stats.roi) >= 0 ? 'green' : 'red'} />
        <StatCard icon={Wallet} label="Оборот" value={`${(stats.totalStake / 1000).toFixed(0)}k ₽`} color="gray" />
        <StatCard icon={Trophy} label="Прибыль" value={`${stats.totalProfit >= 0 ? '+' : ''}${stats.totalProfit.toLocaleString()} ₽`} color={stats.totalProfit >= 0 ? 'green' : 'red'} />
        <StatCard icon={Target} label="Ср. кэф" value={stats.avgOdds} color="blue" />
      </div>

      {/* Фильтры и кнопка добавления */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <FilterSelect
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { value: 'all', label: 'Все' },
              { value: 'won', label: 'Выигранные' },
              { value: 'lost', label: 'Проигранные' },
              { value: 'pending', label: 'Ожидают' }
            ]}
          />
          <FilterSelect
            value={filterLeague}
            onChange={setFilterLeague}
            options={[
              { value: 'all', label: 'Все лиги' },
              ...leagues.map(l => ({ value: l.id, label: l.name }))
            ]}
          />
          <FilterSelect
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: 'date', label: 'По дате' },
              { value: 'profit', label: 'По прибыли' },
              { value: 'odds', label: 'По кэфу' }
            ]}
          />
        </div>
        
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          Добавить ставку
        </button>
      </div>

      {/* Список ставок */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr className="text-left text-xs md:text-sm text-gray-300">
                <th className="py-3 px-3 md:px-4">Дата</th>
                <th className="py-3 px-3 md:px-4">Матч</th>
                <th className="py-3 px-3 md:px-4">Ставка</th>
                <th className="py-3 px-3 md:px-4">Кэф</th>
                <th className="py-3 px-3 md:px-4">Сумма</th>
                <th className="py-3 px-3 md:px-4">Результат</th>
                <th className="py-3 px-3 md:px-4">Прибыль</th>
                <th className="py-3 px-3 md:px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredBets.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-gray-400">
                    Нет ставок. Добавьте первую!
                  </td>
                </tr>
              ) : (
                filteredBets.map(bet => {
                  const league = leagues.find(l => l.id === bet.leagueId);
                  return (
                    <tr key={bet.id} className="border-t border-gray-700 hover:bg-gray-750 text-sm">
                      <td className="py-3 px-3 md:px-4 whitespace-nowrap">
                        {new Date(bet.date).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="py-3 px-3 md:px-4">
                        <div className="font-medium">{bet.match}</div>
                        <div className="text-xs text-gray-400">{league?.name}</div>
                      </td>
                      <td className="py-3 px-3 md:px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          bet.selection === 'over' ? 'bg-green-600/30 text-green-400' :
                          bet.selection === 'under' ? 'bg-red-600/30 text-red-400' :
                          'bg-blue-600/30 text-blue-400'
                        }`}>
                          {bet.selection === 'over' && `ТБ ${bet.total}`}
                          {bet.selection === 'under' && `ТМ ${bet.total}`}
                          {bet.selection === 'home' && 'П1'}
                          {bet.selection === 'away' && 'П2'}
                        </span>
                      </td>
                      <td className="py-3 px-3 md:px-4 font-medium">{bet.odds}</td>
                      <td className="py-3 px-3 md:px-4">{bet.stake} ₽</td>
                      <td className="py-3 px-3 md:px-4">
                        {bet.status === 'pending' ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => updateBetStatus(bet.id, 'won')}
                              className="p-1 bg-green-600/30 hover:bg-green-600 rounded"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => updateBetStatus(bet.id, 'lost')}
                              className="p-1 bg-red-600/30 hover:bg-red-600 rounded"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            bet.status === 'won' ? 'bg-green-600/30 text-green-400' : 'bg-red-600/30 text-red-400'
                          }`}>
                            {bet.status === 'won' ? 'Выигрыш' : 'Проигрыш'}
                          </span>
                        )}
                      </td>
                      <td className={`py-3 px-3 md:px-4 font-medium ${
                        bet.profit > 0 ? 'text-green-400' : bet.profit < 0 ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {bet.profit > 0 ? '+' : ''}{bet.profit} ₽
                      </td>
                      <td className="py-3 px-3 md:px-4">
                        <button
                          onClick={() => deleteBet(bet.id)}
                          className="p-1 text-gray-400 hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модалка добавления ставки */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-auto">
            <h3 className="text-xl font-bold mb-4">Новая ставка</h3>
            
            <form onSubmit={handleAddBet} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Дата</label>
                  <input
                    type="date"
                    value={betForm.date}
                    onChange={(e) => setBetForm({...betForm, date: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Лига</label>
                  <select
                    value={betForm.leagueId}
                    onChange={(e) => setBetForm({...betForm, leagueId: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5"
                  >
                    {leagues.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Матч</label>
                <input
                  type="text"
                  value={betForm.match}
                  onChange={(e) => setBetForm({...betForm, match: e.target.value})}
                  placeholder="Например: Зенит - Спартак"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Тип ставки</label>
                  <select
                    value={betForm.selection}
                    onChange={(e) => setBetForm({...betForm, selection: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5"
                  >
                    <option value="over">Тотал больше</option>
                    <option value="under">Тотал меньше</option>
                    <option value="home">Победа хозяев</option>
                    <option value="away">Победа гостей</option>
                  </select>
                </div>
                {(betForm.selection === 'over' || betForm.selection === 'under') && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Тотал</label>
                    <input
                      type="number"
                      step="0.5"
                      value={betForm.total}
                      onChange={(e) => setBetForm({...betForm, total: parseFloat(e.target.value)})}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5"
                    />
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Коэффициент</label>
                  <input
                    type="number"
                    step="0.01"
                    value={betForm.odds}
                    onChange={(e) => setBetForm({...betForm, odds: parseFloat(e.target.value)})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Сумма (₽)</label>
                  <input
                    type="number"
                    value={betForm.stake}
                    onChange={(e) => setBetForm({...betForm, stake: parseInt(e.target.value)})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Статус</label>
                <select
                  value={betForm.status}
                  onChange={(e) => setBetForm({...betForm, status: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5"
                >
                  <option value="pending">Ожидает</option>
                  <option value="won">Выиграла</option>
                  <option value="lost">Проиграла</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Заметка</label>
                <textarea
                  value={betForm.notes}
                  onChange={(e) => setBetForm({...betForm, notes: e.target.value})}
                  placeholder="Дополнительная информация..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5"
                  rows={2}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg"
                >
                  Добавить ставку
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => {
  const colors = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400',
    purple: 'text-purple-400',
    gray: 'text-gray-400'
  };
  
  return (
    <div className="bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-700">
      <Icon className={`${colors[color]} mb-2`} size={20} />
      <p className="text-xs md:text-sm text-gray-400">{label}</p>
      <p className="text-lg md:text-xl font-bold">{value}</p>
    </div>
  );
};

const FilterSelect = ({ value, onChange, options }) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="appearance-none bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 pr-8 text-sm cursor-pointer hover:bg-gray-700"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
  </div>
);

export default BetTracker;