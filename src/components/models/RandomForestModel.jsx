import { useState, useEffect } from 'react';
import { Activity, Calculator, Play, RefreshCw, TreePine, Save, Database, Target } from 'lucide-react';
import { getData } from '../../data/store';
import {
  buildChronologicalTrainingExamples,
  getLastMatches,
  calculateFeatures,
  buildFeatures,
  getLeagueAvgTotal,
  getLineTotalForLeague,
  calculateProbabilitySimple,
  getDefaultTeamStats,
  getBayesianTeamStats,
} from './neuroFeatures';

/** Детерминированный PRNG для бутстрапа и выбора признаков */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random Forest регрессии: бутстрап + деревья на подмножестве признаков */
class SimpleRandomForest {
  constructor(params = {}) {
    this.trees = [];
    this.nEstimators = params.nEstimators ?? 22;
    this.maxDepth = params.maxDepth ?? 7;
    this.minSamplesSplit = params.minSamplesSplit ?? 6;
    this.maxFeatures = params.maxFeatures ?? 8;
    this.seed = params.seed ?? 42;
  }

  variance(arr) {
    const mean = arr.reduce((x, y) => x + y, 0) / arr.length;
    return arr.reduce((sum, val) => sum + (val - mean) ** 2, 0) / arr.length;
  }

  calculateGain(parentY, leftY, rightY) {
    const parentVar = this.variance(parentY);
    const leftVar = this.variance(leftY);
    const rightVar = this.variance(rightY);
    const lw = leftY.length / parentY.length;
    const rw = rightY.length / parentY.length;
    return parentVar - (lw * leftVar + rw * rightVar);
  }

  trainTree(X, y, depth, rng) {
    if (depth >= this.maxDepth || y.length < this.minSamplesSplit) {
      return { type: 'leaf', value: y.reduce((a, b) => a + b, 0) / y.length };
    }

    const F = X[0].length;
    const k = Math.min(this.maxFeatures, F);
    const order = Array.from({ length: F }, (_, i) => i);
    for (let i = F - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const featCandidates = order.slice(0, k);

    let bestFeature = featCandidates[0];
    let bestThreshold = 0;
    let bestGain = -Infinity;

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
      left: this.trainTree(
        leftX,
        leftY,
        depth + 1,
        mulberry32((this.seed + bestFeature * 973733 + depth * 1013904223 + leftX.length * 7) >>> 0),
      ),
      right: this.trainTree(
        rightX,
        rightY,
        depth + 1,
        mulberry32((this.seed + bestFeature * 73856093 + depth * 1103515245 + rightX.length * 11) >>> 0),
      ),
    };
  }

  predictTree(node, x) {
    if (node.type === 'leaf') return node.value;
    return x[node.feature] <= node.threshold
      ? this.predictTree(node.left, x)
      : this.predictTree(node.right, x);
  }

  fit(X, y) {
    this.trees = [];
    const n = X.length;
    for (let t = 0; t < this.nEstimators; t++) {
      const bootRng = mulberry32((this.seed + t * 2654435761) >>> 0);
      const Xb = [];
      const yb = [];
      for (let i = 0; i < n; i++) {
        const j = Math.floor(bootRng() * n);
        Xb.push(X[j]);
        yb.push(y[j]);
      }
      const treeRng = mulberry32((this.seed + t * 1597334677 + 9) >>> 0);
      this.trees.push(this.trainTree(Xb, yb, 0, treeRng));
    }
  }

  predict(X) {
    return X.map((x) => {
      let s = 0;
      for (const tree of this.trees) s += this.predictTree(tree, x);
      return s / this.trees.length;
    });
  }

  toJSON() {
    return {
      nEstimators: this.nEstimators,
      maxDepth: this.maxDepth,
      minSamplesSplit: this.minSamplesSplit,
      maxFeatures: this.maxFeatures,
      seed: this.seed,
      trees: this.trees,
    };
  }

  static fromJSON(json) {
    const o = typeof json === 'string' ? JSON.parse(json) : json;
    const m = new SimpleRandomForest({
      nEstimators: o.nEstimators,
      maxDepth: o.maxDepth,
      minSamplesSplit: o.minSamplesSplit,
      maxFeatures: o.maxFeatures,
      seed: o.seed,
    });
    m.trees = o.trees || [];
    return m;
  }
}

const STORAGE_MODEL = 'neuro_rf_model_json';
const STORAGE_META = 'neuro_rf_meta';

