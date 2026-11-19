// ============================================================================
// NORMATIVA FIN PALLANUOTO 2026/2027 (NOG Rev.7 + RTPN Rev.6 - 02/10/2026)
// Modulo 100% offline: profili categoria, calcoli regolamentari e prontuario.
// ============================================================================

const CATEGORIE_FIN_26_27 = [
  {
    id: 'A1_M', nome: 'Serie A1 Maschile', gruppo: 'Assoluti',
    durataQuarto: 480, tempoEffettivo: true, intervalloMeta: 300,
    limiteFalli: 3, possesso: '28"/18"', espulsioneSec: 18,
    maxGiocatori: 14, aiutoGiuria: 0,
    note: '4×8\' effettivi • Intervalli 2\'-5\'-2\' • 3 cronometri obbligatori (pena 0-5)'
  },
  {
    id: 'A1_F', nome: 'Serie A1 Femminile', gruppo: 'Assoluti',
    durataQuarto: 480, tempoEffettivo: true, intervalloMeta: 300,
    limiteFalli: 3, possesso: '28"/18"', espulsioneSec: 18,
    maxGiocatori: 14, aiutoGiuria: 0,
    note: '4×8\' effettivi • Intervalli 2\'-5\'-2\' • 3 cronometri obbligatori (pena 0-5)'
  },
  {
    id: 'A2_M', nome: 'Serie A2 Maschile', gruppo: 'Assoluti',
    durataQuarto: 480, tempoEffettivo: true, intervalloMeta: 120,
    limiteFalli: 3, possesso: '28"/18"', espulsioneSec: 18,
    maxGiocatori: 14, aiutoGiuria: 0,
    note: '4×8\' effettivi • Intervalli 2\' • Max 14 giocatori (portieri #1 e #13)'
  },
  {
    id: 'A2_F', nome: 'Serie A2 Femminile', gruppo: 'Assoluti',
    durataQuarto: 480, tempoEffettivo: true, intervalloMeta: 120,
    limiteFalli: 3, possesso: '28"/18"', espulsioneSec: 18,
    maxGiocatori: 14, aiutoGiuria: 0,
    note: '4×8\' effettivi • Intervalli 2\' • Max 14 giocatori (portieri #1 e #13)'
  },
  {
    id: 'B_M', nome: 'Serie B Maschile', gruppo: 'Assoluti',
    durataQuarto: 480, tempoEffettivo: true, intervalloMeta: 120,
    limiteFalli: 3, possesso: '28"/18"', espulsioneSec: 18,
    maxGiocatori: 14, aiutoGiuria: 0,
    note: '4×8\' effettivi • Intervalli 2\' • Max 14 giocatori'
  },
  {
    id: 'B_F', nome: 'Serie B Femminile', gruppo: 'Assoluti',
    durataQuarto: 480, tempoEffettivo: true, intervalloMeta: 120,
    limiteFalli: 3, possesso: '28"/18"', espulsioneSec: 18,
    maxGiocatori: 14, aiutoGiuria: 2,
    note: '4×8\' effettivi • 2 Aiuto Giuria obbligatori (NOG Art. 4.1.1)'
  },
  {
    id: 'C_M', nome: 'Serie C Maschile', gruppo: 'Assoluti',
    durataQuarto: 480, tempoEffettivo: true, intervalloMeta: 120,
    limiteFalli: 3, possesso: '28"/18"', espulsioneSec: 18,
    maxGiocatori: 14, aiutoGiuria: 0,
    note: '4×8\' effettivi • Intervalli 2\' • Max 14 giocatori'
  },
  {
    id: 'PROM_M', nome: 'Promozione Maschile', gruppo: 'Assoluti',
    durataQuarto: 480, tempoEffettivo: true, intervalloMeta: 120,
    limiteFalli: 3, possesso: '28"/18"', espulsioneSec: 18,
    maxGiocatori: 14, aiutoGiuria: 2,
    note: '4×8\' effettivi • 2 Aiuto Giuria obbligatori (NOG Art. 4.1.1)'
  },
  {
    id: 'CAD_M', nome: 'Cadetti Maschile', gruppo: 'Giovanili',
    durataQuarto: 480, tempoEffettivo: true, intervalloMeta: 120,
    limiteFalli: 3, possesso: '28"/18"', espulsioneSec: 18,
    maxGiocatori: 15, aiutoGiuria: 2,
    note: '4×8\' effettivi • 2 Aiuto Giuria (esclusi Play Off / Fasi Naz.)'
  },
  {
    id: 'CAD_F', nome: 'Cadette Femminile', gruppo: 'Giovanili',
    durataQuarto: 480, tempoEffettivo: true, intervalloMeta: 120,
    limiteFalli: 3, possesso: '28"/18"', espulsioneSec: 18,
    maxGiocatori: 15, aiutoGiuria: 2,
    note: '4×8\' effettivi • 2 Aiuto Giuria (esclusi Play Off / Fasi Naz.)'
  },
  {
    id: 'JUN_A', nome: 'Juniores A Maschile', gruppo: 'Giovanili',
    durataQuarto: 480, tempoEffettivo: true, intervalloMeta: 120,
    limiteFalli: 3, possesso: '28"/18"', espulsioneSec: 18,
    maxGiocatori: 15, aiutoGiuria: 0,
    note: '4×8\' effettivi • Intervalli 2\' • 28"/18"'
  },
  {
    id: 'JUN_B', nome: 'Juniores B Maschile', gruppo: 'Giovanili',
    durataQuarto: 480, tempoEffettivo: true, intervalloMeta: 120,
    limiteFalli: 3, possesso: '28"/18"', espulsioneSec: 18,
    maxGiocatori: 15, aiutoGiuria: 2,
    note: '4×8\' effettivi • 2 Aiuto Giuria (esclusi Play Off / Fasi Naz.)'
  },
  {
    id: 'JUN_F', nome: 'Juniores Femminile', gruppo: 'Giovanili',
    durataQuarto: 480, tempoEffettivo: true, intervalloMeta: 120,
    limiteFalli: 3, possesso: '28"/18"', espulsioneSec: 18,
    maxGiocatori: 15, aiutoGiuria: 2,
    note: '4×8\' effettivi • 2 Aiuto Giuria (esclusi Play Off / Fasi Naz.)'
  },
  {
    id: 'ALL_M', nome: 'Allievi Maschile', gruppo: 'Giovanili',
    durataQuarto: 480, tempoEffettivo: true, intervalloMeta: 120,
    limiteFalli: 3, possesso: '28"/18"', espulsioneSec: 18,
    maxGiocatori: 15, aiutoGiuria: 2,
    note: '4×8\' effettivi • 2 Aiuto Giuria (esclusi Play Off / Fasi Naz.)'
  },
  {
    id: 'ALL_F', nome: 'Allieve Femminile', gruppo: 'Giovanili',
    durataQuarto: 480, tempoEffettivo: true, intervalloMeta: 120,
    limiteFalli: 3, possesso: '28"/18"', espulsioneSec: 18,
    maxGiocatori: 15, aiutoGiuria: 2,
    note: '4×8\' effettivi • 2 Aiuto Giuria (esclusi Play Off / Fasi Naz.)'
  },
  {
    id: 'RAG_M', nome: 'Ragazzi', gruppo: 'Giovanili',
    durataQuarto: 480, tempoEffettivo: false, intervalloMeta: 120,
    limiteFalli: 3, possesso: '28"/18"', espulsioneSec: 18,
    maxGiocatori: 15, aiutoGiuria: 1,
    note: '4×8\' continuati (NOG Art. 16.1) • Max 3 falli • 1 Aiuto Giuria'
  },
  {
    id: 'RAG_F', nome: 'Ragazze', gruppo: 'Giovanili',
    durataQuarto: 480, tempoEffettivo: false, intervalloMeta: 120,
    limiteFalli: 3, possesso: '28"/18"', espulsioneSec: 18,
    maxGiocatori: 15, aiutoGiuria: 1,
    note: '4×8\' continuati (NOG Art. 16.1) • Max 3 falli • 1 Aiuto Giuria'
  },
  {
    id: 'ESO', nome: 'Esordienti', gruppo: 'Giovanili',
    durataQuarto: 420, tempoEffettivo: false, intervalloMeta: 120,
    limiteFalli: 5, possesso: 'Norma spec.', espulsioneSec: 18,
    maxGiocatori: 15, aiutoGiuria: 1,
    note: '4×7\' continuati (NOG 16.1) • Max 5 falli gravi (NOG 18) • 1 Aiuto Giuria'
  }
];

