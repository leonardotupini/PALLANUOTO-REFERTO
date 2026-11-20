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
    aiutoGiuria: '',
    medicoServizio: '',
    tempAcqua: '',
    tipoImpianto: 'coperto',
    tiriRigore: '',
    sqBianca: 'Roma Nuoto',
    sqNera: 'Olympic Roma',
    categoria: 'Ragazzi',
    impianto: '',
    allBianca: '',
    allNera: '',
    compilatore: '',
    arbitro1: '',
    arbitro2: '',
    segretario: '',
    cronometrista: '',
    noteArbitrali: '',
    usaCronometro: false,
    tempoCorrente: '1° TEMPO',
    durataQuarto: 480,
    limiteFalli: 3,
    checklistPreGara: { dae: false, medico: false, forzaPubblica: false, cronometri: false },
    cartellini: { allGialloB: false, allGialloN: false, allRossoB: false, allRossoN: false, sqGialloB: false, sqGialloN: false },
    challenge: { B: { usate: 0, esaurita: false }, N: { usate: 0, esaurita: false } },
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
  'allBianca', 'allNera', 'compilatore', 'arbitro1', 'arbitro2',
  'segretario', 'cronometrista', 'noteArbitrali',
  'numeroGara', 'dataGara', 'oraInizio', 'oraTermine', 'manifestazione',
  'giudiciPorta', 'cronometrista30', 'aiutoGiuria', 'medicoServizio',
  'tempAcqua', 'tipoImpianto', 'tiriRigore'
];

const ORDINE_TEMPI = ['1° TEMPO', '2° TEMPO', '3° TEMPO', '4° TEMPO'];

function getLimiteFalli() {
  return statoGara.limiteFalli === 5 ? 5 : 3;
}

function getDurataEspulsioneSec() {
  return statoGara.durataQuarto === 960 ? 36 : 18;
}

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
// WAKE LOCK (SCHERMO SEMPRE ACCESO OFFLINE)
// ==========================================
let wakeLockSentinel = null;
let wakeLockRichiesto = false;

function aggiornaBtnWakeLock() {
  const btn = document.getElementById('btnWakeLock');
  if (!btn) return;
  if (!('wakeLock' in navigator)) {
    btn.textContent = '🔆 SCHERMO ACCESO: N/D';
    btn.style.opacity = '0.6';
    return;
  }
  if (wakeLockRichiesto && wakeLockSentinel) {
    btn.textContent = '🔆 SCHERMO ACCESO: ON';
    btn.style.background = '#14532d';
    btn.style.borderColor = '#22c55e';
    btn.style.color = '#dcfce7';
  } else {
    btn.textContent = '🔆 SCHERMO ACCESO: OFF';
    btn.style.background = '#1e293b';
    btn.style.borderColor = '#475569';
    btn.style.color = '#cbd5e1';
  }
}

async function attivaWakeLockInterno() {
  if (!('wakeLock' in navigator)) return false;
  try {
    wakeLockSentinel = await navigator.wakeLock.request('screen');
    wakeLockSentinel.addEventListener('release', () => {
      wakeLockSentinel = null;
      aggiornaBtnWakeLock();
    });
    aggiornaBtnWakeLock();
    return true;
  } catch (e) {
    wakeLockSentinel = null;
    aggiornaBtnWakeLock();
    return false;
  }
}

async function toggleWakeLock() {
  if (!('wakeLock' in navigator)) {
    const fb = document.getElementById('feedbackQuery');
    if (fb) fb.textContent = 'Wake Lock non supportato da questo browser.';
    return;
  }
  if (wakeLockRichiesto) {
    wakeLockRichiesto = false;
    if (wakeLockSentinel) {
      try { await wakeLockSentinel.release(); } catch (e) {}
      wakeLockSentinel = null;
    }
    aggiornaBtnWakeLock();
  } else {
    wakeLockRichiesto = true;
    const ok = await attivaWakeLockInterno();
    if (!ok) wakeLockRichiesto = false;
    aggiornaBtnWakeLock();
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wakeLockRichiesto && !wakeLockSentinel) {
    attivaWakeLockInterno();
  }
});

// ==========================================
// INIZIALIZZAZIONE
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }

  // Popola datalist categorie FIN 2026/27
  const datalistCat = document.getElementById('listaCategorieFIN');
  if (datalistCat && typeof CATEGORIE_FIN_26_27 !== 'undefined') {
    datalistCat.innerHTML = CATEGORIE_FIN_26_27.map(c => `<option value="${escapeHtml(c.nome)}"></option>`).join('');
  }

  const salvata = await caricaStatoGara();
  if (salvata) {
    const base = creaNuovaStrutturaGara();
    statoGara = {
      ...base,
      ...salvata,
      checklistPreGara: { ...base.checklistPreGara, ...(salvata.checklistPreGara || {}) },
      cartellini: { ...base.cartellini, ...(salvata.cartellini || {}) },
      challenge: {
        B: { ...base.challenge.B, ...(salvata.challenge?.B || {}) },
        N: { ...base.challenge.N, ...(salvata.challenge?.N || {}) }
      }
    };
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
  if (![420, 480, 960].includes(Number(statoGara.durataQuarto))) {
    statoGara.durataQuarto = 480;
  } else {
    statoGara.durataQuarto = Number(statoGara.durataQuarto);
  }
  if (statoGara.limiteFalli !== 5 && statoGara.limiteFalli !== 3) {
    const profInit = typeof trovaProfiloCategoriaFIN === 'function' ? trovaProfiloCategoriaFIN(statoGara.categoria) : null;
    statoGara.limiteFalli = profInit ? profInit.limiteFalli : 3;
  }
  secondiRimanenti = statoGara.durataQuarto;

  const durataEl = document.getElementById('durataQuarto');
  if (durataEl) durataEl.value = String(statoGara.durataQuarto);
  const limiteEl = document.getElementById('limiteFalli');
  if (limiteEl) limiteEl.value = String(statoGara.limiteFalli);

  aggiornaChecklistUI();
  aggiornaChallengeUI();
  aggiornaStatoTemperatura();
  aggiornaInfoCategoriaUI();
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
  aggiornaBtnWakeLock();

  CAMPI_METADATI.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const evtName = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(evtName, async () => {
      let val = el.value;
      if (id === 'sqBianca') val = val.trim() || 'Bianca';
      if (id === 'sqNera') val = val.trim() || 'Nera';
      if (id === 'categoria') val = val.trim() || 'Ragazzi';
      statoGara[id] = val;
      if (id === 'sqBianca' || id === 'sqNera') aggiornaUI();
      if (id === 'tiriRigore') aggiornaPunteggioRigoriAnteprima();
      if (id === 'tempAcqua' || id === 'tipoImpianto') aggiornaStatoTemperatura();
      if (id === 'categoria') applicaProfiloCategoriaSeRiconosciuta(val);
      await salvaStatoGara(statoGara);
    });
  });

  verificaProntezzaOffline();
  window.addEventListener('online', () => aggiornaStatoOfflineUI());
  window.addEventListener('offline', () => aggiornaStatoOfflineUI());
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      verificaProntezzaOffline();
    });
  }
});

// ==========================================
// 0. VERIFICA PRONTEZZA OFFLINE
// ==========================================
const RISORSE_OFFLINE = [
  './index.html', './app.js', './db.js', './manifest.json',
  './lib/pdf-lib.min.js', './lib/fontkit.umd.min.js', './lib/NotoSans-Bold.ttf',
  './regolamento-fin.js', './verbale-fin.js', './modello_verbale_fin_2021.pdf'
];

let cacheOfflinePronta = false;

function aggiornaStatoOfflineUI() {
  const statoEl = document.getElementById('statoOffline');
  if (statoEl && cacheOfflinePronta) {
    statoEl.className = 'ok';
    statoEl.textContent = navigator.onLine === false
      ? '✈️ Connessione assente — Referto e PDF pronti offline.'
      : '✅ Inserimento rapido e PDF pronti anche offline.';
  }
}

async function verificaProntezzaOffline() {
  const el = document.getElementById('statoOffline');
  const imposta = (testo, classe) => {
    if (el) {
      el.textContent = testo;
      el.className = classe || '';
    }
  };

  if (!window.isSecureContext || location.protocol === 'file:') {
    cacheOfflinePronta = false;
    imposta('⚠️ Apri la v2 via HTTPS o localhost per usare l’app e stampare il verbale offline.', 'warn');
    return;
  }

  if (!('serviceWorker' in navigator) || !('caches' in window)) {
    cacheOfflinePronta = false;
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
      cacheOfflinePronta = true;
      aggiornaStatoOfflineUI();
    } else {
      cacheOfflinePronta = false;
      imposta(`⚠️ App non ancora pronta offline. Mancano in cache: ${mancanti.join(', ')}. Apri l'app con rete attiva e verifica che i file siano nella cartella.`, 'warn');
    }
  } catch (e) {
    cacheOfflinePronta = false;
    imposta('⚠️ Impossibile verificare la cache offline.', 'warn');
  }
}

// ==========================================
// 1. CRONOMETRO CON TIMESTAMP (NO DRIFT)
// ==========================================
let secondiRimanenti = 480;
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
  if (quickTempo) quickTempo.textContent = tempo.replace('TEMPO', 'QUARTO');
}

async function cambiaTempoCorrente(nuovoTempo) {
  if (!ORDINE_TEMPI.includes(nuovoTempo)) return;
  statoGara.tempoCorrente = nuovoTempo;
  aggiornaQuarterUI();
  if (statoGara.usaCronometro) {
    resetCronometro();
  } else {
    sincronizzaMinutoInputs(formattaTempo(statoGara.durataQuarto || 480));
  }
  await salvaStatoGara(statoGara);
}

function aggiornaEtichetteDurataET() {
  const dur = statoGara.durataQuarto || 480;
  const secET = getDurataEspulsioneSec();
  const lblDur = document.getElementById('lblDurataAttiva');
  if (lblDur) lblDur.textContent = formattaTempo(dur) + (dur === 960 ? ' (Fissi 16\')' : '');
  const btnQuickET = document.getElementById('btnQuickET');
  if (btnQuickET) btnQuickET.textContent = `${secET}" ET`;
  const btnAuxET = document.getElementById('btnAuxET');
  if (btnAuxET) btnAuxET.textContent = `${secET}" ET`;
}

