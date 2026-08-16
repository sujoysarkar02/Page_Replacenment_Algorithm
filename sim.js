// ------------------ Helpers ------------------
const $ = (id) => document.getElementById(id);

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ------------------ Algorithm ------------------
const ALGO = document.body.dataset.algo || "LRU"; // "LRU", "FIFO", "OPTIMAL"

// ------------------ DOM Elements ------------------
const framesSelect = $("frames");
const refLenInput = $("refLen");
const maxValInput = $("maxVal");
const speedInput = $("speed");

const genBtn = $("genBtn");
const startBtn = $("startBtn");
const stepBtn = $("stepBtn");
const pauseBtn = $("pauseBtn");
const resetBtn = $("resetBtn");

const refStringEl = $("refString");
const currentRefEl = $("currentRef");
const framesBox = $("framesBox");

const statusBadge = $("statusBadge");
const statusMsg = $("statusMsg");

const stepsEl = $("steps");
const hitsEl = $("hits");
const missesEl = $("misses");
const hitRatioEl = $("hitRatio");
const missRatioEl = $("missRatio");

const logEl = $("log");
const canvas = $("chart");
const ctx = canvas.getContext("2d");

// Table elements
const tableHead = $("tableHead");
const tableBody = $("tableBody");
const tableFoot = $("tableFoot");

// ------------------ State ------------------
let reference = [];
let frames = [];
let idx = 0;

let hits = 0;
let misses = 0;

let running = false;
let timer = null;

// LRU
let lastUsed = new Map();

// FIFO
let fifoPtr = 0;

// Graph data
let hitSeries = [];
let missSeries = [];

// Table history
let tableFramesHistory = [];
let tableHM = [];

// ------------------ UI Render ------------------
function renderRef() {
  refStringEl.innerHTML = "";
  reference.forEach((v, i) => {
    const div = document.createElement("div");
    div.className = "ref-item" + (i === idx ? "active" : "");
    if (tableHM[i] === "H") div.classList.add("hit");
    if (tableHM[i] === "M") div.classList.add("miss");
    div.textContent = v;
    refStringEl.appendChild(div);
  });
  currentRefEl.textContent = reference[idx] ?? "-";
}


function renderFrames(flashType = null) {
  framesBox.innerHTML = "";
  const cap = parseInt(framesSelect.value, 10);
  for (let i = 0; i < cap; i++) {
    const cell = document.createElement("div");
    const val = frames[i];
    cell.className = "frame" + (val === undefined ? " empty" : "");
    cell.textContent = val === undefined ? "—" : val;

    if (flashType === "hit") cell.classList.add("flash-hit");
    if (flashType === "miss") cell.classList.add("flash-miss");

    framesBox.appendChild(cell);
  }
}

function setStatus(type, msg) {
  statusBadge.className = "badge";
  statusMsg.textContent = msg;

  if (type === "hit") {
    statusBadge.classList.add("hit");
    statusBadge.textContent = "HIT";
  } else if (type === "miss") {
    statusBadge.classList.add("miss");
    statusBadge.textContent = "MISS";
  } else {
    statusBadge.textContent = "Ready";
  }
}

