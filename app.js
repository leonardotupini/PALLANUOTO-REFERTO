function dataLocaleGara(data) {
  const anno = data.getFullYear();
  const mese = String(data.getMonth() + 1).padStart(2, '0');
  const giorno = String(data.getDate()).padStart(2, '0');
  return `${anno}-${mese}-${giorno}`;
}

function creaNuovaStrutturaGara() {
  const now = new Date();
  return {
    id: 'gara_corrente',
    matchId: `match_${now.getTime()}`,
    dataOraInizio: now.toISOString(),
    numeroGara: '',
    dataGara: dataLocaleGara(now),
    oraInizio: '',
    oraTermine: '',
    manifestazione: '',
    giudiciPorta: '',
    cronometrista30: '',
    tiriRigore: '',
    sqBianca: 'Roma Nuoto',
    sqNera: 'Olympic Roma',
    categoria: 'Ragazzi',
    impianto: '',
    allBianca: '',
    allNera: '',
    arbitro1: '',
    arbitro2: '',
    segretario: '',
    cronometrista: '',
    noteArbitrali: '',
    usaCronometro: false,
    tempoCorrente: '1° TEMPO',
    durataQuarto: 420,
    versioneExport: 0,
    scoreB: 0,
    scoreN: 0,
    parziali: {
      '1° TEMPO': { B: 0, N: 0 },
      '2° TEMPO': { B: 0, N: 0 },
      '3° TEMPO': { B: 0, N: 0 },
      '4° TEMPO': { B: 0, N: 0 }
    },
    rosterB: Array.from({ length: 15 }, (_, i) => ({ num: i + 1, nome: `Giocatore B${i + 1}`, tessera: '', reti: 0, falli: [] })),
    rosterN: Array.from({ length: 15 }, (_, i) => ({ num: i + 1, nome: `Giocatore N${i + 1}`, tessera: '', reti: 0, falli: [] })),
    eventi: []
  };
}

let statoGara = creaNuovaStrutturaGara();

const CAMPI_METADATI = [
  'sqBianca', 'sqNera', 'categoria', 'impianto',
  'allBianca', 'allNera', 'arbitro1', 'arbitro2',
  'segretario', 'cronometrista', 'noteArbitrali',
  'numeroGara', 'dataGara', 'oraInizio', 'oraTermine', 'manifestazione',
  'giudiciPorta', 'cronometrista30', 'tiriRigore'
];

const ORDINE_TEMPI = ['1° TEMPO', '2° TEMPO', '3° TEMPO', '4° TEMPO'];

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ==========================================
// AUDIO & VIBRAZIONE
// ==========================================
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Sblocca AudioContext al primo tocco
window.addEventListener('pointerdown', () => { getAudioContext(); }, { once: true });

function vibraDispositivo(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch (e) {}
}

// ==========================================
// PWA INSTALL PROMPT
// ==========================================
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const btn = document.getElementById('btnInstallaPwa');
  if (btn) btn.style.display = 'block';
});

async function installaPwa() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === 'accepted') {
    const btn = document.getElementById('btnInstallaPwa');
    if (btn) btn.style.display = 'none';
  }
  deferredInstallPrompt = null;
}

// ==========================================
// INIZIALIZZAZIONE
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }

  const salvata = await caricaStatoGara();
  if (salvata) {
    statoGara = { ...statoGara, ...salvata };
    if (salvata.dataGara === undefined) {
      const dataArchivio = new Date(salvata.dataOraInizio);
      statoGara.dataGara = Number.isNaN(dataArchivio.getTime()) ? '' : dataLocaleGara(dataArchivio);
    }
  }
  CAMPI_METADATI.forEach(id => {
    const el = document.getElementById(id);
    if (el && statoGara[id] !== undefined) el.value = statoGara[id];
  });

  // Id progressivi per stabilità dell'ordinamento
  statoGara.eventi.forEach((ev, i) => {
    if (!Number.isFinite(ev.id)) ev.id = i + 1;
  });

  if (!ORDINE_TEMPI.includes(statoGara.tempoCorrente)) statoGara.tempoCorrente = '1° TEMPO';
  statoGara.durataQuarto = (statoGara.durataQuarto === 480) ? 480 : 420;
  secondiRimanenti = statoGara.durataQuarto;

  const durataEl = document.getElementById('durataQuarto');
  if (durataEl) durataEl.value = String(statoGara.durataQuarto);
  aggiornaQuarterUI();
  sincronizzaMinutoInputs(formattaTempo(statoGara.durataQuarto));

  const toggleEl = document.getElementById('toggleTimerMode');
  const manualBar = document.getElementById('manualClockBar');
  if (toggleEl) {
    toggleEl.value = statoGara.usaCronometro ? 'Y' : 'N';
    document.getElementById('timerBox').style.display = statoGara.usaCronometro ? 'block' : 'none';
    if (manualBar) manualBar.style.display = statoGara.usaCronometro ? 'none' : 'flex';
    if (statoGara.usaCronometro) aggiornaDisplayCronometro();
  }

  ricalcolaStatoDaEventi();
  aggiornaUI();
  aggiornaPunteggioRigoriAnteprima();

  CAMPI_METADATI.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', async () => {
      let val = el.value;
      if (id === 'sqBianca') val = val.trim() || 'Bianca';
      if (id === 'sqNera') val = val.trim() || 'Nera';
      if (id === 'categoria') val = val.trim() || 'Ragazzi';
      statoGara[id] = val;
      if (id === 'sqBianca' || id === 'sqNera') aggiornaUI();
      if (id === 'tiriRigore') aggiornaPunteggioRigoriAnteprima();
      await salvaStatoGara(statoGara);
    });
  });

  verificaProntezzaOffline();
});

// ==========================================
// 0. VERIFICA PRONTEZZA OFFLINE
// ==========================================
const RISORSE_OFFLINE = [
  './index.html', './app.js', './db.js', './manifest.json',
  './lib/pdf-lib.min.js', './lib/fontkit.umd.min.js', './lib/NotoSans-Bold.ttf',
  './verbale-fin.js', './modello_verbale_fin_2021.pdf'
];

async function verificaProntezzaOffline() {
  const el = document.getElementById('statoOffline');
  if (!el) return;
  const imposta = (testo, classe) => { el.textContent = testo; el.className = classe || ''; };

  if (!window.isSecureContext || location.protocol === 'file:') {
    imposta('⚠️ Apri la v2 via HTTPS o localhost per usare l’app e stampare il verbale offline.', 'warn');
    return;
  }

  if (!('serviceWorker' in navigator) || !('caches' in window)) {
    imposta('⚠️ Questo browser non supporta il funzionamento offline. Usa Chrome per Android.', 'warn');
    return;
  }
  try {
    await navigator.serviceWorker.ready;
    const mancanti = [];
    for (const u of RISORSE_OFFLINE) {
      if (!(await caches.match(u))) mancanti.push(u.replace('./', ''));
    }

    if (mancanti.length === 0) {
      imposta('✅ Inserimento rapido e PDF pronti anche offline.', 'ok');
    } else {
      imposta(`⚠️ App non ancora pronta offline. Mancano in cache: ${mancanti.join(', ')}. Apri l'app con rete attiva e verifica che i file siano nella cartella.`, 'warn');
    }
  } catch (e) {
    imposta('⚠️ Impossibile verificare la cache offline.', 'warn');
  }
}

// ==========================================
// 1. CRONOMETRO CON TIMESTAMP (NO DRIFT)
// ==========================================
let secondiRimanenti = 420;
let targetEndTimestamp = null;
let timerInterval = null;
let cronometroAttivo = false;

function formattaTempo(sec) {
  const s = Math.max(0, sec);
  const min = Math.floor(s / 60);
  const rem = s % 60;
  return `${min}:${String(rem).padStart(2, '0')}`;
}

function sincronizzaMinutoInputs(valore, sorgenteEl = null) {
  ['minutoTabellone', 'minutoQuickInput', 'minutoInput'].forEach(id => {
    const el = document.getElementById(id);
    if (!el || el === sorgenteEl) return;
    if (document.activeElement === el) return;
    el.value = valore;
  });
}

function normalizzaCampiMinuto(sorgenteEl) {
  if (!sorgenteEl) return;
  const sec = minutoInSecondi(sorgenteEl.value);
  if (sec >= 0) {
    const formatted = formattaTempo(sec);
    sorgenteEl.value = formatted;
    sincronizzaMinutoInputs(formatted, sorgenteEl);
  }
}