function trovaProfiloCategoriaFIN(nomeCategoria) {
  const raw = String(nomeCategoria || '').trim().toLowerCase();
  if (!raw) return null;

  const esatto = CATEGORIE_FIN_26_27.find(c => c.nome.toLowerCase() === raw);
  if (esatto) return esatto;

  if (/esordient|u\s?12|under\s?12|acquagol/i.test(raw)) return CATEGORIE_FIN_26_27.find(c => c.id === 'ESO');
  if (/ragazz[ae]|u\s?14|under\s?14/i.test(raw)) {
    return /ragazze|femmin|f\b/i.test(raw)
      ? CATEGORIE_FIN_26_27.find(c => c.id === 'RAG_F')
      : CATEGORIE_FIN_26_27.find(c => c.id === 'RAG_M');
  }
  if (/alliev[ie]|u\s?16|under\s?16/i.test(raw)) {
    return /allieve|femmin|f\b/i.test(raw)
      ? CATEGORIE_FIN_26_27.find(c => c.id === 'ALL_F')
      : CATEGORIE_FIN_26_27.find(c => c.id === 'ALL_M');
  }
  if (/junior|u\s?18|under\s?18/i.test(raw)) {
    if (/femmin|f\b/i.test(raw)) return CATEGORIE_FIN_26_27.find(c => c.id === 'JUN_F');
    if (/\ba\b/i.test(raw)) return CATEGORIE_FIN_26_27.find(c => c.id === 'JUN_A');
    return CATEGORIE_FIN_26_27.find(c => c.id === 'JUN_B');
  }
  if (/cadett[ie]|u\s?20|under\s?20/i.test(raw)) {
    return /cadette|femmin|f\b/i.test(raw)
      ? CATEGORIE_FIN_26_27.find(c => c.id === 'CAD_F')
      : CATEGORIE_FIN_26_27.find(c => c.id === 'CAD_M');
  }
  if (/promozione/i.test(raw)) return CATEGORIE_FIN_26_27.find(c => c.id === 'PROM_M');
  if (/\ba1\b/i.test(raw)) {
    return /femmin|f\b/i.test(raw)
      ? CATEGORIE_FIN_26_27.find(c => c.id === 'A1_F')
      : CATEGORIE_FIN_26_27.find(c => c.id === 'A1_M');
  }
  if (/\ba2\b/i.test(raw)) {
    return /femmin|f\b/i.test(raw)
      ? CATEGORIE_FIN_26_27.find(c => c.id === 'A2_F')
      : CATEGORIE_FIN_26_27.find(c => c.id === 'A2_M');
  }
  if (/serie\s*b|\bb\b/i.test(raw)) {
    return /femmin|f\b/i.test(raw)
      ? CATEGORIE_FIN_26_27.find(c => c.id === 'B_F')
      : CATEGORIE_FIN_26_27.find(c => c.id === 'B_M');
  }
  if (/serie\s*c|\bc\b/i.test(raw)) return CATEGORIE_FIN_26_27.find(c => c.id === 'C_M');
  return null;
}

