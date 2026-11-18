// Coordinate dal bordo superiore del verbale FIN A4 orizzontale del 2021.
const FORMATO_VERBALE_FIN = { larghezza: 841.8, altezza: 595.2 };
const CAMPI_EVENTO_FIN = [
  [368.4, 394, 405.9, 417.8, 443.2, 479],
  [479, 504.7, 516.6, 528.4, 553.8, 589.7],
  [589.7, 615.4, 627.2, 639.1, 664.5, 700.4],
  [700.4, 726.1, 737.9, 749.8, 775.2, 813.8]
];
const RIGA_VERBALE_FIN = 12.96;
const RIGHE_EVENTI_FIN = 21;
const RIGHE_RIGORI_FIN = 7;
const ORDINE_TEMPI_DEFAULT = ['1° TEMPO', '2° TEMPO', '3° TEMPO', '4° TEMPO'];

function dataVerbaleFIN(data) {
  const [anno, mese, giorno] = String(data || '').split('-');
  const mesi = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  return giorno && mesi[Number(mese) - 1] ? `${giorno}-${mesi[Number(mese) - 1]}-${anno.slice(-2)}` : '';
}

function leggiTiriDiRigoreFIN(testo) {
  const tiri = [];
  const punteggio = { B: 0, N: 0 };
  String(testo || '').split(/\r?\n/).forEach((riga, i) => {
    const trimmed = riga.trim();
    if (!trimmed) return;
    const match = trimmed.match(/^([BNbn])\s*[-–/]?\s*(\d{1,2})\s*[-–/]?\s*(\S+.*)$/);
    if (!match) throw new Error(`Tiri di rigore, riga ${i + 1}: «${trimmed}». Usa il formato «B 4 GOL» o «N 7 ERR».`);
    const squadra = match[1].toUpperCase();
    const calotta = parseInt(match[2], 10);
    if (calotta < 1 || calotta > 15) throw new Error(`Tiri di rigore, riga ${i + 1}: calotta ${calotta} non valida (1-15).`);
    const esitoRaw = match[3].toUpperCase().trim();
    let esito = '';
    if (/^(GOL|RETE|SI|SÌ|1|\+|V)$/i.test(esitoRaw)) {
      esito = 'GOL';
    } else if (/^(ERR|ERRORE|SBAGLIATO|PARATO|FUORI|PALO|TRAVERSA|NO|0|-|X)$/i.test(esitoRaw)) {
      esito = 'ERR';
    } else {
      throw new Error(`Tiri di rigore, riga ${i + 1}: esito «${esitoRaw}» non riconosciuto (usa GOL o ERR).`);
    }
    if (esito === 'GOL') punteggio[squadra] += 1;
    tiri.push({ squadra, calotta: String(calotta), esito, punteggio: `${punteggio.B}-${punteggio.N}` });
  });
  return { tiri, punteggio };
}

function scritturaVerbaleFIN(pagina, font, pulisci) {
  return (valore, sinistra, destra, lineaBase, opzioni = {}) => {
    const { corpo = 7.1, allineamento = 'centro' } = opzioni;
    const testo = pulisci(valore).replace(/\s+/gu, ' ').trim();
    if (!testo) return;
    const larghezza = font.widthOfTextAtSize(testo, corpo);
    const spazio = destra - sinistra - 4;
    const scala = Math.min(1, spazio / larghezza);
    const x = allineamento === 'sinistra' ? sinistra + 2 : (sinistra + destra - larghezza * scala) / 2;
    pagina.drawText(testo, { x, y: pagina.getHeight() - lineaBase - (1 - scala) * corpo / 3, size: corpo * scala, font });
  };
}

function dividiNoteVerbaleFIN(testo, font, larghezza, corpo) {
  return testo.trim().split('\n').flatMap(riga => {
    const righe = [];
    let corrente = '';
    for (const carattere of riga.trim()) {
      if (corrente && font.widthOfTextAtSize(corrente + carattere, corpo) > larghezza) {
        const separatore = corrente.lastIndexOf(' ');
        if (separatore > 0) {
          righe.push(corrente.slice(0, separatore));
          corrente = corrente.slice(separatore + 1);
        } else {
          righe.push(corrente);
          corrente = '';
        }
      }
      corrente += carattere;
    }
    return [...righe, corrente];
  });
}