function aggiornaInfoCategoriaUI() {
  const infoEl = document.getElementById('infoCategoriaFIN');
  const badgeAg = document.getElementById('badgeAiutoGiuria');
  const rosterInfo = document.getElementById('rosterInfoNOG');
  const prof = typeof trovaProfiloCategoriaFIN === 'function' ? trovaProfiloCategoriaFIN(statoGara.categoria) : null;
  const durFmt = formattaTempo(statoGara.durataQuarto || 480);
  const lim = getLimiteFalli();
  const secET = getDurataEspulsioneSec();

  if (prof) {
    const modoTempo = statoGara.durataQuarto === 960 ? 'fissi (Art. 16.6)' : (prof.tempoEffettivo ? 'effettivi' : 'continuati');
    const agTxt = prof.aiutoGiuria > 0 ? `${prof.aiutoGiuria} Aiuto Giuria (NOG 4.1.1)` : 'Nessun Aiuto Giuria obblig.';
    if (infoEl) {
      infoEl.textContent = `📋 ${prof.nome} (NOG 26/27): 4×${durFmt} ${modoTempo} • Max ${lim} falli • ${prof.possesso} • ${secET}" ET • ${agTxt}`;
    }
    if (badgeAg) {
      badgeAg.textContent = prof.aiutoGiuria > 0 ? `previsti: ${prof.aiutoGiuria}` : 'non richiesto';
    }
    if (rosterInfo) {
      rosterInfo.textContent = prof.gruppo === 'Assoluti'
        ? `Min. 7 giocatori (con portiere #1). ${prof.nome}: max ${prof.maxGiocatori} giocatori (portieri rossi #1 e #13 — NOG Art. 5.1 / 8).`
        : `Min. 7 giocatori (con portiere #1). ${prof.nome}: fino a ${prof.maxGiocatori} calotte (portieri rossi #1 e #13 — NOG Art. 5.1 / 8).`;
    }
  } else {
    if (infoEl) {
      infoEl.textContent = `📋 ${statoGara.categoria || 'Categoria personalizzata'} (FIN 26/27): 4×${durFmt} • Max ${lim} falli • 28"/18" • ${secET}" ET`;
    }
    if (badgeAg) badgeAg.textContent = 'verificare NOG 4.1.1';
  }
  aggiornaEtichetteDurataET();
}

function applicaProfiloCategoriaSeRiconosciuta(nomeCat) {
  const prof = typeof trovaProfiloCategoriaFIN === 'function' ? trovaProfiloCategoriaFIN(nomeCat) : null;
  if (prof) {
    const durataEl = document.getElementById('durataQuarto');
    const limiteEl = document.getElementById('limiteFalli');
    // Aggiorna automaticamente durata solo se non è in modalità tempi fissi 16' e non ci sono ancora eventi
    if (statoGara.durataQuarto !== 960 && statoGara.eventi.length === 0) {
      statoGara.durataQuarto = prof.durataQuarto;
      if (durataEl) durataEl.value = String(prof.durataQuarto);
      secondiRimanenti = prof.durataQuarto;
      if (statoGara.usaCronometro) resetCronometro();
      else sincronizzaMinutoInputs(formattaTempo(prof.durataQuarto));
    }
    statoGara.limiteFalli = prof.limiteFalli;
    if (limiteEl) limiteEl.value = String(prof.limiteFalli);
    ricalcolaStatoDaEventi();
    aggiornaUI();
  }
  aggiornaInfoCategoriaUI();
}

async function cambiaDurataQuarto() {
  const durataEl = document.getElementById('durataQuarto');
  const val = parseInt(durataEl?.value, 10);
  const durata = [420, 480, 960].includes(val) ? val : 480;
  statoGara.durataQuarto = durata;
  if (statoGara.usaCronometro) {
    resetCronometro();
  } else {
    secondiRimanenti = durata;
    sincronizzaMinutoInputs(formattaTempo(durata));
  }
  aggiornaInfoCategoriaUI();
  aggiornaUI();
  await salvaStatoGara(statoGara);
}

async function cambiaLimiteFalli() {
  const el = document.getElementById('limiteFalli');
  statoGara.limiteFalli = parseInt(el?.value, 10) === 5 ? 5 : 3;
  ricalcolaStatoDaEventi();
  aggiornaInfoCategoriaUI();
  aggiornaUI();
  aggiornaPunteggioRigoriAnteprima();
  await salvaStatoGara(statoGara);
}

// ==========================================
// 1B. TIMER AUSILIARI GIURIA (18" ET, 1' TO 45"+60", INTERVALLI)
// ==========================================
let auxTimerInterval = null;
let auxTimerEnd = null;
let auxTimerTipo = null;
let auxTimer45Suonato = false;

function suonaBipBreve(freq = 660, durataSec = 0.25) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durataSec);
  } catch (e) {}
}

function avviaTimerAusiliario(tipo) {
  fermaTimerAusiliario();
  const secET = getDurataEspulsioneSec();
  const config = {
    ET: { sec: secET, label: `ESPULSIONE TEMPORANEA (${secET}")` },
    TO: { sec: 60, label: 'TIME-OUT 1:00 (avviso a 45" — RTPN 5.6)' },
    INT2: { sec: 120, label: 'INTERVALLO TRA TEMPI (2:00 — NOG 16.2)' },
    INT5: { sec: 300, label: 'INTERVALLO METÀ GARA A1 (5:00 — NOG 16.2)' },
    RIG3: { sec: 180, label: 'PAUSA PRE-RIGORI (3:00 — App. 4 Art. 1.2.1)' }
  }[tipo];
  if (!config) return;

  const details = document.getElementById('detailsAuxTimers');
  if (details) details.open = true;

  auxTimerTipo = tipo;
  auxTimer45Suonato = false;
  auxTimerEnd = Date.now() + config.sec * 1000;

  const box = document.getElementById('auxTimerActive');
  const lbl = document.getElementById('auxTimerLabel');
  const val = document.getElementById('auxTimerVal');
  if (!box || !lbl || !val) return;

  box.className = 'aux-timer-active';
  box.style.display = 'flex';
  lbl.textContent = config.label;
  val.textContent = formattaTempo(config.sec);

  auxTimerInterval = setInterval(() => {
    const restanti = Math.max(0, Math.ceil((auxTimerEnd - Date.now()) / 1000));
    val.textContent = formattaTempo(restanti);

    // RTPN Art. 5.6.1 / 3.10.5.1: segnale a 45" dall'inizio del Time-Out (= 15" rimasti)
    if (auxTimerTipo === 'TO' && !auxTimer45Suonato && restanti <= 15 && restanti > 0) {
      auxTimer45Suonato = true;
      box.classList.add('warn45');
      lbl.textContent = '🔔 45" TRASCORSI — Giocatori liberi di posizionarsi!';
      vibraDispositivo([150, 80, 150]);
      suonaBipBreve(780, 0.35);
    }

    if (restanti <= 0) {
      clearInterval(auxTimerInterval);
      auxTimerInterval = null;
      box.classList.remove('warn45');
      box.classList.add('ended');
      lbl.textContent = `🔔 SCADUTO: ${config.label}`;
      vibraDispositivo([250, 100, 250, 100, 400]);
      suonaBipBreve(520, 0.7);
    }
  }, 200);
}