/**
 * Calcola il tempo e il minuto esatto di rientro del sostituto dopo 4 minuti effettivi
 * di inferiorità per Azione Violenta (EDA - RTPN Art. 10.8 e 3.11.2.3.2).
 * Il cronometro scende da durataQuarto a 0:00 in ciascuno dei 4 tempi.
 */
function calcolaScadenzaEDA(tempo, secRimanenti, durataQuarto) {
  const ordine = ['1° TEMPO', '2° TEMPO', '3° TEMPO', '4° TEMPO'];
  const idx = ordine.indexOf(tempo);
  if (idx < 0 || secRimanenti < 0) return null;

  const durata = Number(durataQuarto) || 480;
  let daScontare = 240; // 4 minuti effettivi (RTPN Art. 10.8.2.3)
  let tempoCorrente = idx;
  let residuoNelTempo = secRimanenti;

  while (daScontare > residuoNelTempo) {
    daScontare -= residuoNelTempo;
    tempoCorrente += 1;
    if (tempoCorrente >= ordine.length) {
      return { finePartita: true, tempo: null, secondi: 0, testo: 'Fine partita (nessun rientro nei 4 tempi)' };
    }
    residuoNelTempo = durata;
  }

  const secScadenza = residuoNelTempo - daScontare;
  const min = Math.floor(secScadenza / 60);
  const rem = secScadenza % 60;
  const minFmt = `${min}:${String(rem).padStart(2, '0')}`;
  return {
    finePartita: false,
    tempo: ordine[tempoCorrente],
    secondi: secScadenza,
    minutoFmt: minFmt,
    testo: `${ordine[tempoCorrente].charAt(0)}°T ${minFmt}`
  };
}

