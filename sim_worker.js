const { parentPort, workerData } = require('worker_threads')

// Costanti di gioco
const costoPerGratta = 2
const massSpendibile = 800

// Distribuzione pesi
const importiConProb = {
    "100000": 0.08149,
    "1000": 0.21044,
    "500": 0.26348,
    "200": 0.33369,
    "100": 0.82025,
    "50": 1.21156,
    "20": 2.53856,
    "10": 2.66501,
    "5": 3.60514,
    "2": 4.33514,
    "0": 82.93525,
    "quadrifoglio": 1.00, 
    "cornetto": 0.75, 
    "ferro_di_cavallo": 0.5 
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

function simula(n){
  const premiCounter = {}
  const risultati = []
  let ok=0, ko=0, spesaTot=0, guadTot=0

  const step = Math.max(1000, Math.floor(n/100))
  for(let i=1;i<=n;i++){
    let sp=0, gu=0, countGiocate=0
    while(sp<=massSpendibile-costoPerGratta){
      sp+=costoPerGratta; countGiocate++
      const r=gioca()
      gu+=r.guadagno
      premiCounter[r.guadagno] = (premiCounter[r.guadagno]||0) + 1
    }
    const conv = sp<gu
    if(conv) {ok++} else {ko++}
    spesaTot += sp
    guadTot += gu
    risultati.push({ time:i, speso:sp, guadagnato:gu, convenuto:conv, n_giocate:countGiocate })
    if(i % step === 0) parentPort.postMessage({ type:'progress', completed:i })
  }
  return { convenuto:ok, nonConvenuto:ko, spesaTot, guadagnoTot:guadTot, risultati, premiCounter }
}

const result = simula(workerData.n_simulazioni)
parentPort.postMessage({ type:'done', result })
