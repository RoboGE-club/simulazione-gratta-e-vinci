const { Worker } = require('worker_threads')
const os = require('os')
const fs = require('fs')

// Parametri
let n_simulazioni_totali = 10000
const max_workers = 4  // Limite per evitare oversubscription
const n_workers = Math.min(max_workers, os.cpus().length)

// Allinea il numero totale alle CPU
while (n_simulazioni_totali % n_workers !== 0) {
  n_simulazioni_totali++
}

const simulazioni_per_worker = n_simulazioni_totali / n_workers
console.log("Numero totale di simulazioni ottimizzato:", n_simulazioni_totali)

// Stream JSONL per salvare progressivamente
const stream = fs.createWriteStream('risultati_simulazioni.jsonl', { flags: 'a' })

// Variabili globali
let convenuto_tot = 0
let non_convenuto_tot = 0
let spesa_totale = 0
let guadagno_totale = 0
let completati = 0
const premiGlobali = {}

// Progress bar
const progress_bar_length = 20
const progress_per_worker = new Array(n_workers).fill(0)
let ultimo_percentuale = -1
function aggiornaBarra() {
  const totale = progress_per_worker.reduce((a, b) => a + b, 0)
  const pct = (totale / n_simulazioni_totali) * 100
  const pct_r = Math.floor(pct * 10) / 10
  if (pct_r !== ultimo_percentuale) {
    ultimo_percentuale = pct_r
    const filled = Math.floor((pct / 100) * progress_bar_length)
    const bar = "█".repeat(filled) + "-".repeat(progress_bar_length - filled)
    process.stdout.write(`\rProgresso: [${bar}] ${pct_r.toFixed(1)}%`)
  }
}

const startTime = Date.now()

// Crea worker
for (let i = 0; i < n_workers; i++) {
  const w = new Worker('./sim_worker.js', {
    workerData: { n_simulazioni: simulazioni_per_worker }
  })

  w.on('message', msg => {
    if (msg.type === 'progress') {
      progress_per_worker[i] = msg.completed
      aggiornaBarra()

    } else if (msg.type === 'done') {
      // Aggrega statistiche globali
      convenuto_tot += msg.result.convenuto
      non_convenuto_tot += msg.result.nonConvenuto
      spesa_totale += msg.result.spesaTot
      guadagno_totale += msg.result.guadagnoTot

      // Scrive linee JSON per ogni risultato
      msg.result.risultati.forEach(r => {
        stream.write(JSON.stringify(r) + '\n')
      })

      // Unisce contatori premi
      for (const [p, c] of Object.entries(msg.result.premiCounter)) {
        premiGlobali[p] = (premiGlobali[p] || 0) + c
      }

      completati++
      if (completati === n_workers) {
        aggiornaBarra()
        process.stdout.write('\n')
        stream.end()

        console.log(`Tempo totale: ${Date.now() - startTime} ms`)
        console.log('Convenuto:', convenuto_tot)
        console.log('Non convenuto:', non_convenuto_tot)
        console.log('Spesa totale:', spesa_totale)
        console.log('Guadagno totale:', guadagno_totale)
        console.log(`Guadagno del signor gratta e vinci: ${spesa_totale - guadagno_totale} €`)

        // Stampa tabella premi ordinata

        console.log(premiGlobali)
        
        const ordinati = Object.entries(premiGlobali)
          .map(([p, c]) => ({ premio: p, cnt: c }))
          .sort((a,b) => parseFloat(a.premio) - parseFloat(b.premio))
        console.table(ordinati)

        // Salva riepilogo
        const summary = {
          convenuto: convenuto_tot,
          non_convenuto: non_convenuto_tot,
          spesa_totale,
          guadagno_totale,
          guadagno_netto: guadagno_totale - spesa_totale,
          premi: ordinati
        }
        fs.writeFileSync('riepilogo.json', JSON.stringify(summary, null, 2))
        console.log('File riepilogo.json creato.')
      }
    }
  })
  w.on('error', err => console.error('Errore worker:', err))
}
