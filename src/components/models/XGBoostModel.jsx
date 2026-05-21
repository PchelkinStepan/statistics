import { useState, useEffect } from 'react';
import { Activity, Calculator, Play, RefreshCw, Zap, Save } from 'lucide-react';
import { getData } from '../../data/store';
import {
  buildChronologicalTrainingExamples,
  getLastMatches,
  calculateFeatures,
  buildFeatures,
  getLeagueAvgTotal,
  getLineTotalForLeague,
  calculateProbabilitySimple,
} from './neuroFeatures';

/** Упрощённый градиентный бустинг деревьев (MSE), без внешних зависимостей */
class SimpleXGBoost {
  constructor(params = {}) {
    this.trees = [];
    this.learningRate = params.learningRate ?? 0.1;
    this.maxDepth = params.maxDepth ?? 3;
    this.minSamplesSplit = params.minSamplesSplit ?? 10;
    this.nEstimators = params.nEstimators ?? 50;
    this.seed = params.seed ?? 42;
  }

  mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a += 0x6d2b79f5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  trainTree(X, y, depth = 0, rng = Math.random) {
    if (depth >= this.maxDepth || y.length < this.minSamplesSplit) {
      return { type: 'leaf', value: y.reduce((a, b) => a + b, 0) / y.length };
    }

    let bestFeature = 0;
    let bestThreshold = 0;
    let bestGain = -Infinity;

    const F = X[0].length;
    const k = Math.min(8, F);
    const order = Array.from({ length: F }, (_, i) => i);
    for (let i = F - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const featCandidates = order.slice(0, k);

    for (const f of featCandidates) {
      const values = [...new Set(X.map((row) => row[f]))].sort((a, b) => a - b);
      for (let i = 1; i < values.length; i++) {
        const threshold = (values[i] + values[i - 1]) / 2;
        const leftY = [];
        const rightY = [];

        for (let j = 0; j < X.length; j++) {
          if (X[j][f] <= threshold) leftY.push(y[j]);
          else rightY.push(y[j]);
        }

        if (leftY.length < 3 || rightY.length < 3) continue;

        const gain = this.calculateGain(y, leftY, rightY);
        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = f;
          bestThreshold = threshold;
        }
      }
    }

    if (bestGain === -Infinity) {
      return { type: 'leaf', value: y.reduce((a, b) => a + b, 0) / y.length };
    }

    const leftX = [];
    const rightX = [];
    const leftY = [];
    const rightY = [];
    for (let i = 0; i < X.length; i++) {
      if (X[i][bestFeature] <= bestThreshold) {
        leftX.push(X[i]);
        leftY.push(y[i]);
      } else {
        rightX.push(X[i]);
        rightY.push(y[i]);
      }
    }

    return {
      type: 'node',
      feature: bestFeature,
      threshold: bestThreshold,
      left: this.trainTree(leftX, leftY, depth + 1, rng),
      right: this.trainTree(rightX, rightY, depth + 1, rng),
    };
  }

  calculateGain(parentY, leftY, rightY) {
    const parentVar = this.variance(parentY);
    const leftVar = this.variance(leftY);
    const rightVar = this.variance(rightY);
    const leftWeight = leftY.length / parentY.length;
    const rightWeight = rightY.length / parentY.length;
    return parentVar - (leftWeight * leftVar + rightWeight * rightVar);
  }

  variance(arr) {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((sum, val) => sum + (val - mean) ** 2, 0) / arr.length;
  }

  predictTree(node, x) {
    if (node.type === 'leaf') return node.value;
    return x[node.feature] <= node.threshold
      ? this.predictTree(node.left, x)
      : this.predictTree(node.right, x);
  }

  fit(X, y) {
    this.trees = [];
    let residuals = [...y];
    const rng = this.mulberry32(this.seed);

    for (let i = 0; i < this.nEstimators; i++) {
      const bootRng = this.mulberry32(this.seed + i * 2654435761);
      const n = X.length;
      const Xb = [];
      const yb = [];
      for (let j = 0; j < n; j++) {
        const idx = Math.floor(bootRng() * n);
        Xb.push(X[idx]);
        yb.push(residuals[idx]);
      }
      
      const treeRng = this.mulberry32(this.seed + i * 1597334677 + 9);
      const tree = this.trainTree(Xb, yb, 0, treeRng);
      this.trees.push(tree);
      residuals = residuals.map((yi, idx) => yi - this.learningRate * this.predictTree(tree, X[idx]));
    }
  }