function compilaIntestazioneVerbaleFIN(scrivi, gara) {
  scrivi(gara.numeroGara, 27, 61, 42, { corpo: 13 });
  scrivi(dataVerbaleFIN(gara.dataGara), 576, 664, 35.2);
  scrivi(gara.impianto, 524, 664, 48.1);
  scrivi(gara.oraInizio?.replace(':', '.'), 536, 589, 61.1);
  scrivi(gara.oraTermine?.replace(':', '.'), 615, 664, 61.1);
  scrivi(gara.manifestazione?.trim() || gara.categoria, 516, 664, 87);
  scrivi(gara.giudiciPorta, 422, 813, 99.8, { allineamento: 'sinistra' });
  [gara.arbitro1, gara.arbitro2, gara.segretario, gara.cronometrista, gara.cronometrista30]
    .forEach((nome, i) => scrivi(nome, 700, 813, 35.2 + i * RIGA_VERBALE_FIN, { allineamento: 'sinistra' }));
}

function compilaSquadraVerbaleFIN(scrivi, nome, squadra, risultato, roster, eventiPerTempo, extraFalli) {
  const spostamento = squadra === 'B' ? 0 : 259.2;
  const eventi = eventiPerTempo.flat().filter(evento => evento.squadra === squadra);
  scrivi(nome.toUpperCase(), 27, 215.4, 81 + spostamento, { corpo: 11.5 });
  scrivi(risultato, 215.5, 266.3, 80.5 + spostamento, { corpo: 12 });
  const timeOut = eventi.filter(evento => evento.sigla === 'TO').length;
  [266.4, 292.2].forEach((x, i) => scrivi(timeOut > i ? 'X' : i + 1, x, x + 25.5, 80 + spostamento, { corpo: 10 }));

  roster.forEach(giocatore => {
    const y = 126 + spostamento + (giocatore.num - 1) * RIGA_VERBALE_FIN;
    if (!/^Giocatore\s+[BN]\d+$/i.test(giocatore.nome || '')) {
      scrivi(giocatore.nome, 27, 94.1, y, { allineamento: 'sinistra' });
    }
    scrivi(giocatore.tessera, 94.2, 136.5, y);
    eventiPerTempo.forEach((periodo, i) => {
      const gol = periodo.filter(evento => evento.sigla === 'GOL' && evento.squadra === squadra && Number(evento.calotta) === giocatore.num).length;
      if (gol) scrivi(gol, 152.2 + i * 15.9, 168.2 + i * 15.9, y);
    });
    eventi.filter(evento => Number(evento.calotta) === giocatore.num && (evento.sigla === 'ET' || evento.sigla === 'TR' || evento.sigla === 'EDA' || evento.sigla === 'EDS' || evento.sigla === 'ED'))
      .forEach((evento, i) => {
        const tempo = `${evento.tempo[0]}T ${evento.minuto.replace(':', '.')}`;
        if (i >= 3) {
          extraFalli.push(`${squadra} ${giocatore.num} - ${tempo} ${evento.sigla}`);
          return;
        }
        const x = 215.5 + i * 51;
        scrivi(tempo, x, x + 26.1, y, { corpo: 6.3 });
        scrivi(evento.sigla, x + 26.1, x + 51, y, { corpo: evento.sigla.length > 2 ? 5.8 : 6.8 });
      });
  });
}

function compilaRigaEventoVerbaleFIN(scrivi, campi, y, tempo, squadra, calotta, sigla, punteggio) {
  scrivi(tempo, campi[0], campi[1], y);
  const lato = squadra === 'B' ? 1 : 2;
  scrivi(calotta, campi[lato], campi[lato + 1], y);
  scrivi(sigla, campi[3], campi[4], y);
  scrivi(punteggio, campi[4], campi[5], y);
}