/**
 * Analizza lo stato regolamentare della serie di tiri di rigore (RTPN Appendice 4).
 * Controlla:
 * - Tiratori espulsi definitivamente (vietati ex App. 4 Art. 1.5.2.2)
 * - Duplicati nei primi 5 tiri per squadra (App. 4 Art. 1.3.2.1 / 1.4.1.1)
 * - Ordine ripetuto nella fase ad oltranza (App. 4 Art. 1.3.2.2)
 * - Chiusura matematica anticipata o vittoria ad oltranza (App. 4 Art. 1.4.2)
 */
function analizzaSerieRigoriFIN(tiri, espulsiB = new Set(), espulsiN = new Set()) {
  const perSq = { B: [], N: [] };
  const gol = { B: 0, N: 0 };
  const avvisi = [];

  (tiri || []).forEach((t, idx) => {
    const sq = t.squadra;
    const cal = parseInt(t.calotta, 10);
    const setEsp = sq === 'B' ? espulsiB : espulsiN;
    if (setEsp.has(cal)) {
      avvisi.push(`Tiro #${idx + 1}: ${sq} #${cal} risulta espulso definitivamente e NON può tirare (App. 4 Art. 1.5.2.2).`);
    }

    const posSq = perSq[sq].length; // 0-based
    if (posSq < 5) {
      if (perSq[sq].some(x => x.cal === cal)) {
        avvisi.push(`Tiro #${idx + 1}: ${sq} #${cal} ha già tirato nei primi 5 rigori (App. 4 Art. 1.4.1.1).`);
      }
    } else {
      const atteso = perSq[sq][posSq % 5]?.cal;
      if (atteso && atteso !== cal) {
        avvisi.push(`Tiro #${idx + 1} (oltranza): per ${sq} era atteso #${atteso} nello stesso ordine dei primi 5 (App. 4 Art. 1.3.2.2).`);
      }
    }

    perSq[sq].push({ cal, esito: t.esito });
    if (t.esito === 'GOL') gol[sq] += 1;
  });

  const tiriB = perSq.B.length;
  const tiriN = perSq.N.length;
  let conclusa = false;
  let vincitore = null;
  let statoTesto = '';

  if (tiriB <= 5 && tiriN <= 5) {
    const rimastiB = 5 - tiriB;
    const rimastiN = 5 - tiriN;
    if (gol.B > gol.N + rimastiN) {
      conclusa = true;
      vincitore = 'B';
      statoTesto = 'Serie matematicamente conclusa (App. 4 Art. 1.4.2.1)';
    } else if (gol.N > gol.B + rimastiB) {
      conclusa = true;
      vincitore = 'N';
      statoTesto = 'Serie matematicamente conclusa (App. 4 Art. 1.4.2.1)';
    } else if (tiriB === 5 && tiriN === 5) {
      if (gol.B > gol.N) { conclusa = true; vincitore = 'B'; statoTesto = 'Serie conclusa dopo 5 rigori'; }
      else if (gol.N > gol.B) { conclusa = true; vincitore = 'N'; statoTesto = 'Serie conclusa dopo 5 rigori'; }
      else { statoTesto = 'Parità dopo 5 tiri: si procede ad oltranza nello stesso ordine (Art. 1.3.2.2)'; }
    } else {
      const turno = Math.min(5, Math.max(tiriB, tiriN) + (tiriB === tiriN ? 1 : 0));
      statoTesto = `Serie regolare (giro ${turno}/5)`;
    }
  } else {
    // Fase ad oltranza
    if (tiriB === tiriN && gol.B !== gol.N) {
      conclusa = true;
      vincitore = gol.B > gol.N ? 'B' : 'N';
      statoTesto = `Serie conclusa ad oltranza (giro ${tiriB})`;
    } else {
      const giro = Math.max(tiriB, tiriN) + (tiriB === tiriN ? 1 : 0);
      statoTesto = `Fase ad oltranza — giro ${giro} (stesso ordine dei primi 5)`;
    }
  }

  // Suggerimento prossimo tiratore in fase ad oltranza (tiri >= 5 per quella squadra)
  const prossimaCalotta = {
    B: perSq.B.length >= 5 ? (perSq.B[perSq.B.length % 5]?.cal || null) : null,
    N: perSq.N.length >= 5 ? (perSq.N[perSq.N.length % 5]?.cal || null) : null
  };

  return {
    perSq,
    gol,
    tiriB,
    tiriN,
    conclusa,
    vincitore,
    statoTesto,
    avvisi,
    prossimaCalotta
  };
}

