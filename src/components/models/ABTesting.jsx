import { useState, useEffect, useRef } from 'react';
import { Upload, Brain, TreePine, Zap, Check, X, RefreshCw, Save, Scale, TrendingUp } from 'lucide-react';
import { getData } from '../../data/store';
import {
  getLastMatches,
  calculateFeatures,
  buildFeatures,
  getLeagueAvgTotal,
} from './neuroFeatures';

const ABTesting = () => {
  const data = getData();
  const [mainModelType, setMainModelType] = useState('tf');
  const [challengerModel, setChallengerModel] = useState(null);
  const [challengerModelType, setChallengerModelType] = useState(null);
  const [challengerModelName, setChallengerModelName] = useState('');
  const [comparisonResults, setComparisonResults] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const fileInputRef = useRef(null);

  const [predictLeague, setPredictLeague] = useState(data.leagues?.[0]?.id || 'rpl');
  const [predictHomeTeam, setPredictHomeTeam] = useState('');
  const [predictAwayTeam, setPredictAwayTeam] = useState('');
  const [selectedTotal, setSelectedTotal] = useState(9.5);

  const teamsInLeague = data.teams?.filter((t) => t.leagueId === predictLeague) || [];

  // Загрузка модели-претендента из JSON
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        
        if (json.neuro_rf_model_json || json.trees) {
          setChallengerModelType('rf');
          setChallengerModelName('Random Forest');
          setChallengerModel(json.neuro_rf_model_json || json);
        } else if (json.neuro_xgb_model_json || (json.learningRate !== undefined)) {
          setChallengerModelType('xgb');
          setChallengerModelName('XGBoost');
          setChallengerModel(json.neuro_xgb_model_json || json);
        } else if (json.modelTopology || json.model_metadata) {
          setChallengerModelType('tf');
          setChallengerModelName('TensorFlow');
          setChallengerModel(json);
        } else {
          alert('❌ Не удалось определить тип модели.');
        }
        
        setComparisonResults(null);
      } catch (error) {
        alert('❌ Ошибка чтения файла: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  // Прогноз от загруженной модели
  const predictWithChallenger = (features) => {
    if (!challengerModel) return null;
    
    try {
      if (challengerModelType === 'rf') {
        const modelData = typeof challengerModel === 'string' ? JSON.parse(challengerModel) : challengerModel;
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
      }
      
      if (challengerModelType === 'xgb') {
        const modelData = typeof challengerModel === 'string' ? JSON.parse(challengerModel) : challengerModel;
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
      }
      
      return null;
    } catch (e) {
      console.error('Challenger predict error:', e);
      return null;
    }
  };

  // Прогноз от основной модели (сохранённой в localStorage)
  const predictWithMain = async (features) => {
    try {
      if (mainModelType === 'tf') {
        const tf = await import('@tensorflow/tfjs');
        const models = await tf.io.listModels();
        if (!models['localstorage://football-neuro-model']) return null;
        
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
        return Math.max(2, Math.min(18, expectedTotal));
      }
      
      if (mainModelType === 'rf') {
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
      }
      
      if (mainModelType === 'xgb') {
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
      }
      
      return null;
    } catch (e) {
      console.error('Main model predict error:', e);
      return null;
    }
  };

  // Сравнение и запись прогнозов
  const compareAndSave = async () => {
    if (!predictHomeTeam || !predictAwayTeam) return;
    setIsComparing(true);
    setComparisonResults(null);
    setSaveMessage('');

    try {
      const allMatches = [...(data.matches || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
      const homePast = getLastMatches(allMatches, predictHomeTeam, new Date().toISOString(), 12);
      const awayPast = getLastMatches(allMatches, predictAwayTeam, new Date().toISOString(), 12);
      
      if (homePast.length < 3 || awayPast.length < 3) {
        setIsComparing(false);
        return;
      }
      
      const homeStats = calculateFeatures(homePast, predictHomeTeam);
      const awayStats = calculateFeatures(awayPast, predictAwayTeam);
      const features = buildFeatures(homeStats, awayStats, 0, getLeagueAvgTotal(predictLeague, data.seasons));
      
      // Прогноз основной модели
      const mainPred = await predictWithMain(features);
      
      // Прогноз претендента
      const challengerPred = predictWithChallenger(features);
      
      if (mainPred === null && challengerPred === null) {
        setSaveMessage('❌ Ни одна модель не дала прогноз');
        setIsComparing(false);
        return;
      }
      
      const homeTeam = data.teams?.find((t) => t.id === predictHomeTeam)?.name || predictHomeTeam;
      const awayTeam = data.teams?.find((t) => t.id === predictAwayTeam)?.name || predictAwayTeam;
      
      // Запись в Firebase
      const logEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        match: `${homeTeam} - ${awayTeam}`,
        leagueId: predictLeague,
        homeTeamId: predictHomeTeam,
        awayTeamId: predictAwayTeam,
        selectedTotal,
        mainModel: {
          type: mainModelType,
          expectedTotal: mainPred !== null ? Math.max(2, Math.min(18, mainPred)).toFixed(2) : null,
          overProb: mainPred !== null ? Math.round(100 / (1 + Math.exp(-(mainPred - selectedTotal) * 2))) : null,
        },
        challengerModel: {
          type: challengerModelType,
          name: challengerModelName,
          expectedTotal: challengerPred !== null ? Math.max(2, Math.min(18, challengerPred)).toFixed(2) : null,
          overProb: challengerPred !== null ? Math.round(100 / (1 + Math.exp(-(challengerPred - selectedTotal) * 2))) : null,
        },
        actualTotal: null,
        result: null,
      };
      
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('../../firebase');
        await setDoc(doc(db, 'football', 'stats', 'ab_tests', logEntry.id), logEntry);
        setSaveMessage('✅ Прогнозы записаны!');
        setTimeout(() => setSaveMessage(''), 3000);
        console.log('📝 A/B тест записан:', logEntry.match);
      } catch (error) {
        console.error('❌ Ошибка записи:', error);
        setSaveMessage('❌ Ошибка записи');
        setTimeout(() => setSaveMessage(''), 3000);
      }
      
      setComparisonResults({
        mainPrediction: mainPred !== null ? Math.max(2, Math.min(18, mainPred)).toFixed(2) : null,
        challengerPrediction: challengerPred !== null ? Math.max(2, Math.min(18, challengerPred)).toFixed(2) : null,
      });
      
    } catch (error) {
      console.error('Comparison error:', error);
    }
    setIsComparing(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-xl p-6 border border-blue-700/50">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Scale className="text-blue-400" /> A/B тестирование
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Сравните текущую модель с претендентом на реальных прогнозах. Результаты записываются в Firebase.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs text-gray-400 mb-2">Основная модель</label>
            <select value={mainModelType} onChange={(e) => setMainModelType(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm">
              <option value="tf">🧠 TensorFlow</option>
              <option value="rf">🌲 Random Forest</option>
              <option value="xgb">⚡ XGBoost</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs text-gray-400 mb-2">Модель-претендент</label>
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2">
                <Upload size={18} /> Загрузить
              </button>
              {challengerModel && (
                <div className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-2">
                  <Brain size={16} className="text-yellow-400" />
                  <span className="text-xs font-medium">{challengerModelName}</span>
                  <button type="button" onClick={() => { setChallengerModel(null); setChallengerModelType(null); setChallengerModelName(''); }}
                    className="p-1 text-red-400 hover:bg-red-600/20 rounded"><X size={12} /></button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Лига</label>
            <select value={predictLeague} onChange={(e) => { setPredictLeague(e.target.value); setPredictHomeTeam(''); setPredictAwayTeam(''); }}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm">
              {data.leagues?.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Хозяева</label>
            <select value={predictHomeTeam} onChange={(e) => setPredictHomeTeam(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm">
              <option value="">Выберите</option>
              {teamsInLeague.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Гости</label>
            <select value={predictAwayTeam} onChange={(e) => setPredictAwayTeam(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm">
              <option value="">Выберите</option>
              {teamsInLeague.filter((t) => t.id !== predictHomeTeam).map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
            </select>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-xs text-gray-400 mb-2">Тотал: {selectedTotal}</label>
          <div className="flex flex-wrap gap-2">
            {[6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 12.5].map((t) => (
              <button key={t} type="button" onClick={() => setSelectedTotal(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${selectedTotal === t ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        
        <button type="button" onClick={compareAndSave}
          disabled={!predictHomeTeam || !predictAwayTeam || isComparing || !challengerModel}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50 mb-4">
          {isComparing ? 'Сравниваю...' : '⚖️ Сравнить и записать прогнозы'}
        </button>
        
        {saveMessage && (
          <div className={`px-4 py-3 rounded-lg text-sm mb-4 ${saveMessage.includes('❌') ? 'bg-red-600/20 border border-red-600 text-red-400' : 'bg-green-600/20 border border-green-600 text-green-400'}`}>
            {saveMessage}
          </div>
        )}
        
        {comparisonResults && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-700/50">
              <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                <Brain size={16} /> Основная модель ({mainModelType.toUpperCase()})
              </h4>
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Прогноз тотала</p>
                <p className="text-2xl font-bold text-white">{comparisonResults.mainPrediction || '—'}</p>
              </div>
            </div>
            
            <div className="bg-yellow-900/20 rounded-xl p-4 border border-yellow-700/50">
              <h4 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                <Upload size={16} /> Претендент ({challengerModelName})
              </h4>
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Прогноз тотала</p>
                <p className="text-2xl font-bold text-white">{comparisonResults.challengerPrediction || '—'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ABTesting;
