const { parentPort, workerData } = require('worker_threads')

// Costanti di gioco
const costoPerGratta = 2
const massSpendibile = 800
const max_per_simulazione = 365*2

// Distribuzione pesi
const importiConProb = {
  0: 71.45, 2: 15.47, 5: 8.81, 10: 2.94,
  20: 0.68, 50: 0.03, 100: 0.0072, 200: 0.00058,
  500: 0.00037, 1000: 0.000083, 100000: 0.00000926,
  quadrifoglio: 0.15, cornetto: 0.036, ferro_di_cavallo: 0.0018
}
const simboliSpeciali = { quadrifoglio:10, cornetto:20, ferro_di_cavallo:50 }

// Precalcolo cumulativo
const entries = Object.entries(importiConProb).map(([s,w])=>({s,w}))
const cum = []
let totPeso = 0
for (const e of entries) { totPeso += e.w; cum.push(totPeso) }

function randomSymbol(){
  const r = Math.random() * totPeso
  let lo=0, hi=cum.length-1
  while(lo<hi){ const m=(lo+hi)>>1; r<cum[m]?hi=m:lo=m+1 }
  return entries[lo].s
}

function gioca(){
  let found=false, seq=[]
  for(let i=0;i<3;i++){
    let s; do{ s=randomSymbol() } while(found && simboliSpeciali[s])
    if(simboliSpeciali[s]) found=true
    seq.push(s)
  }
  for(const s of seq) if(simboliSpeciali[s]) return { guadagno: simboliSpeciali[s] }
  if(seq[0]===seq[1] && seq[1]===seq[2]) return { guadagno: +seq[0] }
  return { guadagno: 0 }
}

function simula(n) {
  const risultati = [];
  let ok = 0, ko = 0;
  let spesaTot = 0, guadagnoTot = 0;
  const conteggioPremi = {};

  for (let i = 0; i < n; i++) {
    let budget = massSpendibile;
    let sp = 0, gu = 0;
    const det = [];
    
    let giocata_n = 0;


    while (budget >= costoPerGratta && giocata_n <= max_per_simulazione) {
      budget -= costoPerGratta;
      sp += costoPerGratta;
      const r = gioca();
      gu += r.guadagno;
      budget += r.guadagno;
      det.push(r);

      // Conteggio premi
      if (r.guadagno in conteggioPremi) {
        conteggioPremi[r.guadagno]++;
      } else {
        conteggioPremi[r.guadagno] = 1;
      }
      giocata_n++

    }

    const conv = gu > sp;
    if (conv) ok++; else ko++;
    spesaTot += sp;
    guadagnoTot += gu;

    risultati.push({
      time: i + 1,
      speso: sp,
      guadagnato: gu,
      convenuto: conv,
      n_giocate: det.length
    });

    if (i % 100 === 0) {
      parentPort.postMessage({ type: "progress", completed: i });
    }
  }

  return {
    convenuto: ok,
    nonConvenuto: ko,
    spesaTotale: spesaTot,
    guadagnoTotale: guadagnoTot,
    conteggioPremi,
    risultati
  };
}


const result = simula(workerData.n_simulazioni)
parentPort.postMessage({ type:'done', result })