function aggiornaQuarterUI() {
  const tempo = statoGara.tempoCorrente || '1° TEMPO';
  const selectTempo = document.getElementById('tempoCorrente');
  if (selectTempo) selectTempo.value = tempo;
  document.querySelectorAll('.quarter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tempo === tempo);
  });
  const quickTempo = document.getElementById('quickActionTempo');
  if (quickTempo) quickTempo.textContent = tempo;
}

async function cambiaTempoCorrente(nuovoTempo) {
  if (!ORDINE_TEMPI.includes(nuovoTempo)) return;
  statoGara.tempoCorrente = nuovoTempo;
  aggiornaQuarterUI();
  if (statoGara.usaCronometro) {
    resetCronometro();
  } else {
    sincronizzaMinutoInputs(formattaTempo(statoGara.durataQuarto || 420));
  }
  await salvaStatoGara(statoGara);
}

async function cambiaDurataQuarto() {
  const durataEl = document.getElementById('durataQuarto');
  const durata = parseInt(durataEl?.value, 10) === 480 ? 480 : 420;
  statoGara.durataQuarto = durata;
  resetCronometro();
  await salvaStatoGara(statoGara);
}

function aggiornaDisplayCronometro() {
  const displayEl = document.getElementById('timerDisplay');
  if (!displayEl) return;

  const formatted = formattaTempo(secondiRimanenti);
  displayEl.textContent = formatted;
  sincronizzaMinutoInputs(formatted);

  displayEl.classList.remove('running', 'ended');
  if (secondiRimanenti === 0) displayEl.classList.add('ended');
  else if (cronometroAttivo) displayEl.classList.add('running');
}

async function cambiaModalitaCronometro() {
  const scelta = document.getElementById('toggleTimerMode').value;
  const attivo = (scelta === 'Y');
  statoGara.usaCronometro = attivo;

  const timerBox = document.getElementById('timerBox');
  const manualBar = document.getElementById('manualClockBar');
  if (attivo) {
    timerBox.style.display = 'block';
    if (manualBar) manualBar.style.display = 'none';
    resetCronometro();
  } else {
    clearInterval(timerInterval);
    timerInterval = null;
    cronometroAttivo = false;
    timerBox.style.display = 'none';
    if (manualBar) manualBar.style.display = 'flex';
  }
  await salvaStatoGara(statoGara);
}

function toggleCronometro() {
  const btn = document.getElementById('btnStartPause');
  if (cronometroAttivo) {
    clearInterval(timerInterval);
    timerInterval = null;
    cronometroAttivo = false;
    btn.textContent = '▶ RIPRENDI';
    btn.className = 'success';
    aggiornaDisplayCronometro();
  } else {
    if (secondiRimanenti <= 0) return;
    cronometroAttivo = true;
    targetEndTimestamp = Date.now() + secondiRimanenti * 1000;
    btn.textContent = '⏸ PAUSA';
    btn.className = 'danger';
    aggiornaDisplayCronometro();

    timerInterval = setInterval(() => {
      const restanti = Math.max(0, Math.round((targetEndTimestamp - Date.now()) / 1000));
      secondiRimanenti = restanti;
      aggiornaDisplayCronometro();
      if (secondiRimanenti <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        cronometroAttivo = false;
        btn.textContent = '▶ AVVIA';
        btn.className = 'success';
        suonaSirenaFineTempo();
      }
    }, 250);
  }
}

function resetCronometro() {
  clearInterval(timerInterval);
  timerInterval = null;
  cronometroAttivo = false;
  const durata = parseInt(document.getElementById('durataQuarto')?.value, 10) || statoGara.durataQuarto || 420;
  secondiRimanenti = durata;
  targetEndTimestamp = null;

  const btn = document.getElementById('btnStartPause');
  if (btn) {
    btn.textContent = '▶ AVVIA';
    btn.className = 'success';
  }
  const banner = document.getElementById('bannerFineTempo');
  if (banner) banner.style.display = 'none';

  if (statoGara.usaCronometro) aggiornaDisplayCronometro();
}

function aggiustaSecondi(delta) {
  const maxSec = parseInt(document.getElementById('durataQuarto')?.value, 10) || statoGara.durataQuarto || 420;
  secondiRimanenti = Math.min(maxSec, Math.max(0, secondiRimanenti + delta));
  if (cronometroAttivo) {
    targetEndTimestamp = Date.now() + secondiRimanenti * 1000;
  }
  aggiornaDisplayCronometro();
}

function suonaSirenaFineTempo() {
  vibraDispositivo([300, 100, 300, 100, 500]);
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch (e) {}
  mostraBannerFineTempo();
}

function mostraBannerFineTempo() {
  const banner = document.getElementById('bannerFineTempo');
  const testo = document.getElementById('testoFineTempo');
  const btn = document.getElementById('btnAvanzaTempo');
  if (!banner || !testo || !btn) return;

  const corrente = document.getElementById('tempoCorrente').value;
  const mappaSuccessivi = {
    '1° TEMPO': '2° TEMPO',
    '2° TEMPO': '3° TEMPO',
    '3° TEMPO': '4° TEMPO'
  };
  const succ = mappaSuccessivi[corrente];
  if (succ) {
    testo.textContent = `🔔 ${corrente} concluso!`;
    btn.textContent = `PASSA AL ${succ} ▶`;
    btn.style.display = 'inline-block';
    banner.style.display = 'block';
  } else {
    testo.textContent = `🏁 4° Tempo concluso! Fine dei tempi regolamentari.`;
    btn.style.display = 'none';
    banner.style.display = 'block';
  }
}

async function avanzaQuartoAutomatico() {
  const corrente = document.getElementById('tempoCorrente').value;
  const mappaSuccessivi = {
    '1° TEMPO': '2° TEMPO',
    '2° TEMPO': '3° TEMPO',
    '3° TEMPO': '4° TEMPO'
  };
  const succ = mappaSuccessivi[corrente];
  if (succ) {
    await cambiaTempoCorrente(succ);
    const banner = document.getElementById('bannerFineTempo');
    if (banner) banner.style.display = 'none';
    const feedbackEl = document.getElementById('feedbackQuery');
    if (feedbackEl) feedbackEl.textContent = `Avviato ${succ}`;
  }
}

// ==========================================
// 2. RICONOSCIMENTO VOCALE (WEB SPEECH API)
// ==========================================
let recognition = null;
let isListening = false;

function inizializzaSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const rec = new SpeechRecognition();
  rec.lang = 'it-IT';
  rec.continuous = false;
  rec.interimResults = true;

  const btnMic = document.getElementById('btnMic');
  const inputEl = document.getElementById('comandoInput');
  const feedbackEl = document.getElementById('feedbackQuery');

  rec.onstart = () => {
    isListening = true;
    btnMic.classList.add('listening');
    btnMic.textContent = '🔴 IN ASCOLTO... PARLA ORA';
    feedbackEl.textContent = navigator.onLine
      ? ''
      : 'Sei offline: il riconoscimento vocale funziona solo se il pacchetto "Italiano" offline è installato sul telefono.';
  };

  rec.onresult = (event) => {
    let trascrizione = '';
    let isFinal = false;
    for (let i = event.resultIndex; i < event.results.length; i++) {
      trascrizione += event.results[i][0].transcript;
      if (event.results[i].isFinal) isFinal = true;
    }
    inputEl.value = trascrizione;
    if (isFinal && trascrizione.trim() !== '') {
      processaComando();
    }
  };

  rec.onerror = (event) => {
    if (event.error === 'not-allowed') {
      feedbackEl.textContent = 'Permesso microfono negato. Abilitalo nelle impostazioni di Chrome.';
    } else if (event.error === 'network') {
      feedbackEl.textContent = 'Riconoscimento vocale non disponibile senza rete su questo telefono. Usa il tocco sui giocatori o la casella di testo.';
    } else if (event.error === 'language-not-supported') {
      feedbackEl.textContent = 'Lingua italiana non disponibile per il riconoscimento vocale.';
    } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
      feedbackEl.textContent = `Errore microfono (${event.error}). Riprova o tocca i giocatori.`;
    }
  };

  rec.onend = () => {
    isListening = false;
    btnMic.classList.remove('listening');
    btnMic.textContent = '🎤 PREMI E PARLA (ES. "GOL DEL 12 OLYMPIC")';
  };

  return rec;
}

