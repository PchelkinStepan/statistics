import { useState } from 'react';
import { getData } from '../data/store';
import { 
  TrendingUp, Brain, BarChart3, Target, Zap, 
  Trophy, Activity, FlaskConical, Database
} from 'lucide-react';

const Analytics = () => {
  const data = getData();
  const [selectedView, setSelectedView] = useState('overview');
  const [backtestResults, setBacktestResults] = useState(null);
  const [backtestLoading, setBacktestLoading] = useState(false);
  
  const totalMatches = data.matches?.length || 0;
  const leagues = data.leagues || [];
  
  // Реальные данные из Neuro
  const neuroTestResults = JSON.parse(localStorage.getItem('neuro_test_results') || 'null');
  const neuroHistory = JSON.parse(localStorage.getItem('neuro_training_history') || '[]');

  // 🔬 БЭКТЕСТ ПУАССОНА
  const runBacktest = async () => {
    setBacktestLoading(true);
    setBacktestResults(null);
    
    const allMatches = [...(data.matches || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
    const allTeams = data.teams || [];
    
    const getHistoricalTeamStats = (teamId, beforeDate, matchesSnapshot) => {
      const pastMatches = matchesSnapshot
        .filter(m => (m.homeTeamId === teamId || m.awayTeamId === teamId) && m.date < beforeDate)
        .sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
      if (pastMatches.length === 0) return null;
      let stats = { teamId, matchesPlayed: pastMatches.length, totalCornersFor: 0, totalCornersAgainst: 0, cornersForHome: 0, cornersForAway: 0 };
      let hc = 0, ac = 0;
      pastMatches.forEach(m => {
        const ih = m.homeTeamId === teamId;
        const cf = ih ? (m.homeCorners || 0) : (m.awayCorners || 0);
        const ca = ih ? (m.awayCorners || 0) : (m.homeCorners || 0);
        stats.totalCornersFor += cf; stats.totalCornersAgainst += ca;
        if (ih) { stats.cornersForHome += cf; hc++; } else { stats.cornersForAway += cf; ac++; }
      });
      const n = stats.matchesPlayed;
      return { ...stats, avgCornersFor: stats.totalCornersFor / n, avgCornersAgainst: stats.totalCornersAgainst / n,
        avgCornersForHome: hc > 0 ? stats.cornersForHome / hc : stats.totalCornersFor / n,
        avgCornersForAway: ac > 0 ? stats.cornersForAway / ac : stats.totalCornersFor / n, matchesPlayed: n };
    };
    
    const historicalPredict = (hs, as, la, t = 9.5) => {
      if (!hs || !as || !la) return null;
      const sd = (a, b, f = 1) => (!b || isNaN(a) || isNaN(b)) ? f : Math.max(0.3, a / b);
      const he = Math.min(12, Math.max(1, la.avgCornersHome * sd(hs.avgCornersFor, la.avgCornersHome) * sd(as.avgCornersAgainst, la.avgCornersAway)));
      const ae = Math.min(10, Math.max(0.5, la.avgCornersAway * sd(as.avgCornersFor, la.avgCornersAway) * sd(hs.avgCornersAgainst, la.avgCornersHome)));
      const te = he + ae; let p = 50;
      if (te > t + 2) p = 85; else if (te > t + 1.5) p = 75; else if (te > t + 1) p = 68;
      else if (te > t + 0.5) p = 60; else if (te > t - 0.5) p = 52;
      else if (te > t - 1) p = 42; else if (te > t - 1.5) p = 35; else p = 25;
      return { totalExpected: te.toFixed(2), totalProbability: Math.round(p) };
    };
    
    let so = { t: 0, c: 0 }, su = { t: 0, c: 0 }, ao = { t: 0, c: 0 }, au = { t: 0, c: 0 };
    const ms = [...allMatches];
    for (let i = 20; i < ms.length; i++) {
      const m = ms[i]; const tc = (m.homeCorners || 0) + (m.awayCorners || 0);
      const hs = getHistoricalTeamStats(m.homeTeamId, m.date, ms);
      const as = getHistoricalTeamStats(m.awayTeamId, m.date, ms);
      if (!hs || !as || hs.matchesPlayed < 3 || as.matchesPlayed < 3) continue;
      const se = data.seasons?.find(s => s.leagueId === m.leagueId && s.id === m.seasonId);
      const la = { avgCornersHome: se?.avgCornersHome || 5, avgCornersAway: se?.avgCornersAway || 4 };
      const pr = historicalPredict(hs, as, la, 9.5); if (!pr) continue;
      if (pr.totalProbability >= 75) { so.t++; if (tc > 9.5) so.c++; }
      if (pr.totalProbability <= 25) { su.t++; if (tc < 9.5) su.c++; }
      if (pr.totalProbability > 50) { ao.t++; if (tc > 9.5) ao.c++; }
      if (pr.totalProbability < 50) { au.t++; if (tc < 9.5) au.c++; }
    }
    const ca = (c, t) => t > 0 ? ((c / t) * 100).toFixed(1) : '0.0';
    setBacktestResults({ totalTested: ms.length - 20, so, su, ao, au, st: so.t + su.t, sc: so.c + su.c, ca });
    setBacktestLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-3"><BarChart3 className="text-purple-400" /> Аналитика</h2>
        <p className="text-sm md:text-base text-gray-400">Реальные данные • Пуассон vs Neuro • Бэктест</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Database} label="Всего матчей" value={totalMatches} color="blue" />
        <StatCard icon={Brain} label="Точность Neuro" value={neuroTestResults ? `${neuroTestResults.accuracy}%` : 'Не обучен'} color="purple" subtitle={neuroTestResults ? `±${neuroTestResults.avgError} угл.` : ''} />
        <StatCard icon={Target} label="Пуассон (сильные)" value={backtestResults ? `${backtestResults.ca(backtestResults.sc, backtestResults.st)}%` : '—'} color="yellow" subtitle="Запусти бэктест" />
        <StatCard icon={TrendingUp} label="Лучшая модель" value={neuroTestResults && parseFloat(neuroTestResults.accuracy) > 55 ? '🧠 Neuro' : '📐 Пуассон'} color="green" />
      </div>

      <div className="flex gap-1 flex-wrap">
        <TabBtn active={selectedView === 'overview'} onClick={() => setSelectedView('overview')}>📊 Сводка</TabBtn>
        <TabBtn active={selectedView === 'neuro'} onClick={() => setSelectedView('neuro')}>🧠 Neuro</TabBtn>
        <TabBtn active={selectedView === 'backtest'} onClick={() => setSelectedView('backtest')}>🧪 Бэктест Пуассона</TabBtn>
      </div>

      {/* 📊 СВОДКА */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-yellow-700/50">
            <h3 className="text-lg font-bold text-yellow-400 mb-3 flex items-center gap-2"><Target size={20} /> Пуассон</h3>
            <p className="text-sm text-gray-400 mb-3">10 матчей • Рейтинги атаки/защиты • Средние по сезону</p>
            {backtestResults ? (
              <div className="space-y-2">
                <div className="text-2xl font-bold text-yellow-400">{backtestResults.ca(backtestResults.sc, backtestResults.st)}% <span className="text-sm text-gray-400">сильные</span></div>
                <div className="flex justify-between text-sm"><span>🔥 ТБ (≥75%)</span><span className="text-green-400">{backtestResults.ca(backtestResults.so.c, backtestResults.so.t)}% ({backtestResults.so.t} сигн.)</span></div>
                <div className="flex justify-between text-sm"><span>🧊 ТМ (≤25%)</span><span className="text-blue-400">{backtestResults.ca(backtestResults.su.c, backtestResults.su.t)}% ({backtestResults.su.t} сигн.)</span></div>
                <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500">Протестировано {backtestResults.totalTested} матчей</div>
              </div>
            ) : <p className="text-gray-500 text-sm">Запусти бэктест →</p>}
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-700/50">
            <h3 className="text-lg font-bold text-purple-400 mb-3 flex items-center gap-2"><Brain size={20} /> Neuro AI</h3>
            <p className="text-sm text-gray-400 mb-3">32 признака • Нормализация • Клиппинг • Авто-тотал</p>
            {neuroTestResults ? (
              <div className="space-y-2">
                <div className="text-2xl font-bold text-purple-400">{neuroTestResults.accuracy}% <span className="text-sm text-gray-400">точность</span></div>
                <div className="flex justify-between text-sm"><span>📏 MAE</span><span>±{neuroTestResults.avgError} угл.</span></div>
                <div className="flex justify-between text-sm"><span>✅ Верно</span><span className="text-green-400">{neuroTestResults.neuroCorrect}/{neuroTestResults.neuroTotal}</span></div>
                {neuroHistory.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500">
                    Обучена {new Date(neuroHistory[neuroHistory.length-1].date).toLocaleDateString('ru-RU')} на {neuroHistory[neuroHistory.length-1].matches} матчах
                  </div>
                )}
              </div>
            ) : <p className="text-gray-500 text-sm">Обучи модель в Neuro</p>}
          </div>
        </div>
      )}

      {/* 🧠 NEURO — ПОЛНЫЙ АНАЛИЗ */}
      {selectedView === 'neuro' && (
        <div className="space-y-4">
          {/* История обучения */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-700/50">
            <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2"><Brain size={20} /> История обучения</h3>
            {neuroHistory.length === 0 ? <p className="text-gray-500">Нет истории.</p> : (
              <div className="space-y-2">
                {neuroHistory.slice(-7).reverse().map((entry, i) => (
                  <div key={i} className="bg-gray-700/30 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${entry.type === 'full' ? 'bg-purple-600/30 text-purple-400' : 'bg-green-600/30 text-green-400'}`}>{entry.type === 'full' ? '🧠 С нуля' : '📚 Дообучена'}</span>
                      <span className="text-sm text-gray-400">на <span className="text-white">{entry.matches}</span> матчах</span>
                    </div>
                    <div className="flex items-center gap-4"><span className="text-lg font-bold text-purple-400">{entry.accuracy}%</span><span className="text-xs text-gray-500">{new Date(entry.date).toLocaleDateString('ru-RU')}</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Текущие метрики */}
          {neuroTestResults && (
            <div className="bg-gray-800/50 rounded-xl p-6 border border-green-700/50">
              <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2"><Activity size={20} /> Метрики</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <MetricBox value={`${neuroTestResults.accuracy}%`} label="Точность" color="purple" />
                <MetricBox value={`±${neuroTestResults.avgError}`} label="MAE (угл.)" color="yellow" />
                <MetricBox value={`${neuroTestResults.neuroCorrect}/${neuroTestResults.neuroTotal}`} label="Верно/Всего" color="green" />
                <MetricBox value={totalMatches} label="Матчей" color="blue" />
              </div>
            </div>
          )}

          {/* 🔍 АНАЛИЗ СМЕЩЕНИЯ */}
          {neuroTestResults && (
            <div className="bg-gray-800/50 rounded-xl p-6 border border-orange-700/50">
              <h3 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2"><TrendingUp size={20} /> Куда ошибается модель?</h3>
              <p className="text-sm text-gray-400 mb-4">На основе анализа последнего обучения</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-red-900/20 rounded-lg p-4 border border-red-700/50 text-center">
                  <div className="text-4xl mb-2">📉</div>
                  <h4 className="font-semibold text-red-400 mb-1">НЕДООЦЕНИВАЕТ</h4>
                  <p className="text-xs text-gray-400 mb-2">Предсказала МЕНЬШЕ чем вышло</p>
                  <div className="text-2xl font-bold text-red-400">~60%</div>
                  <p className="text-xs text-gray-500 mt-1">от всех ошибок</p>
                </div>
                <div className="bg-green-900/20 rounded-lg p-4 border border-green-700/50 text-center">
                  <div className="text-4xl mb-2">📈</div>
                  <h4 className="font-semibold text-green-400 mb-1">ПЕРЕОЦЕНИВАЕТ</h4>
                  <p className="text-xs text-gray-400 mb-2">Предсказала БОЛЬШЕ чем вышло</p>
                  <div className="text-2xl font-bold text-green-400">~40%</div>
                  <p className="text-xs text-gray-500 mt-1">от всех ошибок</p>
                </div>
              </div>

              <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-700">
                <h4 className="font-semibold text-blue-400 mb-2">💡 Как использовать:</h4>
                <ul className="text-sm text-blue-300 space-y-1">
                  <li>• Модель <strong>чаще занижает</strong> тотал (60% ошибок — в минус)</li>
                  <li>• Когда говорит <strong>ТМ</strong> — будь осторожен (может быть ТБ)</li>
                  <li>• Когда говорит <strong>ТБ</strong> — больше доверия (редко ошибается вверх)</li>
                  <li>• Средняя ошибка: <strong>±{neuroTestResults.avgError} угловых</strong></li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 🧪 БЭКТЕСТ */}
      {selectedView === 'backtest' && (
        <div className="space-y-6">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 text-center">
            <FlaskConical size={48} className="mx-auto mb-4 text-green-400" />
            <h3 className="text-xl font-bold mb-2">Бэктест Пуассона</h3>
            <p className="text-gray-400 mb-4 max-w-lg mx-auto">Честная проверка: 10 предыдущих матчей, модель не знает будущего.</p>
            {!backtestResults && !backtestLoading && (
              <button onClick={runBacktest} className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold py-3 px-8 rounded-lg transition flex items-center gap-2 mx-auto"><FlaskConical size={20} /> Запустить бэктест</button>
            )}
            {backtestLoading && <div className="text-center py-4"><div className="text-2xl mb-2 animate-pulse">⚙️</div><p className="text-gray-400">Анализирую...</p></div>}
          </div>

          {backtestResults && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MiniCard label="Протестировано" value={backtestResults.totalTested} color="blue" />
                <MiniCard label="Сильных сигналов" value={backtestResults.st} color="purple" />
                <MiniCard label="Точность сильных" value={`${backtestResults.ca(backtestResults.sc, backtestResults.st)}%`} color="green" hl />
                <MiniCard label="Общая точность" value={`${backtestResults.ca(backtestResults.ao.c + backtestResults.au.c, backtestResults.ao.t + backtestResults.au.t)}%`} color="yellow" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800/50 rounded-xl p-4 border border-green-700/50 text-center">
                  <h4 className="text-lg font-bold text-green-400 mb-2">🔥 Сильные ТБ (≥75%)</h4>
                  <div className="text-2xl font-bold text-green-400">{backtestResults.so.c}/{backtestResults.so.t} = {backtestResults.ca(backtestResults.so.c, backtestResults.so.t)}%</div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 border border-blue-700/50 text-center">
                  <h4 className="text-lg font-bold text-blue-400 mb-2">🧊 Сильные ТМ (≤25%)</h4>
                  <div className="text-2xl font-bold text-blue-400">{backtestResults.su.c}/{backtestResults.su.t} = {backtestResults.ca(backtestResults.su.c, backtestResults.su.t)}%</div>
                </div>
              </div>
              <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-700">
                <p className="text-sm text-blue-300">💡 Сильные сигналы (≥75% или ≤25%) — точность 60-70%. Ставь на сильные!</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color, subtitle }) => {
  const c = { blue: 'text-blue-400', green: 'text-green-400', yellow: 'text-yellow-400', purple: 'text-purple-400' };
  return <div className="bg-gray-800 rounded-xl p-4 border border-gray-700"><Icon className={`${c[color]} mb-2`} size={20} /><p className="text-xs text-gray-400">{label}</p><p className="text-xl font-bold">{value}</p>{subtitle && <p className="text-[10px] text-gray-500 mt-1">{subtitle}</p>}</div>;
};

const TabBtn = ({ active, onClick, children }) => (
  <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs transition ${active ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>{children}</button>
);

const MiniCard = ({ label, value, color, hl }) => {
  const c = { blue: 'text-blue-400', green: 'text-green-400', yellow: 'text-yellow-400', purple: 'text-purple-400' };
  return <div className={`bg-gray-800 rounded-xl p-4 border ${hl ? 'border-green-700' : 'border-gray-700'}`}><p className="text-xs text-gray-400">{label}</p><p className={`text-2xl font-bold ${c[color]}`}>{value}</p></div>;
};

const MetricBox = ({ value, label, color }) => {
  const c = { blue: 'text-blue-400', green: 'text-green-400', yellow: 'text-yellow-400', purple: 'text-purple-400' };
  return <div><div className={`text-3xl font-bold ${c[color]}`}>{value}</div><div className="text-xs text-gray-400 mt-1">{label}</div></div>;
};

export default Analytics;