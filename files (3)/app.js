(() => {
'use strict';

/* =========================================================
   SABİTLER
   ========================================================= */
const KEY = 'asistan_local_v1';

const BOXES = [
  { number: 1, title: 'Yeni Pasaj', icon: '✒️', purpose: 'Notaları ve ritmi doğru çözme.', question: 'Notaları ve ritmi doğru çözdün mü?' },
  { number: 2, title: 'Akıcılık Geliştir', icon: '🏃', purpose: 'Duraksamadan, yavaş tempoda çalma.', question: 'Duraksamadan, yavaş tempoda çalabildin mi?' },
  { number: 3, title: 'Tempo Kazan', icon: '🚀', purpose: 'Hedef tempoya yaklaşma.', question: 'Hedef tempoya yaklaşabildin mi?' },
  { number: 4, title: 'Farklı Ritimler', icon: '🥁', purpose: 'Pasajı noktalı veya triole ritimleriyle çalma.', question: 'Pasajı farklı ritim kalıplarıyla hatasız çalabiliyor musun?' },
  { number: 5, title: 'Müzikalite Kat', icon: '🎨', purpose: 'İfade ve dinamikleri ekleme.', question: 'İfade ve dinamikleri ekleyebildin mi?' },
  { number: 6, title: 'Zihinsel Pratik', icon: '🧘', purpose: 'Pasajı enstrümansız, zihinde canlandırma.', question: 'Enstrümana dokunmadan, pasajı zihninde net bir şekilde canlandırabildin mi?' },
  { number: 7, title: 'Kör Pratik', icon: '🙈', purpose: 'Enstrümana veya ellerine bakmadan çalma.', question: 'Gözlerin kapalıyken pasajı baştan sona çalabiliyor musun?' },
  { number: 8, title: 'Performansa Hazırla', icon: '✨', purpose: 'Ezberden, bütünsel ve müzikal olarak çalma.', question: 'Pasajı bir dinleyiciye çalar gibi, baştan sona ezberden çalabiliyor musun?' },
  { number: 9, title: 'Prova Sahnesi', icon: '🎭', purpose: 'Eseri baştan sona, bir dinleyiciye çalar gibi prova et.', question: 'Eseri baştan sona akıcı ve müzikal bir bütün olarak çalabiliyor musun?' }
];

const NOTE_CATS = {
  technical: { name: 'Teknik Not', color: '#0ea5e9', ph: 'Örn: 18. ölçüdeki zorlu atlamayı garantilemek için...' },
  artistic: { name: 'Sanatsal Yorum', color: '#9333ea', ph: 'Örn: Bu bölümde sakin bir göl yüzeyi gibi...' },
  historical: { name: 'Tarihsel Bağlam', color: '#059669', ph: 'Örn: Bu eser Barok dönemde yazıldığı için...' },
  analysis: { name: 'Form Analizi', color: '#d97706', ph: 'Örn: Ana tema 3. ölçüde başlıyor ve...' },
  feedback: { name: 'Öğretmen Tavsiyesi', color: '#e11d48', ph: 'Örn: Öğretmenim bu bölüm için "daha nefesli bir ton"...' },
  general: { name: 'Genel Not', color: '#64748b', ph: 'Bu eserle ilgili genel düşüncelerin...' }
};

/* =========================================================
   YARDIMCILAR
   ========================================================= */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const num = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const dayKey = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const fmtClock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const fmtMin = (sec) => (sec < 60 ? `${sec} sn` : `${Math.round(sec / 60)} dk`);
const fmtDate = (ts) => new Date(ts).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* =========================================================
   VERİ (localStorage)
   ========================================================= */
const defaults = () => ({
  projects: {}, activeProject: null, sessions: [], rehearsals: [], masteredLog: [],
  settings: { theme: null, threshold: 5, workMin: 25, breakMin: 5 }
});

function load() {
  try {
    const r = JSON.parse(localStorage.getItem(KEY));
    if (!r) return defaults();
    const d = defaults();
    return { ...d, ...r, settings: { ...d.settings, ...(r.settings || {}) } };
  } catch (e) { return defaults(); }
}
let S = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('Kaydedilemedi: ' + e.message); }
}

const ui = { view: 'dashboard', tab: 'cards', box: 1, sidebar: false, menu: false, noteCat: 'all' };

/* =========================================================
   TOAST / MODAL / ONAY
   ========================================================= */
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}
function openModal(title, body, wide) {
  $('#modal-root').innerHTML = `<div class="overlay" data-action="close-modal-bg"><div class="modal ${wide ? 'wide' : ''}" role="dialog">
    <div class="modal-h"><h3>${title}</h3><button class="x" data-action="close-modal" aria-label="Kapat">&times;</button></div>
    <div class="modal-b">${body}</div></div></div>`;
}
function closeModal() {
  $('#modal-root').innerHTML = '';
  stopMetro(); stopTuner();
}
function ask(msg, ok = 'Onayla', danger = false) {
  return new Promise((res) => {
    const root = $('#confirm-root');
    root.innerHTML = `<div class="overlay"><div class="modal"><div class="modal-b"><p>${esc(msg)}</p>
      <div class="row end" style="margin-top:18px"><button class="btn" id="c-no">İptal</button>
      <button class="btn ${danger ? 'danger' : 'primary'}" id="c-yes">${esc(ok)}</button></div></div></div></div>`;
    $('#c-no').onclick = () => { root.innerHTML = ''; res(false); };
    $('#c-yes').onclick = () => { root.innerHTML = ''; res(true); };
  });
}

/* =========================================================
   TEMA
   ========================================================= */
function isDark() {
  return S.settings.theme === 'dark' || (!S.settings.theme && matchMedia('(prefers-color-scheme: dark)').matches);
}
function applyTheme() { document.documentElement.classList.toggle('dark', isDark()); }

/* =========================================================
   İSTATİSTİK
   ========================================================= */
const allCards = () => Object.values(S.projects).flatMap((p) => p.cards);
const isMastered = (c, p) => c.box === 9 && c.count >= p.threshold;

function dayMap(list = S.sessions) {
  const m = {};
  list.forEach((s) => { m[s.date] = (m[s.date] || 0) + s.seconds; });
  return m;
}
function streak() {
  const m = dayMap(); const d = new Date(); let cur = 0;
  if (!m[dayKey(d)]) d.setDate(d.getDate() - 1);
  while (m[dayKey(d)]) { cur++; d.setDate(d.getDate() - 1); }
  return cur;
}
function bestStreak() {
  const keys = Object.keys(dayMap()).sort();
  let best = 0, run = 0, prev = null;
  keys.forEach((k) => {
    if (prev) { const diff = Math.round((new Date(k) - new Date(prev)) / 86400000); run = diff === 1 ? run + 1 : 1; } else run = 1;
    best = Math.max(best, run); prev = k;
  });
  return best;
}
const totalSeconds = () => S.sessions.reduce((a, s) => a + s.seconds, 0);