function avviaRiconoscimentoVocale() {
  const feedbackEl = document.getElementById('feedbackQuery');
  if (!recognition) recognition = inizializzaSpeechRecognition();

  if (!recognition) {
    feedbackEl.textContent = 'Web Speech API non supportata da questo browser. Usa il tocco sui giocatori o la tastiera.';
    return;
  }

  if (isListening) {
    recognition.stop();
  } else {
    try {
      recognition.start();
    } catch (e) {
      recognition.stop();
    }
  }
}

// ==========================================
// 3. PARSER NLP OFFLINE + AUTOCORREZIONI AL VOLO
// ==========================================
const INIZIO_PAROLA = '(?<![\\p{L}\\p{N}])';
const FINE_PAROLA = '(?![\\p{L}\\p{N}])';
function reParola(sorgente, flag = '') {
  return new RegExp(`${INIZIO_PAROLA}(?:${sorgente})${FINE_PAROLA}`, 'u' + flag);
}

const NUMERI_IN_LETTERE = {
  uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8,
  nove: 9, dieci: 10, undici: 11, dodici: 12, tredici: 13, quattordici: 14, quindici: 15
};
const RE_NUMERI_IN_LETTERE = reParola(Object.keys(NUMERI_IN_LETTERE).join('|'), 'g');

const PAROLE_GENERICHE = new Set([
  'nuoto', 'pallanuoto', 'rari', 'nantes', 'sport', 'sports', 'sporting', 'club', 'team',
  'società', 'societa', 'polisportiva', 'associazione', 'asd', 'ssd', 'srl', 'circolo',
  'canottieri', 'nautico', 'acquatica', 'acquatico', 'aquatic', 'aquatics', 'swim',
  'swimming', 'waterpolo', 'water', 'polo', 'piscina', 'piscine', 'centro', 'the',
  'del', 'della', 'dello', 'dei', 'delle', 'and', 'ssdrl', 'asdrl', 'onlus'
]);

const RE_CORREZIONE = reParola(
  'no\\s+scusa|scusa(?:mi)?|anzi|correggo|correzione|volevo\\s+dire|ho\\s+sbagliato|sbagliato|no',
  'g'
);

const RE_QUERY = reParola(
  'quant[ie]|situazione|com\'?\\s*è\\s+messo|come\\s+sta|falli\\s+ha|reti\\s+ha|gol\\s+ha|espulsioni\\s+ha|stato\\s+(?:del|della|di)'
);
const RE_GOL = reParola('gol|goal|gool|rete|segna\\p{L}*|marcatura');
const RE_EDA = reParola('eda|brutalit[aà]|violenz\\p{L}*|condotta\\s+violent\\p{L}*');
const RE_EDS = reParola('eds|scorrettezz\\p{L}*|protest\\p{L}*|antisportiv\\p{L}*');
const RE_ET = reParola('espuls\\p{L}*|esclus\\p{L}*|fuori|20\\s+secondi|venti\\s+secondi|fallo\\s+grave|et');
const RE_TR = reParola('rigore|penalty|tr');
const RE_TO = reParola('time[\\s-]?out|timeout|taim\\s?aut|t\\.?o\\.?|(?:chiest|chiede|richiest)\\p{L}*\\s+(?:un\\s+)?tempo|tempo\\s+(?:chiest|richiest)\\p{L}*');
const RE_BIANCA = reParola('bianc[aoih]\\p{L}*|bianchi');
const RE_NERA = reParola('ner[aoie]|blu|scur[aoie]');
const RE_CALOTTA = reParola('1[0-5]|[1-9]');
const RE_SCORCIATOIA = /(?<![\p{L}\p{N}])([bn])\s?(1[0-5]|[1-9])(?![\p{L}\p{N}])/u;

