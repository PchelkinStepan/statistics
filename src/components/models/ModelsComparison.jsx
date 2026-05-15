import { useState, useEffect } from 'react';
import { Scale, Calculator, TrendingUp, Brain, TreePine, Zap, Target } from 'lucide-react';
import { getData } from '../../data/store';
import {
  getLastMatches,
  calculateFeatures,
  buildFeatures,
  getLeagueAvgTotal,
  getLineTotalForLeague,
} from './neuroFeatures';

const ModelsComparison = () => {
  const data = getData();
  const totalMatches = data.matches?.length || 0;

  const [predictLeague, setPredictLeague] = useState(data.leagues?.[0]?.id || 'rpl');
  const [predictHomeTeam, setPredictHomeTeam] = useState('');
  const [predictAwayTeam, setPredictAwayTeam] = useState('');
  const [selectedTotal, setSelectedTotal] = useState(9.5);
  const [results, setResults] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);

  const [manualKef, setManualKef] = useState('1.85');

  const teamsInLeague = data.teams?.filter((t) => t.leagueId === predictLeague) || [];
  const availableTotals = [6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 12.5];

  useEffect(() => {
    setSelectedTotal(getLineTotalForLeague(predictLeague, data.seasons, data.leagues));
  }, [predictLeague, data.seasons, data.leagues]);

  const compareModels = async () => {
    if (!predictHomeTeam || !predictAwayTeam) return;
    setIsPredicting(true);
    setResults(null);

    try {
      const allMatches = [...(data.matches || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
      const homePast = getLastMatches(allMatches, predictHomeTeam, new Date().toISOString(), 12);
      const awayPast = getLastMatches(allMatches, predictAwayTeam, new Date().toISOString(), 12);

      if (homePast.length < 3 || awayPast.length < 3) {
        setIsPredicting(false);
        return;
      }

      const homeStats = calculateFeatures(homePast, predictHomeTeam);
      const awayStats = calculateFeatures(awayPast, predictAwayTeam);
      const features = buildFeatures(homeStats, awayStats, 0, getLeagueAvgTotal(predictLeague, data.seasons));
      const leagueTotal = getLineTotalForLeague(predictLeague, data.seasons, data.leagues);

      // === TensorFlow Prediction ===
      let tfResult = null;
      try {
        const tfModel = await (async () => {
          try {
            const tf = await import('@tensorflow/tfjs');
            return await tf.loadLayersModel('localstorage://football-neuro-model');
          } catch { return null; }
        })();

        if (tfModel) {
          const normParams = JSON.parse(localStorage.getItem('neuro_norm_params') || 'null');
          let tfFeatures = [...features];
          if (normParams) {
            tfFeatures = tfFeatures.map((val, idx) => {
              const mn = normParams.mean[idx] || 0;
              const sd = normParams.std[idx] || 1;
              return (val - mn) / sd;
            });
          }

          const inputTensor = (await import('@tensorflow/tfjs')).tensor2d([tfFeatures]);
          const predictionTensor = tfModel.predict(inputTensor);
          let expectedTotal = predictionTensor.dataSync()[0];
          inputTensor.dispose();
          predictionTensor.dispose();
          expectedTotal = Math.max(2, Math.min(18, expectedTotal));

          const historicalErrors = JSON.parse(localStorage.getItem('neuro_historical_errors') || 'null');
          let overProb = 50;
          if (historicalErrors && historicalErrors.length > 20) {
            const simulatedTotals = historicalErrors.map((err) => expectedTotal + err);
            const above = simulatedTotals.filter((t) => t > selectedTotal).length;
            const near = simulatedTotals.filter((t) => Math.abs(t - selectedTotal) < 0.3).length;
            let probOver = (above + near * 0.3) / simulatedTotals.length;
            probOver = Math.min(0.95, Math.max(0.05, probOver));
            overProb = Math.round(probOver * 100);
          } else {
            const diff = expectedTotal - selectedTotal;
            overProb = Math.round(100 / (1 + Math.exp(-diff * 2)));
          }

          const testResults = JSON.parse(localStorage.getItem('neuro_test_results') || 'null');
          tfResult = {
            expectedTotal: expectedTotal.toFixed(2),
            overProbability: Math.min(95, Math.max(5, overProb)),
            underProbability: Math.min(95, Math.max(5, 100 - overProb)),
            recommendation: overProb > 70 ? '🔥 ТБ' : overProb > 60 ? '✅ ТБ' : overProb < 30 ? '🔥 ТМ' : overProb < 40 ? '✅ ТМ' : '⚖️ Мимо',
            accuracy: testResults?.accuracy || '—',
          };
        }
      } catch (e) {
        console.error('TF error:', e);
      }

      // === Random Forest Prediction ===
      let rfResult = null;
      try {
        const rfRaw = localStorage.getItem('neuro_rf_model_json');
        if (rfRaw) {
          const rfModel = (await import('./RandomForestModel')).default?.SimpleRandomForest || 
                          (window.SimpleRandomForest);
          const rf = rfModel ? rfModel.fromJSON(rfRaw) : JSON.parse(rfRaw);
          
          let rfPred = 0;
          if (rf.predict) {
            rfPred = rf.predict([features])[0];
          } else {
            // Fallback: используем сигмоиду
            rfPred = parseFloat(tfResult?.expectedTotal || 8.5);
          }
          
          const rfExpected = Math.max(2, Math.min(18, rfPred));
          const rfDiff = rfExpected - selectedTotal;
          const rfOverProb = Math.round(100 / (1 + Math.exp(-rfDiff * 2)));
          
          const rfMeta = JSON.parse(localStorage.getItem('neuro_rf_meta') || 'null');
          rfResult = {
            expectedTotal: rfExpected.toFixed(2),
            overProbability: Math.min(95, Math.max(5, rfOverProb)),
            underProbability: Math.min(95, Math.max(5, 100 - rfOverProb)),
            recommendation: rfOverProb > 70 ? '🔥 ТБ' : rfOverProb > 60 ? '✅ ТБ' : rfOverProb < 30 ? '🔥 ТМ' : rfOverProb < 40 ? '✅ ТМ' : '⚖️ Мимо',
            accuracy: rfMeta?.accuracy || '—',
          };
        }
      } catch (e) {
        console.error('RF error:', e);
      }

      // === XGBoost Prediction ===
      let xgbResult = null;
      try {
        const xgbRaw = localStorage.getItem('neuro_xgb_model_json');
        if (xgbRaw) {
          const xgbModel = JSON.parse(xgbRaw);
          let xgbPred = 0;
          
          // Простой предикт для XGBoost
          if (xgbModel.trees && xgbModel.trees.length > 0) {
            const predictTree = (node, x) => {
              if (node.type === 'leaf') return node.value;
              return x[node.feature] <= node.threshold
                ? predictTree(node.left, x)
                : predictTree(node.right, x);
            };
            let sum = 0;
            for (const tree of xgbModel.trees) {
              sum += xgbModel.learningRate * predictTree(tree, features);
            }
            xgbPred = sum;
          } else {
            xgbPred = parseFloat(tfResult?.expectedTotal || 8.5);
          }
          
          const xgbExpected = Math.max(2, Math.min(18, xgbPred));
          const xgbDiff = xgbExpected - selectedTotal;
          const xgbOverProb = Math.round(100 / (1 + Math.exp(-xgbDiff * 2)));
          
          const xgbMeta = JSON.parse(localStorage.getItem('neuro_xgb_meta') || 'null');
          xgbResult = {
            expectedTotal: xgbExpected.toFixed(2),
            overProbability: Math.min(95, Math.max(5, xgbOverProb)),
            underProbability: Math.min(95, Math.max(5, 100 - xgbOverProb)),
            recommendation: xgbOverProb > 70 ? '🔥 ТБ' : xgbOverProb > 60 ? '✅ ТБ' : xgbOverProb < 30 ? '🔥 ТМ' : xgbOverProb < 40 ? '✅ ТМ' : '⚖️ Мимо',
            accuracy: xgbMeta?.accuracy || '—',
          };
        }
      } catch (e) {
        console.error('XGB error:', e);
      }

      // === Ансамбль (голосование) ===
      let ensembleVote = '⚖️ Нет данных';
      let ensembleConfidence = 0;
      if (tfResult || rfResult || xgbResult) {
        let votes = 0;
        let total = 0;
        if (tfResult) { votes += tfResult.overProbability > 60 ? 1 : tfResult.overProbability < 40 ? -1 : 0; total++; }
        if (rfResult) { votes += rfResult.overProbability > 60 ? 1 : rfResult.overProbability < 40 ? -1 : 0; total++; }
        if (xgbResult) { votes += xgbResult.overProbability > 60 ? 1 : xgbResult.overProbability < 40 ? -1 : 0; total++; }
        
        if (total > 0) {
          if (votes >= 2) { ensembleVote = '🔥 СТАВЛЮ ТБ!'; ensembleConfidence = 80; }
          else if (votes <= -2) { ensembleVote = '🔥 СТАВЛЮ ТМ!'; ensembleConfidence = 80; }
          else if (votes === 1) { ensembleVote = '✅ ТБ (слабо)'; ensembleConfidence = 55; }
          else if (votes === -1) { ensembleVote = '✅ ТМ (слабо)'; ensembleConfidence = 55; }
          else { ensembleVote = '❌ НЕ ЛЕЗУ!'; ensembleConfidence = 30; }
        }
      }

      // === Value Calculation ===
      let valueResult = null;
      if (tfResult && manualKef) {
        const kef = parseFloat(manualKef);
        const accuracy = parseFloat(tfResult.accuracy || 58);
        if (kef > 0 && !isNaN(accuracy)) {
          const value = ((accuracy / 100) * kef * 100 - 100).toFixed(1);
          const isValue = value > 5;
          const isSuper = value > 10;
          
          const kelly = (accuracy / 100 * kef - 1) / (kef - 1);
          const fractionalKelly = kelly * 0.25;
          const percent = (fractionalKelly * 100).toFixed(1);
          const amount = (fractionalKelly * 10000).toFixed(0);
          
          valueResult = {
            value,
            isValue,
            isSuper,
            kelly: percent > 0 ? `${percent}% от банка` : 'Не ставить',
            amount: amount > 0 ? `${amount}₽ при банке 10,000₽` : '',
            accuracy,
          };
        }
      }

      setResults({
        tf: tfResult,
        rf: rfResult,
        xgb: xgbResult,
        ensemble: { vote: ensembleVote, confidence: ensembleConfidence },
        value: valueResult,
        league: {
          name: data.leagues?.find(l => l.id === predictLeague)?.name || predictLeague,
          total: leagueTotal,
        },
      });
    } catch (error) {
      console.error('Comparison error:', error);
    }
    setIsPredicting(false);
  };

  const ModelCard = ({ icon: Icon, title, result, color, gradient }) => (
    <div className={`bg-gray-800/50 rounded-xl p-4 border ${gradient}`}>
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Icon size={16} className={color} /> {title}
      </h4>
      {result ? (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] text-gray-400">Тотал</p>
              <p className="text-lg font-bold text-white">{result.expectedTotal}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">ТБ {selectedTotal}</p>
              <p className="text-lg font-bold text-green-400">{result.overProbability}%</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">ТМ {selectedTotal}</p>
              <p className="text-lg font-bold text-red-400">{result.underProbability}%</p>
            </div>
          </div>
          <div className={`p-2 rounded-lg text-center text-xs font-semibold ${
            result.recommendation.includes('🔥') ? 'bg-green-600/30 text-green-400' :
            result.recommendation.includes('✅') ? 'bg-yellow-600/30 text-yellow-400' :
            'bg-gray-600/30 text-gray-400'
          }`}>
            {result.recommendation}
          </div>
          <p className="text-[10px] text-gray-500 text-center">Точность модели: {result.accuracy}%</p>
        </div>
      ) : (
        <p className="text-xs text-gray-500 text-center py-4">Модель не обучена</p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-gray-800/50 rounded-xl p-6 border border-blue-700/50">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Scale className="text-blue-400" /> Сравнение прогнозов
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Выберите матч и тотал — получите прогнозы от всех трёх моделей + ансамбль + расчёт Value
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Лига</label>
            <select
              value={predictLeague}
              onChange={(e) => {
                setPredictLeague(e.target.value);
                setPredictHomeTeam('');
                setPredictAwayTeam('');
                setResults(null);
              }}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm"
            >
              {data.leagues?.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Хозяева</label>
            <select
              value={predictHomeTeam}
              onChange={(e) => { setPredictHomeTeam(e.target.value); setResults(null); }}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm"
            >
              <option value="">Выберите</option>
              {teamsInLeague.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Гости</label>
            <select
              value={predictAwayTeam}
              onChange={(e) => { setPredictAwayTeam(e.target.value); setResults(null); }}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm"
            >
              <option value="">Выберите</option>
              {teamsInLeague.filter((t) => t.id !== predictHomeTeam).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs text-gray-400 mb-2">Тотал: {selectedTotal}</label>
          <div className="flex flex-wrap gap-2">
            {availableTotals.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedTotal(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  selectedTotal === t ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={compareModels}
          disabled={!predictHomeTeam || !predictAwayTeam || isPredicting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50 mb-4"
        >
          {isPredicting ? 'Анализирую...' : '⚖️ Сравнить все модели'}
        </button>

        {results && (
          <div className="space-y-4">
            {/* Ансамбль */}
            <div className={`p-4 rounded-xl text-center ${
              results.ensemble.vote.includes('СТАВЛЮ') ? 'bg-green-600/20 border border-green-600' :
              results.ensemble.vote.includes('НЕ ЛЕЗУ') ? 'bg-red-600/20 border border-red-600' :
              'bg-yellow-600/20 border border-yellow-600'
            }`}>
              <h4 className="text-lg font-bold mb-1">🧠 Ансамбль (голосование)</h4>
              <p className="text-2xl font-bold">{results.ensemble.vote}</p>
              <p className="text-sm text-gray-400">Уверенность: {results.ensemble.confidence}%</p>
            </div>

            {/* Карточки моделей */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ModelCard
                icon={Brain}
                title="TensorFlow"
                result={results.tf}
                color="text-purple-400"
                gradient="border-purple-700/50"
              />
              <ModelCard
                icon={TreePine}
                title="Random Forest"
                result={results.rf}
                color="text-lime-400"
                gradient="border-lime-700/50"
              />
              <ModelCard
                icon={Zap}
                title="XGBoost"
                result={results.xgb}
                color="text-emerald-400"
                gradient="border-emerald-700/50"
              />
            </div>

            {/* Value Calculator */}
            {results.value && (
              <div className="bg-gray-800/80 rounded-xl p-5 border border-gray-600">
                <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-green-400" />
                  Value Betting
                  <span className="text-xs text-gray-400 font-normal ml-2">
                    (на основе точности TF: {results.value.accuracy}%)
                  </span>
                </h4>
                <div className="flex items-center gap-4 mb-3 flex-wrap">
                  <label className="text-sm text-gray-400 whitespace-nowrap">Введите кэф:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={manualKef}
                    onChange={(e) => setManualKef(e.target.value)}
                    className="w-24 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white text-center font-bold text-lg"
                  />
                  <div
                    className={`flex-1 min-w-[200px] p-3 rounded-lg text-center font-bold text-lg ${
                      results.value.isSuper
                        ? 'bg-green-600/30 text-green-400'
                        : results.value.isValue
                          ? 'bg-yellow-600/30 text-yellow-400'
                          : 'bg-red-600/30 text-red-400'
                    }`}
                  >
                    Value: {results.value.value > 0 ? '+' : ''}{results.value.value}%
                    {results.value.isSuper ? ' 🔥 СУПЕР!' : results.value.isValue ? ' ✅ ВАЛУЙ!' : ' ❌ МИМО'}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  Безубыточный кэф: <span className="text-white font-bold">{(100 / results.value.accuracy).toFixed(2)}</span>
                </p>
                <div className="pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-400">
                    💰 Келли (1/4): <span className="text-white font-bold">{results.value.kelly}</span>
                  </p>
                  {results.value.amount && (
                    <p className="text-xs text-gray-500">{results.value.amount}</p>
                  )}
                </div>
              </div>
            )}

            {!results.value && (
              <div className="bg-gray-800/80 rounded-xl p-5 border border-gray-600">
                <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-green-400" />
                  Value Betting
                </h4>
                <div className="flex items-center gap-4 mb-3 flex-wrap">
                  <label className="text-sm text-gray-400 whitespace-nowrap">Введите кэф:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={manualKef}
                    onChange={(e) => setManualKef(e.target.value)}
                    className="w-24 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white text-center font-bold text-lg"
                  />
                </div>
                <p className="text-xs text-gray-500">Обучите TensorFlow для расчёта Value</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelsComparison;