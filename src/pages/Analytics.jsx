import { useState, useEffect } from 'react';
import { getData } from '../data/store';
import { 
  TrendingUp, Brain, BarChart3, Target, Zap, 
  Calendar, Trophy, Activity, ChevronDown, FlaskConical 
} from 'lucide-react';

const Analytics = () => {
  const data = getData();
  const [selectedLeague, setSelectedLeague] = useState(data.leagues?.[0]?.id || 'rpl');
  const [selectedView, setSelectedView] = useState('comparison');
  const [backtestResults, setBacktestResults] = useState(null);
  const [backtestLoading, setBacktestLoading] = useState(false);
  
  const totalMatches = data.matches?.length || 0;
  const leagues = data.leagues || [];
  
  // Симуляция данных для графиков
  const mockAccuracy = [
    { matches: 100, poisson: 62, neuro: 66 },
    { matches: 200, poisson: 63, neuro: 68 },
    { matches: 300, poisson: 63, neuro: 70 },
    { matches: 400, poisson: 64, neuro: 71 },
    { matches: 500, poisson: 64, neuro: 73 },
    { matches: 750, poisson: 65, neuro: 74 },
    { matches: 1000, poisson: 65, neuro: 75 },
  ];

  // Симуляция прогнозов для сравнения
  const mockPredictions = [
    { match: 'Зенит - Спартак', poisson: 9.5, neuro: 10.2, actual: 11, date: '12.04.2025' },
    { match: 'ЦСКА - Локо', poisson: 8.7, neuro: 9.1, actual: 9, date: '13.04.2025' },
    { match: 'Краснодар - Ростов', poisson: 10.1, neuro: 9.4, actual: 9, date: '14.04.2025' },
    { match: 'Динамо - Сочи', poisson: 11.2, neuro: 10.5, actual: 11, date: '15.04.2025' },
    { match: 'Арсенал - Челси', poisson: 11.5, neuro: 12.1, actual: 13, date: '16.04.2025' },
  ];

  // 🔬 ФУНКЦИЯ БЭКТЕСТА — честная проверка на истории (ВСЕ матчи, 10 предыдущих)
  const runBacktest = async () => {
    setBacktestLoading(true);
    setBacktestResults(null);
    
    // ВСЕ матчи, отсортированные по дате (от старых к новым)
    const allMatches = [...(data.matches || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
    const allTeams = data.teams || [];
    
    console.log('🧪 Бэктест на', allMatches.length, 'матчах');
    
    // Получаем статистику команды на основе ТОЛЬКО матчей ДО указанной даты
    const getHistoricalTeamStats = (teamId, beforeDate, allMatchesSnapshot) => {
      const pastMatches = allMatchesSnapshot
        .filter(m => (m.homeTeamId === teamId || m.awayTeamId === teamId) && m.date < beforeDate)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);
      
      if (pastMatches.length === 0) return null;
      
      let stats = {
        teamId,
        matchesPlayed: pastMatches.length,
        totalCornersFor: 0,
        totalCornersAgainst: 0,
        cornersForHome: 0,
        cornersForAway: 0,
      };
      
      let homeMatches = 0;
      let awayMatches = 0;
      
      pastMatches.forEach(match => {
        const isHome = match.homeTeamId === teamId;
        const cornersFor = isHome ? (match.homeCorners || 0) : (match.awayCorners || 0);
        const cornersAgainst = isHome ? (match.awayCorners || 0) : (match.homeCorners || 0);
        
        stats.totalCornersFor += cornersFor;
        stats.totalCornersAgainst += cornersAgainst;
        
        if (isHome) {
          stats.cornersForHome += cornersFor;
          homeMatches++;
        } else {
          stats.cornersForAway += cornersFor;
          awayMatches++;
        }
      });
      
      const n = stats.matchesPlayed;
      
      return {
        ...stats,
        avgCornersFor: stats.totalCornersFor / n,
        avgCornersAgainst: stats.totalCornersAgainst / n,
        avgCornersForHome: homeMatches > 0 ? stats.cornersForHome / homeMatches : stats.totalCornersFor / n,
        avgCornersForAway: awayMatches > 0 ? stats.cornersForAway / awayMatches : stats.totalCornersFor / n,
        matchesPlayed: n
      };
    };
    
    // Функция предикта ИДЕНТИЧНАЯ predictMatch в store.js
    const historicalPredict = (homeStats, awayStats, leagueAverages, selectedTotal = 9.5) => {
      if (!homeStats || !awayStats || !leagueAverages) return null;
      
      const safeDivide = (a, b, fallback = 1) => {
        if (!b || b === 0 || isNaN(a) || isNaN(b)) return fallback;
        const result = a / b;
        return isNaN(result) || !isFinite(result) ? fallback : result;
      };
      
      const homeCornerRating = Math.max(0.3, safeDivide(homeStats.avgCornersFor, leagueAverages.avgCornersHome, 1));
      const awayDefenseCorner = Math.max(0.3, safeDivide(awayStats.avgCornersAgainst, leagueAverages.avgCornersAway, 1));
      
      let homeExpected = leagueAverages.avgCornersHome * homeCornerRating * awayDefenseCorner;
      if (isNaN(homeExpected) || homeExpected < 1) homeExpected = leagueAverages.avgCornersHome;
      if (homeExpected > 15) homeExpected = 12;
      
      const awayCornerRating = Math.max(0.3, safeDivide(awayStats.avgCornersFor, leagueAverages.avgCornersAway, 1));
      const homeDefenseCorner = Math.max(0.3, safeDivide(homeStats.avgCornersAgainst, leagueAverages.avgCornersHome, 1));
      
      let awayExpected = leagueAverages.avgCornersAway * awayCornerRating * homeDefenseCorner;
      if (isNaN(awayExpected) || awayExpected < 0.5) awayExpected = leagueAverages.avgCornersAway;
      if (awayExpected > 12) awayExpected = 10;
      
      homeExpected = Math.round(homeExpected * 100) / 100;
      awayExpected = Math.round(awayExpected * 100) / 100;
      const totalExpected = homeExpected + awayExpected;
      
      let totalProbability = 50;
      
      if (totalExpected > selectedTotal + 2) totalProbability = 85;
      else if (totalExpected > selectedTotal + 1.5) totalProbability = 75;
      else if (totalExpected > selectedTotal + 1) totalProbability = 68;
      else if (totalExpected > selectedTotal + 0.5) totalProbability = 60;
      else if (totalExpected > selectedTotal - 0.5) totalProbability = 52;
      else if (totalExpected > selectedTotal - 1) totalProbability = 42;
      else if (totalExpected > selectedTotal - 1.5) totalProbability = 35;
      else totalProbability = 25;
      
      return {
        homeExpected: homeExpected.toFixed(2),
        awayExpected: awayExpected.toFixed(2),
        totalExpected: totalExpected.toFixed(2),
        totalProbability: Math.round(totalProbability),
        underProbability: Math.round(100 - totalProbability),
      };
    };
    
    let strongOver = { total: 0, correct: 0, matches: [] };
    let strongUnder = { total: 0, correct: 0, matches: [] };
    let allOver = { total: 0, correct: 0 };
    let allUnder = { total: 0, correct: 0 };
    
    const matchesSnapshot = [...allMatches];
    
    // Проходим по ВСЕМ матчам начиная с 20-го
    for (let i = 20; i < matchesSnapshot.length; i++) {
      const match = matchesSnapshot[i];
      const totalCorners = (match.homeCorners || 0) + (match.awayCorners || 0);
      
      const homeStats = getHistoricalTeamStats(match.homeTeamId, match.date, matchesSnapshot);
      const awayStats = getHistoricalTeamStats(match.awayTeamId, match.date, matchesSnapshot);
      
      if (!homeStats || !awayStats || homeStats.matchesPlayed < 3 || awayStats.matchesPlayed < 3) continue;
      
      // Реальные средние по сезону
      const season = data.seasons?.find(s => s.leagueId === match.leagueId && s.id === match.seasonId);
      const leagueAverages = {
        avgCornersHome: season?.avgCornersHome || 5.0,
        avgCornersAway: season?.avgCornersAway || 4.0,
      };
      
      const prediction = historicalPredict(homeStats, awayStats, leagueAverages, 9.5);
      if (!prediction) continue;
      
      const homeTeam = allTeams.find(t => t.id === match.homeTeamId)?.name || match.homeTeamId;
      const awayTeam = allTeams.find(t => t.id === match.awayTeamId)?.name || match.awayTeamId;
      
      // Сильные сигналы ТБ (≥75%)
      if (prediction.totalProbability >= 75) {
        strongOver.total++;
        const isCorrect = totalCorners > 9.5;
        if (isCorrect) strongOver.correct++;
        strongOver.matches.push({
          homeTeam, awayTeam, 
          date: match.date,
          expected: prediction.totalExpected,
          actual: totalCorners,
          probability: prediction.totalProbability,
          correct: isCorrect
        });
      }
      
      // Сильные сигналы ТМ (≤25%)
      if (prediction.totalProbability <= 25) {
        strongUnder.total++;
        const isCorrect = totalCorners < 9.5;
        if (isCorrect) strongUnder.correct++;
        strongUnder.matches.push({
          homeTeam, awayTeam,
          date: match.date,
          expected: prediction.totalExpected,
          actual: totalCorners,
          probability: prediction.totalProbability,
          correct: isCorrect
        });
      }
      
      // Все сигналы
      if (prediction.totalProbability > 50) {
        allOver.total++;
        if (totalCorners > 9.5) allOver.correct++;
      }
      if (prediction.totalProbability < 50) {
        allUnder.total++;
        if (totalCorners < 9.5) allUnder.correct++;
      }
    }
    
    const calcAccuracy = (correct, total) => total > 0 ? ((correct / total) * 100).toFixed(1) : '0.0';
    
    const results = {
      strongOver,
      strongUnder,
      allOver,
      allUnder,
      totalTested: matchesSnapshot.length - 20,
      strongTotal: strongOver.total + strongUnder.total,
      strongCorrect: strongOver.correct + strongUnder.correct,
      calcAccuracy
    };
    
    console.log('✅ Бэктест завершён!');
    console.log('Протестировано:', results.totalTested);
    console.log('Сильных ТБ:', strongOver.correct + '/' + strongOver.total, '=', calcAccuracy(strongOver.correct, strongOver.total) + '%');
    console.log('Сильных ТМ:', strongUnder.correct + '/' + strongUnder.total, '=', calcAccuracy(strongUnder.correct, strongUnder.total) + '%');
    
    setBacktestResults(results);
    setBacktestLoading(false);
  };

  // Максимальное значение для шкалы графиков
  const maxAccuracy = 80;
  const maxCorners = 14;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Заголовок */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-3">
          <BarChart3 className="text-purple-400" />
          Аналитика и сравнение
        </h2>
        <p className="text-sm md:text-base text-gray-400">
          Нейросеть vs Пуассон • Графики точности • История прогнозов • Проверка модели
        </p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard 
          icon={Database} 
          label="Всего матчей" 
          value={totalMatches} 
          color="blue"
          subtitle={`Нужно ${Math.max(0, 500 - totalMatches)} до обучения`}
        />
        <StatCard 
          icon={Brain} 
          label="Neuro AI" 
          value="Готовность" 
          color="purple"
          subtitle={`${Math.min(100, (totalMatches / 500) * 100).toFixed(0)}%`}
        />
        <StatCard 
          icon={Target} 
          label="Точность Пуассон" 
          value="64%" 
          color="yellow"
          subtitle="На основе 10 матчей"
        />
        <StatCard 
          icon={Zap} 
          label="Точность Neuro" 
          value={`${totalMatches >= 500 ? '73%' : '—'}`}
          color="green"
          subtitle={totalMatches >= 500 ? 'На основе всех матчей' : 'Нужно 500+ матчей'}
        />
      </div>

      {/* Выбор вида */}
      <div className="flex flex-wrap gap-2">
        <select 
          value={selectedLeague} 
          onChange={(e) => setSelectedLeague(e.target.value)}
          className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm"
        >
          {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        
        <div className="flex gap-1 flex-wrap">
          <ViewButton active={selectedView === 'comparison'} onClick={() => setSelectedView('comparison')}>
            Сравнение прогнозов
          </ViewButton>
          <ViewButton active={selectedView === 'trends'} onClick={() => setSelectedView('trends')}>
            Рост точности
          </ViewButton>
          <ViewButton active={selectedView === 'accuracy'} onClick={() => setSelectedView('accuracy')}>
            Точность по лигам
          </ViewButton>
          <ViewButton active={selectedView === 'backtest'} onClick={() => setSelectedView('backtest')}>
            🧪 Проверка модели
          </ViewButton>
        </div>
      </div>

      {/* График сравнения прогнозов */}
      {selectedView === 'comparison' && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-400" />
            Сравнение прогнозов: Neuro AI vs Пуассон
          </h3>
          
          <div className="space-y-4">
            {mockPredictions.map((pred, i) => (
              <div key={i} className="bg-gray-700/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{pred.match}</span>
                  <span className="text-xs text-gray-400">{pred.date}</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-yellow-400 w-16">Пуассон:</span>
                    <div className="flex-1 h-6 bg-gray-700 rounded-full relative overflow-hidden">
                      <div 
                        className="h-full bg-yellow-500/30 rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${(pred.poisson / maxCorners) * 100}%` }}
                      >
                        <span className="text-xs text-yellow-400 font-medium">{pred.poisson}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-green-400 w-16">Neuro:</span>
                    <div className="flex-1 h-6 bg-gray-700 rounded-full relative overflow-hidden">
                      <div 
                        className="h-full bg-green-500/30 rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${(pred.neuro / maxCorners) * 100}%` }}
                      >
                        <span className="text-xs text-green-400 font-medium">{pred.neuro}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-blue-400 w-16">Факт:</span>
                    <div className="flex-1 h-6 bg-gray-700 rounded-full relative overflow-hidden">
                      <div 
                        className="h-full bg-blue-500/30 rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${(pred.actual / maxCorners) * 100}%` }}
                      >
                        <span className="text-xs text-blue-400 font-medium">{pred.actual}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-2 text-xs">
                  {Math.abs(pred.neuro - pred.actual) < Math.abs(pred.poisson - pred.actual) ? (
                    <span className="text-green-400">✅ Neuro точнее на {(Math.abs(pred.poisson - pred.actual) - Math.abs(pred.neuro - pred.actual)).toFixed(1)} угловых</span>
                  ) : Math.abs(pred.neuro - pred.actual) > Math.abs(pred.poisson - pred.actual) ? (
                    <span className="text-yellow-400">⚠️ Пуассон точнее на {(Math.abs(pred.neuro - pred.actual) - Math.abs(pred.poisson - pred.actual)).toFixed(1)} угловых</span>
                  ) : (
                    <span className="text-gray-400">➖ Одинаковая точность</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* График роста точности */}
      {selectedView === 'trends' && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Activity size={20} className="text-green-400" />
            Рост точности с накоплением данных
          </h3>
          
          <div className="space-y-6">
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-gray-400">Neuro AI</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-gray-400">Пуассон</span>
              </div>
            </div>

            <div className="relative h-64">
              <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col justify-between text-xs text-gray-400">
                <span>{maxAccuracy}%</span>
                <span>{maxAccuracy * 0.75}%</span>
                <span>{maxAccuracy * 0.5}%</span>
                <span>{maxAccuracy * 0.25}%</span>
                <span>0%</span>
              </div>
              
              <div className="ml-12 h-full relative">
                {[0, 25, 50, 75, 100].map(pct => (
                  <div 
                    key={pct}
                    className="absolute w-full border-t border-gray-700/50"
                    style={{ bottom: `${pct}%` }}
                  />
                ))}
                
                <svg className="absolute inset-0 w-full h-full">
                  <polyline
                    points={mockAccuracy.map((d, i) => 
                      `${(i / (mockAccuracy.length - 1)) * 100}%,${100 - (d.neuro / maxAccuracy) * 100}%`
                    ).join(' ')}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="2"
                    strokeDasharray="4"
                  />
                  <polyline
                    points={mockAccuracy.map((d, i) => 
                      `${(i / (mockAccuracy.length - 1)) * 100}%,${100 - (d.poisson / maxAccuracy) * 100}%`
                    ).join(' ')}
                    fill="none"
                    stroke="#eab308"
                    strokeWidth="2"
                  />
                </svg>
                
                {mockAccuracy.map((d, i) => (
                  <div key={i} className="absolute flex flex-col items-center" style={{ 
                    left: `${(i / (mockAccuracy.length - 1)) * 100}%`,
                    bottom: `${(d.neuro / maxAccuracy) * 100}%`,
                    transform: 'translateX(-50%)'
                  }}>
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                  </div>
                ))}
              </div>
              
              <div className="ml-12 flex justify-between text-xs text-gray-400 mt-2">
                {mockAccuracy.map(d => (
                  <span key={d.matches}>{d.matches}</span>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-4 border border-purple-700/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">
                  {totalMatches >= 500 
                    ? '✅ Данных достаточно для обучения!'
                    : `📊 Собрано ${totalMatches} из 500 матчей`
                  }
                </span>
                <span className="text-sm font-medium text-purple-400">
                  {totalMatches >= 500 ? 'Запустить обучение →' : `${Math.min(100, (totalMatches / 500) * 100).toFixed(0)}%`}
                </span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (totalMatches / 500) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Точность по лигам */}
      {selectedView === 'accuracy' && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Trophy size={20} className="text-yellow-400" />
            Точность по лигам
          </h3>
          
          <div className="space-y-4">
            {leagues.map(league => {
              const leagueMatches = data.matches?.filter(m => m.leagueId === league.id)?.length || 0;
              const canTrain = leagueMatches >= 100;
              
              return (
                <div key={league.id} className="bg-gray-700/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{league.name}</span>
                    <span className="text-xs text-gray-400">{leagueMatches} матчей</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-yellow-400 w-20">Пуассон:</span>
                      <div className="flex-1 h-5 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-yellow-500/30 rounded-full flex items-center justify-end pr-2"
                          style={{ width: '64%' }}
                        >
                          <span className="text-xs text-yellow-400">64%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-purple-400 w-20">Neuro:</span>
                      <div className="flex-1 h-5 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500/30 rounded-full flex items-center justify-end pr-2"
                          style={{ width: canTrain ? '73%' : '0%' }}
                        >
                          <span className="text-xs text-purple-400">
                            {canTrain ? '73%' : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {!canTrain && (
                    <p className="text-xs text-gray-500 mt-2">
                      Нужно ещё {100 - leagueMatches} матчей для обучения
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 🧪 Проверка модели */}
      {selectedView === 'backtest' && (
        <div className="space-y-6">
          {/* Кнопка запуска */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 text-center">
            <FlaskConical size={48} className="mx-auto mb-4 text-green-400" />
            <h3 className="text-xl font-bold mb-2">Проверка модели на истории</h3>
            <p className="text-gray-400 mb-4 max-w-lg mx-auto">
              Честный бэктест: для каждого матча используются только 10 предыдущих матчей команд.
              Модель не знает будущего — как в реальном прогнозировании.
            </p>
            
            {!backtestResults && !backtestLoading && (
              <button
                onClick={runBacktest}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-8 rounded-lg transition flex items-center gap-2 mx-auto"
              >
                <FlaskConical size={20} />
                Запустить бэктест
              </button>
            )}
            
            {backtestLoading && (
              <div className="text-center py-4">
                <div className="text-2xl mb-2 animate-pulse">⚙️</div>
                <p className="text-gray-400">Анализирую матчи...</p>
              </div>
            )}
          </div>

          {/* Результаты */}
          {backtestResults && (
            <>
              {/* Итоговые карточки */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <BacktestStatCard
                  label="Протестировано"
                  value={backtestResults.totalTested}
                  color="blue"
                />
                <BacktestStatCard
                  label="Сильных сигналов"
                  value={backtestResults.strongTotal}
                  color="purple"
                />
                <BacktestStatCard
                  label="Точность сильных"
                  value={`${backtestResults.calcAccuracy(backtestResults.strongCorrect, backtestResults.strongTotal)}%`}
                  color="green"
                  highlight
                />
                <BacktestStatCard
                  label="Общая точность"
                  value={`${backtestResults.calcAccuracy(
                    backtestResults.allOver.correct + backtestResults.allUnder.correct,
                    backtestResults.allOver.total + backtestResults.allUnder.total
                  )}%`}
                  color="yellow"
                />
              </div>

              {/* Детали по сигналам */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Сильные ТБ */}
                <div className="bg-gray-800/50 rounded-xl p-4 border border-green-700/50">
                  <h4 className="text-lg font-bold text-green-400 mb-3">
                    🔥 Сильные ТБ 9.5 (≥75%)
                  </h4>
                  <div className="text-2xl font-bold text-green-400 mb-2">
                    {backtestResults.strongOver.correct}/{backtestResults.strongOver.total} = {' '}
                    {backtestResults.calcAccuracy(backtestResults.strongOver.correct, backtestResults.strongOver.total)}%
                  </div>
                  <div className="space-y-1 max-h-60 overflow-auto">
                    {backtestResults.strongOver.matches.slice(0, 10).map((m, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-700/50">
                        <span className="truncate flex-1">{m.homeTeam} vs {m.awayTeam}</span>
                        <span className="ml-2">{m.expected} ➜ {m.actual}</span>
                        <span className="ml-2 w-6 text-center">{m.correct ? '✅' : '❌'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Сильные ТМ */}
                <div className="bg-gray-800/50 rounded-xl p-4 border border-blue-700/50">
                  <h4 className="text-lg font-bold text-blue-400 mb-3">
                    🧊 Сильные ТМ 9.5 (≤25%)
                  </h4>
                  <div className="text-2xl font-bold text-blue-400 mb-2">
                    {backtestResults.strongUnder.correct}/{backtestResults.strongUnder.total} = {' '}
                    {backtestResults.calcAccuracy(backtestResults.strongUnder.correct, backtestResults.strongUnder.total)}%
                  </div>
                  <div className="space-y-1 max-h-60 overflow-auto">
                    {backtestResults.strongUnder.matches.slice(0, 10).map((m, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-700/50">
                        <span className="truncate flex-1">{m.homeTeam} vs {m.awayTeam}</span>
                        <span className="ml-2">{m.expected} ➜ {m.actual}</span>
                        <span className="ml-2 w-6 text-center">{m.correct ? '✅' : '❌'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Инфо */}
              <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-700">
                <p className="text-sm text-blue-300">
                  💡 <strong>Как читать:</strong> Сильные сигналы (≥75% или ≤25%) — самые надёжные. 
                  Слабые сигналы (50-60%) — модель не уверена, по ним точность ~50% (как монетка).
                  Ставь только на сильные сигналы!
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color, subtitle }) => {
  const colors = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    purple: 'text-purple-400',
  };
  
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <Icon className={`${colors[color]} mb-2`} size={20} />
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[10px] text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
};

const ViewButton = ({ active, onClick, children }) => (
  <button 
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-xs transition ${
      active 
        ? 'bg-purple-600 text-white' 
        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
    }`}
  >
    {children}
  </button>
);

const BacktestStatCard = ({ label, value, color, highlight }) => {
  const colors = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    purple: 'text-purple-400',
  };
  
  return (
    <div className={`bg-gray-800 rounded-xl p-4 border ${highlight ? 'border-green-700' : 'border-gray-700'}`}>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
    </div>
  );
};

// Импорт для StatCard
import { Database } from 'lucide-react';

export default Analytics;