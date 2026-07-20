import { useState, useEffect } from 'react';
import { getData, saveData } from '../data/store';
import { X, Save, Wallet } from 'lucide-react';

const BetModal = ({ isOpen, onClose, matchData, total, recommendation, overProb, value }) => {
  const data = getData();
  
  const [betForm, setBetForm] = useState({
    date: new Date().toISOString().split('T')[0],
    leagueId: matchData?.leagueId || data.leagues?.[0]?.id || '',
    homeTeamId: matchData?.homeTeamId || '',
    awayTeamId: matchData?.awayTeamId || '',
    match: matchData?.homeTeam && matchData?.awayTeam ? `${matchData.homeTeam} - ${matchData.awayTeam}` : '',
    betType: 'total',
    selection: overProb > 50 ? 'over' : 'under',
    total: total || 9.5,
    odds: 1.85,
    stake: 1000,
    status: 'pending',
    profit: 0,
    value: value || null,
    notes: ''
  });

  const [message, setMessage] = useState('');

  // 🔧 Обновляем форму когда меняются matchData (команды)
  useEffect(() => {
    if (matchData?.homeTeam && matchData?.awayTeam) {
      setBetForm(prev => ({
        ...prev,
        match: `${matchData.homeTeam} - ${matchData.awayTeam}`,
        leagueId: matchData.leagueId || prev.leagueId,
        homeTeamId: matchData.homeTeamId || prev.homeTeamId,
        awayTeamId: matchData.awayTeamId || prev.awayTeamId,
      }));
    }
  }, [matchData]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const stake = betForm.stake;
    const profit = betForm.status === 'won' 
      ? Math.round(stake * (betForm.odds - 1) * 100) / 100
      : betForm.status === 'lost' 
      ? -stake 
      : 0;
    
    const newBet = { 
      ...betForm, 
      id: Date.now().toString(),
      profit,
      value: betForm.value || null,
    };
    
    // Вычитаем сумму ставки из банкролла
    const currentBankroll = data.bankroll?.current || 10000;
    const updatedBankroll = { 
      ...data.bankroll, 
      current: currentBankroll - stake 
    };
    
    const updatedData = { 
      ...data, 
      bets: [...(data.bets || []), newBet],
      bankroll: updatedBankroll
    };
    saveData(updatedData, null, true);
    
    setMessage('✅ Ставка добавлена!');
    setTimeout(() => {
      setMessage('');
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Wallet className="text-green-400" size={20} />
            Новая ставка
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {message ? (
          <p className="text-green-400 text-center py-4">{message}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Дата</label>
                <input type="date" value={betForm.date} onChange={(e) => setBetForm({...betForm, date: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Лига</label>
                <select value={betForm.leagueId} onChange={(e) => setBetForm({...betForm, leagueId: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                  {data.leagues?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-gray-400 mb-1">Матч</label>
              <input type="text" value={betForm.match} onChange={(e) => setBetForm({...betForm, match: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm" required />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Ставка</label>
                <select value={betForm.selection} onChange={(e) => setBetForm({...betForm, selection: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                  <option value="over">ТБ {betForm.total}</option>
                  <option value="under">ТМ {betForm.total}</option>
                  <option value="home">П1</option>
                  <option value="away">П2</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Тотал</label>
                <input type="number" step="0.5" value={betForm.total} onChange={(e) => setBetForm({...betForm, total: parseFloat(e.target.value)})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Кэф</label>
                <input type="number" step="0.01" value={betForm.odds} onChange={(e) => setBetForm({...betForm, odds: parseFloat(e.target.value)})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Сумма (₽)</label>
                <input type="number" value={betForm.stake} onChange={(e) => setBetForm({...betForm, stake: parseInt(e.target.value)})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm" required />
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-gray-400 mb-1">Статус</label>
              <select value={betForm.status} onChange={(e) => setBetForm({...betForm, status: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                <option value="pending">Ожидает</option>
                <option value="won">Выиграла</option>
                <option value="lost">Проиграла</option>
              </select>
            </div>
            
            <button type="submit" className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2">
              <Save size={16} /> Добавить ставку
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default BetModal;
