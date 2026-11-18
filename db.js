const DB_NAME = 'PallanuotoFIN_V2_DB';
const DB_VERSION = 2;

let dbInstance = null;

function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('gare')) {
        db.createObjectStore('gare', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onversionchange = () => {
        dbInstance.close();
        dbInstance = null;
      };
      resolve(dbInstance);
    };
    request.onerror = () => reject(request.error);
  });
}

async function salvaStatoGara(garaData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('gare', 'readwrite');
    const store = tx.objectStore('gare');
    store.put({ ...garaData, id: 'gara_corrente' });
    if (garaData.matchId) {
      store.put({ ...garaData, id: garaData.matchId });
    }
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function caricaStatoGara(id = 'gara_corrente') {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('gare', 'readonly');
    const req = tx.objectStore('gare').get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function elencaPartiteArchiviate() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('gare', 'readonly');
    const req = tx.objectStore('gare').getAll();
    req.onsuccess = () => {
      const tutte = req.result || [];
      const archivio = tutte
        .filter(item => item.id !== 'gara_corrente')
        .sort((a, b) => new Date(b.dataOraInizio) - new Date(a.dataOraInizio));
      resolve(archivio);
    };
    req.onerror = () => reject(req.error);
  });
}

async function eliminaPartitaArchiviata(matchId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('gare', 'readwrite');
    tx.objectStore('gare').delete(matchId);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function esportaTuttoBackup() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('gare', 'readonly');
    const req = tx.objectStore('gare').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function importaTuttoBackup(elencoGare) {
  if (!Array.isArray(elencoGare)) throw new Error('Formato backup non valido');
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('gare', 'readwrite');
    const store = tx.objectStore('gare');
    elencoGare.forEach(g => {
      if (g && g.id) store.put(g);
    });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