const RandomForestModel = () => {
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
        setModel(SimpleRandomForest.fromJSON(raw));
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

  // Автоматический бэкап перед обучением
  const backupModel = () => {
    try {
      const model = localStorage.getItem(STORAGE_MODEL);
      if (model) {
        localStorage.setItem(`${STORAGE_MODEL}_backup`, model);
        const meta = localStorage.getItem(STORAGE_META);
        if (meta) localStorage.setItem(`${STORAGE_META}_backup`, meta);
        addLog('📥 Автоматический бэкап сохранён');
      }
    } catch (e) {
      console.error('Backup error:', e);
    }
  };

  // Сравнение новой модели со старой
  const compareWithBackup = (newMae) => {
    try {
      const oldMeta = localStorage.getItem(`${STORAGE_META}_backup`);
      if (!oldMeta) {
        addLog('⚠️ Нет бэкапа для сравнения');
        return null;
      }
      
      const oldMae = parseFloat(JSON.parse(oldMeta).mae);
      const newMaeNum = parseFloat(newMae);
      const diff = oldMae - newMaeNum;
      const percent = ((diff / oldMae) * 100).toFixed(1);
      
      if (diff > 0) {
        addLog(`✅ Новая модель лучше на ${percent}% (MAE: ${oldMae.toFixed(2)} → ${newMaeNum.toFixed(2)})`);
        return { better: true, diff: percent };
      } else if (diff < 0) {
        addLog(`⚠️ Старая модель лучше на ${Math.abs(percent)}% (MAE: ${oldMae.toFixed(2)} → ${newMaeNum.toFixed(2)})`);
        return { better: false, diff: Math.abs(percent) };
      } else {
        addLog(`⚖️ Модели одинаковы (MAE: ${oldMae.toFixed(2)})`);
        return { better: null, diff: 0 };
      }
    } catch (e) {
      console.error('Compare error:', e);
      return null;
    }
  };

  // Восстановление предыдущей версии
  const restoreBackup = () => {
    try {
      const backup = localStorage.getItem(`${STORAGE_MODEL}_backup`);
      if (!backup) {
        addLog('❌ Нет бэкапа для восстановления');
        return;
      }
      
      localStorage.setItem(STORAGE_MODEL, backup);
      const backupMeta = localStorage.getItem(`${STORAGE_META}_backup`);
      if (backupMeta) {
        localStorage.setItem(STORAGE_META, backupMeta);
        setTestResults(JSON.parse(backupMeta));
      }
      
      setModel(SimpleRandomForest.fromJSON(backup));
      addLog('✅ Предыдущая версия восстановлена!');
    } catch (e) {
      addLog(`❌ Ошибка восстановления: ${e.message}`);
    }
  };

  const trainModel = async () => {
    setIsTraining(true);
    setTrainingLog([]);
    try {
      // Автоматический бэкап перед обучением
      backupModel();
      
      addLog('🚀 ОБУЧЕНИЕ Random Forest (JS)');
      addLog(`📊 ${totalMatches} матчей в базе`);

      const rows = prepareRows();
      addLog(`✅ ${rows.length} примеров • 32 признака • бутстрап + случайные признаки на сплите`);

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

      const rf = new SimpleRandomForest({
        nEstimators: 50,
        maxDepth: 10,
        minSamplesSplit: 5,
        maxFeatures: 10,
        seed: Math.floor(Math.random() * 10000),
      });

      addLog('🎓 Обучение леса (может занять 1–2 минуты)...');
      const startTime = Date.now();
      rf.fit(trainX, trainY);
      addLog(`✅ Готово за ${((Date.now() - startTime) / 1000).toFixed(1)} с`);

      const predictions = rf.predict(testX);
      let totalError = 0;
      predictions.forEach((pred, i) => {
        const actual = testY[i];
        totalError += Math.abs(pred - actual);
      });

      const mae = (totalError / predictions.length).toFixed(2);
      addLog(`📊 MAE: ±${mae} угловых (${predictions.length} тестов)`);

      const meta = { mae, total: predictions.length };
      setTestResults(meta);
      setModel(rf);
      setModelReady(true);

      localStorage.setItem(STORAGE_MODEL, JSON.stringify(rf.toJSON()));
      localStorage.setItem(STORAGE_META, JSON.stringify(meta));
      
      // Сравнение с предыдущей версией
      const comparison = compareWithBackup(mae);
      if (comparison && !comparison.better) {
        addLog('💡 Совет: нажмите "Восстановить предыдущую версию", если новая модель хуже');
      }
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
    
    // Используем байесовскую оценку
    const homeStats = getBayesianTeamStats(homePast, predictHomeTeam, predictLeague, data.seasons);
    const awayStats = getBayesianTeamStats(awayPast, predictAwayTeam, predictLeague, data.seasons);
    const features = buildFeatures(
      homeStats,
      awayStats,
      0,
      getLeagueAvgTotal(predictLeague, data.seasons),
    );

    const predictions = [];
    for (let seed = 0; seed < 5; seed++) {
      const rfVariant = new SimpleRandomForest({
        nEstimators: model.nEstimators,
        maxDepth: model.maxDepth,
        minSamplesSplit: model.minSamplesSplit,
        maxFeatures: model.maxFeatures,
        seed: model.seed + seed * 1000,
      });
      rfVariant.trees = model.trees;
      predictions.push(rfVariant.predict([features])[0]);
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SCard icon={Database} label="Матчей" v={totalMatches} c="blue" />
        <SCard icon={TreePine} label="Статус" v={modelReady ? 'Готова' : '—'} c="lime" />
        <SCard icon={Target} label="Тестов" v={testResults ? testResults.total : '—'} c="green" />
        <SCard icon={Activity} label="MAE" v={testResults ? `±${testResults.mae}` : '—'} c="yellow" />
      </div>
      <div className="bg-gray-800/50 rounded-xl p-6 border border-lime-700/50 text-center">
        <TreePine size={48} className="mx-auto mb-4 text-lime-400" />
        <h3 className="text-xl font-bold mb-2">Random Forest (браузер)</h3>
        {!isTraining && (
          <button
            type="button"
            onClick={trainModel}
            className="bg-lime-600 hover:bg-lime-700 text-gray-950 font-semibold py-3 px-6 rounded-lg inline-flex items-center gap-2"
          >
            <Play size={20} /> {modelReady ? 'Переобучить' : 'Обучить Random Forest'}
          </button>
        )}
        {isTraining && (
          <div className="text-center py-4">
            <RefreshCw size={32} className="mx-auto mb-2 animate-spin text-lime-400" />
            <p>Обучение леса…</p>
          </div>
        )}
        {modelReady && (
          <div className="flex gap-2 justify-center flex-wrap mt-3">
            <button
              type="button"
              onClick={() => {
                try {
                  const model = localStorage.getItem('neuro_rf_model_json');
                  if (model) {
                    localStorage.setItem('neuro_rf_model_json_backup', model);
                    const meta = localStorage.getItem('neuro_rf_meta');
                    if (meta) localStorage.setItem('neuro_rf_meta_backup', meta);
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
              onClick={restoreBackup}
              className="bg-yellow-700 hover:bg-yellow-600 text-white text-sm py-2 px-4 rounded-lg flex items-center gap-2"
            >
              <Save size={16} /> 🔄 Восстановить
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  const model = localStorage.getItem('neuro_rf_model_json');
                  const meta = localStorage.getItem('neuro_rf_meta');
                  const exportData = {};
                  if (model) exportData.neuro_rf_model_json = model;
                  if (meta) exportData.neuro_rf_meta = meta;
                  
                  const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `rf-model-${new Date().toISOString().split('T')[0]}.json`;
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
            <Activity size={16} className="text-lime-400 inline mr-1" /> Лог обучения
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
        <div className="bg-gray-800/50 rounded-xl p-4 border border-lime-700/50 text-center">
          <h4 className="font-semibold text-lime-400 mb-2">Результаты на отложенной выборке</h4>
          <p className="text-2xl font-bold text-lime-400">MAE ±{testResults.mae}</p>
          <p className="text-xs text-gray-400">
            {testResults.total} тестовых матчей
          </p>
        </div>
      )}

      {modelReady && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-lime-700/50">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Calculator className="text-lime-400" /> Прогноз Random Forest
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
                      ? 'bg-lime-600 text-gray-950'
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
            className="w-full bg-lime-600 hover:bg-lime-700 text-gray-950 font-semibold py-3 rounded-lg disabled:opacity-50"
          >
            Получить прогноз
          </button>

          {prediction && (
            <div className="mt-4 bg-lime-950/30 rounded-lg p-4 border border-lime-700/50">
              <h4 className="font-semibold text-lime-400 mb-3 flex items-center gap-2">
                <TreePine size={16} /> Random Forest
              </h4>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">Ожидаемый тотал</p>
                  <p className="text-2xl font-bold text-white">{prediction.expectedTotal}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">ТБ {selectedTotal}</p>
                  <p className="text-2xl font-bold text-lime-400">{prediction.overProbability}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">ТМ {selectedTotal}</p>
                  <p className="text-2xl font-bold text-red-400">{prediction.underProbability}%</p>
                </div>
              </div>
              <div
                className={`p-3 rounded-lg text-center font-semibold ${
                  prediction.recommendation.includes('СТАВЛЮ')
                    ? 'bg-lime-600/30 text-lime-300'
                    : prediction.recommendation.includes('НЕ ЛЕЗУ')
                      ? 'bg-gray-600/30 text-gray-400'
                      : 'bg-yellow-600/30 text-yellow-300'
                }`}
              >
                {prediction.recommendation}
              </div>
              {testResults && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  MAE модели: ±{testResults.mae} угловых
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SCard = ({ icon: I, label, v, c }) => {
  const cc = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    lime: 'text-lime-400',
    purple: 'text-purple-400',
  };
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <I className={`${cc[c]} mb-2`} size={20} />
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-xl font-bold">{v}</p>
    </div>
  );
};

export default RandomForestModel;