  predict(X) {
    return X.map((x) => {
      let sum = 0;
      for (const tree of this.trees) sum += this.learningRate * this.predictTree(tree, x);
      return sum;
    });
  }

  static fromJSON(json) {
    const o = typeof json === 'string' ? JSON.parse(json) : json;
    const m = new SimpleXGBoost({
      learningRate: o.learningRate,
      maxDepth: o.maxDepth,
      minSamplesSplit: o.minSamplesSplit,
      nEstimators: o.nEstimators,
      seed: o.seed || 42,
    });
    m.trees = o.trees || [];
    return m;
  }

  toJSON() {
    return {
      learningRate: this.learningRate,
      maxDepth: this.maxDepth,
      minSamplesSplit: this.minSamplesSplit,
      nEstimators: this.nEstimators,
      seed: this.seed,
      trees: this.trees,
    };
  }
}

const STORAGE_MODEL = 'neuro_xgb_model_json';
const STORAGE_META = 'neuro_xgb_meta';

const XGBoostModel = () => {
  const data = getData();
  const totalMatches = data.matches?.length || 0;

  const [modelReady, setModelReady] = useState(false);
  const [model, setModel] = useState(null);
  const [trainingLog, setTrainingLog] = useState([]);
  const [isTraining, setIsTraining] = useState(false);
  const [testResults, setTestResults] = useState(null);

  const [predictLeague, setPredictLeague] = useState(data.leagues?.[0]?.id || 'rpl');
  const [predictHomeTeam, setPredictHomeTeam] = useState('');
  const [predictAwayTeam, setPredictAwayTeam] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [selectedTotal, setSelectedTotal] = useState(9.5);

  const teamsInLeague = data.teams?.filter((t) => t.leagueId === predictLeague) || [];

  const addLog = (msg) => {
    console.log(msg);
    setTrainingLog((p) => [...p, { time: new Date().toLocaleTimeString(), text: msg }]);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_MODEL);
      if (raw) {
        setModel(SimpleXGBoost.fromJSON(raw));
        setModelReady(true);
        const meta = localStorage.getItem(STORAGE_META);
        if (meta) setTestResults(JSON.parse(meta));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    setSelectedTotal(getLineTotalForLeague(predictLeague, data.seasons, data.leagues));
  }, [predictLeague, data.seasons, data.leagues]);

  const prepareRows = () =>
    buildChronologicalTrainingExamples(data.matches, data.seasons).map((e) => ({
      features: e.features,
      y: e.label,
      leagueId: e.leagueId,
    }));

  const trainModel = async () => {
    setIsTraining(true);
    setTrainingLog([]);
    try {
      addLog('🚀 ОБУЧЕНИЕ XGBoost (JS)');
      addLog(`📊 ${totalMatches} матчей в базе`);

      const rows = prepareRows();
      addLog(`✅ ${rows.length} примеров (32 признака, как Neuro)`);

      if (rows.length < 100) {
        addLog('❌ Мало данных для обучения');
        setIsTraining(false);
        return;
      }

      const X = rows.map((r) => r.features);
      const y = rows.map((r) => r.y);
      const leagueIds = rows.map((r) => r.leagueId);

      const trainSize = Math.floor(X.length * 0.8);
      const trainX = X.slice(0, trainSize);
      const trainY = y.slice(0, trainSize);
      const testX = X.slice(trainSize);
      const testY = y.slice(trainSize);
      const testLeagues = leagueIds.slice(trainSize);

      const xgb = new SimpleXGBoost({ 
        nEstimators: 50, 
        maxDepth: 4, 
        learningRate: 0.1, 
        minSamplesSplit: 10,
        seed: Math.floor(Math.random() * 10000),
      });

      addLog('🎓 Обучение 50 деревьев с бутстрапом...');
      const startTime = Date.now();
      xgb.fit(trainX, trainY);
      addLog(`✅ Обучено за ${((Date.now() - startTime) / 1000).toFixed(1)} с`);

      const predictions = xgb.predict(testX);
      let correct = 0;
      let totalError = 0;
      predictions.forEach((pred, i) => {
        const actual = testY[i];
        totalError += Math.abs(pred - actual);
        const lineTotal = getLineTotalForLeague(testLeagues[i], data.seasons, data.leagues);
        const actualOver = actual > lineTotal;
        const modelOver = pred > lineTotal;
        if (actualOver === modelOver) correct++;
      });

      const accuracy = ((correct / predictions.length) * 100).toFixed(1);
      const mae = (totalError / predictions.length).toFixed(2);
      addLog(`📊 Точность ТБ/ТМ (линия по лиге): ${accuracy}%`);
      addLog(`📊 MAE: ±${mae} угловых`);

      const meta = { accuracy, mae, total: predictions.length, correct };
      setTestResults(meta);
      setModel(xgb);
      setModelReady(true);

      localStorage.setItem(STORAGE_MODEL, JSON.stringify(xgb.toJSON()));
      localStorage.setItem(STORAGE_META, JSON.stringify(meta));
    } catch (error) {
      addLog(`❌ ${error.message}`);
      console.error(error);
    }
    setIsTraining(false);
  };

  const predict = () => {
    if (!predictHomeTeam || !predictAwayTeam || !model) return;

    const allMatches = [...(data.matches || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
    const homePast = getLastMatches(allMatches, predictHomeTeam, new Date().toISOString(), 12);
    const awayPast = getLastMatches(allMatches, predictAwayTeam, new Date().toISOString(), 12);
    if (homePast.length < 3 || awayPast.length < 3) return;

    const homeStats = calculateFeatures(homePast, predictHomeTeam);
    const awayStats = calculateFeatures(awayPast, predictAwayTeam);
    const features = buildFeatures(
      homeStats,
      awayStats,
      0,
      getLeagueAvgTotal(predictLeague, data.seasons),
    );

    const predictions = [];
    for (let s = 0; s < 5; s++) {
      const xgbVariant = new SimpleXGBoost({
        nEstimators: model.nEstimators,
        maxDepth: model.maxDepth,
        minSamplesSplit: model.minSamplesSplit,
        learningRate: model.learningRate,
        seed: (model.seed || 42) + s * 1000,
      });
      xgbVariant.trees = model.trees;
      predictions.push(xgbVariant.predict([features])[0]);
    }
    
    const pred = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    const expectedTotal = Math.max(2, Math.min(18, pred));
    
    // 🔧 ФИКС: честная сигмоида вместо ошибок TF
    const overProb = calculateProbabilitySimple(expectedTotal, selectedTotal);

    setPrediction({
      expectedTotal: expectedTotal.toFixed(2),
      overProbability: Math.min(95, Math.max(5, overProb)),
      underProbability: Math.min(95, Math.max(5, 100 - overProb)),
      recommendation:
        overProb > 70
          ? `🔥 СТАВЛЮ! ТБ ${selectedTotal}`
          : overProb > 60
            ? `⚠️ СТАВЛЮ ОСТОРОЖНО! ТБ ${selectedTotal}`
            : overProb < 30
              ? `🔥 СТАВЛЮ! ТМ ${selectedTotal}`
              : overProb < 40
                ? `⚠️ СТАВЛЮ ОСТОРОЖНО! ТМ ${selectedTotal}`
                : `❌ НЕ ЛЕЗУ!`,
    });
  };

  const availableTotals = [6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 12.5];

  return (
    <div className="space-y-4">
      <div className="bg-gray-800/50 rounded-xl p-6 border border-emerald-700/50 text-center">
        <Zap size={48} className="mx-auto mb-4 text-emerald-400" />
        <h3 className="text-xl font-bold mb-2">XGBoost (браузер)</h3>
        <p className="text-gray-400 mb-4">
          Градиентный бустинг деревьев • бутстрап • случайные признаки • 32 входа как у Neuro
        </p>
        {!isTraining && (
          <button
            type="button"
            onClick={trainModel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg inline-flex items-center gap-2"
          >
            <Play size={20} /> {modelReady ? 'Переобучить' : 'Обучить XGBoost'}
          </button>
        )}
        {isTraining && (
          <div className="text-center py-4">
            <RefreshCw size={32} className="mx-auto mb-2 animate-spin text-emerald-400" />
            <p>Обучение… обычно до минуты</p>
          </div>
        )}
        {modelReady && (
          <div className="flex gap-2 justify-center flex-wrap mt-3">
            <button
              type="button"
              onClick={() => {
                try {
                  const model = localStorage.getItem('neuro_xgb_model_json');
                  if (model) {
                    localStorage.setItem('neuro_xgb_model_json_backup', model);
                    const meta = localStorage.getItem('neuro_xgb_meta');
                    if (meta) localStorage.setItem('neuro_xgb_meta_backup', meta);
                    addLog('📥 Бэкап сохранён!');
                  }
                } catch (e) {
                  addLog(`❌ ${e.message}`);
                }
              }}
              className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded-lg flex items-center gap-2"
            >
              <Save size={16} /> 💾 Бэкап
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  const model = localStorage.getItem('neuro_xgb_model_json');
                  const meta = localStorage.getItem('neuro_xgb_meta');
                  const exportData = {};
                  if (model) exportData.neuro_xgb_model_json = model;
                  if (meta) exportData.neuro_xgb_meta = meta;
                  
                  const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `xgb-model-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  addLog('📥 Модель скачана!');
                } catch (e) {
                  addLog(`❌ Ошибка: ${e.message}`);
                }
              }}
              className="bg-blue-700 hover:bg-blue-600 text-white text-sm py-2 px-4 rounded-lg flex items-center gap-2"
            >
              <Save size={16} /> 📥 Скачать
            </button>
          </div>
        )}
      </div>

      {trainingLog.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <h4 className="font-semibold mb-2">
            <Activity size={16} className="text-emerald-400 inline mr-1" /> Лог обучения
          </h4>
          <div className="bg-gray-900 rounded-lg p-3 max-h-60 overflow-auto font-mono text-xs space-y-1">
            {trainingLog.map((e, i) => (
              <div key={i} className="text-gray-300">
                <span className="text-gray-500">[{e.time}]</span> {e.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {testResults && (
        <div className="bg-gray-800/50 rounded-xl p-4 border border-emerald-700/50 text-center">
          <h4 className="font-semibold text-emerald-400 mb-2">Результаты на отложенной выборке</h4>
          <p className="text-2xl font-bold text-emerald-400">{testResults.accuracy}%</p>
          <p className="text-xs text-gray-400">
            {testResults.correct}/{testResults.total} верно по направлению ТБ/ТМ • MAE ±{testResults.mae}
          </p>
        </div>
      )}

      {modelReady && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-emerald-700/50">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Calculator className="text-emerald-400" /> Прогноз XGBoost
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Лига</label>
              <select
                value={predictLeague}
                onChange={(e) => {
                  setPredictLeague(e.target.value);
                  setPredictHomeTeam('');
                  setPredictAwayTeam('');
                  setPrediction(null);
                }}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm"
              >
                {data.leagues?.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Хозяева</label>
              <select
                value={predictHomeTeam}
                onChange={(e) => {
                  setPredictHomeTeam(e.target.value);
                  setPrediction(null);
                }}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm"
              >
                <option value="">Выберите</option>
                {teamsInLeague.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Гости</label>
              <select
                value={predictAwayTeam}
                onChange={(e) => {
                  setPredictAwayTeam(e.target.value);
                  setPrediction(null);
                }}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm"
              >
                <option value="">Выберите</option>
                {teamsInLeague
                  .filter((t) => t.id !== predictHomeTeam)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
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
                    selectedTotal === t
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={predict}
            disabled={!predictHomeTeam || !predictAwayTeam}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
          >
            Получить прогноз
          </button>

          {prediction && (
            <div className="mt-4 bg-emerald-900/20 rounded-lg p-4 border border-emerald-700/50">
              <h4 className="font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                <Zap size={16} /> XGBoost
              </h4>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">Ожидаемый тотал</p>
                  <p className="text-2xl font-bold text-white">{prediction.expectedTotal}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">ТБ {selectedTotal}</p>
                  <p className="text-2xl font-bold text-emerald-400">{prediction.overProbability}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">ТМ {selectedTotal}</p>
                  <p className="text-2xl font-bold text-red-400">{prediction.underProbability}%</p>
                </div>
              </div>
              <div
                className={`p-3 rounded-lg text-center font-semibold ${
                  prediction.recommendation.includes('СТАВЛЮ')
                    ? 'bg-emerald-600/30 text-emerald-400'
                    : prediction.recommendation.includes('НЕ ЛЕЗУ')
                      ? 'bg-gray-600/30 text-gray-400'
                      : 'bg-yellow-600/30 text-yellow-300'
                }`}
              >
                {prediction.recommendation}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default XGBoostModel;