async function creaVerbaleFIN(gara, modello, incorporaFont) {
  const rigori = leggiTiriDiRigoreFIN(gara.tiriRigore);
  const { PDFDocument } = PDFLib;
  const base = await PDFDocument.load(modello);
  const dimensioni = base.getPage(0).getSize();
  if (base.getPageCount() !== 1 || Math.abs(dimensioni.width - FORMATO_VERBALE_FIN.larghezza) > 0.5 ||
      Math.abs(dimensioni.height - FORMATO_VERBALE_FIN.altezza) > 0.5 || base.getPage(0).getRotation().angle !== 0) {
    throw new Error('Modello del verbale FIN non valido. Ripristina il modello A4 orizzontale della v2.');
  }
  const pdf = await PDFDocument.create();
  const sfondo = await pdf.embedPage(base.getPage(0));
  const { font, txt } = await incorporaFont(pdf);
  pdf.setTitle('Verbale incontro di pallanuoto');
  
  const listaTempi = (typeof ORDINE_TEMPI !== 'undefined' && Array.isArray(ORDINE_TEMPI)) ? ORDINE_TEMPI : ORDINE_TEMPI_DEFAULT;
  const eventi = listaTempi.map(tempo => gara.eventi.filter(evento => evento.tempo === tempo));
  const righeNote = dividiNoteVerbaleFIN(txt(gara.noteArbitrali), font, 414, 7.1);
  const supplemento = [];
  const tiriPerPagina = CAMPI_EVENTO_FIN.length * RIGHE_RIGORI_FIN;
  const pagineVerbale = Math.max(1,
    ...eventi.map(periodo => Math.ceil(periodo.length / RIGHE_EVENTI_FIN)),
    Math.ceil(rigori.tiri.length / tiriPerPagina));

  for (let foglio = 0; foglio < pagineVerbale; foglio += 1) {
    const pagina = pdf.addPage([dimensioni.width, dimensioni.height]);
    pagina.drawPage(sfondo);
    const scrivi = scritturaVerbaleFIN(pagina, font, txt);
    compilaIntestazioneVerbaleFIN(scrivi, gara);
    if (foglio === 0) {
      compilaSquadraVerbaleFIN(scrivi, gara.sqBianca, 'B', gara.scoreB + rigori.punteggio.B, gara.rosterB, eventi, supplemento);
      compilaSquadraVerbaleFIN(scrivi, gara.sqNera, 'N', gara.scoreN + rigori.punteggio.N, gara.rosterN, eventi, supplemento);
      listaTempi.forEach((tempo, i) => {
        scrivi(gara.parziali[tempo].B, 443, 479.3, 48.1 + i * RIGA_VERBALE_FIN);
        scrivi(gara.parziali[tempo].N, 479.3, 516.1, 48.1 + i * RIGA_VERBALE_FIN);
      });
      scrivi(righeNote[0], 390, 813, 527.8, { allineamento: 'sinistra' });
      scrivi(righeNote[1], 370, 813, 540.7, { allineamento: 'sinistra' });
    } else {
      scrivi(`SEGUE VERBALE - FOGLIO ${foglio + 1}`, 27, 813, 17, { corpo: 8 });
      scrivi(gara.sqBianca.toUpperCase(), 27, 215.4, 81, { corpo: 11.5 });
      scrivi(gara.sqNera.toUpperCase(), 27, 215.4, 340.2, { corpo: 11.5 });
    }

    eventi.forEach((periodo, i) => {
      const inizio = foglio * RIGHE_EVENTI_FIN;
      const righe = periodo.slice(inizio, inizio + RIGHE_EVENTI_FIN);
      righe.forEach((evento, riga) => {
        compilaRigaEventoVerbaleFIN(scrivi, CAMPI_EVENTO_FIN[i], 152 + riga * RIGA_VERBALE_FIN,
          evento.minuto.replace(':', '.'), evento.squadra, evento.calotta, evento.sigla, evento.punteggio);
      });
      if (righe.length && righe.length < RIGHE_EVENTI_FIN) {
        CAMPI_EVENTO_FIN[i].slice(0, -1).forEach((x, j) => scrivi('-', x, CAMPI_EVENTO_FIN[i][j + 1], 152 + righe.length * RIGA_VERBALE_FIN));
      }
    });
    const primoTiro = foglio * tiriPerPagina;
    rigori.tiri.slice(primoTiro, primoTiro + tiriPerPagina).forEach((tiro, i) => {
      const colonne = CAMPI_EVENTO_FIN[Math.floor(i / RIGHE_RIGORI_FIN)];
      compilaRigaEventoVerbaleFIN(scrivi, colonne, 436.8 + (i % RIGHE_RIGORI_FIN) * RIGA_VERBALE_FIN,
        primoTiro + i + 1, tiro.squadra, tiro.calotta, tiro.esito, tiro.punteggio);
    });
  }

  const codaNote = righeNote.slice(2);
  if (supplemento.length) codaNote.push('FALLI PERSONALI - SEGUE', ...supplemento);
  for (let i = 0; i < codaNote.length; i += 34) {
    const pagina = pdf.addPage([dimensioni.width, dimensioni.height]);
    const scrivi = scritturaVerbaleFIN(pagina, font, txt);
    scrivi('VERBALE INCONTRO DI PALLANUOTO - NOTE, SEGUE', 27, 813, 40, { corpo: 12 });
    scrivi(`${gara.numeroGara ? `${gara.numeroGara} - ` : ''}${gara.sqBianca} / ${gara.sqNera} - ${dataVerbaleFIN(gara.dataGara)}`, 27, 813, 58, { corpo: 9 });
    codaNote.slice(i, i + 34).forEach((riga, j) => scrivi(riga, 27, 813, 82 + j * 14, { corpo: 9, allineamento: 'sinistra' }));
  }
  return pdf.save();
}
