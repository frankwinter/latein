const app = document.getElementById('app');
const PAGES = 9;
let entries = [], index = 0, revealed = false, page = null;

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
      `<button data-page="${i + 1}">${i + 1}</button>`).join('')}</div>`;
}

async function startPage(n) {
  page = n;
  try {
    const res = await fetch(`data/${pad(n)}.json`);
    entries = await res.json();
  } catch (e) {
    app.innerHTML = `<h1>Fehler</h1><p class="hint">Seite ${n} konnte nicht geladen werden.</p><button class="wide" data-action="menu">Zurück</button>`;
    return;
  }
  restart();
}

function restart() {
  entries = shuffle(entries);
  index = 0;
  revealed = false;
  render();
}

function render() {
  if (index >= entries.length) {
    app.innerHTML = `
      <h1>Fertig!</h1>
      <p class="hint">Alle ${entries.length} Einträge von Seite ${page} wurden gezeigt.<br>Neu mischen und noch einmal?</p>
      <div><button class="wide" data-action="again">Ja, neu mischen</button>
      <button class="wide" data-action="menu">Andere Seite</button></div>`;
    return;
  }
  const e = entries[index];
  app.innerHTML = `
    <div class="top"><button data-action="menu">← Seiten</button><span>Seite ${page} · ${index + 1} / ${entries.length}</span></div>
    <div class="card" data-action="next">
      <div class="wort">${esc(e.wort)}</div>
      <div class="bedeutung">${revealed ? esc(e.bedeutung) : ''}</div>
    </div>
    <div class="foot">Leertaste oder Tippen: ${revealed ? 'nächstes Wort' : 'Bedeutung zeigen'}</div>`;
}

function advance() {
  if (revealed) { revealed = false; index++; } else { revealed = true; }
  render();
}

document.addEventListener('keydown', ev => {
  if (ev.code === 'Space') {
    ev.preventDefault();
    if (page === null) return;
    if (index >= entries.length) restart(); else advance();
  } else if (page === null && /^[1-9]$/.test(ev.key)) {
    startPage(+ev.key);
  } else if (ev.key === 'Escape' && page !== null) {
    showMenu();
  } else if (ev.key === 'Enter' && page !== null && index >= entries.length) {
    restart();
  }
});

app.addEventListener('click', ev => {
  const t = ev.target.closest('[data-page],[data-action]');
  if (!t) return;
  if (t.dataset.page) return startPage(+t.dataset.page);
  switch (t.dataset.action) {
    case 'menu': return showMenu();
    case 'again': return restart();
    case 'next': return advance();
  }
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
showMenu();
