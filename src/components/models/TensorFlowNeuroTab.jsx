import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Brain,
  Activity,
  Database,
  Target,
  Play,
  RefreshCw,
  Calculator,
  Clock,
  Save,
} from 'lucide-react';
import { getData } from '../../data/store';
import * as tf from '@tensorflow/tfjs';
import {
  NEURO_FEATURE_DIM,
  buildChronologicalTrainingExamples,
  getLastMatches,
  calculateFeatures,
  buildFeatures,
  getLeagueAvgTotal,
  calculateProbabilitySimple,
} from './neuroFeatures';

const TensorFlowNeuroTab = () => {
  const data = getData();
  const totalMatches = data.matches?.length || 0;

  const [trainingLog, setTrainingLog] = useState([]);
  const [isTraining, setIsTraining] = useState(false);
  const [isRetraining, setIsRetraining] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [loadedModel, setLoadedModel] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [historicalErrors, setHistoricalErrors] = useState([]);
  const [predictLeague, setPredictLeague] = useState(data.leagues?.[0]?.id || 'rpl');
  const [predictHomeTeam, setPredictHomeTeam] = useState('');
  const [predictAwayTeam, setPredictAwayTeam] = useState('');
  const [neuroPrediction, setNeuroPrediction] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [selectedTotal, setSelectedTotal] = useState(9.5);
  const availableTotals = [6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 12.5];

  const modelLoadedRef = useRef(false);
  const teamsInLeague = data.teams?.filter((t) => t.leagueId === predictLeague) || [];


  useEffect(() => {
    const loadSavedModel = async () => {
      if (modelLoadedRef.current) return;
      modelLoadedRef.current = true;
      try {
        const models = await tf.io.listModels();
        if (models['localstorage://football-neuro-model']) {
          setModelReady(true);
          const model = await tf.loadLayersModel('localstorage://football-neuro-model');
          model.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError', metrics: ['mae'] });
          setLoadedModel(model);
          const sr = localStorage.getItem('neuro_test_results');
          if (sr) try { setTestResults(JSON.parse(sr)); } catch (e) { /* ignore */ }
          const se = localStorage.getItem('neuro_historical_errors');
          if (se) try { setHistoricalErrors(JSON.parse(se)); } catch (e) { /* ignore */ }
          addLog('✅ Модель загружена из кэша');
        } else {
          addLog('⚡ Модель не найдена. Нажмите "Обучить".');
        }
      } catch (error) {
        console.error(error);
      }
    };
    loadSavedModel();
  }, []);

  const addLog = (msg) => {
    console.log(msg);
    setTrainingLog((p) => [...p, { time: new Date().toLocaleTimeString(), text: msg }]);
  };


  const prepareTrainingData = (allMatches, seasons) =>
    buildChronologicalTrainingExamples(allMatches, seasons);

  const createModel = () => {
    const model = tf.sequential();
    model.add(
      tf.layers.dense({
        units: 128,
        activation: 'relu',
        inputShape: [NEURO_FEATURE_DIM],
        kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }),
      }),
    );
    model.add(tf.layers.dropout({ rate: 0.3 }));
    model.add(
      tf.layers.dense({
        units: 64,
        activation: 'relu',
        kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }),
      }),
    );
    model.add(tf.layers.dropout({ rate: 0.2 }));
    model.add(
      tf.layers.dense({
        units: 32,
        activation: 'relu',
        kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }),
      }),
    );
    model.add(tf.layers.dropout({ rate: 0.1 }));
    model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'linear' }));
    model.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError', metrics: ['mae'] });
    return model;
  };

  const runHonestTest = (model, allMatches, allSeasons, normParams) => {
    let totalAbsError = 0;
    let totalTested = 0;
    const errors = [];

    const allMatchesSorted = [...(allMatches || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
    const testStart = Math.floor(allMatchesSorted.length * 0.8);

    for (let i = testStart; i < allMatchesSorted.length; i++) {
      const match = allMatchesSorted[i];
      const actualTotal = (match.homeCorners || 0) + (match.awayCorners || 0);
      const homePast = getLastMatches(allMatchesSorted, match.homeTeamId, match.date, 12);
      const awayPast = getLastMatches(allMatchesSorted, match.awayTeamId, match.date, 12);
      if (homePast.length < 5 || awayPast.length < 5) continue;

      const homeStats = calculateFeatures(homePast, match.homeTeamId);
      const awayStats = calculateFeatures(awayPast, match.awayTeamId);
      const leagueAvgTotal = getLeagueAvgTotal(match.leagueId, allSeasons);
      const round = match.round ? parseInt(match.round, 10) || 0 : 0;
      let features = buildFeatures(homeStats, awayStats, round, leagueAvgTotal);
      if (features.some((f) => isNaN(f) || !isFinite(f))) continue;

      if (normParams) {
        features = features.map((val, idx) => {
          const mean = normParams.mean[idx] || 0;
          const std = normParams.std[idx] !== 0 ? normParams.std[idx] : 1;
          return (val - mean) / std;
        });
      }

      if (features.some((f) => isNaN(f) || !isFinite(f))) continue;

      const inputTensor = tf.tensor2d([features]);
      const predictionTensor = model.predict(inputTensor);
      let prediction = predictionTensor.dataSync()[0];
      inputTensor.dispose();
      predictionTensor.dispose();
      prediction = Math.max(0, prediction);

      totalAbsError += Math.abs(prediction - actualTotal);
      errors.push(actualTotal - prediction);
      totalTested++;
    }

    const avgError = totalTested > 0 ? (totalAbsError / totalTested).toFixed(2) : '0';
    localStorage.setItem('neuro_historical_errors', JSON.stringify(errors));
    setHistoricalErrors(errors);

    return { avgError, totalTested, errors };
  };

  // Автоматический бэкап перед обучением
  const backupModel = async () => {
    try {
      const models = await tf.io.listModels();
      if (models['localstorage://football-neuro-model']) {
        const model = await tf.loadLayersModel('localstorage://football-neuro-model');
        await model.save('localstorage://football-neuro-model-backup');
        addLog('📥 Автоматический бэкап сохранён');
      }
    } catch (e) {
      console.error('Backup error:', e);
    }
  };

  // Сравнение новой модели со старой
  const compareWithBackup = async (newModel, newMae) => {
    try {
      const models = await tf.io.listModels();
      if (!models['localstorage://football-neuro-model-backup']) {
        addLog('⚠️ Нет бэкапа для сравнения');
        return null;
      }
      
      const oldModel = await tf.loadLayersModel('localstorage://football-neuro-model-backup');
      oldModel.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError', metrics: ['mae'] });
      
      const oldResults = runHonestTest(oldModel, data.matches, data.seasons, JSON.parse(localStorage.getItem('neuro_norm_params') || 'null'));
      const oldMae = parseFloat(oldResults.avgError);
      const newMaeNum = parseFloat(newMae);
      
      const diff = oldMae - newMaeNum;
      const percent = ((diff / oldMae) * 100).toFixed(1);
      
      if (diff > 0) {
        addLog(`✅ Новая модель лучше на ${percent}% (MAE: ${oldMae.toFixed(2)} → ${newMaeNum.toFixed(2)})`);
        return { better: true, diff: percent, oldMae, newMae: newMaeNum };
      } else if (diff < 0) {
        addLog(`⚠️ Старая модель лучше на ${Math.abs(percent)}% (MAE: ${oldMae.toFixed(2)} → ${newMaeNum.toFixed(2)})`);
        return { better: false, diff: Math.abs(percent), oldMae, newMae: newMaeNum };
      } else {
        addLog(`⚖️ Модели одинаковы (MAE: ${oldMae.toFixed(2)})`);
        return { better: null, diff: 0, oldMae, newMae: newMaeNum };
      }
    } catch (e) {
      console.error('Compare error:', e);
      return null;
    }
  };

  // Восстановление предыдущей версии
  const restoreBackup = async () => {
    try {
      const models = await tf.io.listModels();
      if (!models['localstorage://football-neuro-model-backup']) {
        addLog('❌ Нет бэкапа для восстановления');
        return;
      }
      
      const backupModel = await tf.loadLayersModel('localstorage://football-neuro-model-backup');
      await backupModel.save('localstorage://football-neuro-model');
      
      const backupMeta = localStorage.getItem('neuro_test_results_backup');
      if (backupMeta) {
        localStorage.setItem('neuro_test_results', backupMeta);
        setTestResults(JSON.parse(backupMeta));
      }
      
      setLoadedModel(backupModel);
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
      await backupModel();
      // Сохраняем метаданные
      const oldMeta = localStorage.getItem('neuro_test_results');
      if (oldMeta) localStorage.setItem('neuro_test_results_backup', oldMeta);
      
      addLog('🚀 ОБУЧЕНИЕ Neuro AI');
      addLog(`📊 ${totalMatches} матчей`);

      const trainingExamples = prepareTrainingData(data.matches, data.seasons);
      addLog(`✅ ${trainingExamples.length} примеров`);

      if (trainingExamples.length < 100) {
        addLog('❌ Мало данных');
        setIsTraining(false);
        return;
      }

      const shuffled = [...trainingExamples].sort(() => Math.random() - 0.5);
      const trainSize = Math.floor(shuffled.length * 0.8);
      const trainEx = shuffled.slice(0, trainSize);
      const valEx = shuffled.slice(trainSize);

      const xsTensor = tf.tensor2d(trainEx.map((e) => e.features));
      const moments = tf.moments(xsTensor, 0);
      const mean = moments.mean;
      const std = moments.variance.sqrt().add(1e-7);
      const normParams = { mean: await mean.array(), std: await std.array() };
      localStorage.setItem('neuro_norm_params', JSON.stringify(normParams));

      const xsN = xsTensor.sub(mean).div(std);
      const ysT = tf.tensor2d(
        trainEx.map((e) => e.label),
        [trainEx.length, 1],
      );
      const valXsT = tf.tensor2d(valEx.map((e) => e.features));
      const valXsN = valXsT.sub(mean).div(std);
      const valYsT = tf.tensor2d(
        valEx.map((e) => e.label),
        [valEx.length, 1],
      );

      addLog('📊 Данные нормализованы');
      const model = createModel();
      addLog('✅ Модель создана');
      const trainStartTime = Date.now();
      addLog('🎓 Обучение до 120 эпох с early stopping...');

      let bestValMae = Infinity;
      let bestWeights = null;
      let patience = 7;
      let wait = 0;

      const history = await model.fit(xsN, ysT, {
        epochs: 120,
        batchSize: 32,
        validationData: [valXsN, valYsT],
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 20 === 0 || epoch === 119 || epoch === 0) {
              addLog(
                ` Эпоха ${epoch + 1}: loss=${logs.loss.toFixed(4)}, mae=${logs.mae.toFixed(2)}, val_mae=${logs.val_mae.toFixed(2)}`,
              );
            }
            
            // Сохраняем лучшие веса
            if (logs.val_mae < bestValMae) {
              bestValMae = logs.val_mae;
              bestWeights = model.getWeights();
              wait = 0;
            } else {
              wait++;
              if (wait >= patience) {
                model.stopTraining = true;
                addLog(`⏹️ Early stopping на эпохе ${epoch + 1} (val_mae не улучшалось ${patience} эпох)`);
              }
            }
          },
        },
      });

      // Восстанавливаем лучшие веса
      if (bestWeights) {
        model.setWeights(bestWeights);
        addLog(`✅ Восстановлены лучшие веса (val_mae=${bestValMae.toFixed(2)})`);
      }

      const trainDuration = ((Date.now() - trainStartTime) / 1000).toFixed(1);
      const finalTrainMae = history.history.mae[history.history.mae.length - 1];
      const finalValMae = history.history.val_mae[history.history.val_mae.length - 1];
      addLog(`✅ Обучено за ${trainDuration}с. Train MAE: ±${finalTrainMae.toFixed(2)}, Val MAE: ±${finalValMae.toFixed(2)}`);

      xsTensor.dispose();
      xsN.dispose();
      ysT.dispose();
      valXsT.dispose();
      valXsN.dispose();
      valYsT.dispose();

      addLog('🧪 ЧЕСТНОЕ тестирование...');
      const results = runHonestTest(model, data.matches, data.seasons, normParams);
      addLog(`📊 MAE: ±${results.avgError} угловых (${results.totalTested} матчей)`);

      setTestResults(results);
      localStorage.setItem('neuro_test_results', JSON.stringify(results));
      setModelReady(true);
      setLoadedModel(model);

      await model.save('localstorage://football-neuro-model');
      addLog('💾 Модель сохранена');
      localStorage.setItem('neuro_last_trained', new Date().toISOString());
      localStorage.setItem('neuro_matches_count', String(totalMatches));
      
      // Сравнение с предыдущей версией
      const comparison = await compareWithBackup(model, results.avgError);
      if (comparison && !comparison.better) {
        addLog('💡 Совет: нажмите "Восстановить предыдущую версию", если новая модель хуже');
      }
    } catch (error) {
      addLog(`❌ ${error.message}`);
      console.error(error);
    }
    setIsTraining(false);
  };

  const retrainModel = async () => {
    if (!loadedModel) {
      addLog('❌ Модель не загружена');
      return;
    }
    setIsRetraining(true);
    setTrainingLog([]);
    try {
      addLog('📚 ДООБУЧЕНИЕ');
      const trainingExamples = prepareTrainingData(data.matches, data.seasons);
      addLog(`✅ ${trainingExamples.length} примеров`);

      const recentSize = Math.floor(trainingExamples.length * 0.7);
      const recent = trainingExamples.slice(-recentSize);
      const xs = recent.map((e) => e.features);
      const ys = recent.map((e) => e.label);

      const xsT = tf.tensor2d(xs);
      const moments = tf.moments(xsT, 0);
      const mean = moments.mean;
      const std = moments.variance.sqrt().add(1e-7);
      const normParams = { mean: await mean.array(), std: await std.array() };
      localStorage.setItem('neuro_norm_params', JSON.stringify(normParams));
      
      const meanTensor = tf.tensor1d(normParams.mean);
      const stdTensor = tf.tensor1d(normParams.std);
      const xsN = xsT.sub(meanTensor).div(stdTensor);
      const ysT = tf.tensor2d(ys, [ys.length, 1]);

      const retrainStartTime = Date.now();
      addLog('🎓 Дообучение (8 эпох, lr=0.00005)...');
      loadedModel.compile({ optimizer: tf.train.adam(0.00005), loss: 'meanSquaredError', metrics: ['mae'] });
      await loadedModel.fit(xsN, ysT, {
        epochs: 8,
        batchSize: 32,
        callbacks: {
          onEpochEnd: (e, l) => {
            if (e % 2 === 0 || e === 7) {
              addLog(` Эпоха ${e + 1}: loss=${l.loss.toFixed(4)}, mae=${l.mae.toFixed(2)}`);
            }
          },
        },
      });

      const retrainDuration = ((Date.now() - retrainStartTime) / 1000).toFixed(1);
      xsT.dispose();
      xsN.dispose();
      ysT.dispose();

      const results = runHonestTest(loadedModel, data.matches, data.seasons, normParams);
      addLog(`📊 Дообучено за ${retrainDuration}с. MAE: ±${results.avgError} угловых`);

      setTestResults(results);
      localStorage.setItem('neuro_test_results', JSON.stringify(results));

      await loadedModel.save('localstorage://football-neuro-model');
      localStorage.setItem('neuro_last_trained', new Date().toISOString());
      localStorage.setItem('neuro_matches_count', String(totalMatches));
    } catch (error) {
      addLog(`❌ ${error.message}`);
    }
    setIsRetraining(false);
  };


  const predictWithNeuro = async () => {
    if (!predictHomeTeam || !predictAwayTeam || !loadedModel) return;
    setIsPredicting(true);
    setNeuroPrediction(null);
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

      homeStats.cornersTrend = Math.max(-3, Math.min(3, homeStats.cornersTrend || 0));
      awayStats.cornersTrend = Math.max(-3, Math.min(3, awayStats.cornersTrend || 0));

      const leagueAvgTotal = getLeagueAvgTotal(predictLeague, data.seasons);
      let features = buildFeatures(homeStats, awayStats, 0, leagueAvgTotal);

      const normParams = JSON.parse(localStorage.getItem('neuro_norm_params') || 'null');
      if (normParams) {
        features = features.map((val, idx) => {
          const mn = normParams.mean[idx] || 0;
          const sd = normParams.std[idx] !== 0 ? normParams.std[idx] : 1;
          return (val - mn) / sd;
        });
      }

      if (features.some((f) => isNaN(f) || !isFinite(f))) {
        setIsPredicting(false);
        return;
      }

      const inputTensor = tf.tensor2d([features]);
      const predictionTensor = loadedModel.predict(inputTensor);
      let expectedTotal = predictionTensor.dataSync()[0];
      inputTensor.dispose();
      predictionTensor.dispose();
      expectedTotal = Math.max(2, Math.min(18, expectedTotal));

      const overProb = calculateProbabilitySimple(expectedTotal, selectedTotal);
      const underProb = 100 - overProb;

      setNeuroPrediction({
        expectedTotal: expectedTotal.toFixed(2),
        overProbability: Math.min(95, Math.max(5, overProb)),
        underProbability: Math.min(95, Math.max(5, underProb)),
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
    } catch (error) {
      console.error(error);
    }
    setIsPredicting(false);
  };

  const lastTrainedCount = parseInt(localStorage.getItem('neuro_matches_count') || '0', 10);
  const needsRetraining = modelReady && totalMatches - lastTrainedCount > 40;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SCard icon={Database} label="Матчей" v={totalMatches} c="blue" />
        <SCard icon={Brain} label="Статус" v={modelReady ? 'Готова' : '—'} c="purple" />
        <SCard icon={Target} label="Тестов" v={testResults ? testResults.totalTested : '—'} c="green" />
        <SCard icon={Activity} label="MAE" v={testResults ? `±${testResults.avgError}` : '—'} c="yellow" />
      </div>


      {needsRetraining && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-yellow-400">⚠️</span>
            <div>
              <p className="font-medium text-yellow-400">
                +{totalMatches - lastTrainedCount} новых матчей
              </p>
              <p className="text-sm text-gray-400">Рекомендуется дообучить</p>
            </div>
          </div>
          <button
            type="button"
            onClick={retrainModel}
            disabled={isRetraining}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm disabled:opacity-50"
          >
            Дообучить
          </button>
        </div>
      )}


      <div className="space-y-4">
        <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-700/50 text-center">
          <Brain size={48} className="mx-auto mb-4 text-purple-400" />
          <h3 className="text-xl font-bold mb-2">TensorFlow.js v5.2</h3>
          {!isTraining && !isRetraining && (
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                type="button"
                onClick={trainModel}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center gap-2"
              >
                <Play size={20} /> {modelReady ? 'Переобучить' : 'Обучить'}
              </button>
              {modelReady && (
                <button
                  type="button"
                  onClick={retrainModel}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center gap-2"
                >
                  <RefreshCw size={20} /> Дообучить
                </button>
              )}
            </div>
          )}
          {modelReady && (
            <div className="flex gap-2 justify-center flex-wrap mt-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const m = await tf.loadLayersModel('localstorage://football-neuro-model');
                    await m.save('localstorage://football-neuro-model-backup');
                    addLog('📥 Бэкап сохранён!');
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
                    const exportData = {};
                    const keys = ['info', 'model_metadata', 'model_topology', 'weight_data', 'weight_specs'];
                    keys.forEach((key) => {
                      const stored = localStorage.getItem(`tensorflowjs_models/football-neuro-model/${key}`);
                      if (stored) exportData[`tensorflowjs_models/football-neuro-model/${key}`] = stored;
                    });
                    const tr = localStorage.getItem('neuro_test_results');
                    if (tr) exportData.neuro_test_results = tr;
                    const ls = localStorage.getItem('neuro_league_stats');
                    if (ls) exportData.neuro_league_stats = ls;
                    const np = localStorage.getItem('neuro_norm_params');
                    if (np) exportData.neuro_norm_params = np;

                    const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `neuro-model-${new Date().toISOString().split('T')[0]}.json`;
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
          {isTraining && (
            <div className="text-center py-4">
              <RefreshCw size={32} className="mx-auto mb-2 animate-spin text-purple-400" />
              <p>Обучение... 1-3 минуты</p>
            </div>
          )}
          {isRetraining && (
            <div className="text-center py-4">
              <RefreshCw size={32} className="mx-auto mb-2 animate-spin text-green-400" />
              <p>Дообучение...</p>
            </div>
          )}
        </div>

        {trainingLog.length > 0 && (
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <h4 className="font-semibold mb-2">
              <Activity size={16} className="text-green-400 inline mr-1" /> Лог
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

        {trainingLog.filter(e => e.text.includes('Эпоха')).length > 0 && (
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Activity size={16} className="text-green-400" /> График MAE по эпохам
            </h4>
            <div className="bg-gray-900 rounded-lg p-3" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trainingLog.filter(e => e.text.includes('Эпоха')).map((e, i) => {
                  const match = e.text.match(/mae=([\d.]+)/);
                  const valMatch = e.text.match(/val_mae=([\d.]+)/);
                  return {
                    epoch: i + 1,
                    train: match ? parseFloat(match[1]) : null,
                    val: valMatch ? parseFloat(valMatch[1]) : null,
                  };
                })}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="epoch" stroke="#9CA3AF" fontSize={10} label={{ value: 'Эпоха', position: 'insideBottom', offset: -5, fill: '#9CA3AF', fontSize: 10 }} />
                  <YAxis stroke="#9CA3AF" fontSize={10} label={{ value: 'MAE', angle: -90, position: 'insideLeft', fill: '#9CA3AF', fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="train" stroke="#3B82F6" name="Train MAE" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="val" stroke="#10B981" name="Val MAE" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {modelReady && (
          <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-700/50">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Calculator className="text-purple-400" /> Прогноз TensorFlow
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
                  onChange={(e) => setPredictHomeTeam(e.target.value)}
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
                  onChange={(e) => setPredictAwayTeam(e.target.value)}
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
                      selectedTotal === t ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={predictWithNeuro}
              disabled={!predictHomeTeam || !predictAwayTeam || isPredicting}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
            >
              {isPredicting ? 'Анализирую...' : 'Получить прогноз'}
            </button>

            {neuroPrediction && (
              <div className="mt-4 space-y-4">
                <div className="bg-purple-900/20 rounded-xl p-5 border border-purple-700/50">
                  <h4 className="font-semibold text-purple-400 mb-4 text-lg flex items-center gap-2">
                    <Brain size={20} /> Neuro AI
                  </h4>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-1">Ожидаемый тотал</p>
                      <p className="text-2xl font-bold text-white">{neuroPrediction.expectedTotal}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-1">ТБ {selectedTotal}</p>
                      <p className="text-2xl font-bold text-green-400">{neuroPrediction.overProbability}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-1">ТМ {selectedTotal}</p>
                      <p className="text-2xl font-bold text-red-400">{neuroPrediction.underProbability}%</p>
                    </div>
                  </div>
                  <div
                    className={`p-4 rounded-lg text-center font-semibold text-lg ${
                      neuroPrediction.recommendation.includes('СТАВЛЮ')
                        ? 'bg-green-600/30 text-green-400'
                        : neuroPrediction.recommendation.includes('ДУМАЮ')
                          ? 'bg-yellow-600/30 text-yellow-400'
                          : 'bg-gray-600/30 text-gray-400'
                    }`}
                  >
                    {neuroPrediction.recommendation}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

const SCard = ({ icon: I, label, v, c }) => {
  const cc = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
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

export default TensorFlowNeuroTab;