function addLog(message, type = "info") {
  if (!logEl) return;
  const line = document.createElement("div");
  line.className = "line";
  if (type === "hit") line.classList.add("hit");
  if (type === "miss") line.classList.add("miss");
  line.textContent = message;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

function updateStats() {
  stepsEl.textContent = idx;
  hitsEl.textContent = hits;
  missesEl.textContent = misses;

  const total = hits + misses;
  hitRatioEl.textContent = total ? (hits / total).toFixed(2) : "0.00";
  missRatioEl.textContent = total ? (misses / total).toFixed(2) : "0.00";
}

// ------------------ Table ------------------
function saveTableStep(wasHit) {
  const cap = parseInt(framesSelect.value, 10);
  tableFramesHistory[idx] = Array.from({ length: cap }, (_, i) => frames[i] ?? "—");
  tableHM[idx] = wasHit ? "H" : "M";
}

function renderTable() {
  const cap = parseInt(framesSelect.value, 10);

  // Head
  tableHead.innerHTML = "";
  const trHead = document.createElement("tr");
  const th0 = document.createElement("th");
  th0.textContent = "Ref";
  trHead.appendChild(th0);
  reference.forEach((v, i) => {
    const th = document.createElement("th");
    th.textContent = v;
    if (i === idx) th.classList.add("cell-active");
    trHead.appendChild(th);
  });
  tableHead.appendChild(trHead);

  // Body
  tableBody.innerHTML = "";
  for (let r = 0; r < cap; r++) {
    const row = document.createElement("tr");
    const label = document.createElement("th");
    label.textContent = `F${r + 1}`;
    row.appendChild(label);

    for (let c = 0; c < reference.length; c++) {
      const td = document.createElement("td");
      td.textContent = tableFramesHistory[c] ? tableFramesHistory[c][r] : "—";
      if (c === idx) td.classList.add("cell-active");
      row.appendChild(td);
    }
    tableBody.appendChild(row);
  }

  // Footer H/M
  tableFoot.innerHTML = "";
  const trFoot = document.createElement("tr");
  const thFoot = document.createElement("th");
  thFoot.textContent = "H/M";
  trFoot.appendChild(thFoot);
  reference.forEach((v, i) => {
    const td = document.createElement("td");
    const val = tableHM[i];
    td.textContent = val ?? "—";
    if (val === "H") td.classList.add("cell-hit");
    if (val === "M") td.classList.add("cell-miss");
    if (i === idx) td.classList.add("cell-active");
    trFoot.appendChild(td);
  });
  tableFoot.appendChild(trFoot);
}

// ------------------ Victim Selection ------------------
function findVictimLRU() {
  let victimPos = 0;
  let victim = frames[0];
  let minUsed = lastUsed.get(victim) ?? -Infinity;

  for (let i = 1; i < frames.length; i++) {
    const page = frames[i];
    const last = lastUsed.get(page) ?? -Infinity;
    if (last < minUsed) {
      minUsed = last;
      victim = page;
      victimPos = i;
    }
  }
  return { victim, victimPos };
}

function nextUseIndex(page, startIdx) {
  for (let i = startIdx; i < reference.length; i++) if (reference[i] === page) return i;
  return Infinity;
}

function findVictimOptimal(currentIdx) {
  let victimPos = 0;
  let farthest = -1;
  for (let i = 0; i < frames.length; i++) {
    const page = frames[i];
    const nextUse = nextUseIndex(page, currentIdx + 1);
    if (nextUse > farthest) {
      farthest = nextUse;
      victimPos = i;
    }
  }
  return { victim: frames[victimPos], victimPos, farthest };
}

// ------------------ Step Function ------------------
function stepOnce() {
  if (idx >= reference.length) {
    stopAuto();
    setStatus("ready", "Finished. Ratios are shown above.");
    addLog(`Simulation finished: Hits=${hits}, Misses=${misses}`);
    return;
  }

  const page = reference[idx];
  renderRef();
  let wasHit = false;
  const cap = parseInt(framesSelect.value, 10);

  if (frames.includes(page)) {
    // HIT
    hits++;
    wasHit = true;
    setStatus("hit", `Page ${page} is already in frames`);
    if (ALGO === "LRU") lastUsed.set(page, idx);
    renderFrames("hit");
    addLog(`Step ${idx + 1}: Page ${page} → HIT`, "hit");
  } else {
    // MISS
    misses++;
    wasHit = false;

    if (frames.length < cap) {
      frames.push(page);
      if (ALGO === "LRU") lastUsed.set(page, idx);
      setStatus("miss", `MISS. Loaded page ${page} into empty frame`);
      renderFrames("miss");
      addLog(`Step ${idx + 1}: Page ${page} → MISS (empty frame)`, "miss");
    } else {
      // Replacement
      if (ALGO === "FIFO") {
        const victim = frames[fifoPtr];
        frames[fifoPtr] = page;
        setStatus("miss", `MISS. Replaced FIFO page ${victim} → ${page}`);
        renderFrames("miss");
        addLog(`Step ${idx + 1}: Replace FIFO ${victim} → ${page}`, "miss");
        fifoPtr = (fifoPtr + 1) % cap;
      }

      if (ALGO === "LRU") {
        const { victim, victimPos } = findVictimLRU();
        frames[victimPos] = page;
        lastUsed.set(page, idx);
        setStatus("miss", `MISS. Replaced LRU page ${victim} → ${page}`);
        renderFrames("miss");
        addLog(`Step ${idx + 1}: Replace LRU ${victim} → ${page}`, "miss");
      }

      if (ALGO === "OPTIMAL") {
        const { victim, victimPos, farthest } = findVictimOptimal(idx);
        frames[victimPos] = page;
        const explain = farthest === Infinity ? "never used again" : `next used at step ${farthest + 1}`;
        setStatus("miss", `MISS. Replaced Optimal ${victim} → ${page} (${explain})`);
        renderFrames("miss");
        addLog(`Step ${idx + 1}: Replace OPT ${victim} → ${page} (${explain})`, "miss");
      }
    }
  }

  saveTableStep(wasHit);
  hitSeries.push(hits);
  missSeries.push(misses);

  idx++;
  updateStats();
  drawChart();
  renderTable();

  setTimeout(() => renderFrames(null), 220);
}

// ------------------ Auto Control ------------------
function startAuto() {
  if (!reference.length) {
    setStatus("ready", "Generate a reference string first.");
    return;
  }
  if (running) return;
  running = true;
  setStatus("ready", "Running...");
  const speed = Math.max(100, parseInt(speedInput.value, 10) || 700);

  timer = setInterval(() => {
    stepOnce();
    if (idx >= reference.length) stopAuto();
  }, speed);
}

function stopAuto() {
  running = false;
  if (timer) clearInterval(timer);
  timer = null;
}

// ------------------ Generate / Reset ------------------
function generateReference() {
  const len = Math.min(60, Math.max(5, parseInt(refLenInput.value, 10) || 15));
  const maxV = Math.min(99, Math.max(3, parseInt(maxValInput.value, 10) || 9));
  reference = Array.from({ length: len }, () => randInt(0, maxV));
  resetSimulation(true);
  setStatus("ready", "Generated. Click Start or Step.");
  addLog(`Generated reference string: length=${len}, maxPage=${maxV}`);
}

function resetSimulation(keepRef = false) {
  stopAuto();
  frames = [];
  idx = 0;
  hits = 0;
  misses = 0;
  fifoPtr = 0;
  lastUsed = new Map();
  hitSeries = [];
  missSeries = [];
  tableFramesHistory = [];
  tableHM = [];
  logEl.innerHTML = "";

  if (!keepRef) reference = [];
  renderFrames();
  renderRef();
  updateStats();
  drawChart();
  renderTable();
}

// ------------------ Chart Drawing ------------------
function drawChart() {
  if (!ctx || !canvas) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const pad = 50;
  const w = canvas.width - pad * 2;
  const h = canvas.height - pad * 2;

  // Max count
  const maxCount = Math.max(...hitSeries, ...missSeries, 1);
  const stepCount = reference.length;
  const stepW = stepCount > 1 ? w / (stepCount - 1) : w;

  // Draw horizontal grid
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#ccc";
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#fcfcfc";

  for (let i = 0; i <= 5; i++) {
    const yVal = Math.round((maxCount / 5) * i);
    const y = pad + h - (h * i) / 5;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(pad + w, y);
    ctx.stroke();
    ctx.fillText(yVal, pad - 35, y + 4);
  }

  // Vertical steps
  for (let i = 0; i < stepCount; i++) {
    const x = pad + i * stepW;
    ctx.beginPath();
    ctx.moveTo(x, pad + h);
    ctx.lineTo(x, pad + h + 5);
    ctx.stroke();
    ctx.fillText(i + 1, x - 5, pad + h + 20);
  }

  // Axes
  ctx.beginPath();
  ctx.strokeStyle = "#ff0000";
  ctx.lineWidth = 2;
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad, pad + h);
  ctx.lineTo(pad + w, pad + h);
  ctx.stroke();

  // Draw MISS line
  ctx.strokeStyle = "#e24b4b";
  ctx.lineWidth = 5;
  ctx.beginPath();
  missSeries.forEach((v, i) => {
    const x = pad + i * stepW;
    const y = pad + h - (v / maxCount) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    ctx.fillStyle = "#e24b4b";
    ctx.fillText(v, x - 5, y - 5);
  });
  ctx.stroke();

  // Draw HIT line
  ctx.strokeStyle = "#1c9b5e";
  ctx.lineWidth = 5;
  ctx.beginPath();
  hitSeries.forEach((v, i) => {
    const x = pad + i * stepW;
    const y = pad + h - (v / maxCount) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    ctx.fillStyle = "#1c9b5e";
    ctx.fillText(v, x - 5, y - 10);
  });
  ctx.stroke();

  // Axis titles
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("Steps", pad + w / 2 - 20, pad + h + 40);
  ctx.save();
  ctx.translate(pad - 50, pad + h / 2 + 20);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Count", 0, 0);
  ctx.restore();

  // Legend
  ctx.fillStyle = "#e24b4b";
  ctx.fillRect(pad + 10, pad - 30, 15, 15);
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Misses", pad + 30, pad - 18);

  ctx.fillStyle = "#1c9b5e";
  ctx.fillRect(pad + 110, pad - 30, 15, 15);
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Hits", pad + 130, pad - 18);
}

// ------------------ Events ------------------
genBtn.addEventListener("click", generateReference);
startBtn.addEventListener("click", startAuto);
pauseBtn.addEventListener("click", () => {
  stopAuto();
  setStatus("ready", "Paused.");
});
stepBtn.addEventListener("click", () => {
  if (!reference.length) {
    setStatus("ready", "Generate a reference string first.");
    return;
  }
  stopAuto();
  stepOnce();
});
resetBtn.addEventListener("click", () => {
  resetSimulation(false);
  setStatus("ready", "Reset done.");
});
framesSelect.addEventListener("change", () => {
  const keep = reference.length > 0;
  resetSimulation(keep);
  setStatus("ready", keep ? "Frames changed. Ready." : "Ready.");
});

// ------------------ Boot ------------------
(function boot() {
  renderFrames();
  renderRef();
  updateStats();
  drawChart();
  renderTable();
  setStatus("ready", "Generate a reference string to begin.");
})();
