import { useState, useEffect } from 'react';
import { getData, predictMatch, getTeamStats } from '../data/store';
import { Calculator, TrendingUp, Target, Zap, AlertCircle } from 'lucide-react';

const PoissonCalculator = () => {
  const data = getData();
  const [selectedLeague, setSelectedLeague] = useState(data.leagues[0]?.id || '');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [homeStats, setHomeStats] = useState(null);
  const [awayStats, setAwayStats] = useState(null);
  const [bettingOdds, setBettingOdds] = useState({ over9_5: '', over10_5: '' });

  const teamsInLeague = data.teams.filter(t => t.leagueId === selectedLeague);
  const league = data.leagues.find(l => l.id === selectedLeague);

  useEffect(() => {
    if (homeTeam) {
      setHomeStats(getTeamStats(homeTeam));
    }
    if (awayTeam) {
      setAwayStats(getTeamStats(awayTeam));
    }
  }, [homeTeam, awayTeam]);

  const handleCalculate = () => {
    if (homeTeam && awayTeam && selectedLeague) {
      const result = predictMatch(homeTeam, awayTeam, selectedLeague);
      setPrediction(result);
    }
  };

  const checkValue = (fairOdd, bookmakerOdd) => {
    if (!fairOdd || !bookmakerOdd) return null;
    const value = (1 / parseFloat(fairOdd) - 1 / parseFloat(bookmakerOdd)) * 100;
    return value > 0 ? `+${value.toFixed(1)}%` : `${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Calculator className="text-blue-400" />
          Калькулятор Пуассона 2.0 🚀
        </h2>
        <p className="text-gray-400">Улучшенная модель с xG, владением и ударами (точность 68-70%)</p>
      </div>

      {/* Форма выбора матча */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
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
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3"
            >
              {data.leagues.map(league => (
                <option key={league.id} value={league.id}>{league.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Хозяева</label>
            <select
              value={homeTeam}
              onChange={(e) => setHomeTeam(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3"
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
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3"
            >
              <option value="">Выберите команду</option>
              {teamsInLeague.filter(t => t.id !== homeTeam).map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleCalculate}
          disabled={!homeTeam || !awayTeam}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
        >
          <TrendingUp size={20} />
          Рассчитать с расширенной аналитикой
        </button>
      </div>

      {/* Расширенная статистика команд */}
      {(homeStats || awayStats) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {homeStats && (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-4 text-blue-400">
                {data.teams.find(t => t.id === homeTeam)?.name} (Дома)
              </h3>
              <div className="space-y-2">
                <StatRow label="Матчей в анализе" value={homeStats.matchesPlayed} />
                <StatRow label="Средние угловые" value={homeStats.avgCornersFor.toFixed(2)} />
                <StatRow label="Средний xG" value={homeStats.avgXG.toFixed(2)} />
                <StatRow label="Удары из штрафной" value={homeStats.avgShotsInsideBox.toFixed(1)} />
                <StatRow label="Владение 1-й тайм" value={`${homeStats.avgPossession1H.toFixed(1)}%`} />
                <StatRow label="Владение 2-й тайм" value={`${homeStats.avgPossession2H.toFixed(1)}%`} />
                <StatRow label="Опасные атаки" value={homeStats.avgDangerousAttacks.toFixed(1)} />
              </div>
            </div>
          )}
          
          {awayStats && (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-4 text-red-400">
                {data.teams.find(t => t.id === awayTeam)?.name} (В гостях)
              </h3>
              <div className="space-y-2">
                <StatRow label="Матчей в анализе" value={awayStats.matchesPlayed} />
                <StatRow label="Средние угловые" value={awayStats.avgCornersFor.toFixed(2)} />
                <StatRow label="Средний xG" value={awayStats.avgXG.toFixed(2)} />
                <StatRow label="Удары из штрафной" value={awayStats.avgShotsInsideBox.toFixed(1)} />
                <StatRow label="Владение 1-й тайм" value={`${awayStats.avgPossession1H.toFixed(1)}%`} />
                <StatRow label="Владение 2-й тайм" value={`${awayStats.avgPossession2H.toFixed(1)}%`} />
                <StatRow label="Опасные атаки" value={awayStats.avgDangerousAttacks.toFixed(1)} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Результаты прогноза */}
      {prediction && (
        <div className="space-y-6">
          {/* Рекомендация */}
          <div className={`bg-gradient-to-r rounded-xl p-6 border ${
            prediction.recommendation.includes('СИЛЬНЫЙ') 
              ? 'from-green-900/50 to-green-800/50 border-green-700'
              : prediction.recommendation.includes('ХОРОШИЙ')
              ? 'from-blue-900/50 to-blue-800/50 border-blue-700'
              : 'from-gray-800 to-gray-700 border-gray-600'
          }`}>
            <div className="flex items-center gap-3">
              <Zap className={prediction.recommendation.includes('СИЛЬНЫЙ') ? 'text-green-400' : 'text-yellow-400'} size={24} />
              <h3 className="text-xl font-bold">{prediction.recommendation}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h4 className="text-lg font-semibold mb-4 text-gray-300">Ожидаемые угловые</h4>
              <div className="space-y-3">
                <PredictionRow label="Хозяева" value={prediction.homeExpected} />
                <PredictionRow label="Гости" value={prediction.awayExpected} />
                <PredictionRow label="Тотал" value={prediction.totalExpected} highlight />
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h4 className="text-lg font-semibold mb-4 text-gray-300">Вероятности тоталов</h4>
              <div className="space-y-3">
                <PredictionRow label="Тотал больше 8.5" value={`${prediction.over8_5}%`} />
                <PredictionRow label="Тотал больше 9.5" value={`${prediction.over9_5}%`} />
                <PredictionRow label="Тотал больше 10.5" value={`${prediction.over10_5}%`} />
              </div>
            </div>
          </div>

          {/* VALUE BETTING */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h4 className="text-lg font-semibold mb-4 text-gray-300 flex items-center gap-2">
              <Target className="text-green-400" size={20} />
              Value Betting калькулятор
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Кэф букмекера на ТБ 9.5</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Например: 1.85"
                  value={bettingOdds.over9_5}
                  onChange={(e) => setBettingOdds({...bettingOdds, over9_5: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Кэф букмекера на ТБ 10.5</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Например: 2.15"
                  value={bettingOdds.over10_5}
                  onChange={(e) => setBettingOdds({...bettingOdds, over10_5: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3"
                />
              </div>
            </div>

            {bettingOdds.over9_5 && (
              <div className="space-y-3">
                <ValueRow 
                  bet="ТБ 9.5" 
                  fairOdd={prediction.fairOdds.over9_5}
                  bookmakerOdd={bettingOdds.over9_5}
                  probability={prediction.over9_5}
                />
                <ValueRow 
                  bet="ТБ 10.5" 
                  fairOdd={prediction.fairOdds.over10_5}
                  bookmakerOdd={bettingOdds.over10_5}
                  probability={prediction.over10_5}
                />
              </div>
            )}

            <div className="mt-4 p-4 bg-blue-900/30 rounded-lg border border-blue-700">
              <div className="flex items-start gap-2">
                <AlertCircle className="text-blue-400 mt-1" size={16} />
                <div className="text-sm text-gray-300">
                  <p className="font-semibold mb-1">Как использовать:</p>
                  <p>• Если VALUE положительный - есть преимущество над линией</p>
                  <p>• Рекомендуется ставить при VALUE {'>'} 5%</p>
                  <p>• Дистанция 100+ ставок для реализации преимущества</p>
                </div>
              </div>
            </div>
          </div>

          {/* Исходы */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h4 className="text-lg font-semibold mb-4 text-gray-300">Исход по угловым</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">Победа хозяев</div>
                <div className="text-2xl font-bold text-green-400">{prediction.homeWin}%</div>
                <div className="text-xs text-gray-500 mt-1">Кэф: {prediction.fairOdds.homeWin}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">Ничья</div>
                <div className="text-2xl font-bold text-yellow-400">{prediction.draw}%</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">Победа гостей</div>
                <div className="text-2xl font-bold text-red-400">{prediction.awayWin}%</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatRow = ({ label, value }) => (
  <div className="flex justify-between py-2 border-b border-gray-700">
    <span className="text-gray-400">{label}</span>
    <span className="font-semibold">{value}</span>
  </div>
);

const PredictionRow = ({ label, value, highlight }) => (
  <div className={`flex justify-between py-2 ${highlight ? 'text-yellow-400 font-bold text-lg' : ''}`}>
    <span className="text-gray-400">{label}</span>
    <span className="font-semibold">{value}</span>
  </div>
);

const ValueRow = ({ bet, fairOdd, bookmakerOdd, probability }) => {
  const value = bookmakerOdd ? ((parseFloat(probability) / 100) * parseFloat(bookmakerOdd) - 1) * 100 : 0;
  const isPositive = value > 5;
  
  return (
    <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
      <div>
        <span className="font-medium">{bet}</span>
        <div className="text-xs text-gray-400">
          Справедливый кэф: {fairOdd} | Ваш кэф: {bookmakerOdd || '—'}
        </div>
      </div>
      <div className="text-right">
        <div className={`text-lg font-bold ${isPositive ? 'text-green-400' : value > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
          {value.toFixed(1)}%
        </div>
        <div className="text-xs text-gray-400">
          {isPositive ? '✅ VALUE' : value > 0 ? '⚠️ Слабое value' : '❌ Нет value'}
        </div>
      </div>
    </div>
  );
};

export default PoissonCalculator;