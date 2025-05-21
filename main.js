const { Worker } = require('worker_threads')
const os = require('os')
const fs = require('fs')

let n_simulazioni_totali =  14000000
const n_workers = os.cpus().length

while (n_simulazioni_totali % n_workers !== 0) {
  n_simulazioni_totali++
}

const simulazioni_per_worker = n_simulazioni_totali / n_workers

console.log("Numero reale totale di simulazioni:", n_simulazioni_totali)

let convenuto_tot = 0
let non_convenuto_tot = 0
let spesa_totale = 0
let guadagno_totale = 0
let completati = 0

const conteggioPremi = {}

const progress_bar_length = 20
const progress_per_worker = new Array(n_workers).fill(0)
let ultimo_percentuale = -1

const startTime = Date.now()

const stream = fs.createWriteStream('risultati_simulazioni.jsonl', { flags: 'a' })

function aggiornaBarra() {
  const totale_completato = progress_per_worker.reduce((a, b) => a + b, 0)
  const percentuale = (totale_completato / n_simulazioni_totali) * 100
  const percentuale_rounded = Math.floor(percentuale * 10) / 10
  if (percentuale_rounded !== ultimo_percentuale) {
    ultimo_percentuale = percentuale_rounded
    const completato = Math.floor((percentuale / 100) * progress_bar_length)
    const barra = "█".repeat(completato) + "-".repeat(progress_bar_length - completato)
    process.stdout.write(`\rProgresso: [${barra}] ${percentuale_rounded.toFixed(1)}%`)
  }
}

for (let i = 0; i < n_workers; i++) {
  const worker = new Worker('./sim_worker.js', {
    workerData: { n_simulazioni: simulazioni_per_worker }
  })

  worker.on('message', (msg) => {
    if (msg.type === 'progress') {
      progress_per_worker[i] = msg.completed
      aggiornaBarra()
    } else if (msg.type === 'done') {
      const result = msg.result

      convenuto_tot += result.convenuto ?? 0
      non_convenuto_tot += result.nonConvenuto ?? 0
      spesa_totale += result.spesaTotale ?? 0
      guadagno_totale += result.guadagnoTotale ?? 0

      if (result.conteggioPremi) {
        for (const [k, v] of Object.entries(result.conteggioPremi)) {
          if (conteggioPremi[k]) {
            conteggioPremi[k] += v
          } else {
            conteggioPremi[k] = v
          }
        }
      }

      if (result.risultati && Array.isArray(result.risultati)) {
        for (const r of result.risultati) {
          stream.write(JSON.stringify(r) + '\n')
        }
      }

      completati++
      if (completati === n_workers) {
        aggiornaBarra()
        stream.end()
        process.stdout.write('\n')
        const elapsed = Date.now() - startTime
        console.log(`Tempo totale impiegato: ${elapsed} ms`)
        console.log('Convenuto (premi vinti dai giocatori):', convenuto_tot)
        console.log('Non convenuto (nessun premio):', non_convenuto_tot)

        const guadagno_netto = spesa_totale - guadagno_totale

        const summary = {
          simulazioni: n_simulazioni_totali,
          convenuto: convenuto_tot,
          non_convenuto: non_convenuto_tot,
          spesa_totale,
          guadagno_totale,
          guadagno_netto,
          conteggio_premi: conteggioPremi
        }

        fs.writeFileSync('riepilogo.json', JSON.stringify(summary, null, 2))
        console.log('File riepilogo.json creato.')
      }
    }
  })

  worker.on('error', (err) => {
    console.error('Errore worker:', err)
  })
}
