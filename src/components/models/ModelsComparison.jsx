import { useState, useEffect } from 'react';
import { Scale, TrendingUp, Brain, TreePine, Zap, Save } from 'lucide-react';
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
  const [predictLeague, setPredictLeague] = useState(data.leagues?.[0]?.id || 'rpl');
  const [predictHomeTeam, setPredictHomeTeam] = useState('');
  const [predictAwayTeam, setPredictAwayTeam] = useState('');
  const [selectedTotal, setSelectedTotal] = useState(9.5);
  const [results, setResults] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [valueType, setValueType] = useState('over');
  const [manualKef, setManualKef] = useState('1.85');
  const [valueResult, setValueResult] = useState(null);

  const teamsInLeague = data.teams?.filter((t) => t.leagueId === predictLeague) || [];

  useEffect(() => {
    if (!results?.tf || !manualKef) {
      setValueResult(null);
      return;
    }
    const kef = parseFloat(manualKef);
    const accuracy = parseFloat(results.tf.mae || 58);
    if (kef > 0) {
      const value = ((accuracy / 100) * kef * 100 - 100).toFixed(1);
      const isValue = value > 5;
      const isSuper = value > 10;
      setValueResult({ value, isValue, isSuper, accuracy });
    }
  }, [manualKef, results]);
  const availableTotals = [6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 12.5];

  useEffect(() => {
    setSelectedTotal(getLineTotalForLeague(predictLeague, data.seasons, data.leagues));
  }, [predictLeague, data.seasons, data.leagues]);

  useEffect(() => {
    if (!results?.tf || !manualKef) {
      setValueResult(null);
      return;
    }
    const kef = parseFloat(manualKef);
    const prob = valueType === 'over' ? results.tf.overProbability : results.tf.underProbability;
    if (kef > 0 && prob > 0) {
      const value = ((prob / 100) * kef * 100 - 100).toFixed(1);
      const isValue = value > 5;
      const isSuper = value > 10;
      
      const kelly = (prob / 100 * kef - 1) / (kef - 1);
      const fractionalKelly = kelly * 0.25;
      const percent = (fractionalKelly * 100).toFixed(1);
      const amount = (fractionalKelly * 10000).toFixed(0);
      
      setValueResult({
        value,
        isValue,
        isSuper,
        prob,
        kelly: percent > 0 ? `${percent}% от банка` : 'Не ставить',
        amount: amount > 0 ? `${amount}₽ при банке 10,000₽` : '',
      });
    }
  }, [manualKef, valueType, results]);

  const predictRF = (features) => {
    try {
      const raw = localStorage.getItem('neuro_rf_model_json');
      if (!raw) return null;
      const modelData = JSON.parse(raw);
      if (!modelData.trees || modelData.trees.length === 0) return null;
      
      const predictTree = (node, x) => {
        if (node.type === 'leaf') return node.value;
        return x[node.feature] <= node.threshold
          ? predictTree(node.left, x)
          : predictTree(node.right, x);
      };
      
      let sum = 0;
      for (const tree of modelData.trees) {
        sum += predictTree(tree, features);
      }
      return sum / modelData.trees.length;
    } catch (e) {
      console.error('RF predict error:', e);
      return null;
    }
  };

  const predictXGB = (features) => {
    try {
      const raw = localStorage.getItem('neuro_xgb_model_json');
      if (!raw) return null;
      const modelData = JSON.parse(raw);
      if (!modelData.trees || modelData.trees.length === 0) return null;
      
      const predictTree = (node, x) => {
        if (node.type === 'leaf') return node.value;
        return x[node.feature] <= node.threshold
          ? predictTree(node.left, x)
          : predictTree(node.right, x);
      };
      
      let sum = 0;
      for (const tree of modelData.trees) {
        sum += (modelData.learningRate || 0.1) * predictTree(tree, features);
      }
      return sum;
    } catch (e) {
      console.error('XGB predict error:', e);
      return null;
    }
  };


  const compareModels = async () => {
    if (!predictHomeTeam || !predictAwayTeam) return;
    setIsPredicting(true);
    setResults(null);
    setSaveMessage('');

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

      // === TensorFlow ===
      let tfResult = null;
      try {
        const tf = await import('@tensorflow/tfjs');
        const models = await tf.io.listModels();
        if (models['localstorage://football-neuro-model']) {
          const tfModel = await tf.loadLayersModel('localstorage://football-neuro-model');
          
          const normParams = JSON.parse(localStorage.getItem('neuro_norm_params') || 'null');
          let tfFeatures = [...features];
          if (normParams) {
            tfFeatures = tfFeatures.map((val, idx) => {
              const mn = normParams.mean[idx] || 0;
              const sd = normParams.std[idx] || 1;
              return (val - mn) / sd;
            });
          }

          const inputTensor = tf.tensor2d([tfFeatures]);
          const predictionTensor = tfModel.predict(inputTensor);
          let expectedTotal = predictionTensor.dataSync()[0];
          inputTensor.dispose();
          predictionTensor.dispose();
          expectedTotal = Math.max(2, Math.min(18, expectedTotal));

          const testResults = JSON.parse(localStorage.getItem('neuro_test_results') || 'null');
          
          tfResult = {
            expectedTotal: expectedTotal.toFixed(2),
            mae: testResults?.avgError || '—',
          };
        }
      } catch (e) {
        console.error('TF error:', e);
      }

      // === Random Forest ===
      let rfResult = null;
      const rfPred = predictRF(features);
      if (rfPred !== null) {
        const rfExpected = Math.max(2, Math.min(18, rfPred));
        const rfMeta = JSON.parse(localStorage.getItem('neuro_rf_meta') || 'null');
        
        rfResult = {
          expectedTotal: rfExpected.toFixed(2),
          mae: rfMeta?.mae || '—',
        };
      }

      // === XGBoost ===
      let xgbResult = null;
      const xgbPred = predictXGB(features);
      if (xgbPred !== null) {
        const xgbExpected = Math.max(2, Math.min(18, xgbPred));
        const xgbMeta = JSON.parse(localStorage.getItem('neuro_xgb_meta') || 'null');
        
        xgbResult = {
          expectedTotal: xgbExpected.toFixed(2),
          mae: xgbMeta?.mae || '—',
        };
      }

      setResults({ tf: tfResult, rf: rfResult, xgb: xgbResult });
    } catch (error) {
      console.error('Comparison error:', error);
    }
    setIsPredicting(false);
  };

  const savePredictions = async () => {
    if (!results) return;
    
    const homeTeam = data.teams?.find((t) => t.id === predictHomeTeam)?.name || predictHomeTeam;
    const awayTeam = data.teams?.find((t) => t.id === predictAwayTeam)?.name || predictAwayTeam;
    
    const logEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      match: `${homeTeam} - ${awayTeam}`,
      leagueId: predictLeague,
      homeTeamId: predictHomeTeam,
      awayTeamId: predictAwayTeam,
      selectedTotal,
      predictions: {
        tf: results.tf || null,
        rf: results.rf || null,
        xgb: results.xgb || null,
      },
      ensembleVote: results.ensemble?.vote || '—',
      result: null,
    };
    
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../../firebase');
      await setDoc(doc(db, 'football', 'stats', 'predictions', logEntry.id), logEntry);
      
      setSaveMessage('✅ Прогнозы записаны!');
      setTimeout(() => setSaveMessage(''), 3000);
      console.log('📝 Прогноз записан в predictions:', logEntry.match);
    } catch (error) {
      console.error('❌ Ошибка записи прогноза:', error);
      setSaveMessage('❌ Ошибка записи');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const ModelCard = ({ icon: Icon, title, result, color, gradient }) => (
    <div className={`bg-gray-800/50 rounded-xl p-4 border ${gradient}`}>
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Icon size={16} className={color} /> {title}
      </h4>
      {result ? (
        <div className="space-y-2">
          <div className="text-center">
            <p className="text-[10px] text-gray-400">Ожидаемый тотал</p>
            <p className="text-2xl font-bold text-white">{result.expectedTotal}</p>
          </div>
          <p className="text-[10px] text-gray-500 text-center">MAE: ±{result.mae}</p>
        </div>
      ) : (
        <p className="text-xs text-gray-500 text-center py-4">Не обучена</p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-gray-800/50 rounded-xl p-6 border border-blue-700/50">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Scale className="text-blue-400" /> Сравнение прогнозов
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Лига</label>
            <select value={predictLeague} onChange={(e) => { setPredictLeague(e.target.value); setPredictHomeTeam(''); setPredictAwayTeam(''); setResults(null); }}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm">
              {data.leagues?.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Хозяева</label>
            <select value={predictHomeTeam} onChange={(e) => { setPredictHomeTeam(e.target.value); setResults(null); }}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm">
              <option value="">Выберите</option>
              {teamsInLeague.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Гости</label>
            <select value={predictAwayTeam} onChange={(e) => { setPredictAwayTeam(e.target.value); setResults(null); }}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm">
              <option value="">Выберите</option>
              {teamsInLeague.filter((t) => t.id !== predictHomeTeam).map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs text-gray-400 mb-2">Тотал: {selectedTotal}</label>
          <div className="flex flex-wrap gap-2">
            {availableTotals.map((t) => (
              <button key={t} type="button" onClick={() => setSelectedTotal(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${selectedTotal === t ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <button type="button" onClick={compareModels} disabled={!predictHomeTeam || !predictAwayTeam || isPredicting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50">
            {isPredicting ? 'Анализирую...' : '⚖️ Сравнить все модели'}
          </button>
          
          {results && (
            <button type="button" onClick={savePredictions}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center gap-2 transition">
              <Save size={18} /> 📝 Записать
            </button>
          )}
        </div>
        
        {saveMessage && (
          <div className={`px-4 py-3 rounded-lg text-sm mb-4 ${saveMessage.includes('❌') ? 'bg-red-600/20 border border-red-600 text-red-400' : 'bg-green-600/20 border border-green-600 text-green-400'}`}>
            {saveMessage}
          </div>
        )}

        {results && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ModelCard icon={Brain} title="TensorFlow" result={results.tf} color="text-purple-400" gradient="border-purple-700/50" />
              <ModelCard icon={TreePine} title="Random Forest" result={results.rf} color="text-lime-400" gradient="border-lime-700/50" />
              <ModelCard icon={Zap} title="XGBoost" result={results.xgb} color="text-emerald-400" gradient="border-emerald-700/50" />
            </div>

            <div className="bg-gray-800/80 rounded-xl p-5 border border-gray-600">
              <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-green-400" />
                Value Betting
                <span className="text-xs text-gray-400 font-normal ml-2">
                  (MAE модели {results.tf?.mae || '—'})
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
                {valueResult && (
                  <div
                    className={`flex-1 min-w-[200px] p-3 rounded-lg text-center font-bold text-lg ${
                      valueResult.isSuper
                        ? 'bg-green-600/30 text-green-400'
                        : valueResult.isValue
                          ? 'bg-yellow-600/30 text-yellow-400'
                          : 'bg-red-600/30 text-red-400'
                    }`}
                  >
                    Value: {valueResult.value > 0 ? '+' : ''}
                    {valueResult.value}%
                    {valueResult.isSuper
                      ? ' 🔥 СУПЕР-ВАЛУЙ!'
                      : valueResult.isValue
                        ? ' ✅ ВАЛУЙ!'
                        : ' ❌ МИМО'}
                  </div>
                )}
              </div>
              {valueResult && (
                <p className="text-xs text-gray-500">
                  Безубыточный кэф:{' '}
                  <span className="text-white font-bold">{(100 / valueResult.accuracy).toFixed(2)}</span>
                </p>
              )}
              {valueResult && (
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-400 mb-1">
                    💰 Келли (1/4):
                    <span className="text-white font-bold ml-1">
                      {(() => {
                        const accuracy = parseFloat(valueResult.accuracy) / 100;
                        const kef = parseFloat(manualKef);
                        const kelly = (accuracy * kef - 1) / (kef - 1);
                        const fractionalKelly = kelly * 0.25;
                        const percent = (fractionalKelly * 100).toFixed(1);
                        return percent > 0 ? `${percent}% от банка` : 'Не ставить';
                      })()}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {(() => {
                      const accuracy = parseFloat(valueResult.accuracy) / 100;
                      const kef = parseFloat(manualKef);
                      const kelly = (accuracy * kef - 1) / (kef - 1);
                      const fractionalKelly = kelly * 0.25;
                      const amount = (fractionalKelly * 10000).toFixed(0);
                      return amount > 0 ? `При банке 10,000₽ → ставка ${amount}₽` : '';
                    })()}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowBetModal(true)}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <Wallet size={18} /> 💰 Поставить
            </button>
          </div>
        )}
      </div>
      <BetModal
        isOpen={showBetModal}
        onClose={() => setShowBetModal(false)}
        matchData={{
          homeTeam: data.teams?.find((t) => t.id === predictHomeTeam)?.name || '',
          awayTeam: data.teams?.find((t) => t.id === predictAwayTeam)?.name || '',
          leagueId: predictLeague,
        }}
        total={selectedTotal}
        recommendation={results?.tf ? `TF: ${results.tf.expectedTotal}` : ''}
        overProb={50}
      />
    </div>
  );
};

export default ModelsComparison;
