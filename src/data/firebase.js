import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDyi0gYdxk8l2occz_iMP0hUtzTJAkPysk",
  authDomain: "football-stats-tracker-585c9.firebaseapp.com",
  databaseURL: "https://football-stats-tracker-585c9-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "football-stats-tracker-585c9",
  storageBucket: "football-stats-tracker-585c9.firebasestorage.app",
  messagingSenderId: "756760552926",
  appId: "1:756760552926:web:36e94d71f03c43839ba94f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Загрузка всех данных из облака
export const loadFromCloud = async () => {
  try {
    const docRef = doc(db, 'football', 'stats');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log('✅ Данные загружены из облака');
      return docSnap.data();
    } else {
      console.log('📭 В облаке нет данных, используем локальные');
      return null;
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки из облака:', error);
    return null;
  }
};

// Сохранение всех данных в облако
export const saveToCloud = async (data) => {
  try {
    const docRef = doc(db, 'football', 'stats');
    await setDoc(docRef, {
      ...data,
      lastUpdated: new Date().toISOString(),
      version: '2.0'
    });
    console.log('✅ Данные сохранены в облако');
    return true;
  } catch (error) {
    console.error('❌ Ошибка сохранения в облако:', error);
    return false;
  }
};

// Синхронизация: загружаем из облака, если там новее
export const syncData = async (localData) => {
  const cloudData = await loadFromCloud();
  
  if (!cloudData) {
    await saveToCloud(localData);
    return localData;
  }
  
  const localLastUpdated = localData.lastUpdated || '2000-01-01';
  const cloudLastUpdated = cloudData.lastUpdated || '2000-01-01';
  
  if (new Date(cloudLastUpdated) > new Date(localLastUpdated)) {
    console.log('☁️ Облачные данные новее, загружаем их');
    return cloudData;
  } else if (new Date(localLastUpdated) > new Date(cloudLastUpdated)) {
    console.log('💾 Локальные данные новее, загружаем в облако');
    await saveToCloud(localData);
    return localData;
  }
  
  console.log('✅ Данные синхронизированы');
  return localData;
};