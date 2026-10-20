const app = document.getElementById('app');
const PAGES = 9;
let entries = [], all = [], unknown = [], index = 0, revealed = false, page = null, round = 1, retry = false;

const KEY = n => `latein-unknown-${n}`;
function loadSaved(n) {
  try { return JSON.parse(localStorage.getItem(KEY(n))) || []; } catch (e) { return []; }
}
function save() {
  try {
    const keep = retry ? unknown.concat(entries.slice(index)) : unknown;
    if (keep.length) localStorage.setItem(KEY(page), JSON.stringify(keep.map(e => e.wort)));
    else localStorage.removeItem(KEY(page));
  } catch (e) {}
}

const pad = n => String(n).padStart(2, '0');
const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function showMenu() {
  page = null;
  app.innerHTML = `
    <h1>Latein Vokabeln</h1>
    <p class="hint">Seite wählen (Taste 1–9 oder antippen)</p>
    <div class="pages">${Array.from({ length: PAGES }, (_, i) =>
      { const k = loadSaved(i + 1).length;
        return `<button data-page="${i + 1}">${i + 1}${k ? `<small>${k} offen</small>` : ''}</button>`; }).join('')}</div>`;
}

async function startPage(n) {
  page = n;
  try {
    const res = await fetch(`data/${pad(n)}.json`);
    all = await res.json();
  } catch (e) {
    app.innerHTML = `<h1>Fehler</h1><p class="hint">Seite ${n} konnte nicht geladen werden.</p><button class="wide" data-action="menu">Zurück</button>`;
    return;
  }
  const saved = loadSaved(n);
  const open = all.filter(e => saved.includes(e.wort));
  if (open.length && open.length < all.length) {
    app.innerHTML = `
      <h1>Seite ${n}</h1>
      <p class="hint">${open.length} Einträge sind noch nicht gewusst.</p>
      <div><button class="wide" data-action="open">Nur diese ${open.length} üben</button>
      <button class="wide" data-action="full">Ganze Seite (${all.length})</button></div>`;
    return;
  }
  begin(all);
}

function begin(list) {
  round = 1;
  retry = list !== all;
  unknown = [];
  restart(list);
}

function restart(list = entries) {
  entries = shuffle(list);
  unknown = [];
  index = 0;
  revealed = false;
  render();
}

function rate(known) {
  if (!revealed) return;
  if (!known) unknown.push(entries[index]);
  revealed = false;
  index++;
  save();
  render();
}

function render() {
  if (index >= entries.length) {
    if (unknown.length) {
      app.innerHTML = `
        <h1>Runde ${round} fertig</h1>
        <p class="hint">${entries.length - unknown.length} gewusst, ${unknown.length} nicht gewusst.<br>Die nicht gewussten noch einmal abfragen?</p>
        <div><button class="wide" data-action="again">Ja, ${unknown.length} wiederholen</button>
        <button class="wide" data-action="menu">Später (bleibt gespeichert)</button></div>`;
    } else {
      app.innerHTML = `
        <h1>Alles gewusst!</h1>
        <p class="hint">Seite ${page} ist komplett als bekannt markiert.</p>
        <div><button class="wide" data-action="full">Ganze Seite neu üben</button>
        <button class="wide" data-action="menu">Andere Seite</button></div>`;
    }
    return;
  }
  const e = entries[index];
  app.innerHTML = `
    <div class="top"><button data-action="menu">← Seiten</button><span>Seite ${page} · ${index + 1} / ${entries.length}</span></div>
    <div class="card" data-action="next">
      <div class="wort">${esc(e.wort)}</div>
      <div class="bedeutung">${revealed ? esc(e.bedeutung) : ''}</div>
    </div>
    ${revealed
      ? `<div class="rate"><button class="no" data-action="no">✗ Nicht gewusst</button><button class="yes" data-action="yes">✓ Gewusst</button></div>
         <div class="foot">← nicht gewusst · → gewusst</div>`
      : `<div class="foot">Leertaste oder Tippen: Bedeutung zeigen</div>`}`;
}

function reveal() {
  if (!revealed) { revealed = true; render(); }
}

document.addEventListener('keydown', ev => {
  if (ev.code === 'Space') {
    ev.preventDefault();
    if (page === null) return;
    if (index >= entries.length) { if (unknown.length) again(); } else reveal();
  } else if (page !== null && index < entries.length && ev.key === 'ArrowRight') {
    rate(true);
  } else if (page !== null && index < entries.length && ev.key === 'ArrowLeft') {
    rate(false);
  } else if (page === null && /^[1-9]$/.test(ev.key)) {
    startPage(+ev.key);
  } else if (ev.key === 'Escape' && page !== null) {
    showMenu();
  } else if (ev.key === 'Enter' && page !== null && index >= entries.length) {
    if (unknown.length) again();
  }
});

function again() {
  round++;
  retry = true;
  restart(unknown);
}

app.addEventListener('click', ev => {
  const t = ev.target.closest('[data-page],[data-action]');
  if (!t) return;
  if (t.dataset.page) return startPage(+t.dataset.page);
  switch (t.dataset.action) {
    case 'menu': return showMenu();
    case 'again': return again();
    case 'next': return reveal();
    case 'yes': return rate(true);
    case 'no': return rate(false);
    case 'open': return begin(all.filter(e => loadSaved(page).includes(e.wort)));
    case 'full': return begin(all);
  }
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
showMenu();