function normalizzaTesto(s) {
  return String(s || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function convertiNumeriInLettere(t) {
  return t.replace(RE_NUMERI_IN_LETTERE, (w) => String(NUMERI_IN_LETTERE[w]));
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tokenSquadra(nome) {
  return convertiNumeriInLettere(normalizzaTesto(nome))
    .split(/[^\p{L}\p{N}']+/u)
    .filter(w => w.length > 2 && !PAROLE_GENERICHE.has(w) && !/^\d+$/.test(w));
}

function paroleDistintiveSquadre() {
  const tB = tokenSquadra(statoGara.sqBianca);
  const tN = tokenSquadra(statoGara.sqNera);
  const setB = new Set(tB);
  const setN = new Set(tN);
  return {
    B: [...setB].filter(w => !setN.has(w)),
    N: [...setN].filter(w => !setB.has(w))
  };
}

function rilevaSquadra(seg, distintive) {
  let punteggioB = 0;
  let punteggioN = 0;
  if (RE_BIANCA.test(seg)) punteggioB += 10;
  if (RE_NERA.test(seg)) punteggioN += 10;
  distintive.B.forEach(p => { if (reParola(escapeRegex(p)).test(seg)) punteggioB += 1; });
  distintive.N.forEach(p => { if (reParola(escapeRegex(p)).test(seg)) punteggioN += 1; });

  if (punteggioB === 0 && punteggioN === 0) return { squadra: null, ambigua: false };
  if (punteggioB === punteggioN) return { squadra: null, ambigua: true };
  return { squadra: punteggioB > punteggioN ? 'B' : 'N', ambigua: false };
}

function estraiMinutoDaSegmento(seg) {
  let pulito = seg;
  let minuto = null;

  const formattaMin = (mStr, sStr) => {
    const m = parseInt(mStr, 10);
    const s = sStr !== undefined ? parseInt(sStr, 10) : 0;
    if (m < 0 || m > 15 || s < 0 || s > 59) return null;
    return formattaTempo(m * 60 + s);
  };

  const patterns = [
    /(?<![\p{L}\p{N}])(?:al\s+|a\s+)?minut[oi]\s+(\d{1,2})\s*(?:e|:|\.|,)\s*(\d{1,2})(?![\p{L}\p{N}])/iu,
    /(?<![\p{L}\p{N}])(?:al\s+|a\s+)?(\d{1,2})\s+minut[oi]\s*(?:e\s*)?(\d{1,2})(?![\p{L}\p{N}])/iu,
    /(?<![\p{L}\p{N}])(\d{1,2})[:.](\d{2})(?![\p{L}\p{N}])/u,
    /(?<![\p{L}\p{N}])(?:al\s+)?minut[oi]\s+(\d{1,2})(?![\p{L}\p{N}])/iu
  ];

  for (const re of patterns) {
    const match = pulito.match(re);
    if (match) {
      const parsed = formattaMin(match[1], match[2]);
      if (parsed) {
        minuto = parsed;
        pulito = `${pulito.slice(0, match.index)} ${pulito.slice(match.index + match[0].length)}`;
        break;
      }
    }
  }

  return { minuto, senzaMinuti: pulito };
}

function estraiCampiSegmento(seg, distintive) {
  const campi = { squadra: null, calotta: null, sigla: null, minuto: null, query: false, ambigua: false };

  const { minuto, senzaMinuti } = estraiMinutoDaSegmento(seg);
  campi.minuto = minuto;

  const scorciatoia = senzaMinuti.match(RE_SCORCIATOIA);
  if (scorciatoia) {
    campi.squadra = scorciatoia[1].toUpperCase();
    campi.calotta = parseInt(scorciatoia[2], 10);
  }

  if (!campi.squadra) {
    const r = rilevaSquadra(senzaMinuti, distintive);
    campi.squadra = r.squadra;
    campi.ambigua = r.ambigua;
  }

  if (!campi.calotta) {
    const pulitoCalotta = senzaMinuti
      .replace(reParola('\\d{1,2}\\s*°?\\s*(?:tempo|quarto|fallo)', 'g'), ' ');
    const prefissata = pulitoCalotta.match(/(?<![\p{L}\p{N}])(?:calott[ae]|numero|num|n\.?|#|del|dal|per\s+il)\s*(1[0-5]|[1-9])(?![\p{L}\p{N}])/u);
    if (prefissata) {
      campi.calotta = parseInt(prefissata[1], 10);
    } else {
      const m = pulitoCalotta.match(RE_CALOTTA);
      if (m) campi.calotta = parseInt(m[0], 10);
    }
  }

  if (RE_QUERY.test(senzaMinuti)) campi.query = true;

  if (RE_GOL.test(senzaMinuti)) campi.sigla = 'GOL';
  else if (RE_EDA.test(senzaMinuti)) campi.sigla = 'EDA';
  else if (RE_EDS.test(senzaMinuti)) campi.sigla = 'EDS';
  else if (RE_ET.test(senzaMinuti)) campi.sigla = 'ET';
  else if (RE_TR.test(senzaMinuti)) campi.sigla = 'TR';
  else if (RE_TO.test(senzaMinuti)) campi.sigla = 'TO';

  return campi;
}

function parseComandoColloquiale(testo) {
  const t = convertiNumeriInLettere(normalizzaTesto(testo));
  const distintive = paroleDistintiveSquadre();
  const segmenti = t.split(RE_CORREZIONE).map(s => s.trim()).filter(Boolean);

  const ris = { squadra: null, calotta: null, sigla: null, minuto: null, query: false, ambigua: false };
  segmenti.forEach(seg => {
    const c = estraiCampiSegmento(seg, distintive);
    if (c.squadra) { ris.squadra = c.squadra; ris.ambigua = false; }
    else if (c.ambigua && !ris.squadra) ris.ambigua = true;
    if (c.calotta) ris.calotta = c.calotta;
    if (c.sigla) ris.sigla = c.sigla;
    if (c.minuto) ris.minuto = c.minuto;
    if (c.query) ris.query = true;
  });

  if (ris.query) {
    return { tipo: 'QUERY', squadra: ris.squadra, calotta: ris.calotta, ambigua: ris.ambigua };
  }
  return { tipo: 'EVENTO', squadra: ris.squadra, calotta: ris.calotta, sigla: ris.sigla, minuto: ris.minuto, ambigua: ris.ambigua };
}

// ==========================================
// 4. EVENT SOURCING & GESTIONE EVENTI
// ==========================================
function minutoInSecondi(minuto) {
  const s = String(minuto || '').trim().replace(/[.,'’\s]+/g, ':');
  if (/^\d{3}$/.test(s)) {
    const min = parseInt(s[0], 10);
    const sec = parseInt(s.slice(1), 10);
    return sec < 60 ? min * 60 + sec : -1;
  }
  const m = s.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (!m) return -1;
  const min = parseInt(m[1], 10);
  const sec = m[2] ? parseInt(m[2], 10) : 0;
  if (min > 15 || sec > 59) return -1;
  return min * 60 + sec;
}

function normalizzaMinuto(minuto) {
  const raw = String(minuto || '').trim();
  const sec = minutoInSecondi(raw);
  return sec >= 0 ? formattaTempo(sec) : (raw || '0:00');
}

function chiaveCronologica(ev) {
  const idxTempo = Math.max(0, ORDINE_TEMPI.indexOf(ev.tempo));
  const sec = minutoInSecondi(ev.minuto);
  return idxTempo * 100000 + (sec < 0 ? 99999 : 9999 - sec);
}

function ordinaEventiCronologicamente() {
  statoGara.eventi.sort((a, b) =>
    (chiaveCronologica(a) - chiaveCronologica(b)) || ((a.id || 0) - (b.id || 0))
  );
}

function nuovoIdEvento() {
  return statoGara.eventi.reduce((max, ev) => Math.max(max, ev.id || 0), 0) + 1;
}

function calcolaChiave3FalloGiocatore(eventi, squadra, calotta) {
  const targetNum = parseInt(calotta, 10);
  if (!Number.isFinite(targetNum)) return null;
  let falli = 0;
  for (const ev of eventi) {
    if (ev.squadra !== squadra || parseInt(ev.calotta, 10) !== targetNum) continue;
    const isFallo = (ev.sigla === 'ET' || ev.sigla === 'TR' || ev.sigla === 'EDA' || ev.sigla === 'EDS' || ev.sigla === 'ED');
    if (!isFallo) continue;
    falli += 1;
    if (ev.sigla === 'EDA' || ev.sigla === 'EDS' || ev.sigla === 'ED' || falli >= 3) {
      return chiaveCronologica(ev);
    }
  }
  return null;
}

function ricalcolaStatoDaEventi() {
  ordinaEventiCronologicamente();

  statoGara.scoreB = 0;
  statoGara.scoreN = 0;
  ORDINE_TEMPI.forEach(t => {
    statoGara.parziali[t] = { B: 0, N: 0 };
  });
  statoGara.rosterB.forEach(g => { g.reti = 0; g.falli = []; g.chiave3Fallo = null; });
  statoGara.rosterN.forEach(g => { g.reti = 0; g.falli = []; g.chiave3Fallo = null; });

  statoGara.eventi.forEach((ev) => {
    const roster = ev.squadra === 'B' ? statoGara.rosterB : statoGara.rosterN;
    const giocatore = ev.calotta !== 'X' ? roster.find(p => p.num === parseInt(ev.calotta, 10)) : null;

    if (ev.sigla === 'GOL') {
      if (giocatore) giocatore.reti += 1;
      if (!statoGara.parziali[ev.tempo]) statoGara.parziali[ev.tempo] = { B: 0, N: 0 };
      if (ev.squadra === 'B') {
        statoGara.scoreB += 1;
        statoGara.parziali[ev.tempo].B += 1;
      } else {
        statoGara.scoreN += 1;
        statoGara.parziali[ev.tempo].N += 1;
      }
      ev.punteggio = `${statoGara.scoreB}-${statoGara.scoreN}`;
    } else {
      ev.punteggio = '';
      const isFallo = (ev.sigla === 'ET' || ev.sigla === 'TR' || ev.sigla === 'EDA' || ev.sigla === 'EDS' || ev.sigla === 'ED');
      if (isFallo && giocatore) {
        const tempoSigla = ev.tempo.charAt(0) + 'T';
        giocatore.falli.push(`${tempoSigla} ${ev.minuto} ${ev.sigla}`);
        // Espulsione definitiva immediata (EDA/EDS) o per raggiungimento del 3° fallo
        if (ev.sigla === 'EDA' || ev.sigla === 'EDS' || ev.sigla === 'ED' || giocatore.falli.length >= 3) {
          if (giocatore.chiave3Fallo == null) {
            giocatore.chiave3Fallo = chiaveCronologica(ev);
          }
        }
      }
    }
  });
}

// ==========================================
// REGISTRAZIONE EVENTI CENTRALIZZATA
// ==========================================
async function registraEventoStrutturato(datiEvento) {
  const { tempo, minuto, squadra, calotta, sigla } = datiEvento;
  const roster = squadra === 'B' ? statoGara.rosterB : statoGara.rosterN;
  const nomeSquadra = squadra === 'B' ? statoGara.sqBianca : statoGara.sqNera;

  const nuovoEvento = {
    id: nuovoIdEvento(),
    tempo: tempo || document.getElementById('tempoCorrente').value,
    minuto: normalizzaMinuto(minuto || document.getElementById('minutoInput').value),
    squadra,
    calotta: sigla === 'TO' ? 'X' : parseInt(calotta, 10),
    sigla,
    punteggio: ''
  };

  const giocatore = nuovoEvento.calotta !== 'X' ? roster.find(p => p.num === nuovoEvento.calotta) : null;
  if (giocatore && giocatore.chiave3Fallo != null && chiaveCronologica(nuovoEvento) >= giocatore.chiave3Fallo) {
    mostraAlertEspulsione(`Calottina ${squadra} N.${giocatore.num} (${nomeSquadra}) è GIÀ ESPULSO DEFINITIVAMENTE!`);
    return false;
  }

  const falliPrima = giocatore ? giocatore.falli.length : 0;

  statoGara.eventi.push(nuovoEvento);
  ricalcolaStatoDaEventi();
  aggiornaUI();
  await salvaStatoGara(statoGara);

  const descr = `${nuovoEvento.tempo.charAt(0)}T ${nuovoEvento.minuto} | ${nuovoEvento.squadra} #${nuovoEvento.calotta} | ${nuovoEvento.sigla}`;
  const feedbackEl = document.getElementById('feedbackQuery');
  if (feedbackEl) feedbackEl.textContent = `✔ Registrato: ${descr}`;

  // Segnale di alert per 3° fallo o per espulsione definitiva immediata (EDA / EDS)
  if (giocatore) {
    if (sigla === 'EDA' || sigla === 'EDS' || sigla === 'ED') {
      mostraAlertEspulsione(`Calottina ${squadra} N.${giocatore.num} (${nomeSquadra}) - ESPULSIONE DEFINITIVA (${sigla})!`);
    } else if (sigla === 'ET' || sigla === 'TR') {
      const falliDopo = giocatore.falli.length;
      if (falliPrima < 3 && falliDopo >= 3) {
        mostraAlertEspulsione(`Calottina ${squadra} N.${giocatore.num} (${nomeSquadra}) - 3° FALLO PERSONALE!`);
      }
    }
  }

  return true;
}

// ==========================================
// TASTIERINO ONE-TAP SUI GIOCATORI
// ==========================================
let giocatoreSelezionatoAzione = null;

function selezionaGiocatorePerAzione(squadra, num) {
  const roster = squadra === 'B' ? statoGara.rosterB : statoGara.rosterN;
  const g = roster.find(p => p.num === num);
  if (!g) return;

  if (giocatoreSelezionatoAzione && giocatoreSelezionatoAzione.squadra === squadra && giocatoreSelezionatoAzione.calotta === num) {
    chiudiQuickAction();
    return;
  }

  giocatoreSelezionatoAzione = { squadra, calotta: num, nome: g.nome };
  const bar = document.getElementById('quickActionBar');
  const target = document.getElementById('quickActionTarget');

  if (target) {
    target.textContent = `#${num} ${squadra === 'B' ? 'Bianca' : 'Nera'} (${g.nome}) - ${g.falli.length}/3 falli`;
  }
  aggiornaQuarterUI();
  const minQuick = document.getElementById('minutoQuickInput');
  const minMain = document.getElementById('minutoInput');
  if (minQuick && minMain) minQuick.value = minMain.value;
  if (bar) bar.style.display = 'block';

  document.querySelectorAll('.player-row').forEach(el => el.classList.remove('selected'));
  const rowEl = document.getElementById(`prow_${squadra}_${num}`);
  if (rowEl) rowEl.classList.add('selected');
}

function chiudiQuickAction() {
  giocatoreSelezionatoAzione = null;
  const bar = document.getElementById('quickActionBar');
  if (bar) bar.style.display = 'none';
  document.querySelectorAll('.player-row').forEach(el => el.classList.remove('selected'));
}

function leggiMinutoCorrenteValido(preferId = 'minutoInput') {
  const el = document.getElementById(preferId) || document.getElementById('minutoInput');
  const raw = el ? el.value : '';
  const sec = minutoInSecondi(raw);
  if (sec < 0) return null;
  const formatted = formattaTempo(sec);
  sincronizzaMinutoInputs(formatted);
  return formatted;
}

async function eseguiAzioneRapida(sigla) {
  if (!giocatoreSelezionatoAzione) return;
  const { squadra, calotta } = giocatoreSelezionatoAzione;
  const tempo = document.getElementById('tempoCorrente').value;
  const minuto = leggiMinutoCorrenteValido('minutoQuickInput');
  if (!minuto) {
    const feedbackEl = document.getElementById('feedbackQuery');
    if (feedbackEl) feedbackEl.textContent = '⚠️ Minuto non valido. Inserisci es. 5:45 o 545.';
    document.getElementById('minutoQuickInput')?.focus();
    return;
  }

  await registraEventoStrutturato({
    tempo,
    minuto,
    squadra,
    calotta,
    sigla
  });

  chiudiQuickAction();
}

async function registraTimeOutRapido(squadra) {
  const usati = statoGara.eventi.filter(ev => ev.squadra === squadra && ev.sigla === 'TO').length;
  const nomeSquadra = squadra === 'B' ? statoGara.sqBianca : statoGara.sqNera;
  if (usati >= 2 && !confirm(`${nomeSquadra} ha già registrato ${usati} Time Out. Vuoi registrarne un altro?`)) {
    return;
  }
  const tempo = document.getElementById('tempoCorrente').value;
  const preferId = statoGara.usaCronometro ? 'minutoInput' : 'minutoTabellone';
  const minuto = leggiMinutoCorrenteValido(preferId);
  if (!minuto) {
    const feedbackEl = document.getElementById('feedbackQuery');
    if (feedbackEl) feedbackEl.textContent = '⚠️ Minuto non valido per il Time Out.';
    return;
  }
  await registraEventoStrutturato({
    tempo,
    minuto,
    squadra,
    calotta: 'X',
    sigla: 'TO'
  });
}

// ==========================================
// UNDO RAPIDO ULTIMO EVENTO
// ==========================================
async function annullaUltimoEvento() {
  if (statoGara.eventi.length === 0) return;
  const rimosso = statoGara.eventi.pop();
  ricalcolaStatoDaEventi();
  aggiornaUI();
  await salvaStatoGara(statoGara);
  vibraDispositivo(100);

  const feedbackEl = document.getElementById('feedbackQuery');
  if (feedbackEl) {
    feedbackEl.textContent = `↩ Annullato: [${rimosso.tempo.slice(0, 2)}] ${rimosso.minuto} ${rimosso.squadra} #${rimosso.calotta} ${rimosso.sigla}`;
  }
}

async function processaComando() {
  const inputEl = document.getElementById('comandoInput');
  const feedbackEl = document.getElementById('feedbackQuery');
  const testo = inputEl.value;
  if (!testo) return;

  const parsed = parseComandoColloquiale(testo);
  feedbackEl.textContent = '';

  if (!parsed.squadra) {
    const d = paroleDistintiveSquadre();
    const suggB = ['bianca', ...d.B].join(' / ');
    const suggN = ['nera', ...d.N].join(' / ');
    feedbackEl.textContent = parsed.ambigua
      ? `Squadra ambigua: di' "bianca" oppure "nera".`
      : `Specifica la squadra (Bianca: ${suggB} — Nera: ${suggN}).`;
    return;
  }

  const roster = parsed.squadra === 'B' ? statoGara.rosterB : statoGara.rosterN;

  if (parsed.tipo === 'QUERY') {
    if (!parsed.calotta) {
      feedbackEl.textContent = 'Indica il numero di calotta (1-15).';
      return;
    }
    const g = roster.find(p => p.num === parsed.calotta);
    feedbackEl.textContent = `Calottina ${parsed.squadra} N.${g.num} (${g.nome}): ${g.falli.length}/3 falli (${g.falli.join(', ') || 'nessuno'}), ${g.reti} reti.`;
    inputEl.value = '';
    return;
  }

  if (!parsed.sigla) {
    feedbackEl.textContent = 'Evento non riconosciuto (usa: gol, espulsione, rigore, eda, eds, time out).';
    return;
  }
  if (parsed.sigla !== 'TO' && !parsed.calotta) {
    feedbackEl.textContent = 'Manca il numero di calotta (1-15).';
    return;
  }

  let minutoEvento = parsed.minuto;
  if (minutoEvento) {
    if (!statoGara.usaCronometro) sincronizzaMinutoInputs(minutoEvento);
  } else {
    minutoEvento = leggiMinutoCorrenteValido('minutoInput');
    if (!minutoEvento) {
      feedbackEl.textContent = '⚠️ Minuto non valido. Inserisci es. 5:45 oppure dillo nel comando.';
      return;
    }
  }

  const ok = await registraEventoStrutturato({
    tempo: document.getElementById('tempoCorrente').value,
    minuto: minutoEvento,
    squadra: parsed.squadra,
    calotta: parsed.calotta,
    sigla: parsed.sigla
  });

  if (ok) inputEl.value = '';
}

function apriEditModal(index) {
  const ev = statoGara.eventi[index];
  document.getElementById('editIndex').value = index;
  document.getElementById('editTempo').value = ev.tempo;
  document.getElementById('editMinuto').value = ev.minuto;
  document.getElementById('editSquadra').value = ev.squadra;
  document.getElementById('editCalotta').value = ev.calotta;
  document.getElementById('editSigla').value = ev.sigla;
  const errEl = document.getElementById('editError');
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
  document.getElementById('editModal').style.display = 'flex';
}

function chiudiEditModal() {
  document.getElementById('editModal').style.display = 'none';
}

function mostraErroreEdit(msg) {
  const errEl = document.getElementById('editError');
  if (errEl) {
    errEl.textContent = msg;
    errEl.style.display = 'block';
  } else {
    alert(msg);
  }
}

async function salvaModificaEvento() {
  const idx = parseInt(document.getElementById('editIndex').value, 10);
  const sigla = document.getElementById('editSigla').value;
  const tempo = document.getElementById('editTempo').value;
  const squadra = document.getElementById('editSquadra').value;
  const rawMinuto = document.getElementById('editMinuto').value;
  const sec = minutoInSecondi(rawMinuto);
  if (sec < 0) {
    mostraErroreEdit('Minuto non valido (usa es. 5:45 o 545).');
    return;
  }

  let calotta;
  if (sigla === 'TO') {
    calotta = 'X';
  } else {
    const rawCalotta = document.getElementById('editCalotta').value.trim();
    if (!/^\d{1,2}$/.test(rawCalotta)) {
      mostraErroreEdit('Inserisci un numero di calotta valido (1-15).');
      return;
    }
    calotta = parseInt(rawCalotta, 10);
    if (calotta < 1 || calotta > 15) {
      mostraErroreEdit('La calotta deve essere compresa tra 1 e 15.');
      return;
    }
  }

  const eventoModificato = {
    id: statoGara.eventi[idx].id,
    tempo,
    minuto: formattaTempo(sec),
    squadra,
    calotta,
    sigla,
    punteggio: ''
  };

  if (calotta !== 'X') {
    const altriEventi = statoGara.eventi
      .filter((_, i) => i !== idx)
      .sort((a, b) => (chiaveCronologica(a) - chiaveCronologica(b)) || ((a.id || 0) - (b.id || 0)));
    const chiaveEspulsioneAltro = calcolaChiave3FalloGiocatore(altriEventi, squadra, calotta);
    if (chiaveEspulsioneAltro != null && chiaveCronologica(eventoModificato) >= chiaveEspulsioneAltro) {
      mostraErroreEdit(`Calottina ${squadra} #${calotta} è già espulsa definitivamente prima o in questo istante.`);
      return;
    }
  }

  statoGara.eventi[idx] = eventoModificato;
  chiudiEditModal();
  ricalcolaStatoDaEventi();
  aggiornaUI();
  await salvaStatoGara(statoGara);
}

async function eliminaEvento(index) {
  if (!confirm('Eliminare questa riga dal referto? I punteggi e i falli verranno ricalcolati.')) return;
  statoGara.eventi.splice(index, 1);
  ricalcolaStatoDaEventi();
  aggiornaUI();
  await salvaStatoGara(statoGara);
}

// ==========================================
// 5. PROVVEDIMENTI PANCHINA & ALERT
// ==========================================
async function registraCartellinoAllenatore(squadra, tipoCartellino) {
  const tempo = document.getElementById('tempoCorrente').value;
  const tempoSigla = tempo.charAt(0) + 'T';
  const minuto = normalizzaMinuto(document.getElementById('minutoInput').value).replace(':', '.');
  const nomeSquadra = squadra === 'B' ? statoGara.sqBianca : statoGara.sqNera;
  const nomeAllenatore = squadra === 'B' ? statoGara.allBianca : statoGara.allNera;
  const dettaglioAll = nomeAllenatore ? ` (${nomeAllenatore})` : '';
  const azione = tipoCartellino === 'GIALLO' ? 'Giallo' : 'Rosso';
  const rigaNota = `${tempoSigla} ${minuto} ${azione} al Tecnico della squadra ${nomeSquadra}${dettaglioAll}`;

  const noteEl = document.getElementById('noteArbitrali');
  const testoAttuale = noteEl.value.trim();
  const nuovoTesto = testoAttuale ? `${testoAttuale}\n${rigaNota}` : rigaNota;

  noteEl.value = nuovoTesto;
  statoGara.noteArbitrali = nuovoTesto;

  await salvaStatoGara(statoGara);
}

function mostraAlertEspulsione(messaggio) {
  document.getElementById('alertText').textContent = messaggio;
  document.getElementById('alertModal').style.display = 'flex';
  vibraDispositivo([200, 100, 200, 100, 400]);
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {}
}

function chiudiAlert() {
  document.getElementById('alertModal').style.display = 'none';
}

// ==========================================
// 6. GESTIONE DISTINTE PRE-GARA & RUOLI
// ==========================================
let tabRosterAttivo = 'B';
let rosterSnapshot = null;

function apriRosterModal() {
  rosterSnapshot = {
    rosterB: structuredClone(statoGara.rosterB),
    rosterN: structuredClone(statoGara.rosterN)
  };
  document.getElementById('tabBtnB').textContent = `BIANCA (${statoGara.sqBianca})`;
  document.getElementById('tabBtnN').textContent = `NERA (${statoGara.sqNera})`;
  cambiaTabRoster(tabRosterAttivo);
  document.getElementById('rosterModal').style.display = 'block';
}

function chiudiRosterModal() {
  if (rosterSnapshot) {
    statoGara.rosterB = rosterSnapshot.rosterB;
    statoGara.rosterN = rosterSnapshot.rosterN;
    rosterSnapshot = null;
  }
  document.getElementById('rosterEditList').innerHTML = '';
  document.getElementById('rosterModal').style.display = 'none';
}

function cambiaTabRoster(squadra) {
  if (document.getElementById('rosterEditList').children.length > 0) {
    leggiCampiRosterCorrente();
  }
  tabRosterAttivo = squadra;
  document.getElementById('tabBtnB').classList.toggle('active', squadra === 'B');
  document.getElementById('tabBtnN').classList.toggle('active', squadra === 'N');
  document.getElementById('bulkRosterText').value = '';

  const roster = squadra === 'B' ? statoGara.rosterB : statoGara.rosterN;
  const container = document.getElementById('rosterEditList');

  container.innerHTML = roster.map(g => `
    <div class="roster-table-row">
      <div style="font-weight:bold; text-align:center;">#${g.num}</div>
      <input type="text" id="r_nome_${g.num}" value="${escapeHtml(g.nome)}" placeholder="Cognome Nome (es. con (Cap.))">
      <input type="text" id="r_tess_${g.num}" value="${escapeHtml(g.tessera || '')}" placeholder="Tessera FIN">
    </div>
  `).join('');
}

function leggiCampiRosterCorrente() {
  const roster = tabRosterAttivo === 'B' ? statoGara.rosterB : statoGara.rosterN;
  roster.forEach(g => {
    const inpNome = document.getElementById(`r_nome_${g.num}`);
    const inpTess = document.getElementById(`r_tess_${g.num}`);
    if (inpNome) g.nome = inpNome.value.trim() || `Giocatore ${tabRosterAttivo}${g.num}`;
    if (inpTess) g.tessera = inpTess.value.trim();
  });
}

function importaRosterDaTesto() {
  const raw = document.getElementById('bulkRosterText').value.trim();
  if (!raw) return;

  const righe = raw.split(/\r?\n/).filter(r => r.trim() !== '');
  righe.forEach((riga, idx) => {
    let numCalotta = idx + 1;
    const matchInizio = riga.match(/^(\d{1,2})[\.\-\)\s]+/);
    let pulita = riga;
    if (matchInizio) {
      const n = parseInt(matchInizio[1], 10);
      if (n >= 1 && n <= 15) {
        numCalotta = n;
        pulita = riga.slice(matchInizio[0].length).trim();
      } else {
        pulita = riga.replace(/^\d+[\.\-\)\s]+/, '').trim();
      }
    }
    const matchTessera = pulita.match(/\b(\d{5,8})\b/);
    const tessera = matchTessera ? matchTessera[1] : '';
    let nome = pulita.replace(tessera, '').replace(/[\-\|;,]+/g, ' ').replace(/\s+/g, ' ').trim();

    // Riconoscimento Capitano e Portiere (anche insieme sullo stesso giocatore)
    let isCap = false;
    let isPortiere = false;
    if (/(?:\(\s*c(?:ap\.?)?\s*\)|\b(?:cap|capitano)\b)/i.test(nome) && !nome.includes('(Cap.)')) {
      nome = nome.replace(/(?:\(\s*c(?:ap\.?)?\s*\)|\b(?:cap|capitano)\b\.?)/gi, '').trim();
      isCap = true;
    }
    if (/(?:\(\s*p\s*\)|\bportiere\b)/i.test(nome) && !nome.includes('(P)')) {
      nome = nome.replace(/(?:\(\s*p\s*\)|\bportiere\b\.?)/gi, '').trim();
      isPortiere = true;
    }
    nome = nome.replace(/\s+/g, ' ').trim();
    if (isCap) nome += ' (Cap.)';
    if (isPortiere) nome += ' (P)';

    const inpNome = document.getElementById(`r_nome_${numCalotta}`);
    const inpTess = document.getElementById(`r_tess_${numCalotta}`);
    if (inpNome && nome) inpNome.value = nome;
    if (inpTess && tessera) inpTess.value = tessera;
  });
}

async function salvaRostersManuali() {
  leggiCampiRosterCorrente();
  rosterSnapshot = null;
  aggiornaUI();
  await salvaStatoGara(statoGara);
  chiudiRosterModal();
}

// ==========================================
// 7. AGGIORNAMENTO DASHBOARD LIVE
// ==========================================
function calcolaRigoriSicuro(testoRigori) {
  if (!String(testoRigori || '').trim()) return null;
  try {
    const res = leggiTiriDiRigoreFIN(testoRigori);
    return res.tiri.length > 0 ? res : null;
  } catch (e) {
    return null;
  }
}

function aggiornaUI() {
  document.getElementById('lblBianca').textContent = statoGara.sqBianca;
  document.getElementById('lblNera').textContent = statoGara.sqNera;
  document.getElementById('scoreB').textContent = statoGara.scoreB;
  document.getElementById('scoreN').textContent = statoGara.scoreN;

  const rigoriInfo = calcolaRigoriSicuro(statoGara.tiriRigore);
  const rigoriBanner = document.getElementById('scoreboardRigori');
  if (rigoriBanner) {
    if (rigoriInfo) {
      const totB = statoGara.scoreB + rigoriInfo.punteggio.B;
      const totN = statoGara.scoreN + rigoriInfo.punteggio.N;
      rigoriBanner.textContent = `Rigori: B ${rigoriInfo.punteggio.B} - N ${rigoriInfo.punteggio.N} • Finale d.t.r.: ${totB} - ${totN}`;
      rigoriBanner.style.display = 'block';
    } else {
      rigoriBanner.style.display = 'none';
    }
  }

  const toB = statoGara.eventi.filter(ev => ev.squadra === 'B' && ev.sigla === 'TO').length;
  const toN = statoGara.eventi.filter(ev => ev.squadra === 'N' && ev.sigla === 'TO').length;
  const btnToB = document.getElementById('btnToB');
  const btnToN = document.getElementById('btnToN');
  if (btnToB) btnToB.textContent = `⏱ TO BIANCA (${toB}/2)`;
  if (btnToN) btnToN.textContent = `⏱ TO NERA (${toN}/2)`;

  const renderRoster = (lista, elId, squadra) => {
    const container = document.getElementById(elId);
    container.innerHTML = lista.map(g => {
      const fCount = g.falli.length;
      const isExpelled = g.chiave3Fallo != null;
      const dots = [1, 2, 3].map(n => {
        if (n <= fCount) return `<span class="dot ${isExpelled ? 'out' : 'active'}"></span>`;
        return `<span class="dot"></span>`;
      }).join('');
      const nomeBreve = g.nome.startsWith('Giocatore ') ? '' : g.nome.split(' ')[0];
      const isSelected = giocatoreSelezionatoAzione && giocatoreSelezionatoAzione.squadra === squadra && giocatoreSelezionatoAzione.calotta === g.num;
      
      return `
        <div class="player-row ${isSelected ? 'selected' : ''}" 
             id="prow_${squadra}_${g.num}"
             onclick="selezionaGiocatorePerAzione('${squadra}', ${g.num})">
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:115px;">
            <strong>#${g.num}</strong> ${escapeHtml(nomeBreve)} (${g.reti}G)
          </span>
          <div class="fouls">${dots}</div>
        </div>`;
    }).join('');
  };

  renderRoster(statoGara.rosterB, 'rosterB', 'B');
  renderRoster(statoGara.rosterN, 'rosterN', 'N');

  // Aggiorna pulsante Undo rapido
  const btnUndo = document.getElementById('btnUndo');
  const lblUndo = document.getElementById('lblUndoEvento');
  if (btnUndo && lblUndo) {
    if (statoGara.eventi.length > 0) {
      const u = statoGara.eventi[statoGara.eventi.length - 1];
      lblUndo.textContent = `[${u.tempo.slice(0, 2)}] ${u.minuto} ${u.squadra} #${u.calotta} ${u.sigla}`;
      btnUndo.style.display = 'block';
    } else {
      btnUndo.style.display = 'none';
    }
  }

  // Cronologia log
  const logBox = document.getElementById('logBox');
  logBox.innerHTML = statoGara.eventi
    .map((ev, realIdx) => ({ ev, realIdx }))
    .reverse()
    .map(({ ev, realIdx }) => `
      <div class="log-item">
        <span>[${escapeHtml(ev.tempo.slice(0, 2))}] ${escapeHtml(ev.minuto)} | <strong>${escapeHtml(ev.squadra)} #${escapeHtml(ev.calotta)}</strong> | ${escapeHtml(ev.sigla)} ${ev.punteggio ? `(${escapeHtml(ev.punteggio)})` : ''}</span>
        <div class="log-actions">
          <button type="button" class="btn-mini" onclick="apriEditModal(${realIdx})">Modifica</button>
          <button type="button" class="btn-mini danger" onclick="eliminaEvento(${realIdx})">X</button>
        </div>
      </div>`
    ).join('');
}

// ==========================================
// 8. TIRI DI RIGORE GUIDATI
// ==========================================
function aggiornaPunteggioRigoriAnteprima() {
  const textarea = document.getElementById('tiriRigore');
  const anteprima = document.getElementById('anteprimaPunteggioRigori');
  if (!textarea || !anteprima) return;
  const val = textarea.value;
  try {
    const { punteggio, tiri } = leggiTiriDiRigoreFIN(val);
    anteprima.textContent = `Rigori (${tiri.length} tirati): B ${punteggio.B} - N ${punteggio.N}`;
    anteprima.style.color = '#38bdf8';
  } catch (e) {
    anteprima.textContent = `Rigori: ${e.message.split(':')[0] || 'formato non valido'}`;
    anteprima.style.color = '#f87171';
  }
  aggiornaUI();
}

async function aggiungiTiroRigoreGuidato(esito) {
  const sq = document.getElementById('rigoreSquadra').value;
  const cal = parseInt(document.getElementById('rigoreCalotta').value, 10) || 1;
  const textarea = document.getElementById('tiriRigore');
  const riga = `${sq} ${cal} ${esito}`;
  const attuale = textarea.value.trim();
  textarea.value = attuale ? `${attuale}\n${riga}` : riga;
  statoGara.tiriRigore = textarea.value;
  aggiornaPunteggioRigoriAnteprima();
  await salvaStatoGara(statoGara);
  vibraDispositivo(50);

  // Alterna automaticamente squadra per il tiro successivo
  document.getElementById('rigoreSquadra').value = (sq === 'B' ? 'N' : 'B');
}

async function annullaUltimoTiroRigore() {
  const textarea = document.getElementById('tiriRigore');
  const righe = textarea.value.trim().split(/\r?\n/).filter(Boolean);
  if (righe.length === 0) return;
  righe.pop();
  textarea.value = righe.join('\n');
  statoGara.tiriRigore = textarea.value;
  aggiornaPunteggioRigoriAnteprima();
  await salvaStatoGara(statoGara);
}

// ==========================================
// 9. GENERAZIONE PDF OVERLAY FIN & STAMPA
// ==========================================
const WINANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');
const TRASLITTERAZIONI = { 'Đ': 'D', 'đ': 'd', 'Ł': 'L', 'ł': 'l', 'ı': 'i', 'Ħ': 'H', 'ħ': 'h', 'ŧ': 't', 'Ŧ': 'T' };

function carattereWinAnsi(ch) {
  const c = ch.codePointAt(0);
  return (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || ch === '\n' || WINANSI_EXTRA.has(ch);
}

function sanificaWinAnsi(testo) {
  return Array.from(String(testo ?? '')).map(ch => {
    if (carattereWinAnsi(ch)) return ch;
    if (TRASLITTERAZIONI[ch]) return TRASLITTERAZIONI[ch];
    const base = ch.normalize('NFD').replace(/\p{M}/gu, '');
    if (base && Array.from(base).every(carattereWinAnsi)) return base;
    return '?';
  }).join('');
}

function sanificaUnicode(testo) {
  return String(testo ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '')
    .replace(/\p{Extended_Pictographic}|\uFE0F/gu, '');
}

let fontTtfCache = null;

async function incorporaFontReferto(pdfDoc) {
  const { StandardFonts } = PDFLib;
  try {
    if (!window.fontkit) throw new Error('fontkit non caricato');
    if (!fontTtfCache) {
      const r = await fetch('./lib/NotoSans-Bold.ttf');
      if (!r.ok) throw new Error(`font HTTP ${r.status}`);
      fontTtfCache = await r.arrayBuffer();
    }
    pdfDoc.registerFontkit(window.fontkit);
    const font = await pdfDoc.embedFont(fontTtfCache, { subset: false });
    return { font, txt: (s) => sanificaUnicode(s) };
  } catch (e) {
    console.warn('Font TTF non disponibile, fallback a Helvetica:', e);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    return { font, txt: (s) => sanificaWinAnsi(sanificaUnicode(s)) };
  }
}

async function caricaTemplatePDF() {
  let response;
  try {
    response = await fetch('./modello_verbale_fin_2021.pdf');
  } catch (e) {
    throw new Error('Modello del verbale FIN non raggiungibile. Apri la v2 via HTTPS o localhost per preparare anche l’uso offline.');
  }
  if (!response.ok) {
    throw new Error('Modello del verbale FIN mancante. Ripristina modello_verbale_fin_2021.pdf nella cartella della v2.');
  }
  return response.arrayBuffer();
}

let ultimoPdf = null;
let esportazioneInCorso = false;

function mostraFeedbackExport(testo) {
  const el = document.getElementById('feedbackExport');
  if (el) el.textContent = testo || '';
}

function scaricaBlob(blobUrl, fileName) {
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function eAndroid() {
  return /Android/i.test(navigator.userAgent);
}

async function condividiPdf(file) {
  if (!(navigator.canShare && navigator.canShare({ files: [file] }))) return 'non-supportato';
  try {
    await navigator.share({ files: [file], title: file.name });
    return 'ok';
  } catch (e) {
    if (e.name === 'AbortError') return 'annullato';
    return 'serve-tocco';
  }
}

async function condividiUltimoPDF() {
  if (!ultimoPdf) return;
  const esito = await condividiPdf(ultimoPdf.file);
  if (esito === 'ok' || esito === 'annullato') {
    document.getElementById('btnCondividi').style.display = 'none';
    mostraFeedbackExport('');
  } else {
    mostraFeedbackExport('Condivisione non disponibile: apri il PDF da "Download" e usa Stampa.');
  }
}

function stampaViaIframe(blobUrl) {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  const rimuovi = () => { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); };
  iframe.onload = () => {
    try {
      iframe.contentWindow.addEventListener('afterprint', rimuovi, { once: true });
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      rimuovi();
    }
    setTimeout(rimuovi, 60000);
  };
  iframe.src = blobUrl;
  document.body.appendChild(iframe);
}

async function esportaEStampaPDF(stampaSubito = false) {
  if (esportazioneInCorso) return;
  esportazioneInCorso = true;
  mostraFeedbackExport('Preparazione verbale FIN…');
  document.getElementById('btnCondividi').style.display = 'none';

  try {
    const gara = structuredClone(statoGara);
    const versione = (gara.versioneExport || 0) + 1;
    const modello = await caricaTemplatePDF();
    const pdfBytes = await creaVerbaleFIN(gara, modello, incorporaFontReferto);

    statoGara.versioneExport = versione;
    await salvaStatoGara(statoGara);

    const dataArchivio = new Date(gara.dataOraInizio);
    const dataFile = (gara.dataGara || dataLocaleGara(dataArchivio)).replace(/-/g, '');
    const oraFile = gara.oraInizio || dataArchivio.toTimeString().slice(0, 5);
    const pulisci = s => String(s).normalize('NFD').replace(/[^a-zA-Z0-9]/g, '');
    const fileName = `${dataFile}_${pulisci(oraFile)}_${pulisci(gara.sqBianca)}_vs_${pulisci(gara.sqNera)}_${pulisci(gara.categoria)}_v${versione}.pdf`;

    const file = new File([pdfBytes], fileName, { type: 'application/pdf' });
    if (ultimoPdf) URL.revokeObjectURL(ultimoPdf.blobUrl);
    const blobUrl = URL.createObjectURL(file);
    ultimoPdf = { file, blobUrl, fileName };

    if (stampaSubito && !eAndroid()) {
      scaricaBlob(blobUrl, fileName);
      stampaViaIframe(blobUrl);
      mostraFeedbackExport(`PDF salvato: ${fileName}`);
    } else if (stampaSubito) {
      const esito = await condividiPdf(file);
      scaricaBlob(blobUrl, fileName);
      if (esito === 'serve-tocco') {
        document.getElementById('btnCondividi').style.display = 'block';
        mostraFeedbackExport('PDF pronto: tocca il pulsante viola per aprire Stampa / Condividi.');
      } else if (esito === 'non-supportato') {
        mostraFeedbackExport('PDF salvato in Download: aprilo e usa il menu ⋮ > Stampa.');
      } else {
        mostraFeedbackExport(`PDF salvato: ${fileName}`);
      }
    } else {
      scaricaBlob(blobUrl, fileName);
      mostraFeedbackExport(`✔ PDF salvato: ${fileName}`);
    }
  } catch (err) {
    console.error(err);
    mostraFeedbackExport(`❌ Errore generazione PDF: ${err.message || err}`);
  } finally {
    esportazioneInCorso = false;
  }
}

// ==========================================
// 10. ARCHIVIO STORICO & BACKUP JSON
// ==========================================
async function apriArchivioModal() {
  await salvaStatoGara(statoGara);
  const lista = await elencaPartiteArchiviate();
  const container = document.getElementById('archiveList');

  if (lista.length === 0) {
    container.innerHTML = '<p style="color:#94a3b8; text-align:center;">Nessuna partita salvata in archivio.</p>';
  } else {
    container.innerHTML = lista.map(p => {
      const isCorrente = (p.matchId === statoGara.matchId);
      const rigoriInfo = calcolaRigoriSicuro(p.tiriRigore);
      const rigoriTxt = rigoriInfo
        ? ` <span style="font-size:0.78rem; color:#94a3b8;">(d.t.r. ${p.scoreB + rigoriInfo.punteggio.B}-${p.scoreN + rigoriInfo.punteggio.N})</span>`
        : '';
      const dataFmt = new Date(p.dataOraInizio).toLocaleString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      return `
        <div class="archive-item ${isCorrente ? 'current' : ''}">
          <div style="font-size:0.85rem;">
            <div style="color:#94a3b8; font-size:0.75rem;">${escapeHtml(dataFmt)} • ${escapeHtml(p.categoria || 'Cat. N/D')} ${isCorrente ? '<strong>(IN USO)</strong>' : ''}</div>
            <div style="font-weight:bold; font-size:0.95rem; margin:2px 0;">
              ${escapeHtml(p.sqBianca)} <span style="color:#38bdf8;">${p.scoreB} - ${p.scoreN}</span>${rigoriTxt} ${escapeHtml(p.sqNera)}
            </div>
            <div style="color:#64748b; font-size:0.75rem;">Eventi: ${(p.eventi || []).length} • Export: v${p.versioneExport || 0}</div>
          </div>
          <div style="display:flex; flex-direction:column; gap:4px; flex-shrink:0;">
            ${!isCorrente ? `<button type="button" class="btn-mini success" onclick="caricaPartitaDaArchivio('${p.matchId}')">APRI</button>` : ''}
            <button type="button" class="btn-mini danger" onclick="cancellaDaArchivio('${p.matchId}')">ELIMINA</button>
          </div>
        </div>
      `;
    }).join('');
  }

  document.getElementById('archiveModal').style.display = 'block';
}

function chiudiArchivioModal() {
  document.getElementById('archiveModal').style.display = 'none';
}

async function caricaPartitaDaArchivio(matchId) {
  const partitaSelezionata = await caricaStatoGara(matchId);
  if (!partitaSelezionata) return;
  await salvaStatoGara(partitaSelezionata);
  location.reload();
}

async function cancellaDaArchivio(matchId) {
  if (!confirm('Eliminare definitivamente questa partita dallo storico?')) return;
  await eliminaPartitaArchiviata(matchId);
  if (matchId === statoGara.matchId) {
    const nuova = creaNuovaStrutturaGara();
    await salvaStatoGara(nuova);
    location.reload();
  } else {
    apriArchivioModal();
  }
}

async function nuovaPartita() {
  if (!confirm('La partita attuale resterà salvata nell\'Archivio. Vuoi avviare un nuovo referto vuoto?')) return;
  await salvaStatoGara(statoGara);
  const nuova = creaNuovaStrutturaGara();
  await salvaStatoGara(nuova);
  location.reload();
}

async function scaricaBackupArchivio() {
  await salvaStatoGara(statoGara);
  const tutti = await esportaTuttoBackup();
  const jsonStr = JSON.stringify(tutti, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const blobUrl = URL.createObjectURL(blob);
  const d = new Date();
  const dataFmt = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  scaricaBlob(blobUrl, `BACKUP_REFERTI_FIN_${dataFmt}.json`);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
}

async function importaBackupArchivioDaFile(inputEl) {
  const file = inputEl.files && inputEl.files[0];
  if (!file) return;
  try {
    const testo = await file.text();
    const gare = JSON.parse(testo);
    await importaTuttoBackup(gare);
    alert(`Backup ripristinato con successo (${gare.length} elementi).`);
    location.reload();
  } catch (e) {
    alert('Errore nel ripristino del backup: file non valido.');
  }
}