const BADGES = [
  { slug: 'first-project', icon: '🌱', name: 'İlk Adım', desc: 'İlk eserini oluşturdun.', ok: () => Object.keys(S.projects).length >= 1 || S.masteredLog.length > 0 },
  { slug: 'streak-3', icon: '🔥', name: 'Ateşleyici', desc: '3 günlük pratik zincirine ulaştın.', ok: () => bestStreak() >= 3 },
  { slug: 'streak-7', icon: '☄️', name: 'Alev Topu', desc: '7 günlük pratik zincirine ulaştın.', ok: () => bestStreak() >= 7 },
  { slug: 'master-first', icon: '👑', name: 'Ustalığa Giden Yol', desc: 'Bir eserdeki tüm kartlarda ustalaştın.', ok: () => S.masteredLog.length >= 1 },
  { slug: 'cards-50', icon: '🗂️', name: 'Kart Koleksiyoncusu', desc: 'Toplamda 50 çalışma kartı oluşturdun.', ok: () => allCards().length >= 50 },
  { slug: 'hour', icon: '⏱️', name: 'Bir Saatlik Emek', desc: 'Toplam 1 saat çalıştın.', ok: () => totalSeconds() >= 3600 }
];

function weekChart(sessions) {
  const m = dayMap(sessions); const days = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
  const mins = days.map((d) => Math.round((m[dayKey(d)] || 0) / 60));
  const max = Math.max(10, ...mins);
  return `<div class="bars">${days.map((d, i) => `<div class="bar"><span>${mins[i]}</span><i style="height:${(mins[i] / max) * 100}%"></i><span>${d.toLocaleDateString('tr-TR', { weekday: 'short' })}</span></div>`).join('')}</div>`;
}

/* =========================================================
   TEMPO BASAMAKLARI (3. kutu: Tempo Kazan)
   ========================================================= */
const TEMPO_STEP = 5;
const hasRamp = (c) => c.bpmStart && c.bpmTarget && c.bpmTarget > c.bpmStart;
const tempoNow = (c) => (hasRamp(c) ? clamp(c.tempo || c.bpmStart, c.bpmStart, c.bpmTarget) : c.bpmStart);
function tempoSteps(c) {
  const a = [];
  for (let t = c.bpmStart; t < c.bpmTarget; t += TEMPO_STEP) a.push(t);
  a.push(c.bpmTarget);
  return a;
}

/* =========================================================
   KART DEĞERLENDİRME (Leitner)
   ========================================================= */
function grade(p, c, ok) {
  c.history = c.history || [];
  c.history.push({ ts: Date.now(), ok, box: c.box });
  if (c.history.length > 200) c.history.shift();
  let msg;
  if (ok) {
    if (isMastered(c, p)) { msg = '🏅 Bu kart zaten ustalaşmış.'; }
    else {
      c.count = Math.min(c.count + 1, p.threshold);
      if (c.count >= p.threshold) {
        if (c.box === 3 && hasRamp(c) && tempoNow(c) < c.bpmTarget) {
          c.tempo = Math.min(tempoNow(c) + TEMPO_STEP, c.bpmTarget); c.count = 0;
          msg = `🚀 Tempo ${c.tempo} BPM'e yükseldi (hedef ${c.bpmTarget})`;
        }
        else if (c.box < 9) { c.box++; c.count = 0; if (c.box === 3) c.tempo = null; msg = `🎉 Kart ${c.box}. kutuya yükseldi: ${BOXES[c.box - 1].title}`; }
        else { msg = '🏅 Kart ustalaştı!'; checkMastery(p); }
      } else msg = `Başarı ${c.count}/${p.threshold}`;
    }
  } else {
    c.count = 0;
    if (c.box > 1) { c.box--; msg = `Kart ${c.box}. kutuya geri döndü.`; }
    else msg = 'Sorun değil, 1. kutuda tekrar dene.';
  }
  c.lastReviewed = Date.now();
  save();
  return msg;
}
function checkMastery(p) {
  if (p.cards.length && p.cards.every((c) => isMastered(c, p)) && !S.masteredLog.includes(p.id)) {
    S.masteredLog.push(p.id);
    setTimeout(() => toast(`👑 "${p.name}" eserinde ustalaştın!`), 1800);
  }
}

/* =========================================================
   GÖRÜNÜMLER
   ========================================================= */
function render() {
  applyTheme();
  $('#app').classList.toggle('side-open', ui.sidebar);
  renderSidebar();
  const v = $('#view');
  const p = S.projects[S.activeProject];
  if (ui.view === 'project' && !p) ui.view = 'dashboard';
  v.innerHTML = ({
    dashboard: viewDashboard, project: () => viewProject(p), rehearsal: viewRehearsal,
    notebook: viewNotebook, achievements: viewAchievements, settings: viewSettings
  }[ui.view] || viewDashboard)();
}

function renderSidebar() {
  const nav = [['dashboard', '🏠', 'Genel Bakış'], ['rehearsal', '🎭', 'Prova Sahnesi'], ['notebook', '📝', 'Not Defterim'], ['achievements', '🏆', 'Başarımlar'], ['settings', '⚙️', 'Ayarlar']];
  const ps = Object.values(S.projects).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  $('#sidebar').innerHTML = `
    <div class="brand"><span>📖</span> Asistan</div>
    ${nav.map(([v, i, t]) => `<button class="navbtn ${ui.view === v ? 'on' : ''}" data-action="nav" data-view="${v}"><span>${i}</span>${t}</button>`).join('')}
    <button class="btn primary block" data-action="new-project" style="margin-top:10px">+ Yeni Eser</button>
    <div class="side-title">Tüm Eserler</div>
    <div class="proj-list">
      ${ps.length ? ps.map((p) => `<button class="navbtn ${ui.view === 'project' && S.activeProject === p.id ? 'on' : ''}" data-action="open-project" data-id="${p.id}">🎼 <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}</span></button>`).join('') : '<p class="muted small" style="padding:6px 12px">Henüz eser yok.</p>'}
    </div>
    <button class="navbtn" data-action="open-tools">🔧 Araçlar (Metronom / Akort)</button>
    <button class="navbtn" data-action="open-method">🎓 Çalışma Yöntemi</button>
    <button class="navbtn" data-action="toggle-theme">${isDark() ? '☀️ Açık Mod' : '🌙 Koyu Mod'}</button>`;
}