function fermaTimerAusiliario() {
  if (auxTimerInterval) {
    clearInterval(auxTimerInterval);
    auxTimerInterval = null;
  }
  auxTimerEnd = null;
  auxTimerTipo = null;
  auxTimer45Suonato = false;
  const box = document.getElementById('auxTimerActive');
  if (box) {
    box.style.display = 'none';
    box.className = 'aux-timer-active';
  }
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
  const durata = parseInt(document.getElementById('durataQuarto')?.value, 10) || statoGara.durataQuarto || 480;
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
  const maxSec = parseInt(document.getElementById('durataQuarto')?.value, 10) || statoGara.durataQuarto || 480;
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
const RE_EDA = reParola('eda|azione\\s+violent\\p{L}*|brutalit[aà]|violenz\\p{L}*|condotta\\s+violent\\p{L}*');
const RE_EDS = reParola('eds|cattiva\\s+condotta|misconduct|gioco\\s+aggressivo|scorrettezz\\p{L}*|protest\\p{L}*|antisportiv\\p{L}*');
const RE_ET = reParola('espuls\\p{L}*|esclus\\p{L}*|fuori|18\\s*(?:secondi|sec)|diciotto\\s+secondi|20\\s*(?:secondi|sec)|venti\\s+secondi|36\\s*(?:secondi|sec)|fallo\\s+grave|et');
const RE_TR = reParola('rigore|penalty|tr');
const RE_PANCHINA = reParola('panchina|allenatore|tecnico|dirigente');
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

const ORDINALI_ITALIANI = {
  primo: 1, prima: 1, secondo: 2, seconda: 2, terzo: 3, terza: 3, quarto: 4, quarta: 4,
  quinto: 5, quinta: 5, sesto: 6, sesta: 6, settimo: 7, settima: 7, ottavo: 8, ottava: 8
};

const NUMERI_SECONDI_BASE = {
  zero: 0, ...NUMERI_IN_LETTERE,
  sedici: 16, diciassette: 17, diciotto: 18, diciannove: 19
};

const DECINE_ITALIANE = { vent: 20, trent: 30, quarant: 40, cinquant: 50 };
const UNITA_ITALIANE = { uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9 };

function italianoInNumero(token) {
  const w = String(token || '').trim().toLowerCase();
  if (/^\d{1,2}$/.test(w)) return parseInt(w, 10);
  if (Object.prototype.hasOwnProperty.call(NUMERI_SECONDI_BASE, w)) return NUMERI_SECONDI_BASE[w];
  for (const [rad, dec] of Object.entries(DECINE_ITALIANE)) {
    if (w === `${rad}i` || w === `${rad}a`) return dec;
    if (w.startsWith(rad)) {
      const resto = w.slice(rad.length).replace(/^[ia](?!(?:uno|otto)$)/, '');
      if (Object.prototype.hasOwnProperty.call(UNITA_ITALIANE, resto)) {
        return dec + UNITA_ITALIANE[resto];
      }
    }
  }
  return null;
}

function estraiTempoDaSegmento(seg) {
  let tempo = null;
  const pulito = seg.replace(
    /(?<![\p{L}\p{N}])(primo|prima|secondo|seconda|terzo|terza|quarto|quarta|[1-4]\s*[°'’]?)\s+(?:tempo|quarto)(?![\p{L}\p{N}])/iu,
    (_, g1) => {
      const key = g1.trim().toLowerCase();
      const num = ORDINALI_ITALIANI[key] || parseInt(key, 10);
      if (num >= 1 && num <= 4) tempo = ORDINE_TEMPI[num - 1];
      return ' ';
    }
  );
  return { tempo, senzaTempo: pulito };
}

function estraiMinutoDaSegmento(seg) {
  let pulito = seg.replace(
    /(?<![\p{L}\p{N}])(primo|prima|secondo|seconda|terzo|terza|quarto|quarta|quinto|quinta|sesto|sesta|settimo|settima|ottavo|ottava)\s+(minut[oi])(?![\p{L}\p{N}])/giu,
    (_, ord, minWord) => `${ORDINALI_ITALIANI[ord.toLowerCase()]}° ${minWord}`
  );
  let minuto = null;

  const formattaMin = (mStr, sStr) => {
    const m = italianoInNumero(mStr);
    const s = sStr !== undefined ? italianoInNumero(sStr) : 0;
    if (m === null || s === null || m < 0 || m > 16 || s < 0 || s > 59 || (m === 16 && s > 0)) return null;
    return formattaTempo(m * 60 + s);
  };

  const rimuoviMatch = (match, parsed) => {
    minuto = parsed;
    pulito = `${pulito.slice(0, match.index)} ${pulito.slice(match.index + match[0].length)}`;
  };

  const p1 = pulito.match(/(?<![\p{L}\p{N}])(?:al\s+|a\s+)?minut[oi]\s+(\d{1,2}|zero)\s*(?:e|:|\.|,)\s*(\d{1,2}|[\p{L}]+)(?![\p{L}\p{N}])/iu);
  if (p1) {
    const parsed = formattaMin(p1[1], p1[2]);
    if (parsed) { rimuoviMatch(p1, parsed); return { minuto, senzaMinuti: pulito }; }
  }

  const p2 = pulito.match(/(?<![\p{L}\p{N}])(?:al\s+|a\s+)?(\d{1,2})\s*[°'’]?\s*minut[oi]\s*(?:e|:|\.|,|\s+)\s*(\d{1,2}|[\p{L}]+)(?![\p{L}\p{N}])/iu);
  if (p2) {
    const parsed = formattaMin(p2[1], p2[2]);
    if (parsed) { rimuoviMatch(p2, parsed); return { minuto, senzaMinuti: pulito }; }
  }

  const p3 = pulito.match(/(?<![\p{L}\p{N}])(\d{1,2})[:.](\d{2})(?![\p{L}\p{N}])/u);
  if (p3) {
    const parsed = formattaMin(p3[1], p3[2]);
    if (parsed) { rimuoviMatch(p3, parsed); return { minuto, senzaMinuti: pulito }; }
  }

  const p4 = pulito.match(/(?<![\p{L}\p{N}])(al\s+|a\s+)?(\d{1,2}|zero)\s+e\s+(\d{1,2}|[\p{L}]+)(?![\p{L}\p{N}])/iu);
  if (p4) {
    const secVal = italianoInNumero(p4[3]);
    const haPrefisso = Boolean(p4[1]);
    const formatoDueCifre = /^\d{2}$/.test(p4[3]);
    if (secVal !== null && (haPrefisso || secVal >= 16 || formatoDueCifre)) {
      const parsed = formattaMin(p4[2], p4[3]);
      if (parsed) { rimuoviMatch(p4, parsed); return { minuto, senzaMinuti: pulito }; }
    }
  }

  const p5 = pulito.match(/(?<![\p{L}\p{N}])(?:al\s+|a\s+)?(\d{1,2})\s*[°'’]?\s*minut[oi](?![\p{L}\p{N}])/iu);
  if (p5) {
    const parsed = formattaMin(p5[1]);
    if (parsed) { rimuoviMatch(p5, parsed); return { minuto, senzaMinuti: pulito }; }
  }

  const p6 = pulito.match(/(?<![\p{L}\p{N}])(?:al\s+)?minut[oi]\s+(\d{1,2}|zero)(?![\p{L}\p{N}])/iu);
  if (p6) {
    const parsed = formattaMin(p6[1]);
    if (parsed) { rimuoviMatch(p6, parsed); return { minuto, senzaMinuti: pulito }; }
  }

  return { minuto, senzaMinuti: pulito };
}

function estraiCampiSegmento(seg, distintive) {
  const campi = { squadra: null, calotta: null, sigla: null, minuto: null, tempo: null, query: false, ambigua: false, panchina: false };

  const { tempo, senzaTempo } = estraiTempoDaSegmento(seg);
  campi.tempo = tempo;

  const { minuto, senzaMinuti } = estraiMinutoDaSegmento(senzaTempo);
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
  if (RE_PANCHINA.test(senzaMinuti)) campi.panchina = true;

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

  const ris = { squadra: null, calotta: null, sigla: null, minuto: null, tempo: null, query: false, ambigua: false, panchina: false };
  segmenti.forEach(seg => {
    const c = estraiCampiSegmento(seg, distintive);
    if (c.squadra) { ris.squadra = c.squadra; ris.ambigua = false; }
    else if (c.ambigua && !ris.squadra) ris.ambigua = true;
    if (c.calotta) ris.calotta = c.calotta;
    if (c.sigla) ris.sigla = c.sigla;
    if (c.minuto) ris.minuto = c.minuto;
    if (c.tempo) ris.tempo = c.tempo;
    if (c.query) ris.query = true;
    if (c.panchina) ris.panchina = true;
  });

  if (ris.query) {
    return { tipo: 'QUERY', squadra: ris.squadra, calotta: ris.calotta, ambigua: ris.ambigua };
  }
  return { tipo: 'EVENTO', squadra: ris.squadra, calotta: ris.calotta, sigla: ris.sigla, minuto: ris.minuto, tempo: ris.tempo, ambigua: ris.ambigua, panchina: ris.panchina };
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
  if (/^\d{4}$/.test(s)) {
    const min = parseInt(s.slice(0, 2), 10);
    const sec = parseInt(s.slice(2), 10);
    return (min <= 16 && sec < 60 && (min < 16 || sec === 0)) ? min * 60 + sec : -1;
  }
  const m = s.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (!m) return -1;
  const min = parseInt(m[1], 10);
  const sec = m[2] ? parseInt(m[2], 10) : 0;
  if (min > 16 || sec > 59 || (min === 16 && sec > 0)) return -1;
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

// RTPN Art. 17.1: sia i falli da espulsione (ET/EDS/EDA) sia i falli da rigore (TR) di un giocatore sono falli personali.
function isSiglaFalloPersonale(sigla) {
  return sigla === 'ET' || sigla === 'TR' || sigla === 'EDA' || sigla === 'EDS' || sigla === 'ED';
}

function calcolaInfo3FalloGiocatore(eventi, squadra, calotta) {
  const targetNum = parseInt(calotta, 10);
  if (!Number.isFinite(targetNum)) return null;
  const limite = getLimiteFalli();
  let falli = 0;
  for (const ev of eventi) {
    if (ev.squadra !== squadra || parseInt(ev.calotta, 10) !== targetNum) continue;
    if (!isSiglaFalloPersonale(ev.sigla)) continue;
    falli += 1;
    if (ev.sigla === 'EDA' || ev.sigla === 'EDS' || ev.sigla === 'ED' || falli >= limite) {
      return { chiave: chiaveCronologica(ev), id: ev.id || 0 };
    }
  }
  return null;
}

function eDopoEspulsioneDefinitiva(evento, infoEspulsione) {
  if (!infoEspulsione) return false;
  const chiaveEv = chiaveCronologica(evento);
  if (chiaveEv > infoEspulsione.chiave) return true;
  if (chiaveEv < infoEspulsione.chiave) return false;
  if (isSiglaFalloPersonale(evento.sigla)) return true;
  return (evento.id || 0) >= (infoEspulsione.id || 0);
}

function trovaConflittoEspulsione(eventiOrdinati, squadra, calotta) {
  const targetNum = parseInt(calotta, 10);
  if (!Number.isFinite(targetNum)) return null;
  const limite = getLimiteFalli();
  let falli = 0;
  let espulsione = null;
  for (const ev of eventiOrdinati) {
    if (ev.squadra !== squadra || parseInt(ev.calotta, 10) !== targetNum) continue;
    if (espulsione) {
      return { espulsione, conflitto: ev };
    }
    if (isSiglaFalloPersonale(ev.sigla)) {
      falli += 1;
      if (ev.sigla === 'EDA' || ev.sigla === 'EDS' || ev.sigla === 'ED' || falli >= limite) {
        espulsione = ev;
      }
    }
  }
  return null;
}

function trovaIndiceUltimoEventoInserito() {
  if (statoGara.eventi.length === 0) return -1;
  let bestIdx = 0;
  let bestId = statoGara.eventi[0].id || 0;
  for (let i = 1; i < statoGara.eventi.length; i += 1) {
    const curId = statoGara.eventi[i].id || 0;
    if (curId >= bestId) {
      bestId = curId;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function ricalcolaStatoDaEventi() {
  ordinaEventiCronologicamente();
  const limite = getLimiteFalli();

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
      if (isSiglaFalloPersonale(ev.sigla) && giocatore) {
        const tempoSigla = ev.tempo.charAt(0) + 'T';
        giocatore.falli.push(`${tempoSigla} ${ev.minuto} ${ev.sigla}`);
        // Espulsione definitiva immediata (EDA/EDS) o per raggiungimento del limite falli (3 o 5 Esordienti)
        if (ev.sigla === 'EDA' || ev.sigla === 'EDS' || ev.sigla === 'ED' || giocatore.falli.length >= limite) {
          if (giocatore.chiave3Fallo == null) {
            giocatore.chiave3Fallo = { chiave: chiaveCronologica(ev), id: ev.id || 0 };
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
  const limite = getLimiteFalli();
  const secET = getDurataEspulsioneSec();

  const calottaNorm = (sigla === 'TO' || (sigla === 'TR' && calotta === 'X'))
    ? 'X'
    : parseInt(calotta, 10);

  const nuovoEvento = {
    id: nuovoIdEvento(),
    tempo: tempo || document.getElementById('tempoCorrente').value,
    minuto: normalizzaMinuto(minuto || document.getElementById('minutoInput').value),
    squadra,
    calotta: calottaNorm,
    sigla,
    punteggio: ''
  };

  const giocatore = nuovoEvento.calotta !== 'X' ? roster.find(p => p.num === nuovoEvento.calotta) : null;
  if (giocatore && eDopoEspulsioneDefinitiva(nuovoEvento, giocatore.chiave3Fallo)) {
    mostraAlertEspulsione(
      `Calottina ${squadra} N.${giocatore.num} (${nomeSquadra}) è GIÀ ESPULSO DEFINITIVAMENTE!`,
      'Non è consentito registrare ulteriori eventi per questo giocatore dopo l\'espulsione definitiva.',
      'GIOCATORE GIÀ ESPULSO!'
    );
    return false;
  }

  const falliPrima = giocatore ? giocatore.falli.length : 0;

  statoGara.eventi.push(nuovoEvento);
  ricalcolaStatoDaEventi();
  aggiornaUI();
  aggiornaPunteggioRigoriAnteprima();
  await salvaStatoGara(statoGara);

  const descr = `${nuovoEvento.tempo.charAt(0)}T ${nuovoEvento.minuto} | ${nuovoEvento.squadra} #${nuovoEvento.calotta} | ${nuovoEvento.sigla}`;
  const feedbackEl = document.getElementById('feedbackQuery');
  if (feedbackEl) feedbackEl.textContent = `✔ Registrato: ${descr}`;

  // Controllo numero minimo 2 giocatori disponibili durante la gara (RTPN Art. 2.3.6)
  const compilati = roster.filter(p => !/^Giocatore\s+[BN]\d+$/i.test(p.nome || ''));
  let extraAvvisoMin = '';
  if (compilati.length >= 2) {
    const disponibili = compilati.filter(p => p.chiave3Fallo == null).length;
    if (disponibili < 2) {
      extraAvvisoMin = ` ⚠️ ATTENZIONE (RTPN Art. 2.3.6): ${nomeSquadra} è scesa a meno di 2 giocatori disponibili → sospensione definitiva (0-5)!`;
    }
  }

  // Segnale di alert per limite falli (3° o 5° Esordienti) o espulsione definitiva immediata (EDA / EDS)
  if (giocatore) {
    if (sigla === 'EDA') {
      const scad = typeof calcolaScadenzaEDA === 'function'
        ? calcolaScadenzaEDA(nuovoEvento.tempo, minutoInSecondi(nuovoEvento.minuto), statoGara.durataQuarto)
        : null;
      const bandColore = squadra === 'B' ? 'BIANCA' : 'BLU';
      const scadTxt = scad ? `Rientro sostituto (4' eff.): ${scad.testo}` : 'Rientro sostituto dopo 4\' effettivi';
      mostraAlertEspulsione(
        `Calottina ${squadra} N.${giocatore.num} (${nomeSquadra}) — AZIONE VIOLENTA (EDA)`,
        `Cartellino ROSSO: il giocatore deve abbandonare il piano vasca (spogliatoi). ${scadTxt} — esporre bandierina GIALLA + ${bandColore} (RTPN Art. 3.11.2.3.2). Se commessa in gioco: assegnare TIRO DI RIGORE (Art. 10.8.2.1).${extraAvvisoMin}`,
        'AZIONE VIOLENTA — EDA (4\')!'
      );
    } else if (sigla === 'EDS' || sigla === 'ED') {
      mostraAlertEspulsione(
        `Calottina ${squadra} N.${giocatore.num} (${nomeSquadra}) — ESPULSIONE DEFINITIVA (${sigla})`,
        `Cartellino ROSSO (Cattiva Condotta / Art. 10.6-10.7): il giocatore deve abbandonare il piano vasca (spogliatoi). Sostituto entra dopo ${secET}"/gol/cambio possesso (o subito se in pausa di gioco).${extraAvvisoMin}`,
        `ESPULSIONE DEFINITIVA (${sigla})!`
      );
    } else if (sigla === 'TR' || sigla === 'ET') {
      const falliDopo = giocatore.falli.length;
      if (falliPrima < limite && falliDopo >= limite) {
        const rientroTxt = sigla === 'TR'
          ? `Essendo il ${limite}° fallo un FALLO DA RIGORE (TR), il sostituto può entrare IMMEDIATAMENTE (RTPN Art. 17.4.1)!`
          : `Il sostituto può entrare dopo ${secET}"/gol/cambio possesso (RTPN Art. 17.4.2).`;
        mostraAlertEspulsione(
          `Calottina ${squadra} N.${giocatore.num} (${nomeSquadra}) — ${limite}° FALLO PERSONALE (${sigla})!`,
          `Alzare BANDIERINA ROSSA (Art. 17.3). Il giocatore abbandona la panchina verso l'area riservata (NOG Art. 18). ${rientroTxt}${extraAvvisoMin}`,
          `${limite}° FALLO PERSONALE!`
        );
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
    target.textContent = `#${num} ${squadra === 'B' ? 'Bianca' : 'Nera'} (${g.nome}) - ${g.falli.length}/${getLimiteFalli()} falli`;
  }
  aggiornaQuarterUI();
  aggiornaEtichetteDurataET();
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

async function registraRigorePanchina(squadra) {
  const nomeSquadra = squadra === 'B' ? statoGara.sqBianca : statoGara.sqNera;
  if (!confirm(`Registrare TIRO DI RIGORE contro la panchina di ${nomeSquadra} (calotta X, NESSUN fallo personale — RTPN Art. 11.1.5 / 11.1.6.3)?`)) {
    return;
  }
  const tempo = document.getElementById('tempoCorrente').value;
  const preferId = statoGara.usaCronometro ? 'minutoInput' : 'minutoTabellone';
  const minuto = leggiMinutoCorrenteValido(preferId);
  if (!minuto) {
    const feedbackEl = document.getElementById('feedbackQuery');
    if (feedbackEl) feedbackEl.textContent = '⚠️ Minuto non valido per il Rigore da panchina.';
    return;
  }
  const ok = await registraEventoStrutturato({
    tempo,
    minuto,
    squadra,
    calotta: 'X',
    sigla: 'TR'
  });
  if (ok) {
    const rigaNota = `${tempo.charAt(0)}T ${minuto.replace(':', '.')} TR contro panchina ${nomeSquadra} (nessun fallo personale — RTPN Art. 11.1.5/11.1.6.3)`;
    appendiNotaArbitrale(rigaNota);
    await salvaStatoGara(statoGara);
  }
}

async function registraTimeOutRapido(squadra) {
  const usati = statoGara.eventi.filter(ev => ev.squadra === squadra && ev.sigla === 'TO').length;
  const nomeSquadra = squadra === 'B' ? statoGara.sqBianca : statoGara.sqNera;
  if (usati >= 2 && !confirm(`${nomeSquadra} ha già registrato ${usati}/2 Time Out (RTPN Art. 5.1 / 5.8.2). Vuoi registrarne comunque un altro?`)) {
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
  const ok = await registraEventoStrutturato({
    tempo,
    minuto,
    squadra,
    calotta: 'X',
    sigla: 'TO'
  });
  if (ok) {
    avviaTimerAusiliario('TO');
  }
}

// ==========================================
// UNDO RAPIDO ULTIMO EVENTO
// ==========================================
async function annullaUltimoEvento() {
  const idx = trovaIndiceUltimoEventoInserito();
  if (idx < 0) return;
  const [rimosso] = statoGara.eventi.splice(idx, 1);
  ricalcolaStatoDaEventi();
  aggiornaUI();
  aggiornaPunteggioRigoriAnteprima();
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
    feedbackEl.textContent = `Calottina ${parsed.squadra} N.${g.num} (${g.nome}): ${g.falli.length}/${getLimiteFalli()} falli (${g.falli.join(', ') || 'nessuno'}), ${g.reti} reti.`;
    inputEl.value = '';
    return;
  }

  if (!parsed.sigla) {
    feedbackEl.textContent = 'Evento non riconosciuto (usa: gol, espulsione/18s, rigore, eda/azione violenta, eds/cattiva condotta, time out).';
    return;
  }

  let calottaFinale = parsed.calotta;
  if (parsed.sigla === 'TR' && !calottaFinale && parsed.panchina) {
    calottaFinale = 'X';
  }
  if (parsed.sigla !== 'TO' && !calottaFinale) {
    feedbackEl.textContent = 'Manca il numero di calotta (1-15) oppure "panchina" per rigore da panchina.';
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
    tempo: parsed.tempo || document.getElementById('tempoCorrente').value,
    minuto: minutoEvento,
    squadra: parsed.squadra,
    calotta: calottaFinale,
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
  const rawCalotta = document.getElementById('editCalotta').value.trim().toUpperCase();
  if (sigla === 'TO' || (sigla === 'TR' && rawCalotta === 'X')) {
    calotta = 'X';
  } else {
    if (!/^\d{1,2}$/.test(rawCalotta)) {
      mostraErroreEdit('Inserisci un numero di calotta valido (1-15, oppure X per TR da panchina).');
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
    const eventiSimulati = statoGara.eventi
      .map((ev, i) => (i === idx ? eventoModificato : ev))
      .sort((a, b) => (chiaveCronologica(a) - chiaveCronologica(b)) || ((a.id || 0) - (b.id || 0)));
    const esito = trovaConflittoEspulsione(eventiSimulati, squadra, calotta);
    if (esito) {
      const espDescr = `${esito.espulsione.tempo.charAt(0)}T ${esito.espulsione.minuto} ${esito.espulsione.sigla}`;
      const confDescr = `${esito.conflitto.tempo.charAt(0)}T ${esito.conflitto.minuto} ${esito.conflitto.sigla}`;
      mostraErroreEdit(`Conflitto espulsione per ${squadra} #${calotta}: risulta «${confDescr}» dopo l'espulsione definitiva (${espDescr}).`);
      return;
    }
  }

  statoGara.eventi[idx] = eventoModificato;
  chiudiEditModal();
  ricalcolaStatoDaEventi();
  aggiornaUI();
  aggiornaPunteggioRigoriAnteprima();
  await salvaStatoGara(statoGara);
}

async function eliminaEvento(index) {
  if (!confirm('Eliminare questa riga dal referto? I punteggi e i falli verranno ricalcolati.')) return;
  statoGara.eventi.splice(index, 1);
  ricalcolaStatoDaEventi();
  aggiornaUI();
  aggiornaPunteggioRigoriAnteprima();
  await salvaStatoGara(statoGara);
}

// ==========================================
// 5. PROVVEDIMENTI PANCHINA, CONTROLLI NOG 26/27 & ALERT
// ==========================================
function appendiNotaArbitrale(rigaNota) {
  const noteEl = document.getElementById('noteArbitrali');
  const testoAttuale = (noteEl ? noteEl.value : statoGara.noteArbitrali || '').trim();
  const nuovoTesto = testoAttuale ? `${testoAttuale}\n${rigaNota}` : rigaNota;
  if (noteEl) noteEl.value = nuovoTesto;
  statoGara.noteArbitrali = nuovoTesto;
}

function leggiMinutoNotaArbitrale() {
  const preferId = statoGara.usaCronometro ? 'minutoInput' : 'minutoTabellone';
  const valido = leggiMinutoCorrenteValido(preferId);
  if (valido) return valido.replace(':', '.');
  const fallback = normalizzaMinuto(document.getElementById('minutoInput')?.value || '');
  return (fallback || formattaTempo(secondiRimanenti)).replace(':', '.');
}

async function registraCartellinoPanchina(squadra, tipoCartellino, destinatario = 'ALL') {
  const tempo = document.getElementById('tempoCorrente').value;
  const tempoSigla = tempo.charAt(0) + 'T';
  const minuto = leggiMinutoNotaArbitrale();
  const nomeSquadra = squadra === 'B' ? statoGara.sqBianca : statoGara.sqNera;
  const nomeAllenatore = squadra === 'B' ? statoGara.allBianca : statoGara.allNera;
  const dettaglioAll = nomeAllenatore ? ` (${nomeAllenatore})` : '';
  const feedbackEl = document.getElementById('feedbackQuery');

  let tipoEff = tipoCartellino;
  if (destinatario === 'ALL' && tipoEff === 'GIALLO') {
    const giaAmmonito = squadra === 'B' ? statoGara.cartellini?.allGialloB : statoGara.cartellini?.allGialloN;
    if (giaAmmonito) {
      if (confirm(`L'allenatore di ${nomeSquadra} ha già ricevuto un cartellino GIALLO: ai sensi dell'Art. 18.3.3.1 RTPN il secondo provvedimento comporta il cartellino ROSSO.\n\nPremi OK per registrare il ROSSO all'Allenatore (o Annulla per registrare comunque Giallo).`)) {
        tipoEff = 'ROSSO';
      }
    }
  }

  let rigaNota = '';
  if (destinatario === 'ALL') {
    const azione = tipoEff === 'GIALLO' ? 'Cartellino Giallo' : 'Cartellino Rosso (espulsione)';
    rigaNota = `${tempoSigla} ${minuto} ${azione} all'Allenatore ${nomeSquadra}${dettaglioAll} (RTPN Art. 18)`;
    if (squadra === 'B') {
      if (tipoEff === 'GIALLO') statoGara.cartellini.allGialloB = true;
      else statoGara.cartellini.allRossoB = true;
    } else {
      if (tipoEff === 'GIALLO') statoGara.cartellini.allGialloN = true;
      else statoGara.cartellini.allRossoN = true;
    }
    if (tipoEff === 'ROSSO' && feedbackEl) {
      feedbackEl.textContent = `🟥 Rosso Allenatore ${nomeSquadra}: lascia il piano vasca. Eventuale 2° allenatore SIT subentra (soggetto direttamente a Rosso — RTPN Art. 18.3.7).`;
    }
  } else if (destinatario === 'SQ') {
    rigaNota = `${tempoSigla} ${minuto} Cartellino Giallo all'intera squadra ${nomeSquadra} — ammonizione collettiva (RTPN Art. 18.2.4 / 18.4)`;
    if (squadra === 'B') statoGara.cartellini.sqGialloB = true;
    else statoGara.cartellini.sqGialloN = true;
    if (feedbackEl) {
      feedbackEl.textContent = `🟨 Ammonizione collettiva squadra ${nomeSquadra}: ulteriori recidive di qualsiasi giocatore comportano Cartellino Rosso (Art. 18.4.3).`;
    }
  } else {
    const dettaglioDir = prompt(`Qualifica / nome del dirigente, vice-allenatore o staff sanitario di ${nomeSquadra} espulso con Rosso (Art. 18.3.4 / NOG Art. 7):`, 'Dirigente / Vice-Allenatore');
    if (dettaglioDir === null) return;
    const ruolo = dettaglioDir.trim() || 'Dirigente / Staff';
    rigaNota = `${tempoSigla} ${minuto} Cartellino Rosso diretto a ${ruolo} squadra ${nomeSquadra} (RTPN Art. 18.3.4 — lascia piano vasca)`;
    if (feedbackEl) {
      feedbackEl.textContent = `🟥 Rosso diretto a ${ruolo} (${nomeSquadra}): deve abbandonare panchina e piano vasca.`;
    }
  }

  appendiNotaArbitrale(rigaNota);
  aggiornaUI();
  await salvaStatoGara(statoGara);
}

// Alias retrocompatibile
async function registraCartellinoAllenatore(squadra, tipoCartellino) {
  return registraCartellinoPanchina(squadra, tipoCartellino, 'ALL');
}

function aggiornaStatoTemperatura() {
  const el = document.getElementById('tempAcquaStatus');
  if (!el) return;
  if (typeof verificaTemperaturaAcquaFIN !== 'function' || !String(statoGara.tempAcqua || '').trim()) {
    el.innerHTML = '';
    return;
  }
  const esito = verificaTemperaturaAcquaFIN(statoGara.tempAcqua, statoGara.tipoImpianto);
  if (!esito) {
    el.innerHTML = '<span class="status-pill warn">Inserisci un valore numerico (es. 27.0)</span>';
    return;
  }
  el.innerHTML = `<span class="status-pill ${esito.ok ? 'ok' : 'err'}">${escapeHtml(esito.messaggio)}</span>`;
}

function aggiornaChecklistUI() {
  const c = statoGara.checklistPreGara || {};
  const map = {
    chkDae: Boolean(c.dae),
    chkMedico: Boolean(c.medico),
    chkForzaPubblica: Boolean(c.forzaPubblica),
    chkCronometri: Boolean(c.cronometri)
  };
  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.checked = val;
  });
}

async function salvaChecklistPreGara() {
  statoGara.checklistPreGara = {
    dae: Boolean(document.getElementById('chkDae')?.checked),
    medico: Boolean(document.getElementById('chkMedico')?.checked),
    forzaPubblica: Boolean(document.getElementById('chkForzaPubblica')?.checked),
    cronometri: Boolean(document.getElementById('chkCronometri')?.checked)
  };
  await salvaStatoGara(statoGara);
}

function aggiornaChallengeUI() {
  ['B', 'N'].forEach(sq => {
    const ch = statoGara.challenge?.[sq] || { usate: 0, esaurita: false };
    const el = document.getElementById(`lblChallenge${sq}`);
    if (!el) return;
    if (ch.esaurita || ch.usate >= 2) {
      el.textContent = `Esaurita (${ch.usate}/2)`;
      el.style.color = '#f87171';
    } else {
      el.textContent = `Disponibile (${ch.usate}/2)`;
      el.style.color = '#86efac';
    }
  });
}

async function registraChallenge(squadra, esito) {
  const ch = statoGara.challenge[squadra] || { usate: 0, esaurita: false };
  const nomeSq = squadra === 'B' ? statoGara.sqBianca : statoGara.sqNera;
  if (ch.esaurita || ch.usate >= 2) {
    alert(`${nomeSq} ha già esaurito le Coach's Challenge consentite (RTPN App. 6 Art. 1.5.8-1.5.9). Una richiesta non consentita comporta cartellino giallo all'allenatore (Art. 1.3.3).`);
    return;
  }
  ch.usate += 1;
  if (esito === 'RESPINTA' || ch.usate >= 2) {
    ch.esaurita = true;
  }
  statoGara.challenge[squadra] = ch;
  const tempo = document.getElementById('tempoCorrente').value;
  const minuto = leggiMinutoNotaArbitrale();
  const statoRes = esito === 'ACCOLTA'
    ? (ch.usate < 2 ? 'ACCOLTA (conserva 1 ulteriore richiesta)' : 'ACCOLTA (raggiunto limite 2/2)')
    : 'RESPINTA (esaurita)';
  appendiNotaArbitrale(`${tempo.charAt(0)}T ${minuto} Coach's Challenge ${nomeSq}: ${statoRes} (RTPN App. 6)`);
  aggiornaChallengeUI();
  await salvaStatoGara(statoGara);
}

async function aggiungiNotaRapidaFIN(codice) {
  const tempo = document.getElementById('tempoCorrente').value;
  const tempoSigla = tempo.charAt(0) + 'T';
  const minuto = leggiMinutoNotaArbitrale();
  const map = {
    AIUTO_ASSENTE: 'Pre-gara: Assenza di 1 unità Aiuto Giuria della Società ospitante (NOG Art. 4.1.1).',
    FP_ASSENTE: 'Pre-gara: Mancata o tardiva esibizione richiesta Forza Pubblica ≥3 gg (NOG Art. 11).',
    CARENZA_28: 'Pre-gara: Carenza dotazioni tecniche campo gara — 28"/18", tabellone o TO (NOG Art. 4.3).',
    RECLAMO: `${tempoSigla} ${minuto} Presentato preavviso di reclamo con versamento tassa € 70,00 (NOG Art. 24.1).`,
    RINUNCIA_TR: `${tempoSigla} ${minuto} Ultimo minuto: allenatore rinuncia al tiro di rigore e opta per tiro libero a metà campo con 28" (RTPN Art. 16.9).`,
    CAMBIO_CALOTTA: `${tempoSigla} ${minuto} Autorizzato cambio numero di calottina da parte dell'Arbitro con notifica al Segretario (NOG Art. 8).`
  };
  const testo = map[codice];
  if (!testo) return;
  appendiNotaArbitrale(testo);
  const fb = document.getElementById('feedbackQuery');
  if (fb) fb.textContent = `📝 Annotazione aggiunta alle Note arbitrali.`;
  await salvaStatoGara(statoGara);
}

function mostraAlertEspulsione(messaggio, dettaglio = 'Giocatore escluso definitivamente dal gioco. Alzare bandierina rossa!', titolo = 'ESPULSIONE DEFINITIVA!') {
  const titleEl = document.getElementById('alertTitle');
  const detailEl = document.getElementById('alertDetail');
  if (titleEl) titleEl.textContent = titolo;
  document.getElementById('alertText').textContent = messaggio;
  if (detailEl) detailEl.textContent = dettaglio;
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
  aggiornaInfoCategoriaUI();
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

  container.innerHTML = roster.map(g => {
    const isPortiereNum = (g.num === 1 || g.num === 13);
    const numStyle = isPortiereNum ? 'font-weight:bold; text-align:center; color:#f87171;' : 'font-weight:bold; text-align:center;';
    const ph = isPortiereNum ? 'Portiere (calotta rossa)' : 'Cognome Nome (es. "(Cap.)")';
    return `
      <div class="roster-table-row">
        <div style="${numStyle}">#${g.num}${isPortiereNum ? 'P' : ''}</div>
        <input type="text" id="r_nome_${g.num}" value="${escapeHtml(g.nome)}" placeholder="${ph}">
        <input type="text" id="r_tess_${g.num}" value="${escapeHtml(g.tessera || '')}" placeholder="Tessera FIN">
      </div>`;
  }).join('');
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

  // Pulisce eventuali nominativi/tessere residui dalle calotte 1-15 prima di applicare il nuovo elenco
  for (let n = 1; n <= 15; n += 1) {
    const inpNome = document.getElementById(`r_nome_${n}`);
    const inpTess = document.getElementById(`r_tess_${n}`);
    if (inpNome) inpNome.value = '';
    if (inpTess) inpTess.value = '';
  }

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
  aggiornaPunteggioRigoriAnteprima();
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

  // Indicatori cartellini allenatore
  const btnGB = document.getElementById('btnGialloAllB');
  const btnGN = document.getElementById('btnGialloAllN');
  if (btnGB) btnGB.textContent = statoGara.cartellini?.allGialloB ? '🟨 GIALLO ALL. BIANCA (✓ già amm.)' : '🟨 GIALLO ALL. BIANCA';
  if (btnGN) btnGN.textContent = statoGara.cartellini?.allGialloN ? '🟨 GIALLO ALL. NERA (✓ già amm.)' : '🟨 GIALLO ALL. NERA';

  // Banner EDA 4' (Art. 10.8 / 3.11.2.3.2 RTPN)
  const edaBanner = document.getElementById('edaActiveBanner');
  if (edaBanner) {
    const eventiEDA = statoGara.eventi.filter(ev => ev.sigla === 'EDA');
    if (eventiEDA.length > 0 && typeof calcolaScadenzaEDA === 'function') {
      edaBanner.innerHTML = eventiEDA.map(ev => {
        const scad = calcolaScadenzaEDA(ev.tempo, minutoInSecondi(ev.minuto), statoGara.durataQuarto);
        const band = ev.squadra === 'B' ? 'Gialla + Bianca' : 'Gialla + Blu';
        return `<div class="eda-banner-row">
          <span>🟥 <strong>EDA ${escapeHtml(ev.squadra)} #${escapeHtml(ev.calotta)}</strong> (${ev.tempo.charAt(0)}°T ${escapeHtml(ev.minuto)})</span>
          <span>Rientro 4': <strong>${escapeHtml(scad ? scad.testo : '4\' eff.')}</strong> [${band}]</span>
        </div>`;
      }).join('');
      edaBanner.style.display = 'block';
    } else {
      edaBanner.style.display = 'none';
    }
  }

  const limite = getLimiteFalli();
  const dotClassSize = limite === 5 ? ' sm' : '';
  const dotArray = Array.from({ length: limite }, (_, i) => i + 1);

  const renderRoster = (lista, elId, squadra) => {
    const container = document.getElementById(elId);
    container.innerHTML = lista.map(g => {
      const fCount = g.falli.length;
      const isExpelled = g.chiave3Fallo != null;
      const dots = dotArray.map(n => {
        if (n <= fCount) return `<span class="dot${dotClassSize} ${isExpelled ? 'out' : 'active'}"></span>`;
        return `<span class="dot${dotClassSize}"></span>`;
      }).join('');
      const nomeBreve = g.nome.startsWith('Giocatore ') ? '' : g.nome.split(' ')[0];
      const isSelected = giocatoreSelezionatoAzione && giocatoreSelezionatoAzione.squadra === squadra && giocatoreSelezionatoAzione.calotta === g.num;
      const isPortiereNum = (g.num === 1 || g.num === 13);

      return `
        <div class="player-row ${isSelected ? 'selected' : ''} ${isExpelled ? 'expelled-row' : ''}"
             id="prow_${squadra}_${g.num}"
             onclick="selezionaGiocatorePerAzione('${squadra}', ${g.num})">
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:110px;">
            <strong${isPortiereNum ? ' style="color:#f87171;"' : ''}>#${g.num}</strong> ${escapeHtml(nomeBreve)} (${g.reti}G)
          </span>
          <div class="fouls">${dots}</div>
        </div>`;
    }).join('');
  };

  renderRoster(statoGara.rosterB, 'rosterB', 'B');
  renderRoster(statoGara.rosterN, 'rosterN', 'N');

  // Aggiorna pulsante Undo rapido (ultimo evento effettivamente inserito per id)
  const btnUndo = document.getElementById('btnUndo');
  const lblUndo = document.getElementById('lblUndoEvento');
  if (btnUndo && lblUndo) {
    const lastIdx = trovaIndiceUltimoEventoInserito();
    if (lastIdx >= 0) {
      const u = statoGara.eventi[lastIdx];
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

  const reviewModal = document.getElementById('reviewModal');
  if (reviewModal && reviewModal.style.display === 'block') {
    renderRiepilogoModal();
  }
}

// ==========================================
// 8. TIRI DI RIGORE GUIDATI (RTPN APPENDICE 4)
// ==========================================
function setEspulsiSquadra(squadra) {
  const roster = squadra === 'B' ? statoGara.rosterB : statoGara.rosterN;
  return new Set(roster.filter(g => g.chiave3Fallo != null).map(g => g.num));
}

function aggiornaOpzioniCalottaRigori(analisi = null) {
  const selSq = document.getElementById('rigoreSquadra');
  const selCal = document.getElementById('rigoreCalotta');
  if (!selSq || !selCal) return;
  const sq = selSq.value;
  const prevVal = parseInt(selCal.value, 10);
  const roster = sq === 'B' ? statoGara.rosterB : statoGara.rosterN;

  let analisiCorrente = analisi;
  if (!analisiCorrente && typeof analizzaSerieRigoriFIN === 'function') {
    const info = calcolaRigoriSicuro(statoGara.tiriRigore);
    analisiCorrente = analizzaSerieRigoriFIN(info ? info.tiri : [], setEspulsiSquadra('B'), setEspulsiSquadra('N'));
  }

  const tiratiPrimi5 = new Set((analisiCorrente?.perSq?.[sq] || []).slice(0, 5).map(x => x.cal));
  const suggeritaOltranza = analisiCorrente?.prossimaCalotta?.[sq] || null;

  selCal.innerHTML = roster.map(g => {
    const espulso = g.chiave3Fallo != null;
    const nome = g.nome.startsWith('Giocatore ') ? '' : ` ${g.nome}`;
    const giaTirato = !suggeritaOltranza && tiratiPrimi5.has(g.num);
    const label = espulso
      ? `#${g.num}${nome} — ESPULSO (vietato)`
      : `#${g.num}${nome}${giaTirato ? ' (già tirato)' : ''}${suggeritaOltranza === g.num ? ' ★ prossimo ordine' : ''}`;
    return `<option value="${g.num}"${espulso ? ' disabled' : ''}>${escapeHtml(label)}</option>`;
  }).join('');

  // Selezione intelligente: in oltranza pre-seleziona il prossimo nell'ordine 1-5; altrimenti primo non espulso e non ancora tirato
  if (suggeritaOltranza && !roster.find(g => g.num === suggeritaOltranza)?.chiave3Fallo) {
    selCal.value = String(suggeritaOltranza);
  } else if (Number.isFinite(prevVal) && !roster.find(g => g.num === prevVal)?.chiave3Fallo && !tiratiPrimi5.has(prevVal)) {
    selCal.value = String(prevVal);
  } else {
    const primoLibero = roster.find(g => g.chiave3Fallo == null && !tiratiPrimi5.has(g.num))
      || roster.find(g => g.chiave3Fallo == null);
    if (primoLibero) selCal.value = String(primoLibero.num);
  }
}

function aggiornaPunteggioRigoriAnteprima() {
  const textarea = document.getElementById('tiriRigore');
  const anteprima = document.getElementById('anteprimaPunteggioRigori');
  const statoEl = document.getElementById('statoSerieRigori');
  const avvisiEl = document.getElementById('avvisiRigori');
  if (!textarea || !anteprima) return;
  const val = textarea.value;
  let analisi = null;

  try {
    const { punteggio, tiri } = leggiTiriDiRigoreFIN(val);
    anteprima.textContent = `Rigori (${tiri.length} tirati): B ${punteggio.B} - N ${punteggio.N}`;
    anteprima.style.color = '#38bdf8';

    if (typeof analizzaSerieRigoriFIN === 'function') {
      analisi = analizzaSerieRigoriFIN(tiri, setEspulsiSquadra('B'), setEspulsiSquadra('N'));
      if (statoEl) {
        if (tiri.length === 0) {
          statoEl.textContent = '';
        } else if (analisi.conclusa) {
          const nomeVinc = analisi.vincitore === 'B' ? statoGara.sqBianca : statoGara.sqNera;
          statoEl.textContent = `🏆 ${analisi.statoTesto} — Vince ${nomeVinc}!`;
          statoEl.style.color = '#86efac';
        } else {
          statoEl.textContent = `ℹ️ ${analisi.statoTesto}`;
          statoEl.style.color = '#bae6fd';
        }
      }
      if (avvisiEl) {
        if (analisi.avvisi.length > 0) {
          avvisiEl.innerHTML = analisi.avvisi.map(a => `<div>⚠️ ${escapeHtml(a)}</div>`).join('');
          avvisiEl.style.display = 'block';
        } else {
          avvisiEl.style.display = 'none';
        }
      }
    }
  } catch (e) {
    anteprima.textContent = `Rigori: ${e.message.split(':')[0] || 'formato non valido'}`;
    anteprima.style.color = '#f87171';
    if (statoEl) statoEl.textContent = '';
    if (avvisiEl) avvisiEl.style.display = 'none';
  }
  aggiornaOpzioniCalottaRigori(analisi);
  aggiornaUI();
}

async function aggiungiTiroRigoreGuidato(esito) {
  const sq = document.getElementById('rigoreSquadra').value;
  const cal = parseInt(document.getElementById('rigoreCalotta').value, 10);
  if (!Number.isFinite(cal) || cal < 1 || cal > 15) return;

  // Controllo blocco tiratore espulso definitivamente (RTPN App. 4 Art. 1.5.2.2)
  if (setEspulsiSquadra(sq).has(cal)) {
    mostraAlertEspulsione(
      `Calottina ${sq} N.${cal} è ESPULSO DEFINITIVAMENTE!`,
      'Ai sensi dell\'Appendice 4 Art. 1.5.2.2 RTPN nessun giocatore con limite falli o espulso definitivamente può partecipare alla serie dei tiri di rigore.',
      'TIRATORE NON AMMESSO!'
    );
    return;
  }

  const textarea = document.getElementById('tiriRigore');
  const riga = `${sq} ${cal} ${esito}`;
  const attuale = textarea.value.trim();
  textarea.value = attuale ? `${attuale}\n${riga}` : riga;
  statoGara.tiriRigore = textarea.value;

  // Alterna automaticamente squadra per il tiro successivo PRIMA di ricalcolare le opzioni
  document.getElementById('rigoreSquadra').value = (sq === 'B' ? 'N' : 'B');
  aggiornaPunteggioRigoriAnteprima();
  await salvaStatoGara(statoGara);
  vibraDispositivo(50);
}

async function annullaUltimoTiroRigore() {
  const textarea = document.getElementById('tiriRigore');
  const righe = textarea.value.trim().split(/\r?\n/).filter(Boolean);
  if (righe.length === 0) return;
  const rimossa = righe.pop();
  const matchSq = rimossa.match(/^([BNbn])/);
  if (matchSq) document.getElementById('rigoreSquadra').value = matchSq[1].toUpperCase();
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

async function salvaSuSupportoEsterno(file, pdfBytes, fileName) {
  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: 'Verbale FIN (PDF)',
          accept: { 'application/pdf': ['.pdf'] }
        }]
      });
      const writable = await handle.createWritable();
      await writable.write(pdfBytes);
      await writable.close();
      return 'ok-picker';
    } catch (e) {
      if (e.name === 'AbortError') return 'annullato';
      if (e.name === 'NotAllowedError' || e.name === 'SecurityError') return 'serve-tocco';
    }
  }
  return condividiPdf(file);
}

function liberaUltimoPdfInMemoria() {
  if (ultimoPdf && ultimoPdf.blobUrl) {
    URL.revokeObjectURL(ultimoPdf.blobUrl);
  }
  ultimoPdf = null;
}

async function condividiUltimoPDF() {
  if (!ultimoPdf) return;
  const btn = document.getElementById('btnCondividi');
  const isEsterno = ultimoPdf.modalita === 'esterno';
  const esito = isEsterno
    ? await salvaSuSupportoEsterno(ultimoPdf.file, ultimoPdf.pdfBytes, ultimoPdf.fileName)
    : await condividiPdf(ultimoPdf.file);

  if (esito === 'ok' || esito === 'ok-picker') {
    if (btn) btn.style.display = 'none';
    mostraFeedbackExport(
      isEsterno
        ? `✔ PDF salvato su supporto esterno (nessuna copia nei Download): ${ultimoPdf.fileName}`
        : `✔ PDF condiviso / inviato alla stampa: ${ultimoPdf.fileName}`
    );
    liberaUltimoPdfInMemoria();
  } else if (esito === 'annullato') {
    if (btn) btn.style.display = 'none';
    mostraFeedbackExport(isEsterno ? 'Salvataggio su supporto esterno annullato.' : '');
  } else {
    if (ultimoPdf.blobUrl) scaricaBlob(ultimoPdf.blobUrl, ultimoPdf.fileName);
    if (btn) btn.style.display = 'none';
    mostraFeedbackExport('Salvataggio esterno diretto non supportato da questo browser: PDF salvato in Download, spostalo da lì.');
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

async function esportaEStampaPDF(modalita = false) {
  if (esportazioneInCorso) return;
  esportazioneInCorso = true;
  mostraFeedbackExport('Preparazione verbale FIN…');
  const btnCondividi = document.getElementById('btnCondividi');
  if (btnCondividi) btnCondividi.style.display = 'none';

  const isEsterno = modalita === 'esterno';
  const stampaSubito = modalita === true || modalita === 'stampa';

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
    liberaUltimoPdfInMemoria();
    const blobUrl = URL.createObjectURL(file);
    ultimoPdf = { file, pdfBytes, blobUrl, fileName, modalita: isEsterno ? 'esterno' : (stampaSubito ? 'stampa' : 'salva') };

    if (isEsterno) {
      const esito = await salvaSuSupportoEsterno(file, pdfBytes, fileName);
      if (esito === 'ok' || esito === 'ok-picker') {
        mostraFeedbackExport(`✔ PDF salvato su supporto esterno (nessuna copia nei Download): ${fileName}`);
        liberaUltimoPdfInMemoria();
      } else if (esito === 'annullato') {
        mostraFeedbackExport('Salvataggio su supporto esterno annullato (nessuna copia salvata sul telefono).');
      } else if (esito === 'serve-tocco') {
        if (btnCondividi) {
          btnCondividi.textContent = '💾 TOCCA PER SCEGLIERE SUPPORTO ESTERNO (SD / USB / DRIVE)';
          btnCondividi.style.display = 'block';
        }
        mostraFeedbackExport('PDF pronto: tocca il pulsante viola per salvarlo su SD, USB o Drive senza occupare Download.');
      } else {
        scaricaBlob(blobUrl, fileName);
        mostraFeedbackExport('Browser senza salvataggio esterno diretto: PDF scaricato in Download, spostalo su SD/USB/Drive.');
      }
    } else if (stampaSubito && !eAndroid()) {
      scaricaBlob(blobUrl, fileName);
      stampaViaIframe(blobUrl);
      mostraFeedbackExport(`PDF salvato: ${fileName}`);
    } else if (stampaSubito) {
      const esito = await condividiPdf(file);
      if (esito === 'ok') {
        mostraFeedbackExport(`✔ PDF condiviso / inviato alla stampa: ${fileName}`);
        liberaUltimoPdfInMemoria();
      } else if (esito === 'serve-tocco') {
        if (btnCondividi) {
          btnCondividi.textContent = '📤 TOCCA PER STAMPARE / CONDIVIDERE IL PDF';
          btnCondividi.style.display = 'block';
        }
        mostraFeedbackExport('PDF pronto: tocca il pulsante viola per aprire Stampa / Condividi.');
      } else if (esito === 'non-supportato') {
        scaricaBlob(blobUrl, fileName);
        mostraFeedbackExport('PDF salvato in Download: aprilo e usa il menu ⋮ > Stampa.');
      } else {
        mostraFeedbackExport('Stampa / condivisione annullata.');
      }
    } else {
      scaricaBlob(blobUrl, fileName);
      mostraFeedbackExport(`✔ PDF salvato nei Download: ${fileName}`);
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
      const compilatoreTxt = String(p.compilatore || '').trim()
        ? ` • Compilatore: ${escapeHtml(p.compilatore.trim())}`
        : '';
      return `
        <div class="archive-item ${isCorrente ? 'current' : ''}">
          <div style="font-size:0.85rem;">
            <div style="color:#94a3b8; font-size:0.75rem;">${escapeHtml(dataFmt)} • ${escapeHtml(p.categoria || 'Cat. N/D')} ${isCorrente ? '<strong>(IN USO)</strong>' : ''}</div>
            <div style="font-weight:bold; font-size:0.95rem; margin:2px 0;">
              ${escapeHtml(p.sqBianca)} <span style="color:#38bdf8;">${p.scoreB} - ${p.scoreN}</span>${rigoriTxt} ${escapeHtml(p.sqNera)}
            </div>
            <div style="color:#64748b; font-size:0.75rem;">Eventi: ${(p.eventi || []).length} • Export: v${p.versioneExport || 0}${compilatoreTxt}</div>
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

async function pulisciPartiteEsportate() {
  const lista = await elencaPartiteArchiviate();
  const eliminabili = lista.filter(p => p.matchId !== statoGara.matchId && (p.versioneExport || 0) > 0);
  if (eliminabili.length === 0) {
    alert('Non ci sono altre partite già esportate da rimuovere in archivio.');
    return;
  }
  if (!confirm(`Eliminare ${eliminabili.length} partit${eliminabili.length === 1 ? 'a' : 'e'} già esportat${eliminabili.length === 1 ? 'a' : 'e'} dall'archivio locale per liberare spazio? (La partita attualmente aperta non verrà toccata).`)) {
    return;
  }
  for (const p of eliminabili) {
    await eliminaPartitaArchiviata(p.matchId);
  }
  apriArchivioModal();
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

// ==========================================
// 11. RIEPILOGO FINALE PRE-PDF (PER TEMPO E MINUTO)
// ==========================================
let azioneRiepilogoRichiesta = null;

function nomeGiocatorePerRiepilogo(ev) {
  if (ev.sigla === 'TO') return 'Time Out';
  if (ev.calotta === 'X') return 'Panchina (no fallo pers.)';
  const roster = ev.squadra === 'B' ? statoGara.rosterB : statoGara.rosterN;
  const g = roster.find(p => p.num === parseInt(ev.calotta, 10));
  if (!g || g.nome.startsWith('Giocatore ')) return `#${ev.calotta}`;
  return `#${ev.calotta} ${g.nome}`;
}

function renderRiepilogoModal() {
  const headerEl = document.getElementById('reviewSummaryHeader');
  const alertsEl = document.getElementById('reviewAlerts');
  const bodyEl = document.getElementById('reviewBody');
  if (!headerEl || !alertsEl || !bodyEl) return;

  const rigoriInfo = calcolaRigoriSicuro(statoGara.tiriRigore);
  const totB = statoGara.scoreB + (rigoriInfo ? rigoriInfo.punteggio.B : 0);
  const totN = statoGara.scoreN + (rigoriInfo ? rigoriInfo.punteggio.N : 0);

  const parzialiHtml = ORDINE_TEMPI.map((t, i) => {
    const p = statoGara.parziali[t] || { B: 0, N: 0 };
    return `<span>${i + 1}°T: <strong>${p.B}-${p.N}</strong></span>`;
  }).join(' • ');

  const compilatoreRiepilogo = String(statoGara.compilatore || '').trim();
  headerEl.innerHTML = `
    <div style="font-size:1rem; font-weight:800; margin-bottom:4px;">
      ${escapeHtml(statoGara.sqBianca)} <span style="color:#38bdf8;">${statoGara.scoreB} - ${statoGara.scoreN}</span> ${escapeHtml(statoGara.sqNera)}
      ${rigoriInfo ? `<span style="font-size:0.82rem; color:#94a3b8;">(d.t.r. ${totB}-${totN})</span>` : ''}
    </div>
    <div style="color:#cbd5e1; font-size:0.8rem; margin-bottom:4px;">Parziali: ${parzialiHtml}</div>
    <div style="color:#94a3b8; font-size:0.78rem;">Totale azioni registrate: <strong>${statoGara.eventi.length}</strong> • Limite falli: <strong>${getLimiteFalli()}</strong>${compilatoreRiepilogo ? ` • Compilatore (solo archivio): <strong>${escapeHtml(compilatoreRiepilogo)}</strong>` : ''}</div>
  `;

  const minutoInizioQuarto = formattaTempo(statoGara.durataQuarto || 480);
  const eventiAlMinutoIniziale = statoGara.eventi.filter(ev => ev.minuto === minutoInizioQuarto);
  const avvisi = [];
  if (statoGara.eventi.length === 0) {
    avvisi.push('Nessun evento registrato nel referto.');
  }
  if (eventiAlMinutoIniziale.length > 0) {
    avvisi.push(`${eventiAlMinutoIniziale.length} azion${eventiAlMinutoIniziale.length === 1 ? 'e risulta' : 'i risultano'} ancora al minuto iniziale (${minutoInizioQuarto}): verifica se il minuto è corretto.`);
  }
  if (!String(statoGara.numeroGara || '').trim() || !String(statoGara.arbitro1 || '').trim()) {
    avvisi.push('Promemoria: verifica numero gara e nominativo Arbitro 1 nei dati del verbale.');
  }

  // Verifiche regolamentari FIN 2026/2027 (non bloccanti)
  const profCat = typeof trovaProfiloCategoriaFIN === 'function' ? trovaProfiloCategoriaFIN(statoGara.categoria) : null;
  if (profCat && profCat.aiutoGiuria > 0 && !String(statoGara.aiutoGiuria || '').trim()) {
    avvisi.push(`NOG Art. 4.1.1: per ${profCat.nome} sono previsti ${profCat.aiutoGiuria} Aiuto Giuria (campo attualmente vuoto).`);
  }
  if (String(statoGara.tempAcqua || '').trim() && typeof verificaTemperaturaAcquaFIN === 'function') {
    const tCheck = verificaTemperaturaAcquaFIN(statoGara.tempAcqua, statoGara.tipoImpianto);
    if (tCheck && !tCheck.ok) avvisi.push(tCheck.messaggio);
  }
  // Controllo composizione distinte (se compilate)
  [
    { sq: statoGara.sqBianca, roster: statoGara.rosterB },
    { sq: statoGara.sqNera, roster: statoGara.rosterN }
  ].forEach(({ sq, roster }) => {
    const compilati = roster.filter(p => !/^Giocatore\s+[BN]\d+$/i.test(p.nome || '')).length;
    if (compilati > 0 && compilati < 7) {
      avvisi.push(`Distinta ${sq}: risultano solo ${compilati} giocatori nominati (minimo 7 per iniziare — NOG Art. 5.1).`);
    }
    if (profCat && profCat.gruppo === 'Assoluti' && compilati > 14) {
      avvisi.push(`Distinta ${sq}: risultano ${compilati} giocatori nominati (max 14 nei Campionati Assoluti — NOG Art. 5.1).`);
    }
  });
  // Controllo anomalie tiri di rigore (App. 4 RTPN)
  if (rigoriInfo && typeof analizzaSerieRigoriFIN === 'function') {
    const analisiRig = analizzaSerieRigoriFIN(rigoriInfo.tiri, setEspulsiSquadra('B'), setEspulsiSquadra('N'));
    analisiRig.avvisi.forEach(a => avvisi.push(`Rigori — ${a}`));
  }

  if (avvisi.length > 0) {
    alertsEl.innerHTML = avvisi.map(a => `<div>⚠️ ${escapeHtml(a)}</div>`).join('');
    alertsEl.style.display = 'block';
  } else {
    alertsEl.style.display = 'none';
  }

  const blocchiTempi = ORDINE_TEMPI.map((tempo) => {
    const p = statoGara.parziali[tempo] || { B: 0, N: 0 };
    const righe = statoGara.eventi
      .map((ev, realIdx) => ({ ev, realIdx }))
      .filter(({ ev }) => ev.tempo === tempo);

    const righeHtml = righe.length === 0
      ? '<div style="color:#64748b; font-size:0.8rem; padding:4px 0;">Nessuna azione registrata in questo tempo.</div>'
      : righe.map(({ ev, realIdx }) => {
          const isMinIniziale = ev.minuto === minutoInizioQuarto;
          const descrGioc = nomeGiocatorePerRiepilogo(ev);
          const badgeSq = ev.squadra === 'B'
            ? '<span class="badge-b" style="font-size:0.7rem; padding:1px 5px;">B</span>'
            : '<span class="badge-n" style="font-size:0.7rem; padding:1px 5px;">N</span>';
          return `
            <div class="review-row">
              <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <strong style="font-variant-numeric:tabular-nums;">${escapeHtml(ev.minuto)}</strong>
                ${isMinIniziale ? `<span class="badge-warn-min">verifica min</span>` : ''}
                ${badgeSq}
                <span>${escapeHtml(descrGioc)}</span>
                <strong>${escapeHtml(ev.sigla)}</strong>
                ${ev.punteggio ? `<span style="color:#38bdf8;">(${escapeHtml(ev.punteggio)})</span>` : ''}
              </div>
              <div class="log-actions">
                <button type="button" class="btn-mini" onclick="apriEditModal(${realIdx})">Modifica</button>
                <button type="button" class="btn-mini danger" onclick="eliminaEvento(${realIdx})">X</button>
              </div>
            </div>`;
        }).join('');

    return `
      <div class="review-tempo-card">
        <div class="review-tempo-head">
          <span>${escapeHtml(tempo)}</span>
          <span>Parziale: ${p.B} - ${p.N} • ${righe.length} azioni</span>
        </div>
        ${righeHtml}
      </div>`;
  }).join('');

  let rigoriHtml = '';
  if (rigoriInfo) {
    rigoriHtml = `
      <div class="review-tempo-card">
        <div class="review-tempo-head">
          <span>TIRI DI RIGORE</span>
          <span>B ${rigoriInfo.punteggio.B} - N ${rigoriInfo.punteggio.N}</span>
        </div>
        ${rigoriInfo.tiri.map((t, i) => `
          <div class="review-row">
            <span>Tiro ${i + 1}: <strong>${escapeHtml(t.squadra)} #${escapeHtml(t.calotta)}</strong> — ${escapeHtml(t.esito)} (${escapeHtml(t.punteggio)})</span>
          </div>`).join('')}
      </div>`;
  } else if (String(statoGara.tiriRigore || '').trim()) {
    rigoriHtml = `
      <div class="review-tempo-card" style="border-color:#dc2626;">
        <div style="color:#f87171; font-size:0.82rem; font-weight:bold;">
          ⚠️ Il riquadro Tiri di rigore contiene un formato non valido: correggilo prima di generare il PDF.
        </div>
      </div>`;
  }

  bodyEl.innerHTML = blocchiTempi + rigoriHtml;

  const btnSave = document.getElementById('btnConfirmSavePdf');
  const btnPrint = document.getElementById('btnConfirmPrintPdf');
  const btnExt = document.getElementById('btnConfirmExternalPdf');
  if (btnSave) btnSave.style.outline = azioneRiepilogoRichiesta === false ? '2px solid #86efac' : 'none';
  if (btnPrint) btnPrint.style.outline = azioneRiepilogoRichiesta === true ? '2px solid #7dd3fc' : 'none';
  if (btnExt) btnExt.style.outline = azioneRiepilogoRichiesta === 'esterno' ? '2px solid #5eead4' : 'none';
}

function apriRiepilogoModal(stampaSubito = null) {
  azioneRiepilogoRichiesta = stampaSubito;
  ricalcolaStatoDaEventi();
  aggiornaUI();
  renderRiepilogoModal();
  document.getElementById('reviewModal').style.display = 'block';
}

function chiudiRiepilogoModal() {
  document.getElementById('reviewModal').style.display = 'none';
}

async function confermaEsportazioneDaRiepilogo(stampaSubito) {
  chiudiRiepilogoModal();
  await esportaEStampaPDF(stampaSubito);
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
  } finally {
    inputEl.value = '';
  }
}

// ==========================================
// 12. PRONTUARIO REGOLAMENTI FIN 2026/2027 (100% OFFLINE)
// ==========================================
function apriRegolamentoModal() {
  const inp = document.getElementById('rulesSearchInput');
  if (inp) inp.value = '';
  renderRegolamentoModal();
  document.getElementById('rulesModal').style.display = 'block';
}

function chiudiRegolamentoModal() {
  document.getElementById('rulesModal').style.display = 'none';
}

function renderRegolamentoModal() {
  const body = document.getElementById('rulesModalBody');
  if (!body) return;
  const q = String(document.getElementById('rulesSearchInput')?.value || '').trim().toLowerCase();

  let html = '';

  // Tabella riepilogativa campionati FIN 2026/27
  if (typeof CATEGORIE_FIN_26_27 !== 'undefined') {
    const righeCat = CATEGORIE_FIN_26_27.filter(c =>
      !q || c.nome.toLowerCase().includes(q) || c.note.toLowerCase().includes(q) || String(c.aiutoGiuria).includes(q)
    );
    if (righeCat.length > 0) {
      html += `
        <div class="rules-section">
          <h4>Tabella Campionati FIN 2026/2027 (Tempi, Falli, Aiuto Giuria)</h4>
          <div style="overflow-x:auto;">
            <table class="rules-table">
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Tempi</th>
                  <th>Falli</th>
                  <th>Int.</th>
                  <th>Aiuto G.</th>
                </tr>
              </thead>
              <tbody>
                ${righeCat.map(c => `
                  <tr>
                    <td><strong>${escapeHtml(c.nome)}</strong></td>
                    <td>4×${c.durataQuarto / 60}' ${c.tempoEffettivo ? 'eff.' : 'cont.'}</td>
                    <td>${c.limiteFalli}</td>
                    <td>${c.intervalloMeta === 300 ? "2'-5'-2'" : "2'"}</td>
                    <td>${c.aiutoGiuria || '—'}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
    }
  }

  // Sezioni prontuario NOG + RTPN
  if (typeof PRONTUARIO_FIN_26_27 !== 'undefined') {
    PRONTUARIO_FIN_26_27.forEach(sez => {
      const punti = q
        ? sez.punti.filter(p => p.toLowerCase().includes(q) || sez.titolo.toLowerCase().includes(q))
        : sez.punti;
      if (punti.length === 0) return;
      html += `
        <div class="rules-section">
          <h4>${escapeHtml(sez.titolo)}</h4>
          <ul>${punti.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
        </div>`;
    });
  }

  if (!html) {
    html = '<p style="color:#94a3b8; text-align:center; font-size:0.85rem;">Nessuna regola trovata per questa ricerca.</p>';
  }
  body.innerHTML = html;
}