/**
 * Validazione temperatura acqua secondo NOG Art. 4.7 (senza ulteriore tolleranza):
 * - Coperto: 25,0°C – 30,0°C
 * - Scoperto: 26,0°C – 31,0°C
 */
function verificaTemperaturaAcquaFIN(tempVal, tipoImpianto) {
  const num = parseFloat(String(tempVal || '').replace(',', '.'));
  if (!Number.isFinite(num)) return null;
  const scoperto = tipoImpianto === 'scoperto';
  const min = scoperto ? 26 : 25;
  const max = scoperto ? 31 : 30;
  const ok = num >= min && num <= max;
  return {
    ok,
    min,
    max,
    valore: num,
    messaggio: ok
      ? `Temperatura regolare (${num}°C — limite ${scoperto ? 'scoperto' : 'coperto'}: ${min}°–${max}°C, NOG Art. 4.7).`
      : `⚠️ TEMPERATURA NON REGOLAMENTARE (${num}°C)! Limite ${scoperto ? 'scoperto' : 'coperto'}: ${min}°–${max}°C senza tolleranza (NOG Art. 4.7 → sospensione gara / 0-5).`
  };
}

const PRONTUARIO_FIN_26_27 = [
  {
    titolo: 'Novità Chiave 2026/2027 (NOG Rev.7 + RTPN Rev.6)',
    punti: [
      'Possesso palla: 28 secondi (nuovo possesso) / 18 secondi (secondo possesso, rimbalzo, angolo, espulsione) — NOG 16.3, RTPN Art. 9.',
      'Espulsione temporanea (ET): 18 secondi di tempo effettivo (non più 20") — NOG Art. 17, RTPN Art. 10.5. A tempi fissi raddoppiati: 36".',
      'Durata tempi (NOG 16.1): 4×8\' effettivi da Allievi a Serie A1; Ragazzi M/F = 4×8\' continuati; Esordienti M/F = 4×7\' continuati.',
      'Limite falli gravi (NOG 18): 3 falli personali in tutti i campionati, 5 falli nel Campionato Esordienti M/F.',
      'Fallo da rigore (TR): è un fallo personale a tutti gli effetti (RTPN Art. 17.1.2), tranne se causato da allenatore/dirigente (Art. 11.1.5 / 11.1.6.3). Se è il 3° fallo → sostituzione immediata (Art. 17.4.1).',
      'Aiuto Giuria (NOG 4.1.1 — dal 2026/27): 2 unità in Promozione M, Serie B F, Cadetti/e, Juniores B M/F, Allievi/e; 1 unità in Ragazzi/e ed Esordienti (esclusi Play Off e Fasi Naz.). Età ≥16, tessera FIN, 30\' prima, maglia bianca e pantalone nero.',
      'Ultimo minuto (RTPN Art. 16.9): l\'allenatore beneficiario di un rigore può rinunciarvi e chiedere tiro libero a metà campo con 28".'
    ]
  },
  {
    titolo: 'Espulsioni, Falli Personali e Segnalazioni Segretario',
    punti: [
      'ET (18" — Art. 10.5): rientro al primo fra 18" effettivi, rete segnata, cambio possesso, o tiro libero/rimessa dal fondo/rigore a favore.',
      '3° Fallo Personale (o 5° Esordienti — Art. 17.3): bandierina ROSSA del segretario. Il giocatore resta nell\'area riservata indicata dagli arbitri. Se il 3° fallo è TR → sostituzione immediata; altrimenti dopo 18"/gol/possesso.',
      'EDS — Cattiva condotta (Art. 10.6) o Interferenza rigore (Art. 10.7): cartellino ROSSO, giocatore abbandona il piano vasca (spogliatoi). Sostituto entra dopo 18"/gol/possesso (immediatamente se in pausa di gioco).',
      'EDA — Azione violenta (Art. 10.8): cartellino ROSSO, giocatore agli spogliatoi, 4 minuti effettivi di inferiorità + tiro di rigore (se in gioco; no rigore se in pausa). Allo scadere dei 4\' il segretario espone bandierina GIALLA + BIANCA/BLU (Art. 3.11.2.3.2). Squalifica automatica turno successivo (min. 2 gg + ammenda €250 naz / €200 reg).',
      'Numero minimo giocatori (Art. 2.3.6): min. 7 (col portiere) per iniziare; se durante la gara una squadra scende sotto 2 giocatori disponibili → sospensione definitiva (0-5).'
    ]
  },
  {
    titolo: 'Cartellini Gialli e Rossi (RTPN Art. 18 & NOG Art. 6-7)',
    punti: [
      'Cartellino GIALLO: mostrabile solo all\'Allenatore (ammonizione) o all\'Intera Squadra (ammonizione collettiva per falli ripetuti/simulazione/proteste senza offese).',
      'Cartellino ROSSO Allenatore: diretto per condotta grave/offensiva oppure al 2° provvedimento dopo giallo. Deve lasciare il piano vasca. Il 2° allenatore (tesserato SIT) subentra, ma è soggetto direttamente a ROSSO senza giallo.',
      'Cartellino ROSSO Dirigenti / Vice-Allenatore / Staff Sanitario: sempre direttamente ROSSO (niente giallo), obbligo di lasciare panchina e piano vasca.',
      'Registrazione a verbale (Art. 18.5.2): il segretario deve annotare ogni cartellino giallo e rosso sul PNV1 con tempo, minuto e destinatario.'
    ]
  },
  {
    titolo: 'Time-Out, Intervalli e Tempi Fissi',
    punti: [
      'Time-Out (Art. 5): max 2 per squadra, durata 1 minuto. Segnale acustico cronometrista ai 45" (movimento libero) e ai 60" (fine). Vietato durante VAR o intervalli.',
      'Richiesta TO irregolare (Art. 5.8): se richiesta in gioco senza possesso palla → Tiro di Rigore agli avversari + perdita di 1 TO (nessun fallo personale). Se TO già esauriti in possesso → tiro libero avversario a metà campo.',
      'Intervalli (NOG 16.2 / RTPN 4.3): 2\' tra i tempi; in Serie A1 M/F 5\' tra 2° e 3° tempo. Cambio campo e panchine prima del 3° tempo.',
      'Guasto cronometri / tabellone (NOG 16.6): obbligatori 3 cronometri (in A1 assenza → 0-5 + €500). Altri campionati senza cronometri: 4 tempi fissi da 16\', espulsione 36", possesso 28" non rilevato.'
    ]
  },
  {
    titolo: 'Serie di Tiri di Rigore (RTPN Appendice 4)',
    punti: [
      'Pausa di 3 minuti tra fine 4° tempo e inizio rigori (sorteggio moneta tra i capitani).',
      '5 giocatori di movimento per squadra nei primi 5 tiri. Il Segretario verifica che NESSUN giocatore con 3 falli o espulso definitivamente partecipi (App. 4 Art. 1.5.2.2).',
      'Vittoria immediata non appena il distacco nei primi 5 tiri è matematicamente incolmabile (Art. 1.4.2.1).',
      'In caso di parità dopo 5 tiri: si prosegue ad oltranza ripetendo esattamente lo stesso ordine dei primi 5 tiratori (Art. 1.3.2.2).'
    ]
  },
  {
    titolo: 'Controlli Pre-Gara, VAR, Coach\'s Challenge e Reclami',
    punti: [
      'Composizione squadra (NOG 5.1): max 14 giocatori nei campionati assoluti (12 mov. + 1-2 portieri #1 e #13 rossi). Minimo 7 giocatori + almeno allenatore o dirigente.',
      'Medico di servizio (NOG 10): 20\' prima con tesserino Albo professionale (non validi tesserini ospedalieri o autocertificazioni). Dopo 30\' assenza → sospensione 0-5.',
      'DAE (NOG 4.1): defibrillatore funzionante e operatore qualificato obbligatori.',
      'Forza Pubblica (NOG 11): richiesta almeno 3 giorni prima (art. 18 TULPS); copia consegnata all\'arbitro. Mancata richiesta: €50 → €100 → €200.',
      'Temperatura acqua (NOG 4.7): Coperto 25°–30°C • Scoperto 26°–31°C (senza tolleranza).',
      'Coach\'s Challenge & VAR (App. 5-6-7): 1 richiesta per squadra (bandiera verde); se accolta mantiene diritto fino a max 2 totali. Se rollback temporale: gol, TO e falli personali intermedi si annullano, ma cartellini gialli/rossi e sanzioni 10.6/10.8 restano a referto (Art. 4.5).',
      'Reclamo (NOG 24.1): preavviso per irregolarità pre-gara entro 20\' prima dell\'inizio; tassa €70,00 all\'arbitro; motivazioni via PEC entro ore 13:00 del 2° giorno successivo.'
    ]
  }
];