function viewDashboard() {
  const ps = Object.values(S.projects);
  const cards = allCards();
  const today = dayMap()[dayKey()] || 0;
  if (!ps.length) {
    return `<div class="empty panel"><div class="big-i">🎼</div><h2>Hoş geldin!</h2>
      <p>Çalışmaya başlamak için ilk eserini oluştur.</p>
      <p class="small">Verilerin yalnızca bu tarayıcıda, cihazında saklanır.</p>
      <button class="btn primary big" data-action="new-project" style="margin-top:14px">+ İlk Eserini Oluştur</button></div>`;
  }
  const counts = BOXES.map((b) => cards.filter((c) => c.box === b.number).length);
  const maxC = Math.max(1, ...counts);
  return `
    <div class="page-h"><h1>Genel Bakış</h1></div>
    <div class="grid" style="margin-bottom:16px">
      <div class="stat"><span class="muted small">🔥 Pratik zinciri</span><b>${streak()} gün</b></div>
      <div class="stat"><span class="muted small">⏱️ Bugün</span><b>${fmtMin(today)}</b></div>
      <div class="stat"><span class="muted small">🎼 Eser</span><b>${ps.length}</b></div>
      <div class="stat"><span class="muted small">🗂️ Kart</span><b>${cards.length}</b></div>
    </div>
    <div class="panel"><h3>Son 7 gün (dakika)</h3>${weekChart(S.sessions)}</div>
    <div class="panel"><h3>Kutulara göre kartlar</h3>
      ${BOXES.map((b, i) => `<div class="hbar"><span class="lbl">${b.icon} ${b.number}. ${esc(b.title)}</span><span class="track"><i style="width:${(counts[i] / maxC) * 100}%"></i></span><span class="num">${counts[i]}</span></div>`).join('')}
    </div>
    <div class="panel"><h3>Eserlerim</h3>
      ${ps.map((p) => {
        const done = p.cards.filter((c) => isMastered(c, p)).length;
        const pct = p.cards.length ? (done / p.cards.length) * 100 : 0;
        return `<div class="card-item" style="cursor:pointer" data-action="open-project" data-id="${p.id}">
          <div><div class="ci-title">${esc(p.name)}</div><div class="muted small">${esc(p.composer || '')}</div></div>
          <div class="ci-side"><div class="progress"><i style="width:${pct}%"></i></div><span class="small muted">${done}/${p.cards.length} ustalaşan kart</span></div></div>`;
      }).join('')}
    </div>`;
}

function viewProject(p) {
  const tempo = p.baseTempo && p.targetTempo ? `<span class="chip">🎵 ${p.baseTempo} → ${p.targetTempo} BPM</span>` : '<span class="chip amber">Tempo ayarlanmadı</span>';
  const studyable = p.cards.filter((c) => c.box < 9).length;
  let body = '';
  if (ui.tab === 'cards') body = projectCards(p);
  else if (ui.tab === 'notes') body = projectNotes(p);
  else body = projectReport(p);
  return `
    <div class="page-h">
      <div><h1>${esc(p.name)}</h1><div>${tempo}${p.composer ? `<span class="muted small">${esc(p.composer)}</span>` : ''}</div></div>
      <div class="row">
        <button class="btn primary" data-action="study-all" ${studyable ? '' : 'disabled style="opacity:.5"'}>▶ Tümünü Çalış</button>
        ${p.mode === 'whole' ? '' : '<button class="btn" data-action="new-card">+ Kart</button>'}
        <div class="menu-wrap"><button class="btn icon" data-action="toggle-menu" aria-label="Seçenekler">⋮</button>
          ${ui.menu ? `<div class="menu"><button data-action="edit-project">Eser Bilgilerini Düzenle</button><button class="danger-t" data-action="delete-project">Eseri Sil</button></div>` : ''}</div>
      </div>
    </div>
    <div class="tabs">${[['cards', 'Kartlar'], ['notes', 'Notlar'], ['report', 'Rapor']].map(([t, l]) => `<button class="tab ${ui.tab === t ? 'on' : ''}" data-action="set-tab" data-t="${t}">${l}</button>`).join('')}</div>
    ${body}`;
}

function projectCards(p) {
  if (!p.cards.length) {
    return `<div class="empty panel"><div class="big-i">🗂️</div><p>Bu eserde henüz kart yok.</p><p class="small">Her kart, eserin çalışmak istediğin küçük bir pasajıdır (örn. "Ölçü 1–8").</p>
      <button class="btn primary" data-action="new-card" style="margin-top:10px">+ İlk Kartı Ekle</button></div>`;
  }
  const B = BOXES[ui.box - 1];
  const list = p.cards.filter((c) => c.box === ui.box);
  const whole = p.mode === 'whole';
  const cur = whole && p.cards[0] ? p.cards[0].box : 0;
  const emptyMsg = whole
    ? `Eser şu anda <strong>${cur}. kutuda</strong> (${esc(BOXES[cur - 1].title)}). <button class="btn sm" data-action="set-box" data-n="${cur}">Oraya git</button>`
    : 'Bu kutuda kart yok.';
  return `
    <div class="boxtabs">${BOXES.map((b) => `<button class="boxtab ${ui.box === b.number ? 'on' : ''} ${whole && b.number < cur ? 'done' : ''} ${whole && b.number === cur ? 'cur' : ''}" data-action="set-box" data-n="${b.number}">${whole && b.number < cur ? '✓' : b.icon} ${b.number}<span class="count">${p.cards.filter((c) => c.box === b.number).length}</span></button>`).join('')}</div>
    <div class="row between" style="margin-bottom:12px"><div><strong>${B.icon} ${B.number}. ${esc(B.title)}</strong><div class="muted small">${esc(B.purpose)}</div></div>
      ${list.length ? `<button class="btn sm primary" data-action="study-box">▶ Bu kutuyu çalış</button>` : ''}</div>
    ${list.length ? list.map((c) => cardItem(c, p, whole)).join('') : `<div class="empty">${emptyMsg}</div>`}
    ${whole ? '<div style="margin-top:16px"><button class="btn sm" data-action="split-project">✂️ Eseri bölüp kartlara ayır</button></div>' : ''}`;
}

