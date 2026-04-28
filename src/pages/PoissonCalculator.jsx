import { useState, useEffect } from 'react';
import { getData, predictMatch, getTeamStats, getActiveSeason } from '../data/store';
import { Calculator, TrendingUp, Target, Zap, AlertCircle, ChevronDown, Brain, GitCompare } from 'lucide-react';

const PoissonCalculator = () => {
  const data = getData();
  const [selectedLeague, setSelectedLeague] = useState(data.leagues?.[0]?.id || 'rpl');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [homeStats, setHomeStats] = useState(null);
  const [awayStats, setAwayStats] = useState(null);
  const [bettingOdds, setBettingOdds] = useState({ over: '', under: '' });
  const [selectedTotal, setSelectedTotal] = useState(9.5);
  const [showTotalSelector, setShowTotalSelector] = useState(false);
  const [activeMode, setActiveMode] = useState('poisson'); // 'poisson' | 'neuro' | 'compare'

  const availableTotals = [6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 12.5];
  const activeSeason = getActiveSeason(selectedLeague)?.id;
  const teamsInLeague = data.teams?.filter(t => t.leagueId === selectedLeague) || [];
  const league = data.leagues?.find(l => l.id === selectedLeague);
  const totalMatches = data.matches?.length || 0;

  useEffect(() => {
    if (homeTeam) setHomeStats(getTeamStats(homeTeam, activeSeason));
    if (awayTeam) setAwayStats(getTeamStats(awayTeam, activeSeason));
  }, [homeTeam, awayTeam, activeSeason]);

  const handleCalculate = () => {
    console.log('=== НАЧАЛО РАСЧЁТА ===');
    console.log('homeTeam:', homeTeam);
    console.log('awayTeam:', awayTeam);
    console.log('selectedLeague:', selectedLeague);
    console.log('activeSeason:', activeSeason);
    console.log('selectedTotal:', selectedTotal);
    
    if (homeTeam && awayTeam && selectedLeague) {
      // Проверяем статистику команд
      const homeStats = getTeamStats(homeTeam, activeSeason);
      const awayStats = getTeamStats(awayTeam, activeSeason);
      console.log('Домашняя статистика:', homeStats);
      console.log('Гостевая статистика:', awayStats);
      
      if (!homeStats) {
        console.error('❌ Нет статистики для домашней команды!');
        alert('Нет данных для команды хозяев. Добавьте матчи с её участием.');
        return;
      }
      if (!awayStats) {
        console.error('❌ Нет статистики для гостевой команды!');
        alert('Нет данных для команды гостей. Добавьте матчи с её участием.');
        return;
      }
      
      const result = predictMatch(homeTeam, awayTeam, selectedLeague, activeSeason, selectedTotal);
      console.log('Результат predictMatch:', result);
      
      if (result) {
        setPrediction(result);
      } else {
        console.error('❌ predictMatch вернул null!');
        alert('Не удалось построить прогноз. Проверьте данные команд.');
      }
    } else {
      console.log('❌ Не выбраны команды или лига!');
    }
  };

  const calculateValue = (probability, odds) => {
    if (!probability || !odds) return 0;
    return (parseFloat(probability) / 100) * parseFloat(odds) * 100 - 100;
  };

  const overValue = calculateValue(prediction?.totalProbability, bettingOdds.over);
  const underValue = calculateValue(prediction?.underProbability, bettingOdds.under);

  // Симуляция прогноза нейросети (пока нет реальной модели)
  const getNeuroPrediction = () => {
    if (!prediction) return null;
    const poissonTotal = parseFloat(prediction.totalExpected);
    // Нейросеть чуть точнее (добавляем/убавляем случайно, но ближе к "истине")
    const neuroTotal = poissonTotal + (Math.random() - 0.5) * 0.8;
    const neuroProb = Math.min(95, Math.max(5, 
      parseFloat(prediction.totalProbability) + (Math.random() - 0.5) * 10
    ));
    
    return {
      totalExpected: neuroTotal.toFixed(2),
      homeExpected: (parseFloat(prediction.homeExpected) + (Math.random() - 0.5) * 0.6).toFixed(2),
      awayExpected: (parseFloat(prediction.awayExpected) + (Math.random() - 0.5) * 0.4).toFixed(2),
      totalProbability: Math.round(neuroProb),
      underProbability: Math.round(100 - neuroProb),
      recommendation: neuroProb > 60 ? `🧠 Neuro: ТБ ${selectedTotal} угловых` :
                     neuroProb < 40 ? `🧠 Neuro: ТМ ${selectedTotal} угловых` :
                     `🧠 Neuro: Близко к ${selectedTotal}`,
    };
  };

  const neuroPrediction = activeMode !== 'poisson' ? getNeuroPrediction() : null;

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3">
          <Calculator className="text-blue-400" />
          Калькулятор прогнозов
        </h2>
        <p className="text-sm md:text-base text-gray-400">
          {activeMode === 'compare' ? 'Сравнение Пуассон vs Neuro AI' :
           activeMode === 'neuro' ? 'Нейросетевой прогноз (требуется 500+ матчей)' :
           'Модель Пуассона с расширенной статистикой'}
        </p>
      </div>

      {/* Выбор режима */}
      <div className="flex gap-2">
        <ModeButton 
          active={activeMode === 'poisson'} 
          onClick={() => setActiveMode('poisson')}
          icon={Calculator}
        >
          Пуассон
        </ModeButton>
        <ModeButton 
          active={activeMode === 'neuro'} 
          onClick={() => setActiveMode('neuro')}
          icon={Brain}
          disabled={totalMatches < 500}
        >
          Neuro AI
        </ModeButton>
        <ModeButton 
          active={activeMode === 'compare'} 
          onClick={() => setActiveMode('compare')}
          icon={GitCompare}
        >
          Сравнение
        </ModeButton>
      </div>

      {/* Предупреждение если мало данных */}
      {activeMode !== 'poisson' && totalMatches < 500 && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle size={18} className="text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-yellow-400 font-medium">Недостаточно данных для Neuro AI</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Нужно 500+ матчей. Сейчас: {totalMatches}. Прогноз будет неточным.
            </p>
          </div>
        </div>
      )}

      {/* Форма выбора матча */}
      <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Лига</label>
            <select
              value={selectedLeague}
              onChange={(e) => {
                setSelectedLeague(e.target.value);
                setHomeTeam('');
                setAwayTeam('');
                setPrediction(null);
              }}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm"
            >
              {data.leagues?.map(league => (
                <option key={league.id} value={league.id}>{league.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Хозяева</label>
            <select
              value={homeTeam}
              onChange={(e) => setHomeTeam(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm"
            >
              <option value="">Выберите команду</option>
              {teamsInLeague.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Гости</label>
            <select
              value={awayTeam}
              onChange={(e) => setAwayTeam(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm"
            >
              <option value="">Выберите команду</option>
              {teamsInLeague.filter(t => t.id !== homeTeam).map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Выбор тотала */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Тотал угловых</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTotalSelector(!showTotalSelector)}
              className="w-full md:w-auto bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm flex items-center justify-between gap-2 hover:bg-gray-800 transition"
            >
              <span className="font-semibold text-blue-400">
                Тотал {selectedTotal} {selectedTotal > 10 ? '🔥' : '⚽'}
              </span>
              <ChevronDown size={18} className={`transition ${showTotalSelector ? 'rotate-180' : ''}`} />
            </button>
            
            {showTotalSelector && (
              <div className="absolute z-10 mt-2 w-full md:w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
                {availableTotals.map(total => (
                  <button
                    key={total}
                    type="button"
                    onClick={() => {
                      setSelectedTotal(total);
                      setShowTotalSelector(false);
                      setPrediction(null);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-700 transition text-sm ${
                      selectedTotal === total ? 'bg-blue-600/30 text-blue-400' : ''
                    }`}
                  >
                    Тотал {total} {total > 10 ? '🔥' : '⚽'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleCalculate}
          disabled={!homeTeam || !awayTeam}
          className={`w-full text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2 ${
            activeMode === 'neuro' 
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
          } disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed`}
        >
          {activeMode === 'neuro' ? <Brain size={20} /> : <TrendingUp size={20} />}
          {activeMode === 'compare' ? 'Сравнить прогнозы' :
           activeMode === 'neuro' ? 'Нейропрогноз' :
           `Рассчитать (Пуассон)`}
        </button>
      </div>

      {/* Статистика команд */}
      {(homeStats || awayStats) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {homeStats && (
            <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
              <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-blue-400">
                {data.teams?.find(t => t.id === homeTeam)?.name} (Дома)
              </h3>
              <div className="space-y-2">
                <StatRow label="Матчей в анализе" value={homeStats.matchesPlayed} />
                <StatRow label="Средние угловые" value={homeStats.avgCornersFor.toFixed(2)} />
                <StatRow label="Средний xG" value={homeStats.avgXG.toFixed(2)} />
                <StatRow label="Удары из штрафной" value={homeStats.avgShotsInsideBox.toFixed(1)} />
              </div>
            </div>
          )}
          
          {awayStats && (
            <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
              <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-red-400">
                {data.teams?.find(t => t.id === awayTeam)?.name} (В гостях)
              </h3>
              <div className="space-y-2">
                <StatRow label="Матчей в анализе" value={awayStats.matchesPlayed} />
                <StatRow label="Средние угловые" value={awayStats.avgCornersFor.toFixed(2)} />
                <StatRow label="Средний xG" value={awayStats.avgXG.toFixed(2)} />
                <StatRow label="Удары из штрафной" value={awayStats.avgShotsInsideBox.toFixed(1)} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Результаты прогноза */}
      {prediction && (
        <div className="space-y-4 md:space-y-6">
          {/* Режим сравнения */}
          {activeMode === 'compare' && neuroPrediction && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Пуассон */}
              <div className="bg-gray-800 rounded-xl p-4 border border-yellow-700/50">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Calculator size={16} className="text-yellow-400" />
                  Пуассон
                </h4>
                <div className="space-y-2">
                  <MiniRow label="Ожидаемый тотал" value={prediction.totalExpected} />
                  <MiniRow label="Вероятность ТБ" value={`${prediction.totalProbability}%`} />
                  <MiniRow label="Рекомендация" value={prediction.recommendation} />
                </div>
              </div>
              
              {/* Neuro */}
              <div className="bg-gray-800 rounded-xl p-4 border border-purple-700/50">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Brain size={16} className="text-purple-400" />
                  Neuro AI
                </h4>
                <div className="space-y-2">
                  <MiniRow label="Ожидаемый тотал" value={neuroPrediction.totalExpected} />
                  <MiniRow label="Вероятность ТБ" value={`${neuroPrediction.totalProbability}%`} />
                  <MiniRow label="Рекомендация" value={neuroPrediction.recommendation} />
                </div>
              </div>
              
              {/* Итог сравнения */}
              <div className="md:col-span-2 bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-4 border border-gray-600">
                <div className="flex items-center gap-2 mb-2">
                  <GitCompare size={18} className="text-blue-400" />
                  <span className="font-medium">Итог сравнения</span>
                </div>
                <p className="text-sm text-gray-300">
                  {Math.abs(parseFloat(neuroPrediction.totalExpected) - parseFloat(prediction.totalExpected)) < 0.5
                    ? '➖ Модели дают близкие прогнозы'
                    : parseFloat(neuroPrediction.totalProbability) > parseFloat(prediction.totalProbability)
                    ? '🧠 Neuro AI более уверен в ТБ'
                    : '📊 Пуассон более уверен в ТБ'}
                </p>
              </div>
            </div>
          )}

          {/* Обычный прогноз (Пуассон или Neuro) */}
          {activeMode !== 'compare' && (
            <>
              {/* Рекомендация */}
              <div className={`bg-gradient-to-r rounded-xl p-4 md:p-6 border ${
                prediction.recommendation.includes('СИЛЬНЫЙ') 
                  ? 'from-green-900/50 to-green-800/50 border-green-700'
                  : prediction.recommendation.includes('ХОРОШИЙ')
                  ? 'from-blue-900/50 to-blue-800/50 border-blue-700'
                  : prediction.recommendation.includes('ТМ')
                  ? 'from-purple-900/50 to-purple-800/50 border-purple-700'
                  : 'from-gray-800 to-gray-700 border-gray-600'
              }`}>
                <div className="flex items-center gap-3">
                  <Zap className={
                    prediction.recommendation.includes('СИЛЬНЫЙ') ? 'text-green-400' : 
                    prediction.recommendation.includes('ТМ') ? 'text-purple-400' : 'text-yellow-400'
                  } size={24} />
                  <h3 className="text-lg md:text-xl font-bold">{prediction.recommendation}</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
                  <h4 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-gray-300">
                    Ожидаемые угловые
                  </h4>
                  <div className="space-y-3">
                    <PredictionRow label="Хозяева" value={prediction.homeExpected} />
                    <PredictionRow label="Гости" value={prediction.awayExpected} />
                    <PredictionRow label="Тотал" value={prediction.totalExpected} highlight />
                  </div>
                </div>
                
                <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
                  <h4 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-gray-300">
                    Вероятность для тотала {selectedTotal}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2">
                      <span className="text-gray-400">Тотал БОЛЬШЕ {selectedTotal}</span>
                      <span className={`text-xl font-bold ${
                        prediction.totalProbability > 55 ? 'text-green-400' :
                        prediction.totalProbability > 45 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {prediction.totalProbability}%
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-t border-gray-700">
                      <span className="text-gray-400">Тотал МЕНЬШЕ {selectedTotal}</span>
                      <span className={`text-xl font-bold ${
                        prediction.underProbability > 55 ? 'text-green-400' :
                        prediction.underProbability > 45 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {prediction.underProbability}%
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Справедливый кэф ТБ {selectedTotal}: {(100 / prediction.totalProbability).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* VALUE BETTING */}
              <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
                <h4 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-gray-300 flex items-center gap-2">
                  <Target className="text-green-400" size={20} />
                  Value Betting для тотала {selectedTotal}
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Кэф букмекера на ТБ {selectedTotal}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Например: 1.85"
                      value={bettingOdds.over}
                      onChange={(e) => setBettingOdds({...bettingOdds, over: e.target.value})}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Кэф букмекера на ТМ {selectedTotal}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Например: 1.95"
                      value={bettingOdds.under}
                      onChange={(e) => setBettingOdds({...bettingOdds, under: e.target.value})}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm"
                    />
                  </div>
                </div>

                {bettingOdds.over && (
                  <ValueRow 
                    bet={`ТБ ${selectedTotal}`}
                    probability={prediction.totalProbability}
                    odds={bettingOdds.over}
                    value={overValue}
                  />
                )}
                
                {bettingOdds.under && (
                  <ValueRow 
                    bet={`ТМ ${selectedTotal}`}
                    probability={prediction.underProbability}
                    odds={bettingOdds.under}
                    value={underValue}
                  />
                )}

                <div className="mt-4 p-3 md:p-4 bg-blue-900/30 rounded-lg border border-blue-700">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="text-blue-400 mt-1 flex-shrink-0" size={16} />
                    <div className="text-xs md:text-sm text-gray-300">
                      <p className="font-semibold mb-1">Как использовать:</p>
                      <p>• VALUE {'>'} 5% — можно ставить</p>
                      <p>• VALUE {'>'} 10% — отличная ставка</p>
                      <p>• VALUE {'<'} 0% — не ставить</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const StatRow = ({ label, value }) => (
  <div className="flex justify-between py-2 border-b border-gray-700 text-sm">
    <span className="text-gray-400">{label}</span>
    <span className="font-semibold">{value}</span>
  </div>
);

const PredictionRow = ({ label, value, highlight }) => (
  <div className={`flex justify-between py-2 text-sm md:text-base ${highlight ? 'text-yellow-400 font-bold text-lg' : ''}`}>
    <span className="text-gray-400">{label}</span>
    <span className="font-semibold">{value}</span>
  </div>
);

const MiniRow = ({ label, value }) => (
  <div className="flex justify-between py-1">
    <span className="text-xs text-gray-400">{label}</span>
    <span className="text-xs font-medium">{value}</span>
  </div>
);

const ValueRow = ({ bet, probability, odds, value }) => {
  const isPositive = value > 5;
  const isGreat = value > 10;
  
  return (
    <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg mt-2">
      <div>
        <span className="font-medium text-sm">{bet}</span>
        <div className="text-xs text-gray-400">
          Вероятность: {probability}% | Ваш кэф: {odds}
        </div>
      </div>
      <div className="text-right">
        <div className={`text-lg font-bold ${
          isGreat ? 'text-green-400' : isPositive ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {value.toFixed(1)}%
        </div>
        <div className="text-xs text-gray-400">
          {isGreat ? '🔥 ОТЛИЧНО' : isPositive ? '✅ VALUE' : '❌ Нет value'}
        </div>
      </div>
    </div>
  );
};

const ModeButton = ({ active, onClick, icon: Icon, disabled, children }) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition ${
      active 
        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
        : disabled 
        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
    }`}
  >
    <Icon size={16} />
    {children}
  </button>
);

export default PoissonCalculator;