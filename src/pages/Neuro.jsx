import { useState, useEffect } from 'react';
import { Brain, Zap, TrendingUp, Activity, Database, Target, Play, RefreshCw, BarChart3, Calculator, Home, User, Save, Clock } from 'lucide-react';
import { getData, getActiveSeason } from '../data/store';
import * as tf from '@tensorflow/tfjs';

const Neuro = () => {
  const data = getData();
  const totalMatches = data.matches?.length || 0;
  const [activeTab, setActiveTab] = useState('tensorflow');
  const [trainingLog, setTrainingLog] = useState([]);
  const [isTraining, setIsTraining] = useState(false);
  const [isRetraining, setIsRetraining] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [trainingHistory, setTrainingHistory] = useState([]);

  // 🔧 Состояния для выбора тотала
  const [selectedTotal, setSelectedTotal] = useState(9.5);
  const availableTotals = [6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 12.5];

  // Проверяем сохранена ли модель при загрузке
  useEffect(() => {
    const checkModel = async () => {
      try {
        const models = await tf.io.listModels();
        if (models['localstorage://football-neuro-model']) {
          setModelReady(true);
          
          const savedResults = localStorage.getItem('neuro_test_results');
          if (savedResults) {
            try { setTestResults(JSON.parse(savedResults)); } catch (e) {}
          }
          
          const savedHistory = localStorage.getItem('neuro_training_history');
          if (savedHistory) {
            try { setTrainingHistory(JSON.parse(savedHistory)); } catch (e) {}
          }
        }
      } catch (e) {}
    };
    checkModel();
  }, []);

  // 🔮 ПРЕДИКТ
  const [predictLeague, setPredictLeague] = useState(data.leagues?.[0]?.id || 'rpl');
  const [predictHomeTeam, setPredictHomeTeam] = useState('');
  const [predictAwayTeam, setPredictAwayTeam] = useState('');
  const [neuroPrediction, setNeuroPrediction] = useState(null);
  const [poissonPrediction, setPoissonPrediction] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);

  const activeSeason = getActiveSeason(predictLeague)?.id;
  const teamsInLeague = data.teams?.filter(t => t.leagueId === predictLeague) || [];

  // 🔧 Функция расчёта вероятности для любого тотала
  const calculateProbability = (total, expectedTotal) => {
    const diff = total - expectedTotal;
    if (diff > 2.5) return 8;
    if (diff > 2) return 15;
    if (diff > 1.5) return 25;
    if (diff > 1) return 35;
    if (diff > 0.5) return 42;
    if (diff > 0) return 48;
    if (diff > -0.5) return 52;
    if (diff > -1) return 58;
    if (diff > -1.5) return 65;
    if (diff > -2) return 75;
    if (diff > -2.5) return 85;
    return 92;
  };

  // 🔧 Авто-определение тотала по лиге
  useEffect(() => {
    const league = data.leagues?.find(l => l.id === predictLeague);
    const season = data.seasons?.find(s => s.leagueId === predictLeague && s.isActive);
    const avgTotal = season?.avgTotalCorners || 9.5;
    
    if (league?.name === 'АПЛ' || avgTotal > 10) {
      setSelectedTotal(10.5);
    } else {
      setSelectedTotal(9.5);
    }
  }, [predictLeague, data]);

  const predictWithNeuro = async () => {
    if (!predictHomeTeam || !predictAwayTeam || !modelReady) return;
    
    setIsPredicting(true);
    
    let model;
    
    try {
      model = await tf.loadLayersModel('localstorage://football-neuro-model');
      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mae']
      });
      
      const allMatches = [...(data.matches || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
      const homePast = getLastMatches(allMatches, predictHomeTeam, '2099-12-31', 10);
      const awayPast = getLastMatches(allMatches, predictAwayTeam, '2099-12-31', 10);
      
      const homeStats = calculateFeatures(homePast, predictHomeTeam);
      const awayStats = calculateFeatures(awayPast, predictAwayTeam);
      
      // 🔧 Признак лиги
      const leagueAvgTotal = getLeagueAvgTotal(predictLeague, data.seasons);
      
      const features = [
        homeStats.avgCornersFor || 5,
        homeStats.avgCornersAgainst || 4,
        homeStats.cornersTrend || 0,
        homeStats.avgXG || 1.2,
        homeStats.avgPossession || 50,
        homeStats.avgShotsInside || 6,
        homeStats.formPoints || 0,
        
        awayStats.avgCornersFor || 4,
        awayStats.avgCornersAgainst || 5,
        awayStats.cornersTrend || 0,
        awayStats.avgXG || 1.1,
        awayStats.avgPossession || 50,
        awayStats.avgShotsInside || 5,
        awayStats.formPoints || 0,
        
        homeStats.avgCornersForHome || 5,
        homeStats.avgCornersAgainstHome || 4,
        awayStats.avgCornersForAway || 4,
        awayStats.avgCornersAgainstAway || 5,
        
        0,
        homeStats.matchesPlayed || 10,
        awayStats.matchesPlayed || 10,
        
        // 🔧 22-й признак — средний тотал лиги
        leagueAvgTotal,
      ];
      
      // prediction — ожидаемый тотал
      const prediction = model.predict(tf.tensor2d([features])).dataSync()[0];
      const expectedTotal = prediction.toFixed(2);
      
      const overProb = calculateProbability(selectedTotal, parseFloat(expectedTotal));
      
      const { predictMatch } = await import('../data/store');
      const poissonResult = predictMatch(predictHomeTeam, predictAwayTeam, predictLeague, activeSeason, selectedTotal);
      setPoissonPrediction(poissonResult);
      
      setNeuroPrediction({
        expectedTotal: expectedTotal,
        overProbability: overProb,
        underProbability: 100 - overProb,
        recommendation: overProb > 75 ? `🔥 СИЛЬНЫЙ ТБ ${selectedTotal}` :
                        overProb > 60 ? `✅ ТБ ${selectedTotal}` :
                        overProb < 25 ? `🧊 СИЛЬНЫЙ ТМ ${selectedTotal}` :
                        overProb < 40 ? `❄️ ТМ ${selectedTotal}` :
                        `⚖️ Близко к ${selectedTotal}`,
        confidence: Math.abs(overProb - 50) * 2
      });
      
    } catch (error) {
      console.error('Ошибка предикта:', error);
    }
    
    setIsPredicting(false);
  };
  
  const log = (message) => {
    console.log(message);
    setTrainingLog(prev => [...prev, { time: new Date().toLocaleTimeString(), text: message }]);
  };

  const addToHistory = (type, matchesCount, accuracy) => {
    const entry = {
      type: type,
      date: new Date().toISOString(),
      matches: matchesCount,
      accuracy: accuracy
    };
    
    const updatedHistory = [...trainingHistory, entry];
    setTrainingHistory(updatedHistory);
    localStorage.setItem('neuro_training_history', JSON.stringify(updatedHistory));
  };
  
  // 🧠 ОБУЧЕНИЕ С НУЛЯ
  const trainTensorFlowModel = async () => {
    setIsTraining(true);
    setTrainingLog([]);
    
    try {
      log('🚀 Начинаю обучение TensorFlow модели (регрессия)...');
      log(`📊 Данных: ${totalMatches} матчей`);
      
      const trainingData = prepareTrainingData(data.matches, data.teams, data.seasons);
      log(`✅ Подготовлено ${trainingData.length} примеров`);
      
      const model = createModel();
      log('✅ Модель создана (22 входа → 64 → 32 → 16 → 1 выход)');
      
      log('🎓 Обучение (50 эпох)...');
      const trainResult = await trainModel(model, trainingData, log);
      log(`✅ Обучение завершено! Loss: ${trainResult.loss.toFixed(4)}, MAE: ±${trainResult.mae} угл.`);
      
      log('🧪 Тестирование...');
      const results = testModel(model, data.matches, data.teams, data.seasons);
      log(`📊 Точность Neuro: ${results.accuracy}%`);
      log(`📊 Средняя ошибка: ±${results.avgError} угловых`);
      log(`📊 Протестировано: ${results.neuroTotal} матчей`);
      
      setTestResults(results);
      localStorage.setItem('neuro_test_results', JSON.stringify(results));
      setModelReady(true);
      
      addToHistory('full', totalMatches, results.accuracy);
      
      await model.save('localstorage://football-neuro-model');
      log('💾 Модель сохранена в браузере');
      
      localStorage.setItem('neuro_last_trained', new Date().toISOString());
      localStorage.setItem('neuro_matches_count', totalMatches);
      
    } catch (error) {
      log(`❌ Ошибка: ${error.message}`);
      console.error(error);
    }
    
    setIsTraining(false);
  };

  // 📚 ДООБУЧЕНИЕ
  const retrainModel = async () => {
    setIsRetraining(true);
    setTrainingLog([]);
    
    try {
      log('📚 Загружаю существующую модель...');
      const model = await tf.loadLayersModel('localstorage://football-neuro-model');
      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mae']
      });
      log('✅ Модель загружена и скомпилирована');
      
      log('📦 Подготовка ВСЕХ данных...');
      const trainingData = prepareTrainingData(data.matches, data.teams, data.seasons);
      log(`✅ Подготовлено ${trainingData.length} примеров`);
      
      const xs = trainingData.map(d => d.features);
      const ys = trainingData.map(d => d.label);
      
      const xsTensor = tf.tensor2d(xs);
      const ysTensor = tf.tensor2d(ys, [ys.length, 1]);
      
      log('📚 Дообучение (10 эпох)...');
      
      const history = await model.fit(xsTensor, ysTensor, {
        epochs: 10,
        batchSize: 16,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            log(`  Эпоха ${epoch + 1}/10: loss=${logs.loss.toFixed(4)}, mae=±${logs.mae.toFixed(2)}`);
          }
        }
      });
      
      log(`✅ Дообучение завершено!`);
      
      xsTensor.dispose();
      ysTensor.dispose();
      
      log('🧪 Тестирование...');
      const results = testModel(model, data.matches, data.teams, data.seasons);
      log(`📊 Точность Neuro: ${results.accuracy}%`);
      log(`📊 Средняя ошибка: ±${results.avgError} угловых`);
      
      setTestResults(results);
      localStorage.setItem('neuro_test_results', JSON.stringify(results));
      
      addToHistory('retrain', totalMatches, results.accuracy);
      
      await model.save('localstorage://football-neuro-model');
      log('💾 Обновлённая модель сохранена');
      
      localStorage.setItem('neuro_last_trained', new Date().toISOString());
      localStorage.setItem('neuro_matches_count', totalMatches);
      
    } catch (error) {
      log(`❌ Ошибка: ${error.message}`);
      console.error(error);
    }
    
    setIsRetraining(false);
  };
  
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-3">
          <Brain className="text-purple-400" />
          Neuro AI
        </h2>
        <p className="text-sm md:text-base text-gray-400">
          Регрессия с признаком лиги • Предсказывает точный тотал угловых
        </p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatusCard icon={Database} label="Матчей для обучения" value={totalMatches} color="blue" />
        <StatusCard icon={Brain} label="Статус модели" value={modelReady ? 'Готова' : 'Не обучена'} color="purple" />
        <StatusCard icon={Target} label="Точность Neuro" value={testResults ? `${testResults.accuracy}%` : '—'} color="green" />
        <StatusCard icon={TrendingUp} label="Ср. ошибка" value={testResults ? `±${testResults.avgError} угл.` : '—'} color="yellow" />
      </div>
      
      {trainingHistory.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Clock size={16} className="text-blue-400" />
            История обучения
          </h4>
          <div className="space-y-2">
            {trainingHistory.map((entry, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-700/30 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    entry.type === 'full' ? 'bg-purple-600/30 text-purple-400' : 'bg-green-600/30 text-green-400'
                  }`}>
                    {entry.type === 'full' ? '🧠 Обучена с нуля' : '📚 Дообучена'}
                  </span>
                  <span className="text-gray-400">
                    на <span className="text-white font-medium">{entry.matches}</span> матчах
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-400">
                    точность <span className="text-green-400 font-bold">{entry.accuracy}%</span>
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(entry.date).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {modelReady && (
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 flex items-center justify-between text-sm">
          <span className="text-gray-400">
            🕐 Обучена: <span className="text-white">{new Date(localStorage.getItem('neuro_last_trained') || Date.now()).toLocaleString('ru-RU')}</span>
          </span>
          {totalMatches > parseInt(localStorage.getItem('neuro_matches_count') || 0) && (
            <span className="text-yellow-400 text-xs">
              ⚠️ +{totalMatches - parseInt(localStorage.getItem('neuro_matches_count') || 0)} матчей. Дообучи!
            </span>
          )}
        </div>
      )}
      
      <div className="flex gap-2 flex-wrap">
        <TabButton active={activeTab === 'tensorflow'} onClick={() => setActiveTab('tensorflow')}>
          🧠 TensorFlow
        </TabButton>
        <TabButton active={activeTab === 'randomforest'} onClick={() => setActiveTab('randomforest')}>
          🌲 Random Forest
        </TabButton>
        <TabButton active={activeTab === 'xgboost'} onClick={() => setActiveTab('xgboost')}>
          ⚡ XGBoost
        </TabButton>
      </div>
      
      {activeTab === 'tensorflow' && (
        <div className="space-y-4">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-700/50 text-center">
            <Brain size={48} className="mx-auto mb-4 text-purple-400" />
            <h3 className="text-xl font-bold mb-2">TensorFlow.js — Регрессия + Признак лиги</h3>
            <p className="text-gray-400 mb-4 max-w-lg mx-auto">
              Предсказывает точный тотал. Учитывает особенности лиги (АПЛ ~10.5, РПЛ ~9.5).
            </p>
            
            {!isTraining && !isRetraining && (
              <div className="flex gap-3 justify-center flex-wrap">
                <button onClick={trainTensorFlowModel} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center gap-2">
                  <Play size={20} />
                  {modelReady ? 'Переобучить с нуля' : 'Обучить модель'}
                </button>
                
                {modelReady && (
                  <button onClick={retrainModel} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center gap-2">
                    <RefreshCw size={20} />
                    Дообучить
                  </button>
                )}
              </div>
            )}
            
            {isTraining && (
              <div className="text-center py-4">
                <RefreshCw size={32} className="mx-auto mb-2 animate-spin text-purple-400" />
                <p className="text-purple-400">Обучение нейросети с нуля...</p>
              </div>
            )}
            
            {isRetraining && (
              <div className="text-center py-4">
                <RefreshCw size={32} className="mx-auto mb-2 animate-spin text-green-400" />
                <p className="text-green-400">Дообучение нейросети...</p>
              </div>
            )}
          </div>
          
          {trainingLog.length > 0 && (
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Activity size={16} className="text-green-400" />
                Лог обучения
              </h4>
              <div className="bg-gray-900 rounded-lg p-3 max-h-60 overflow-auto font-mono text-xs space-y-1">
                {trainingLog.map((entry, i) => (
                  <div key={i} className="text-gray-300">
                    <span className="text-gray-500">[{entry.time}]</span> {entry.text}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {testResults && (
            <div className="grid grid-cols-1 gap-4">
              <ResultCard 
                title="Neuro AI — Точность на тестовой выборке"
                accuracy={testResults.accuracy}
                correct={testResults.neuroCorrect}
                total={testResults.neuroTotal}
                color="purple"
                subtitle={`Средняя ошибка: ±${testResults.avgError} угловых`}
              />
            </div>
          )}
          
          {modelReady && (
            <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-700/50">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Calculator className="text-purple-400" />
                Прогноз нейросети
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Лига</label>
                  <select value={predictLeague} onChange={(e) => { setPredictLeague(e.target.value); setPredictHomeTeam(''); setPredictAwayTeam(''); }} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm">
                    {data.leagues?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Хозяева</label>
                  <select value={predictHomeTeam} onChange={(e) => setPredictHomeTeam(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm">
                    <option value="">Выберите</option>
                    {teamsInLeague.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Гости</label>
                  <select value={predictAwayTeam} onChange={(e) => setPredictAwayTeam(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm">
                    <option value="">Выберите</option>
                    {teamsInLeague.filter(t => t.id !== predictHomeTeam).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              
              {/* 🔧 ВЫБОР ТОТАЛА */}
              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-2">Тотал угловых</label>
                <div className="flex flex-wrap gap-2">
                  {availableTotals.map(total => (
                    <button
                      key={total}
                      onClick={() => setSelectedTotal(total)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        selectedTotal === total
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      {total}
                    </button>
                  ))}
                </div>
              </div>
              
              <button onClick={predictWithNeuro} disabled={!predictHomeTeam || !predictAwayTeam || isPredicting} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50">
                {isPredicting ? 'Анализирую...' : 'Получить прогноз'}
              </button>
              
              {(neuroPrediction || poissonPrediction) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {neuroPrediction && (
                    <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-700/50">
                      <h4 className="font-semibold text-purple-400 mb-3 flex items-center gap-2">
                        <Brain size={16} /> Neuro AI
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Ожидаемый тотал</span>
                          <span className="text-xl font-bold text-white">{neuroPrediction.expectedTotal}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">ТБ {selectedTotal}</span>
                          <span className="text-lg font-bold text-green-400">{neuroPrediction.overProbability}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">ТМ {selectedTotal}</span>
                          <span className="text-lg font-bold text-red-400">{neuroPrediction.underProbability}%</span>
                        </div>
                        <div className={`mt-3 p-3 rounded-lg text-center font-semibold ${
                          neuroPrediction.recommendation.includes('СИЛЬНЫЙ') ? 'bg-green-600/30 text-green-400' :
                          neuroPrediction.recommendation.includes('ТБ') || neuroPrediction.recommendation.includes('ТМ') ? 'bg-blue-600/30 text-blue-400' :
                          'bg-gray-600/30 text-gray-400'
                        }`}>
                          {neuroPrediction.recommendation}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {poissonPrediction && (
                    <div className="bg-yellow-900/20 rounded-lg p-4 border border-yellow-700/50">
                      <h4 className="font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                        <Calculator size={16} /> Пуассон
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Ожидаемый тотал</span>
                          <span className="font-semibold">{poissonPrediction.totalExpected}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">ТБ {selectedTotal}</span>
                          <span className="text-lg font-bold text-green-400">{poissonPrediction.totalProbability}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">ТМ {selectedTotal}</span>
                          <span className="text-lg font-bold text-red-400">{poissonPrediction.underProbability}%</span>
                        </div>
                        <div className={`mt-3 p-3 rounded-lg text-center text-sm font-semibold ${
                          poissonPrediction.recommendation.includes('СИЛЬНЫЙ') ? 'bg-green-600/30 text-green-400' :
                          poissonPrediction.recommendation.includes('ТМ') ? 'bg-blue-600/30 text-blue-400' :
                          'bg-gray-600/30 text-gray-400'
                        }`}>
                          {poissonPrediction.recommendation}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'randomforest' && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 text-center">
          <h3 className="text-xl font-bold mb-2">🌲 Random Forest</h3>
          <p className="text-gray-400 mb-4">Будет добавлен позже (1000+ матчей)</p>
          <div className="text-4xl mb-4">🚧</div>
        </div>
      )}
      
      {activeTab === 'xgboost' && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 text-center">
          <h3 className="text-xl font-bold mb-2">⚡ XGBoost</h3>
          <p className="text-gray-400 mb-4">Будет добавлен позже (2000+ матчей)</p>
          <div className="text-4xl mb-4">🚧</div>
        </div>
      )}
    </div>
  );
};

// 🔧 Функция получения среднего тотала лиги
const getLeagueAvgTotal = (leagueId, seasons) => {
  const season = seasons?.find(s => s.leagueId === leagueId && s.isActive);
  return season?.avgTotalCorners || 9.5;
};

// 📦 Подготовка данных
const prepareTrainingData = (matches, teams, seasons) => {
  const sortedMatches = [...matches].sort((a, b) => new Date(a.date) - new Date(b.date));
  const trainingExamples = [];
  
  for (let i = 20; i < sortedMatches.length; i++) {
    const match = sortedMatches[i];
    
    const homePast = getLastMatches(sortedMatches, match.homeTeamId, match.date, 10);
    const awayPast = getLastMatches(sortedMatches, match.awayTeamId, match.date, 10);
    
    if (homePast.length < 3 || awayPast.length < 3) continue;
    
    const homeStats = calculateFeatures(homePast, match.homeTeamId);
    const awayStats = calculateFeatures(awayPast, match.awayTeamId);
    
    const actualTotal = (match.homeCorners || 0) + (match.awayCorners || 0);
    
    // 🔧 Признак лиги
    const leagueAvgTotal = getLeagueAvgTotal(match.leagueId, seasons);
    
    trainingExamples.push({
      features: [
        homeStats.avgCornersFor, homeStats.avgCornersAgainst, homeStats.cornersTrend,
        homeStats.avgXG || 0, homeStats.avgPossession || 50, homeStats.avgShotsInside || 0,
        homeStats.formPoints,
        awayStats.avgCornersFor, awayStats.avgCornersAgainst, awayStats.cornersTrend,
        awayStats.avgXG || 0, awayStats.avgPossession || 50, awayStats.avgShotsInside || 0,
        awayStats.formPoints,
        homeStats.avgCornersForHome, homeStats.avgCornersAgainstHome,
        awayStats.avgCornersForAway, awayStats.avgCornersAgainstAway,
        match.round ? parseInt(match.round) || 0 : 0,
        homeStats.matchesPlayed, awayStats.matchesPlayed,
        // 🔧 22-й признак
        leagueAvgTotal,
      ],
      label: actualTotal,
      actualTotal: actualTotal
    });
  }
  
  return trainingExamples;
};

const getLastMatches = (allMatches, teamId, beforeDate, count) => {
  return allMatches
    .filter(m => (m.homeTeamId === teamId || m.awayTeamId === teamId) && m.date < beforeDate)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, count);
};

const calculateFeatures = (matches, teamId) => {
  if (matches.length === 0) return {};
  
  let totalCornersFor = 0, totalCornersAgainst = 0;
  let cornersForHome = 0, cornersForAway = 0;
  let cornersAgainstHome = 0, cornersAgainstAway = 0;
  let homeCount = 0, awayCount = 0;
  let totalXG = 0, totalPossession = 0, totalShotsInside = 0;
  let cornersTrend = [];
  let formPoints = 0;
  
  matches.forEach(match => {
    const isHome = match.homeTeamId === teamId;
    const teamScore = isHome ? (match.homeScore || 0) : (match.awayScore || 0);
    const oppScore = isHome ? (match.awayScore || 0) : (match.homeScore || 0);
    
    const cornersFor = isHome ? (match.homeCorners || 0) : (match.awayCorners || 0);
    const cornersAgainst = isHome ? (match.awayCorners || 0) : (match.homeCorners || 0);
    
    if (isHome) { cornersForHome += cornersFor; cornersAgainstHome += cornersAgainst; homeCount++; }
    else { cornersForAway += cornersFor; cornersAgainstAway += cornersAgainst; awayCount++; }
    
    totalCornersFor += cornersFor;
    totalCornersAgainst += cornersAgainst;
    cornersTrend.push(cornersFor);
    totalXG += isHome ? (match.homeXG || 0) : (match.awayXG || 0);
    totalPossession += isHome ? (match.homePossession || 50) : (match.awayPossession || 50);
    totalShotsInside += isHome ? (match.homeShotsInsideBox || 0) : (match.awayShotsInsideBox || 0);
    
    if (teamScore > oppScore) formPoints += 3;
    else if (teamScore === oppScore) formPoints += 1;
  });
  
  const n = matches.length;
  const recentAvg = cornersTrend.slice(0, Math.floor(n / 2)).reduce((a, b) => a + b, 0) / Math.floor(n / 2);
  const olderAvg = cornersTrend.slice(Math.floor(n / 2)).reduce((a, b) => a + b, 0) / Math.ceil(n / 2);
  
  return {
    avgCornersFor: totalCornersFor / n,
    avgCornersAgainst: totalCornersAgainst / n,
    cornersTrend: recentAvg - olderAvg,
    avgXG: totalXG / n,
    avgPossession: totalPossession / n,
    avgShotsInside: totalShotsInside / n,
    formPoints,
    avgCornersForHome: homeCount > 0 ? cornersForHome / homeCount : totalCornersFor / n,
    avgCornersAgainstHome: homeCount > 0 ? cornersAgainstHome / homeCount : totalCornersAgainst / n,
    avgCornersForAway: awayCount > 0 ? cornersForAway / awayCount : totalCornersFor / n,
    avgCornersAgainstAway: awayCount > 0 ? cornersAgainstAway / awayCount : totalCornersAgainst / n,
    matchesPlayed: n
  };
};

// 🏗️ Модель — 22 входа!
const createModel = () => {
  const model = tf.sequential();
  
  model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [22] }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.15 }));
  model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1, activation: 'linear' }));
  
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'meanSquaredError',
    metrics: ['mae']
  });
  
  return model;
};

const trainModel = async (model, trainingData, log) => {
  const xs = trainingData.map(d => d.features);
  const ys = trainingData.map(d => d.label);
  
  const xsTensor = tf.tensor2d(xs);
  const ysTensor = tf.tensor2d(ys, [ys.length, 1]);
  
  log('🔄 Запуск обучения (50 эпох)...');
  
  const history = await model.fit(xsTensor, ysTensor, {
    epochs: 50,
    batchSize: 16,
    validationSplit: 0.2,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if (epoch % 10 === 0 || epoch === 49) {
          log(`  Эпоха ${epoch + 1}/50: loss=${logs.loss.toFixed(4)}, mae=±${logs.mae.toFixed(2)} угл.`);
        }
      }
    }
  });
  
  xsTensor.dispose();
  ysTensor.dispose();
  
  return {
    loss: history.history.loss[history.history.loss.length - 1],
    mae: history.history.mae[history.history.mae.length - 1].toFixed(2)
  };
};

const testModel = (model, matches, teams, seasons) => {
  const sortedMatches = [...matches].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  let totalError = 0;
  let neuroCorrect = 0, neuroTotal = 0;
  
  const testStart = Math.floor(sortedMatches.length * 0.8);
  
  for (let i = testStart; i < sortedMatches.length; i++) {
    const match = sortedMatches[i];
    const actualTotal = (match.homeCorners || 0) + (match.awayCorners || 0);
    
    const homePast = getLastMatches(sortedMatches, match.homeTeamId, match.date, 10);
    const awayPast = getLastMatches(sortedMatches, match.awayTeamId, match.date, 10);
    if (homePast.length < 3 || awayPast.length < 3) continue;
    
    const homeStats = calculateFeatures(homePast, match.homeTeamId);
    const awayStats = calculateFeatures(awayPast, match.awayTeamId);
    const leagueAvgTotal = getLeagueAvgTotal(match.leagueId, seasons);
    
    const features = [
      homeStats.avgCornersFor, homeStats.avgCornersAgainst, homeStats.cornersTrend,
      homeStats.avgXG || 0, homeStats.avgPossession || 50, homeStats.avgShotsInside || 0,
      homeStats.formPoints,
      awayStats.avgCornersFor, awayStats.avgCornersAgainst, awayStats.cornersTrend,
      awayStats.avgXG || 0, awayStats.avgPossession || 50, awayStats.avgShotsInside || 0,
      awayStats.formPoints,
      homeStats.avgCornersForHome, homeStats.avgCornersAgainstHome,
      awayStats.avgCornersForAway, awayStats.avgCornersAgainstAway,
      match.round ? parseInt(match.round) || 0 : 0,
      homeStats.matchesPlayed, awayStats.matchesPlayed,
      leagueAvgTotal,
    ];
    
    const prediction = model.predict(tf.tensor2d([features])).dataSync()[0];
    
    totalError += Math.abs(prediction - actualTotal);
    
    const actualOver = actualTotal > 9.5;
    const neuroOver = prediction > 9.5;
    
    if (neuroOver === actualOver) neuroCorrect++;
    neuroTotal++;
  }
  
  return {
    neuroCorrect, neuroTotal,
    accuracy: neuroTotal > 0 ? ((neuroCorrect / neuroTotal) * 100).toFixed(1) : '0.0',
    avgError: neuroTotal > 0 ? (totalError / neuroTotal).toFixed(2) : '0',
  };
};

const StatusCard = ({ icon: Icon, label, value, color }) => {
  const colors = { blue: 'text-blue-400', green: 'text-green-400', yellow: 'text-yellow-400', purple: 'text-purple-400' };
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <Icon className={`${colors[color]} mb-2`} size={20} />
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
};

const TabButton = ({ active, onClick, children }) => (
  <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm transition ${active ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
    {children}
  </button>
);

const ResultCard = ({ title, accuracy, correct, total, color, highlight, subtitle }) => {
  const colors = { purple: 'text-purple-400', yellow: 'text-yellow-400', green: 'text-green-400' };
  return (
    <div className={`bg-gray-800 rounded-xl p-4 border ${highlight ? 'border-green-700' : 'border-gray-700'}`}>
      <h4 className={`font-semibold mb-2 ${colors[color]}`}>{title}</h4>
      <div className={`text-3xl font-bold ${colors[color]}`}>{accuracy}%</div>
      <p className="text-xs text-gray-400 mt-1">{correct}/{total} верно</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
};

export default Neuro;