function cardItem(c, p, whole) {
  const pct = isMastered(c, p) ? 100 : (c.count / p.threshold) * 100;
  const ramp = c.box === 3 && hasRamp(c);
  const tempo = c.bpmStart || c.bpmTarget ? `<span class="chip">♩ ${c.bpmStart || '?'} → ${c.bpmTarget || '?'}</span>` : '';
  const stepsHtml = ramp ? `<div class="tsteps">${tempoSteps(c).map((t) => `<span class="${t < tempoNow(c) ? 'past' : t === tempoNow(c) ? 'now' : ''}">${t}</span>`).join('')}</div>` : '';
  return `<div class="card-item">
    <div><div class="ci-title">${esc(c.title)} ${isMastered(c, p) ? '🏅' : ''}</div>
      ${c.desc ? `<div class="muted small">${esc(c.desc)}</div>` : ''}
      <div class="chips">${tempo}${(c.tags || []).map((t) => `<span class="chip">#${esc(t)}</span>`).join('')}</div>${stepsHtml}</div>
    <div class="ci-side"><div class="progress"><i style="width:${pct}%"></i></div><span class="small muted">${c.count}/${p.threshold}</span>
      ${whole ? '' : `<div class="row"><button class="btn sm" data-action="edit-card" data-id="${c.id}">Düzenle</button><button class="btn sm" data-action="delete-card" data-id="${c.id}">Sil</button></div>`}</div></div>`;
}

function projectNotes(p) {
  const opts = Object.entries(NOTE_CATS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('');
  const notes = (p.notes || []).slice().sort((a, b) => b.ts - a.ts);
  return `<form class="panel" data-form="note"><input type="hidden" name="pid" value="${p.id}">
      <label>Kategori<select name="cat" id="note-cat" data-change="note-cat">${opts}</select></label>
      <label>Not<textarea name="text" id="note-text" required placeholder="${esc(NOTE_CATS.technical.ph)}"></textarea></label>
      <button class="btn primary">Notu Kaydet</button></form>
    ${notes.length ? notes.map((n) => noteHtml(n, p.id)).join('') : '<div class="empty">Henüz not yok.</div>'}`;
}
function noteHtml(n, pid, withProject) {
  const cat = NOTE_CATS[n.cat] || NOTE_CATS.general;
  return `<div class="note" style="border-left-color:${cat.color}">
    <div class="row between"><span class="chip" style="background:${cat.color}22;color:${cat.color}">${cat.name}</span>
    <span class="muted small">${withProject ? esc(withProject) + ' · ' : ''}${fmtDate(n.ts)}</span></div>
    <p>${esc(n.text)}</p>
    <button class="btn sm" data-action="delete-note" data-pid="${pid}" data-id="${n.id}">Sil</button></div>`;
}

function projectReport(p) {
  const ss = S.sessions.filter((s) => s.projectId === p.id);
  const secs = ss.reduce((a, s) => a + s.seconds, 0);
  const hist = p.cards.flatMap((c) => c.history || []);
  const okRate = hist.length ? Math.round((hist.filter((h) => h.ok).length / hist.length) * 100) : 0;
  const mastered = p.cards.filter((c) => isMastered(c, p)).length;
  return `<div class="grid" style="margin-bottom:16px">
      <div class="stat"><span class="muted small">Toplam süre</span><b>${fmtMin(secs)}</b></div>
      <div class="stat"><span class="muted small">Seans sayısı</span><b>${ss.length}</b></div>
      <div class="stat"><span class="muted small">Başarı oranı</span><b>%${okRate}</b></div>
      <div class="stat"><span class="muted small">Ustalaşan kart</span><b>${mastered}/${p.cards.length}</b></div></div>
    <div class="panel"><h3>Son 7 gün (dakika)</h3>${weekChart(ss)}</div>
    <div class="panel"><h3>Son seanslar</h3>
      ${ss.length ? ss.slice(-8).reverse().map((s) => `<div class="row between" style="padding:6px 0;border-bottom:1px solid var(--line)"><span>${fmtDate(s.ts)}</span><span class="muted">${fmtMin(s.seconds)} · ✔ ${s.ok} ✖ ${s.fail}</span></div>`).join('') : '<p class="muted">Henüz seans yok.</p>'}</div>`;
}

function viewRehearsal() {
  const ps = Object.values(S.projects).filter((p) => p.cards.some((c) => c.box === 9));
  return `<div class="page-h"><div><h1>🎭 Prova Sahnesi</h1><p class="muted">9. kutuya ulaşan pasajlar burada. Bir dinleyiciye çalar gibi baştan sona çal.</p></div></div>
    ${ps.length ? ps.map((p) => {
      const list = p.cards.filter((c) => c.box === 9);
      return `<div class="panel"><div class="row between"><h3>${esc(p.name)}</h3><button class="btn sm primary" data-action="study-rehearsal" data-id="${p.id}">▶ Prova Başlat</button></div>
        ${list.map((c) => `<div class="row between" style="padding:8px 0;border-bottom:1px solid var(--line)"><span>${esc(c.title)} ${isMastered(c, p) ? '🏅' : ''} <span class="muted small">${c.count}/${p.threshold}</span></span>
          <span class="row"><button class="btn sm ok" data-action="rehearse-grade" data-ok="1" data-pid="${p.id}" data-id="${c.id}">✔ Çaldım</button><button class="btn sm" data-action="rehearse-grade" data-ok="0" data-pid="${p.id}" data-id="${c.id}">Olmadı</button></span></div>`).join('')}</div>`;
    }).join('') : `<div class="empty panel"><div class="big-i">🎭</div><p>Henüz 9. kutuya ulaşan kart yok.</p></div>`}`;
}

function viewNotebook() {
  const all = Object.values(S.projects).flatMap((p) => (p.notes || []).map((n) => ({ ...n, pid: p.id, pname: p.name })))
    .filter((n) => ui.noteCat === 'all' || n.cat === ui.noteCat).sort((a, b) => b.ts - a.ts);
  const filters = [['all', 'Tümü'], ...Object.entries(NOTE_CATS).map(([k, v]) => [k, v.name])];
  return `<div class="page-h"><h1>📝 Not Defterim</h1></div>
    <div class="boxtabs">${filters.map(([k, l]) => `<button class="boxtab ${ui.noteCat === k ? 'on' : ''}" data-action="note-filter" data-cat="${k}">${l}</button>`).join('')}</div>
    ${all.length ? all.map((n) => noteHtml(n, n.pid, n.pname)).join('') : '<div class="empty panel">Not bulunamadı. Notları eser sayfasındaki "Notlar" sekmesinden ekleyebilirsin.</div>'}`;
}

function viewAchievements() {
  return `<div class="page-h"><h1>🏆 Başarımlar</h1></div>
    <div class="grid">${BADGES.map((b) => `<div class="badge ${b.ok() ? '' : 'locked'}"><div class="ic">${b.icon}</div><strong>${b.name}</strong><p class="muted small">${b.desc}</p></div>`).join('')}</div>`;
}

function viewSettings() {
  const st = S.settings;
  return `<div class="page-h"><h1>⚙️ Ayarlar</h1></div>
    <form class="panel" data-form="settings"><h3>Çalışma</h3>
      <div class="grid2"><label>Pomodoro çalışma (dk)<input type="number" name="workMin" min="1" max="120" value="${st.workMin}"></label>
      <label>Mola (dk)<input type="number" name="breakMin" min="1" max="60" value="${st.breakMin}"></label></div>
      <label>Yeni eserler için varsayılan ustalık eşiği<input type="number" name="threshold" min="1" max="20" value="${st.threshold}"></label>
      <button class="btn primary">Kaydet</button></form>
    <div class="panel"><h3>Veri</h3><p class="muted">Tüm verilerin bu tarayıcıda (localStorage) saklanır. Düzenli yedek almanı öneririm.</p>
      <div class="row" style="margin-top:10px"><button class="btn" data-action="export">⬇ Yedek İndir</button>
      <button class="btn" data-action="import">⬆ Yedekten Yükle</button>
      <input type="file" id="import-file" accept=".json,application/json" class="hidden">
      <button class="btn danger" data-action="reset">Tüm Verileri Sil</button></div></div>`;
}

/* =========================================================
   FORMLAR
   ========================================================= */
function projectForm(p = {}) {
  return `<form data-form="project"><input type="hidden" name="id" value="${esc(p.id || '')}">
    <label>Eser adı<input name="name" required maxlength="80" value="${esc(p.name || '')}" placeholder="Örn: Bach – Prelüd No.1"></label>
    <label>Besteci / not<input name="composer" maxlength="80" value="${esc(p.composer || '')}"></label>
    <div class="grid2"><label>Başlangıç BPM<input type="number" name="baseTempo" min="20" max="300" value="${p.baseTempo || ''}"></label>
    <label>Hedef BPM<input type="number" name="targetTempo" min="20" max="300" value="${p.targetTempo || ''}"></label></div>
    ${p.id
      ? (p.mode === 'whole' ? `<label class="opt"><input type="checkbox" name="toSplit"><span>Eseri bölüp kartlarla çalışmaya geç</span></label>` : '')
      : `<div class="muted small" style="font-weight:600;margin-bottom:6px">Nasıl çalışacaksın?</div>
         <label class="opt"><input type="radio" name="mode" value="whole" checked><span><strong>Eserin tümünü çalış</strong><br><span class="muted small">Eser tek bir kart olarak çalışılır. Kart eklemen gerekmez.</span></span></label>
         <label class="opt"><input type="radio" name="mode" value="split"><span><strong>Bölüp kartlarla çalış</strong><br><span class="muted small">Eseri pasajlara ayırıp her pasaj için ayrı kart eklersin.</span></span></label>`}
    <label>Ustalık eşiği <span class="muted">(bir sonraki kutuya geçmek için gereken başarılı tekrar)</span><input type="number" name="threshold" min="1" max="20" value="${p.threshold || S.settings.threshold}"></label>
    <div class="row end"><button type="button" class="btn" data-action="close-modal">İptal</button><button class="btn primary">Kaydet</button></div></form>`;
}
function cardForm(p, c = {}) {
  return `<form data-form="card"><input type="hidden" name="pid" value="${p.id}"><input type="hidden" name="id" value="${esc(c.id || '')}">
    <label>Başlık<input name="title" required maxlength="80" value="${esc(c.title || '')}" placeholder="Örn: Ölçü 1–8"></label>
    <label>Açıklama<textarea name="desc" maxlength="400" placeholder="Bu pasajda neye dikkat etmelisin?">${esc(c.desc || '')}</textarea></label>
    <div class="grid2"><label>Başlangıç BPM<input type="number" name="bpmStart" min="20" max="300" value="${c.bpmStart || p.baseTempo || ''}"></label>
    <label>Hedef BPM<input type="number" name="bpmTarget" min="20" max="300" value="${c.bpmTarget || p.targetTempo || ''}"></label></div>
    <label>Etiketler <span class="muted">(virgülle ayır)</span><input name="tags" value="${esc((c.tags || []).join(', '))}"></label>
    ${c.id ? `<label>Kutu<select name="box">${BOXES.map((b) => `<option value="${b.number}" ${b.number === c.box ? 'selected' : ''}>${b.number}. ${b.title}</option>`).join('')}</select></label>` : ''}
    <div class="row end"><button type="button" class="btn" data-action="close-modal">İptal</button><button class="btn primary">Kaydet</button></div></form>`;
}

const forms = {
  project(fd) {
    const name = fd.get('name').trim(); if (!name) return;
    const data = { name, composer: fd.get('composer').trim(), baseTempo: num(fd.get('baseTempo')), targetTempo: num(fd.get('targetTempo')), threshold: clamp(num(fd.get('threshold')) || 5, 1, 20) };
    const id = fd.get('id');
    if (id && S.projects[id]) {
      const p = S.projects[id];
      Object.assign(p, data);
      if (p.mode === 'whole') {
        if (fd.get('toSplit')) p.mode = 'split';
        else if (p.cards[0]) {
          const c0 = p.cards[0];
          if (c0.bpmStart !== data.baseTempo || c0.bpmTarget !== data.targetTempo) c0.tempo = null;
          Object.assign(c0, { title: data.name, bpmStart: data.baseTempo, bpmTarget: data.targetTempo });
        }
      }
    } else {
      const mode = fd.get('mode') === 'split' ? 'split' : 'whole';
      const p = { id: uid(), createdAt: Date.now(), cards: [], notes: [], mode, ...data };
      if (mode === 'whole') {
        p.cards.push({ id: uid(), box: 1, count: 0, history: [], createdAt: Date.now(), title: name, desc: '', bpmStart: data.baseTempo, bpmTarget: data.targetTempo, tags: [] });
      }
      S.projects[p.id] = p; S.activeProject = p.id; ui.view = 'project'; ui.tab = 'cards'; ui.box = 1;
    }
    save(); closeModal(); render();
  },
  card(fd) {
    const p = S.projects[fd.get('pid')]; if (!p) return;
    const title = fd.get('title').trim(); if (!title) return;
    const data = {
      title, desc: fd.get('desc').trim(), bpmStart: num(fd.get('bpmStart')), bpmTarget: num(fd.get('bpmTarget')),
      tags: fd.get('tags').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 6)
    };
    const id = fd.get('id');
    if (id) {
      const c = p.cards.find((x) => x.id === id);
      if (c) {
        const changed = c.bpmStart !== data.bpmStart || c.bpmTarget !== data.bpmTarget;
        Object.assign(c, data);
        if (changed) c.tempo = null;
        const nb = clamp(num(fd.get('box')) || c.box, 1, 9);
        if (nb !== c.box) { c.box = nb; c.count = 0; c.tempo = null; }
        ui.box = c.box;
      }
    } else { p.cards.push({ id: uid(), box: 1, count: 0, history: [], createdAt: Date.now(), ...data }); ui.box = 1; }
    save(); closeModal(); render();
  },
  note(fd, form) {
    const p = S.projects[fd.get('pid')]; const text = fd.get('text').trim(); if (!p || !text) return;
    (p.notes = p.notes || []).push({ id: uid(), cat: fd.get('cat'), text, ts: Date.now() });
    save(); render(); toast('Not kaydedildi.');
  },
  settings(fd) {
    S.settings.workMin = clamp(num(fd.get('workMin')) || 25, 1, 120);
    S.settings.breakMin = clamp(num(fd.get('breakMin')) || 5, 1, 60);
    S.settings.threshold = clamp(num(fd.get('threshold')) || 5, 1, 20);
    save(); toast('Ayarlar kaydedildi.');
  }
};

/* =========================================================
   ÇALIŞMA SEANSI (Pomodoro + Harmanlanmış Pratik)
   ========================================================= */
let sess = null; let sessTimer = null;

function interleave(cards) {
  const groups = {};
  cards.forEach((c) => (groups[c.box] = groups[c.box] || []).push(c));
  const lists = Object.keys(groups).sort((a, b) => a - b).map((k) => shuffle(groups[k]));
  const out = [];
  while (lists.some((l) => l.length)) lists.forEach((l) => { if (l.length) out.push(l.shift()); });
  return out;
}

function startSession(pid, box) {
  const p = S.projects[pid]; if (!p) return;
  let cards = box ? p.cards.filter((c) => c.box === box) : p.cards.filter((c) => c.box < 9);
  if (!cards.length) return toast('Çalışılacak kart yok.');
  const queue = (box ? shuffle(cards) : interleave(cards)).map((c) => c.id);
  sess = { pid, queue, i: 0, ok: 0, fail: 0, seconds: 0, mode: 'work', left: S.settings.workMin * 60, paused: false };
  clearInterval(sessTimer); sessTimer = setInterval(tick, 1000);
  renderSession();
}

function tick() {
  if (!sess || sess.paused) return;
  sess.left--;
  if (sess.mode === 'work') sess.seconds++;
  if (sess.left <= 0) {
    if (sess.mode === 'work') { sess.mode = 'break'; sess.left = S.settings.breakMin * 60; toast(`Çalışma süresi bitti! ${S.settings.breakMin} dakikalık mola zamanı.`); }
    else { sess.mode = 'work'; sess.left = S.settings.workMin * 60; toast('Mola bitti! Yeni seansa hazır mısın?'); }
    beep(); renderSession(); return;
  }
  const el = $('#pomo-clock'); if (el) el.textContent = fmtClock(sess.left);
}

function renderSession() {
  const root = $('#session-root');
  if (!sess) { root.classList.remove('on'); root.innerHTML = ''; return; }
  root.classList.add('on');
  const p = S.projects[sess.pid];
  const done = sess.i >= sess.queue.length;
  const top = `<div class="s-top"><div><strong>${esc(p.name)}</strong> <span class="muted small">${done ? '' : `${sess.i + 1} / ${sess.queue.length}`}</span></div>
    <div class="row"><span class="chip ${sess.mode === 'break' ? 'amber' : ''}">${sess.mode === 'break' ? '☕ Mola' : '🍅 Çalışma'}</span><span class="s-clock" id="pomo-clock">${fmtClock(sess.left)}</span>
    <button class="btn sm" data-action="session-pause">${sess.paused ? '▶ Devam' : '⏸ Duraklat'}</button>
    <button class="btn sm" data-action="open-tools">🔧 Araçlar</button>
    <button class="btn sm" data-action="session-close">✕ Bitir</button></div></div>
    <div class="s-prog"><i style="width:${(sess.i / sess.queue.length) * 100}%"></i></div>`;
  let body;
  if (done) {
    body = `<div class="s-card"><div class="s-icon">🎉</div><h2>Seans tamamlandı!</h2>
      <p class="muted">✔ ${sess.ok} başarılı · ✖ ${sess.fail} tekrar gerekli · ⏱ ${fmtMin(sess.seconds)}</p>
      <button class="btn primary big" data-action="session-close" style="margin-top:18px">Bitir ve Kaydet</button></div>`;
  } else {
    const c = p.cards.find((x) => x.id === sess.queue[sess.i]);
    if (!c) { sess.i++; return renderSession(); }
    const B = BOXES[c.box - 1];
    const ramp = c.box === 3 && hasRamp(c);
    const tn = ramp ? tempoNow(c) : c.bpmStart;
    const question = ramp ? `${tn} BPM tempoda hatasız ve akıcı çalabildin mi? (hedef: ${c.bpmTarget} BPM)` : B.question;
    const tempo = ramp ? `<span class="chip">🚀 Şimdi ${tn} BPM → hedef ${c.bpmTarget} BPM</span>`
      : (c.bpmStart || c.bpmTarget ? `<span class="chip">♩ ${c.bpmStart || '?'} → ${c.bpmTarget || '?'} BPM</span>` : '');
    body = `<div class="s-card"><div class="s-icon">${B.icon}</div><div class="muted small">${B.number}. Kutu · ${esc(B.title)} · ${c.count}/${p.threshold}</div>
      <h2>${esc(c.title)}</h2>${c.desc ? `<p class="muted">${esc(c.desc)}</p>` : ''}<div style="margin-top:6px">${tempo}${(c.tags || []).map((t) => `<span class="chip">#${esc(t)}</span>`).join('')}</div>
      <div class="s-q">${esc(question)}</div>
      <div class="row" style="justify-content:center">
        <button class="btn big" data-action="session-grade" data-ok="0">✖ Henüz değil</button>
        <button class="btn ok big" data-action="session-grade" data-ok="1">✔ Evet</button></div>
      <div class="row" style="justify-content:center;margin-top:14px"><button class="btn sm" data-action="session-skip">Atla</button>
      ${tn ? `<button class="btn sm" data-action="open-tools" data-bpm="${tn}">🎚 Metronomu ${tn} BPM'e ayarla</button>` : ''}</div></div>`;
  }
  root.innerHTML = top + `<div class="s-body">${body}</div>`;
}

function endSession() {
  if (!sess) return;
  clearInterval(sessTimer);
  if (sess.seconds >= 5 || sess.ok + sess.fail > 0) {
    S.sessions.push({ id: uid(), ts: Date.now(), date: dayKey(), seconds: sess.seconds, projectId: sess.pid, ok: sess.ok, fail: sess.fail });
    save();
  }
  const sp = S.projects[sess.pid];
  if (sp && sp.mode === 'whole' && sp.cards[0]) ui.box = sp.cards[0].box;
  sess = null; renderSession(); render();
}

/* =========================================================
   METRONOM
   ========================================================= */
const AC = window.AudioContext || window.webkitAudioContext;
const M = { ctx: null, bpm: 80, beats: 4, running: false, next: 0, beat: 0, timer: null };
function audio() { if (!M.ctx) M.ctx = new AC(); if (M.ctx.state === 'suspended') M.ctx.resume(); return M.ctx; }
function click(t, accent) {
  const o = M.ctx.createOscillator(), g = M.ctx.createGain();
  o.frequency.value = accent ? 1500 : 1000;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.6, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  o.connect(g); g.connect(M.ctx.destination); o.start(t); o.stop(t + 0.06);
}
function beep() { try { audio(); const t = M.ctx.currentTime; click(t, true); click(t + 0.2, true); } catch (e) {} }
function flash(b) {
  document.querySelectorAll('#m-dots .dot').forEach((d, i) => d.classList.toggle('on', i === b));
}
function sched() {
  while (M.next < M.ctx.currentTime + 0.1) {
    click(M.next, M.beat === 0);
    const b = M.beat;
    setTimeout(() => M.running && flash(b), Math.max(0, (M.next - M.ctx.currentTime) * 1000));
    M.next += 60 / M.bpm; M.beat = (M.beat + 1) % M.beats;
  }
}
function startMetro() { audio(); M.beat = 0; M.next = M.ctx.currentTime + 0.05; M.running = true; M.timer = setInterval(sched, 25); setMetroBtn(); }
function stopMetro() { if (!M.running) return; clearInterval(M.timer); M.running = false; flash(-1); setMetroBtn(); }
function setMetroBtn() { const b = $('#m-toggle'); if (b) b.textContent = M.running ? '⏹ Durdur' : '▶ Başlat'; }
function setBpm(v) {
  M.bpm = clamp(Math.round(v), 30, 240);
  const a = $('#m-bpm'), s = $('#m-slider'); if (a) a.textContent = M.bpm; if (s) s.value = M.bpm;
}

/* =========================================================
   AKORT (mikrofon + otokorelasyon)
   ========================================================= */
const T = { stream: null, ctx: null, an: null, timer: null, buf: null };
const NOTE_TR = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
const NOTE_EN = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

function autoCorrelate(buf, sr) {
  let SIZE = buf.length, rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  if (Math.sqrt(rms / SIZE) < 0.01) return -1;
  let r1 = 0, r2 = SIZE - 1; const th = 0.2;
  for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < th) { r1 = i; break; }
  for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < th) { r2 = SIZE - i; break; }
  buf = buf.slice(r1, r2); SIZE = buf.length;
  if (SIZE < 8) return -1;
  const c = new Array(SIZE).fill(0);
  for (let i = 0; i < SIZE; i++) for (let j = 0; j < SIZE - i; j++) c[i] += buf[j] * buf[j + i];
  let d = 0; while (c[d] > c[d + 1]) d++;
  let maxv = -1, maxp = -1;
  for (let i = d; i < SIZE; i++) if (c[i] > maxv) { maxv = c[i]; maxp = i; }
  let T0 = maxp; if (T0 < 1 || T0 >= SIZE - 1) return -1;
  const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1], a = (x1 + x3 - 2 * x2) / 2, b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);
  return sr / T0;
}
async function startTuner() {
  const msg = $('#t-msg');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { if (msg) msg.textContent = 'Bu tarayıcıda mikrofon kullanılamıyor. Uygulamayı http://localhost üzerinden aç.'; return; }
  try { T.stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) { if (msg) msg.textContent = 'Mikrofona erişilemedi. Tarayıcı iznini kontrol et.'; return; }
  T.ctx = new AC(); const src = T.ctx.createMediaStreamSource(T.stream);
  T.an = T.ctx.createAnalyser(); T.an.fftSize = 2048; src.connect(T.an);
  T.buf = new Float32Array(T.an.fftSize); T.timer = setInterval(tunerTick, 100);
  const b = $('#t-toggle'); if (b) b.textContent = '⏹ Mikrofonu Kapat';
  if (msg) msg.textContent = 'Bir nota çal...';
}
function stopTuner() {
  if (!T.timer && !T.stream) return;
  clearInterval(T.timer); if (T.stream) T.stream.getTracks().forEach((t) => t.stop()); if (T.ctx) T.ctx.close();
  T.stream = T.ctx = T.timer = T.an = null;
  const b = $('#t-toggle'); if (b) b.textContent = '🎤 Mikrofonu Başlat';
}
function tunerTick() {
  if (!T.an) return;
  T.an.getFloatTimeDomainData(T.buf);
  const f = autoCorrelate(T.buf, T.ctx.sampleRate);
  if (f < 20 || f > 4200) return;
  const n = 12 * Math.log2(f / 440) + 69, r = Math.round(n), cents = Math.round((n - r) * 100);
  const nn = $('#t-note'), ff = $('#t-freq'), nd = $('#t-needle'), cc = $('#t-cents');
  if (!nn) return;
  nn.textContent = `${NOTE_TR[((r % 12) + 12) % 12]}${Math.floor(r / 12) - 1}`;
  ff.textContent = `${NOTE_EN[((r % 12) + 12) % 12]}${Math.floor(r / 12) - 1} · ${f.toFixed(1)} Hz`;
  nd.style.left = `${50 + clamp(cents, -50, 50)}%`;
  cc.textContent = Math.abs(cents) <= 5 ? '✔ Akort doğru' : `${cents > 0 ? '+' : ''}${cents} cent`;
}

/* ---- Araçlar modalı ---- */
function metroHtml() {
  return `<div class="m-bpm"><span id="m-bpm">${M.bpm}</span></div><p class="muted" style="text-align:center">BPM</p>
    <div class="dots" id="m-dots">${Array.from({ length: M.beats }, (_, i) => `<span class="dot ${i === 0 ? 'acc' : ''}"></span>`).join('')}</div>
    <input type="range" id="m-slider" min="30" max="240" value="${M.bpm}" data-input="metro-bpm">
    <div class="row" style="justify-content:center;margin:10px 0">${[-5, -1, 1, 5].map((d) => `<button class="btn sm" data-action="bpm-delta" data-d="${d}">${d > 0 ? '+' : ''}${d}</button>`).join('')}</div>
    <label>Vuruş sayısı<select data-change="metro-beats">${[2, 3, 4, 5, 6, 7].map((n) => `<option ${n === M.beats ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <button class="btn primary block big" id="m-toggle" data-action="metro-toggle">${M.running ? '⏹ Durdur' : '▶ Başlat'}</button>`;
}
function tunerHtml() {
  return `<div class="t-note" id="t-note">–</div><p class="muted" id="t-freq" style="text-align:center">&nbsp;</p>
    <div class="needle"><i id="t-needle"></i></div><p id="t-cents" style="text-align:center;font-weight:600">&nbsp;</p>
    <button class="btn primary block big" id="t-toggle" data-action="tuner-toggle">${T.stream ? '⏹ Mikrofonu Kapat' : '🎤 Mikrofonu Başlat'}</button>
    <p class="muted small" id="t-msg" style="text-align:center;margin-top:10px">Tuner için mikrofon izni gerekir.</p>`;
}
function toolsBody(tab) {
  return `<div class="tabs"><button class="tab ${tab === 'metro' ? 'on' : ''}" data-action="tools-tab" data-t="metro">Metronom</button>
    <button class="tab ${tab === 'tuner' ? 'on' : ''}" data-action="tools-tab" data-t="tuner">Akort</button></div>${tab === 'metro' ? metroHtml() : tunerHtml()}`;
}

/* =========================================================
   YÖNTEM MODALI
   ========================================================= */
function openMethod() {
  openModal('Çalışma Yöntemi', `<p>Her kart eserin küçük bir pasajıdır ve <strong>9 adımlık bir ustalık yolculuğuna</strong> çıkar. Bir sonraki kutuya geçmek için o kutunun hedefini <em>ustalık eşiği</em> kadar başarıyla tamamlaman gerekir. Başaramazsan kart bir kutu geri döner.</p>
    <ol style="padding-left:20px">${BOXES.map((b) => `<li style="margin:6px 0"><strong>${b.icon} ${b.title}</strong><br><span class="muted small">${b.purpose}</span></li>`).join('')}</ol>
    <p><strong>Akıllı harmanlama:</strong> "Tümünü Çalış" farklı kutulardaki kartları dönüşümlü sunar (harmanlanmış pratik). Bu, zihnini tetikte tutar ve kalıcı öğrenmeyi güçlendirir.</p>`, true);
}

/* =========================================================
   OLAYLAR
   ========================================================= */
const curProject = () => S.projects[S.activeProject];

const actions = {
  nav(el) { ui.view = el.dataset.view; ui.sidebar = false; ui.menu = false; render(); window.scrollTo(0, 0); },
  'toggle-sidebar'() { ui.sidebar = !ui.sidebar; $('#app').classList.toggle('side-open', ui.sidebar); },
  'toggle-theme'() { S.settings.theme = isDark() ? 'light' : 'dark'; save(); render(); },
  'toggle-menu'() { ui.menu = !ui.menu; render(); },
  'new-project'() { ui.sidebar = false; render(); openModal('Yeni Eser', projectForm()); },
  'edit-project'() { ui.menu = false; render(); openModal('Eseri Düzenle', projectForm(curProject())); },
  async 'delete-project'() {
    ui.menu = false; const p = curProject();
    if (!p || !(await ask(`"${p.name}" eseri ve tüm kartları silinecek. Emin misin?`, 'Sil', true))) return render();
    delete S.projects[p.id]; S.activeProject = null; ui.view = 'dashboard'; save(); render();
  },
  'open-project'(el) {
    const p = S.projects[el.dataset.id]; if (!p) return;
    S.activeProject = p.id; ui.view = 'project'; ui.tab = 'cards'; ui.menu = false; ui.sidebar = false;
    ui.box = p.cards.length ? Math.min(...p.cards.map((c) => c.box)) : 1;
    save(); render(); window.scrollTo(0, 0);
  },
  'set-tab'(el) { ui.tab = el.dataset.t; render(); },
  'set-box'(el) { ui.box = +el.dataset.n; render(); },
  'new-card'() { const p = curProject(); if (p && p.mode !== 'whole') openModal('Yeni Kart', cardForm(p)); },
  'split-project'() {
    const p = curProject(); if (!p) return;
    p.mode = 'split'; save(); render();
    toast('Artık eseri pasajlara bölüp yeni kartlar ekleyebilirsin.');
  },
  'edit-card'(el) { const p = curProject(); const c = p && p.cards.find((x) => x.id === el.dataset.id); if (c) openModal('Kartı Düzenle', cardForm(p, c)); },
  async 'delete-card'(el) {
    const p = curProject(); if (!p || !(await ask('Bu kart silinecek. Emin misin?', 'Sil', true))) return;
    p.cards = p.cards.filter((c) => c.id !== el.dataset.id); save(); render();
  },
  'delete-note'(el) { const p = S.projects[el.dataset.pid]; if (!p) return; p.notes = p.notes.filter((n) => n.id !== el.dataset.id); save(); render(); },
  'note-filter'(el) { ui.noteCat = el.dataset.cat; render(); },
  'study-all'() { startSession(S.activeProject, null); },
  'study-box'() { startSession(S.activeProject, ui.box); },
  'study-rehearsal'(el) { startSession(el.dataset.id, 9); },
  'rehearse-grade'(el) {
    const p = S.projects[el.dataset.pid]; const c = p && p.cards.find((x) => x.id === el.dataset.id); if (!c) return;
    const ok = el.dataset.ok === '1'; const msg = grade(p, c, ok);
    if (ok) { S.rehearsals.push({ ts: Date.now(), projectId: p.id }); save(); }
    if (p.mode === 'whole') ui.box = c.box;
    toast(msg); render();
  },
  'session-grade'(el) {
    const p = S.projects[sess.pid]; const c = p.cards.find((x) => x.id === sess.queue[sess.i]);
    const ok = el.dataset.ok === '1';
    if (c) { toast(grade(p, c, ok)); ok ? sess.ok++ : sess.fail++; }
    sess.i++; renderSession();
  },
  'session-skip'() { sess.i++; renderSession(); },
  'session-pause'() { sess.paused = !sess.paused; renderSession(); },
  'session-close'() { endSession(); },
  'close-modal'() { closeModal(); },
  'close-modal-bg'(el, e) { if (e.target === el) closeModal(); },
  'open-tools'(el) {
    if (el && el.dataset.bpm) setBpm(+el.dataset.bpm);
    ui.sidebar = false; $('#app').classList.remove('side-open');
    openModal('Araçlar', toolsBody('metro'));
  },
  'tools-tab'(el) {
    const t = el.dataset.t; if (t === 'metro') stopTuner(); else stopMetro();
    $('#modal-root .modal-b').innerHTML = toolsBody(t);
  },
  'metro-toggle'() { M.running ? stopMetro() : startMetro(); },
  'bpm-delta'(el) { setBpm(M.bpm + +el.dataset.d); },
  'tuner-toggle'() { T.stream ? stopTuner() : startTuner(); },
  'open-method'() { ui.sidebar = false; render(); openMethod(); },
  export() {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `asistan-yedek-${dayKey()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  import() { $('#import-file').click(); },
  async reset() {
    if (!(await ask('Tüm eserler, kartlar, notlar ve çalışma geçmişi silinecek. Bu işlem geri alınamaz!', 'Hepsini Sil', true))) return;
    S = defaults(); save(); ui.view = 'dashboard'; render(); toast('Tüm veriler silindi.');
  }
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) {
    if (ui.menu && !e.target.closest('.menu-wrap')) { ui.menu = false; render(); }
    return;
  }
  const fn = actions[el.dataset.action];
  if (fn) fn(el, e);
});

document.addEventListener('submit', (e) => {
  const f = e.target.closest('form[data-form]'); if (!f) return;
  e.preventDefault();
  const h = forms[f.dataset.form]; if (h) h(new FormData(f), f);
});

document.addEventListener('input', (e) => {
  if (e.target.dataset.input === 'metro-bpm') setBpm(+e.target.value);
});

document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.dataset.change === 'metro-beats') {
    M.beats = +t.value; const d = $('#m-dots');
    if (d) d.innerHTML = Array.from({ length: M.beats }, (_, i) => `<span class="dot ${i === 0 ? 'acc' : ''}"></span>`).join('');
    if (M.running) M.beat = 0;
  } else if (t.dataset.change === 'note-cat') {
    const ta = $('#note-text'); if (ta) ta.placeholder = NOTE_CATS[t.value].ph;
  } else if (t.id === 'import-file' && t.files[0]) {
    try {
      const data = JSON.parse(await t.files[0].text());
      if (!data || typeof data.projects !== 'object') throw new Error('Geçersiz yedek dosyası');
      if (await ask('Mevcut verilerin yedekteki verilerle değiştirilecek. Devam edilsin mi?', 'Yükle')) {
        const d = defaults(); S = { ...d, ...data, settings: { ...d.settings, ...(data.settings || {}) } };
        save(); render(); toast('Yedek yüklendi.');
      }
    } catch (err) { toast('Yedek yüklenemedi: ' + err.message); }
    t.value = '';
  }
});

// Sekme arka plana alınırken/kapanırken seansı kaybetme
window.addEventListener('beforeunload', () => { if (sess && sess.seconds >= 5) endSession(); });

render();
})();
