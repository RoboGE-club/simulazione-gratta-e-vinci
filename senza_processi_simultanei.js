/* 

Owner: Eduardo Bolognini - RoboGe 
Lavoro realizzato per un progetto scolatisco.

Questo file è di più facile comprensione se si desidera capire il funzionamento generale.
*/

const costo_per_grattavinci = 10;

// mancano i simboli e il gratta e vinci è da 2 euro. ritarare le probabilità

const importi_con_probabilità = {
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
};

const simboli_speciali = {
  "quadrifoglio": 10,
  "cornetto": 20,
  "ferro_di_cavallo": 50
};

const valori = Object.values(importi_con_probabilità).filter((v) => v > 0);
const minVal = Math.min(...valori);
const dimensione = Math.round(1 / minVal);
const lista = [];

for (const [simbolo, percentuale] of Object.entries(importi_con_probabilità)) {
    const count = Math.round(percentuale * dimensione);
    for (let i = 0; i < count; i++) {
        lista.push(simbolo);
    }
}

function random_con_pesi() {
    return lista[Math.floor(Math.random() * lista.length)];
}

function gioca() {
    var just_found_symbol = false
    const symbols = [];
    
    for (let i = 0; i < 3; i++) {
        let estratto;
        do {
            estratto = random_con_pesi();
        } while (simboli_speciali.hasOwnProperty(estratto) && just_found_symbol);

        if (simboli_speciali.hasOwnProperty(estratto)) {
            just_found_symbol = true;
        }

        symbols.push(estratto);
    }

    let guadagno = 0;

    for (let i = 0; i < symbols.length; i++) {
        if (Object.keys(simboli_speciali).includes(symbols[i])) {
            return {
                guadagno: simboli_speciali[symbols[i]],
                symbols: symbols
            }
        }
    }

    if (symbols[0] == symbols[1] && symbols[1] == symbols[2]) {
        let guadagno = parseInt(symbols[0]);
    }

    

    return { guadagno: guadagno, symbols: symbols };
}

console.log(gioca())
