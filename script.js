/* Human Benchmark - vanilla JS
   - index.html loads this file.
   - Keeps code modular and commented.
*/

/* ---------- Utilities ---------- */
const qs = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* ---------- View routing ---------- */
function setView(name) {
  qsa('.view').forEach(v => v.classList.remove('active'));
  const target = qs('#view-' + name);
  if (target) target.classList.add('active');

  qsa('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  // refresh dashboard when shown
  if (name === 'dashboard') renderDashboard();
}
qsa('[data-view]').forEach(btn => {
  btn.addEventListener('click', e => {
    const view = btn.dataset.view;
    setView(view);
  });
});

/* ---------- Persistence (localStorage) ---------- */
const STORAGE_KEY = 'human-benchmark-scores';
function loadScores(){
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch(e){ return {}; }
}
function saveScores(obj){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}
function setBest(category, value){
  const s = loadScores();
  if (!s[category] || valueBetter(category, value, s[category])) {
    s[category] = value;
    saveScores(s);
  }
}
function getBest(category){ return loadScores()[category]; }
function valueBetter(category, vNew, vOld){
  // reaction: lower better, chimp/typing: higher better
  if (category === 'reaction') return vNew < vOld;
  return vNew > vOld;
}
function clearScores(){ localStorage.removeItem(STORAGE_KEY); renderDashboard(); initBests(); }

/* ---------- Initialization for best displays ---------- */
function initBests(){
  qs('#reaction-best').textContent = getBest('reaction') ?? '—';
  qs('#chimp-best').textContent = getBest('chimp') ?? '—';
  qs('#typing-best').textContent = getBest('typing') ?? '—';
}
initBests();

/* ---------- Dashboard ---------- */
function renderDashboard(){
  qs('#dash-reaction').textContent = getBest('reaction') ?? '—';
  qs('#dash-chimp').textContent = getBest('chimp') ?? '—';
  qs('#dash-typing').textContent = getBest('typing') ?? '—';
}
qs('#clear-scores').addEventListener('click', () => {
  if (confirm('Clear all stored best scores?')) {
    clearScores();
    alert('Scores cleared.');
  }
});

/* ---------- Reaction Time Test ---------- */
(function ReactionTest(){
  const box = qs('#reaction-box');
  const resultEl = qs('#reaction-result');
  const warningEl = qs('#reaction-warning');
  const restartBtn = qs('#reaction-restart');
  const backBtn = qs('#reaction-back');

  let timeoutId = null;
  let startMs = 0;
  let state = 'idle'; // idle | waiting | ready

  function startRound(){
    clear();
    state = 'waiting';
    box.classList.remove('green');
    box.classList.add('status-wait');
    box.textContent = 'Wait...';
    resultEl.textContent = '';
    warningEl.textContent = '';
    const delay = 2000 + Math.random() * 3000; // 2-5s
    timeoutId = setTimeout(() => {
      state = 'ready';
      box.classList.add('green');
      box.classList.remove('status-wait');
      box.textContent = 'Click!';
      startMs = performance.now();
    }, delay);
  }

  function clear(){
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
  }

  box.addEventListener('click', (e) => {
    if (state === 'waiting') {
      // false start
      clear();
      state = 'idle';
      box.classList.remove('green');
      box.classList.add('status-wait');
      box.textContent = 'Too soon!';
      warningEl.textContent = 'Too soon! Click Try Again.';
      resultEl.textContent = '';
      return;
    }
    if (state === 'ready') {
      const dt = Math.round(performance.now() - startMs);
      resultEl.textContent = dt + ' ms';
      warningEl.textContent = '';
      setBest('reaction', dt);
      qs('#reaction-best').textContent = getBest('reaction') ?? '—';
      state = 'idle';
      box.textContent = 'Nice!';
      box.classList.remove('green');
      return;
    }
    // if idle, start new cycle
    startRound();
  });

  restartBtn.addEventListener('click', startRound);
  backBtn.addEventListener('click', () => { clear(); state = 'idle'; box.textContent='Wait...'; });

  // start first round when visiting view
  const reactionView = qs('#view-reaction');
  reactionView.addEventListener('transitionstart', ()=>{}); // placeholder
  // start when opened
  document.addEventListener('click', function onFirstOpen(e){ 
    // ensure not auto-triggering; start when user interacts first time on page to make performance.now valid
    document.removeEventListener('click', onFirstOpen);
    // no-op
  });
  // start when view shown
  const observer = new MutationObserver(() => {
    if (reactionView.classList.contains('active')) startRound();
    else { clear(); }
  });
  observer.observe(reactionView, { attributes: true, attributeFilter: ['class'] });
})();

/* ---------- Chimp Test ---------- */
(function ChimpTest(){
  const board = qs('#chimp-board');
  const startBtn = qs('#chimp-start');
  const message = qs('#chimp-message');
  const levelEl = qs('#chimp-level');

  let level = 1;
  let sequence = [];
  let clickable = false;
  let nextIndex = 0;

  // create 9 fixed cells (3x3)
  function makeCells(){
    board.innerHTML = '';
    for(let i=0;i<9;i++){
      const div = document.createElement('div');
      div.className = 'chimp-cell';
      div.dataset.index = i;
      board.appendChild(div);
    }
  }
  makeCells();

  function newRound(){
    message.textContent = '';
    sequence = generateSequence(level);
    showSequence(sequence).then(() => {
      // hide numbers
      hideAll();
      clickable = true;
      nextIndex = 0;
    }).catch(()=>{ /* ignore */});
    levelEl.textContent = level;
  }

  function generateSequence(n){
    // choose n unique positions 0-8
    const pool = [...Array(9).keys()];
    const pick = [];
    for(let i=0;i<n;i++){
      const idx = Math.floor(Math.random() * pool.length);
      pick.push(pool.splice(idx,1)[0]);
    }
    return pick;
  }

  function showSequence(seq){
    return new Promise(resolve => {
      // show numbers for 1 second then resolve
      const cells = qsa('.chimp-cell', board);
      seq.forEach((pos, i) => {
        const el = cells[pos];
        el.textContent = (i+1);
        el.style.transform = 'scale(1.03)';
      });
      setTimeout(() => {
        resolve();
      }, 1000);
    });
  }

  function hideAll(){
    qsa('.chimp-cell', board).forEach(el => {
      el.textContent = '';
      el.classList.add('hidden');
      el.style.transform = '';
    });
  }

  function revealCell(pos){
    const el = qsa('.chimp-cell', board)[pos];
    el.classList.remove('hidden');
    el.textContent = '';
  }

  board.addEventListener('click', (e) => {
    if (!clickable) return;
    const cell = e.target.closest('.chimp-cell');
    if (!cell) return;
    const idx = Number(cell.dataset.index);
    const expected = sequence[nextIndex];
    if (idx === expected){
      // correct
      cell.classList.remove('hidden');
      cell.textContent = (nextIndex+1);
      nextIndex++;
      if (nextIndex === sequence.length){
        // success -> increase level
        clickable = false;
        level++;
        setTimeout(() => { newRound(); }, 600);
        // update best
        setBest('chimp', level-1);
        qs('#chimp-best').textContent = getBest('chimp') ?? '—';
      }
    } else {
      // wrong -> end
      clickable = false;
      message.textContent = 'Wrong! Score: ' + (level - 1);
      // store best
      setBest('chimp', level-1);
      qs('#chimp-best').textContent = getBest('chimp') ?? '—';
    }
  });

  startBtn.addEventListener('click', () => {
    level = 1;
    newRound();
  });

  // reset when leaving view
  const chimpView = qs('#view-chimp');
  const observer = new MutationObserver(() => {
    if (!chimpView.classList.contains('active')) {
      clickable = false;
      message.textContent = '';
      qsa('.chimp-cell', board).forEach(c => { c.classList.remove('hidden'); c.textContent=''; });
    }
  });
  observer.observe(chimpView, { attributes:true, attributeFilter:['class'] });

})();

/* ---------- Typing Speed Test ---------- */
(function TypingTest(){
  const sampleSelect = qs('#sample-select');
  const typingText = qs('#typing-text');
  const typingInput = qs('#typing-input');
  const finishBtn = qs('#typing-stop');
  const restartBtn = qs('#typing-restart');
  const statsEl = qs('#typing-stats');

  const samples = [
    "The quick brown fox jumps over the lazy dog.",
    "Typing quickly requires practice and a focus on accuracy.",
    "Human Benchmark provides simple tests to measure cognitive skills.",
    "Practice a little every day to improve speed and confidence."
  ];

  let currentText = '';
  let startTime = null;
  let ended = false;

  function populateSamples(){
    sampleSelect.innerHTML = '';
    samples.forEach((s, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = 'Sample ' + (i+1);
      sampleSelect.appendChild(opt);
    });
    sampleSelect.value = 0;
    loadSample(0);
  }

  function loadSample(idx){
    currentText = samples[idx];
    typingText.textContent = currentText;
    typingInput.value = '';
    startTime = null;
    ended = false;
    statsEl.textContent = '';
  }

  sampleSelect.addEventListener('change', (e) => { loadSample(Number(e.target.value)); });

  typingInput.addEventListener('input', (e) => {
    if (ended) return;
    if (!startTime) startTime = performance.now();
  });

  finishBtn.addEventListener('click', concludeTest);
  restartBtn.addEventListener('click', () => loadSample(Number(sampleSelect.value)));

  function concludeTest(){
    if (ended) return;
    ended = true;
    const end = performance.now();
    const timeSec = ((startTime) ? (end - startTime)/1000 : 0);
    const typed = typingInput.value || '';
    const wpm = timeSec > 0 ? Math.round((typed.trim().split(/\s+/).length) / (timeSec/60)) : 0;
    // accuracy: percent of characters matching
    let match = 0;
    const len = Math.max(currentText.length, typed.length);
    for (let i=0;i<len;i++){
      if (typed[i] === currentText[i]) match++;
    }
    const accuracy = len === 0 ? 0 : Math.round((match/len)*100);
    statsEl.innerHTML = `WPM: <strong>${wpm}</strong> • Accuracy: <strong>${accuracy}%</strong> • Time: <strong>${timeSec.toFixed(2)}s</strong>`;
    setBest('typing', wpm);
    qs('#typing-best').textContent = getBest('typing') ?? '—';
  }

  // allow quick finish via Enter + Ctrl
  typingInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) { concludeTest(); }
  });

  populateSamples();
})();

/* ---------- Small UX: switch to view when nav large buttons clicked ---------- */
qsa('.large').forEach(b => {
  b.addEventListener('click', (e) => {
    const view = b.dataset.view;
    setView(view);
  });
});

/* ---------- Initialize default view ---------- */
setView('home');