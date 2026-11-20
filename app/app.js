/* Neon Palm v3 — GTA VI Trophy Guide & Tracker.
   Static, offline, no network at runtime: it fetches only its own data
   files by relative path and saves progress in localStorage. */
const SAVE_KEY = "neon-palm-v3-save";
const SPOILER_KEY = "neon-palm-v3-spoiler";
const KIND_FILTERS = [
  ["all", "All"],
  ["story", "Story"],
  ["missable", "Missable"],
  ["collectibles", "Collectibles"],
  ["activities", "Activities"],
  ["online", "Online"]
];

let trophies = [];
let sourceList = [];
let sourceMeta = {};
let roadmapStages = [];
let disputeList = [];
let seedSave = null;
let save = { earned: [], progress: {} };
let spoilerOn = false;
let activeFilter = "all";
let searchText = "";
let earnedOnly = false;
let selectedId = 28;
let selectedStage = 1;
let saveDemo = false;

function $(id) { return document.getElementById(id); }
function esc(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function sourceByNumber(n) { return sourceList.find(function (s) { return s.n === n; }); }
function trophyById(id) { return trophies.find(function (t) { return t.id === id; }); }
function isEarned(t) { return save.earned.indexOf(t.id) !== -1; }
function isSpoilerHidden(t) { return spoilerOn && t.kind === "story" && !isEarned(t); }
function gradeBadge(t) { return '<span class="badge ' + t.grade + '">' + t.grade + "</span>"; }
function citeLinks(cites) {
  return cites.map(function (n) {
    return '<a class="cite" href="#sources" data-src="' + n + '">[' + n + "]</a>";
  }).join(" ");
}

function loadData() {
  const asJson = function (r) { return r.json(); };
  return Promise.all([
    fetch("data/trophies.json").then(asJson),
    fetch("data/sources.json").then(asJson),
    fetch("data/roadmap.json").then(asJson),
    fetch("data/disputes.json").then(asJson),
    fetch("data/seed.json").then(asJson)
  ]).then(function (parts) {
    trophies = parts[0].trophies;
    sourceMeta = parts[1];
    sourceList = parts[1].sources;
    roadmapStages = parts[2].stages;
    disputeList = parts[3].disputes;
    seedSave = parts[4];
  });
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.earned)) { save = parsed; return; }
    }
  } catch (e) { /* corrupted save: fall through to seed */ }
  if (seedSave) {
    save = { earned: seedSave.earned.slice(), progress: Object.assign({}, seedSave.progress) };
    persistSave();
  }
}
function persistSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage full or blocked */ }
  renderExportPreview();
  renderAuditStrip();
  renderPlatinum();
}
function loadSpoiler() {
  try { spoilerOn = localStorage.getItem(SPOILER_KEY) === "1"; } catch (e) { spoilerOn = false; }
}
function persistSpoiler() {
  try { localStorage.setItem(SPOILER_KEY, spoilerOn ? "1" : "0"); } catch (e) { /* ignored */ }
}

function showToast(message, sticky) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  if (!sticky) {
    setTimeout(function () { toast.classList.remove("show"); }, 4500);
  }
}

function citedByCount(n) {
  let count = 0;
  trophies.forEach(function (t) {
    const used = {};
    t.steps.forEach(function (st) { st.cites.forEach(function (c) { used[c] = true; }); });
    if (used[n]) { count += 1; }
  });
  return count;
}
function singleSourceCount() {
  return trophies.filter(function (t) {
    const used = {};
    t.steps.forEach(function (st) { st.cites.forEach(function (c) { used[c] = true; }); });
    return Object.keys(used).length === 1;
  }).length;
}
function unconfirmedCount() {
  return trophies.filter(function (t) {
    return t.steps.some(function (st) { return st.text.indexOf("not known") !== -1; });
  }).length;
}

function renderAuditStrip() {
  const totalSteps = trophies.reduce(function (a, t) { return a + t.steps.length; }, 0);
  const citedSteps = trophies.reduce(function (a, t) {
    return a + t.steps.filter(function (st) { return st.cites && st.cites.length; }).length;
  }, 0);
  const guidesCited = trophies.filter(function (t) {
    return t.steps.some(function (st) { return st.cites && st.cites.length; });
  }).length;
  const missable = trophies.filter(function (t) { return t.missable === "possible"; }).length;
  const watch = trophies.filter(function (t) { return t.missable === "watch"; }).length;
  const earned = save.earned.length;
  const pct = Math.round((earned / trophies.length) * 100);
  $("audit").innerHTML = "<b>" + guidesCited + "/" + trophies.length + " guides cite a source</b> · " +
    citedSteps + "/" + totalSteps + " steps cited · " + sourceList.length + " sources · " +
    missable + " possibly missable · " + watch + " watch · " + unconfirmedCount() + " unconfirmed · " +
    disputeList.length + " disagreements · " + singleSourceCount() + " single-source · " +
    earned + "/" + trophies.length + " earned (" + pct + "%)";
}
function renderPlatinum() {
  const earned = save.earned.length;
  $("platfill").style.width = Math.round((earned / trophies.length) * 100) + "%";
  $("platnum").textContent = earned + "/" + trophies.length + " earned";
}

function filteredTrophies() {
  const q = searchText.trim().toLowerCase();
  return trophies.filter(function (t) {
    if (activeFilter === "story" && t.kind !== "story") { return false; }
    if (activeFilter === "missable" && t.missable === "no") { return false; }
    if (activeFilter === "collectibles" && t.kind !== "collectibles") { return false; }
    if (activeFilter === "activities" && t.kind !== "activities") { return false; }
    if (activeFilter === "online") { return false; }
    if (earnedOnly && !isEarned(t)) { return false; }
    if (q) {
      const hay = (t.name + " " + t.description + " " + t.guide).toLowerCase();
      if (hay.indexOf(q) === -1) { return false; }
    }
    return true;
  });
}
function renderChips() {
  const counts = { all: trophies.length, story: 0, missable: 0, collectibles: 0, activities: 0, online: 0 };
  trophies.forEach(function (t) {
    counts[t.kind] += 1;
    if (t.missable !== "no") { counts.missable += 1; }
  });
  $("chips").innerHTML = KIND_FILTERS.map(function (pair) {
    const key = pair[0];
    const label = pair[1];
    return '<button class="chip' + (activeFilter === key ? " active" : "") + '" data-filter="' + key + '">' +
      label + " (" + counts[key] + ")</button>";
  }).join("");
}
function renderChecklist() {
  const rows = filteredTrophies();
  $("listcount").textContent = "(" + rows.length + " of " + trophies.length + ")";
  if (!rows.length) {
    $("list").innerHTML = "<li>No trophies match this filter. The list has no online trophies — the Online filter is empty by design.</li>";
    return;
  }
  $("list").innerHTML = rows.map(function (t) {
    const hidden = isSpoilerHidden(t);
    const name = hidden ? "Hidden story trophy — earn it to reveal" : esc(t.name);
    const flags = [];
    if (t.hidden) { flags.push('<span class="tag hidden">hidden on PS</span>'); }
    if (t.missable === "possible") { flags.push('<span class="tag miss">possibly missable</span>'); }
    if (t.missable === "watch") { flags.push('<span class="tag watch">watch</span>'); }
    flags.push('<span class="tag">' + t.kind + "</span>");
    if (t.target) { flags.push('<span class="tag">' + (save.progress[t.id] || 0) + "/" + t.target + "</span>"); }
    return '<li class="' + (t.id === selectedId ? "sel " : "") + (isEarned(t) ? "earned" : "") + '" data-id="' + t.id + '">' +
      '<input type="checkbox" data-check="' + t.id + '"' + (isEarned(t) ? " checked" : "") + ' aria-label="Earned: ' + esc(t.name) + '">' +
      '<div><div class="tname">' + gradeBadge(t) + name + "</div>" +
      '<div class="tmeta">' + (hidden ? "Story trophy — name and description hidden until earned." : esc(t.description)) + "</div>" +
      '<div class="tmeta">' + flags.join("") + "</div></div></li>";
  }).join("");
}

function disputeBoxFor(t) {
  if (!t.dispute || !t.dispute.length) { return ""; }
  return t.dispute.map(function (id) {
    const d = disputeList.find(function (x) { return x.id === id; });
    if (!d) { return ""; }
    const versions = d.versions.map(function (v) {
      return '<p class="ver"><b>' + esc(v.label) + ":</b> " + esc(v.text) + " " + citeLinks(v.sources) + "</p>";
    }).join("");
    return '<div class="dispute"><h3>Sources disagree — ' + esc(d.title) + "</h3>" + versions +
      '<p class="safe">Safe play: ' + esc(d.safe) + "</p></div>";
  }).join("");
}
function meditationCounter(t) {
  if (t.id !== 28) { return ""; }
  const done = save.progress[28] || 0;
  return '<div class="counter"><span class="cnum">' + done + '/18 meditations</span>' +
    '<button data-med="-1" aria-label="One fewer meditation">−</button>' +
    '<button data-med="1" aria-label="One more meditation">+</button>' +
    '<p class="fine">Tap + each time you finish a meditation spot. The counter lives in your save file and exports with it. 100% needs only 15/18 — the trophy appears to need all 18. [18][3]</p></div>';
}
function renderGuideDetail() {
  const t = trophyById(selectedId) || trophies[0];
  if (!t) { $("detail").innerHTML = ""; return; }
  if (isSpoilerHidden(t)) {
    $("detail").innerHTML = '<div class="detailhead"><h2>Hidden story trophy</h2>' +
      '<p class="desc">Spoiler-safe mode is on. This story trophy’s name and description stay hidden until you earn it — tick its box in the checklist to reveal the guide.</p></div>' +
      '<p class="guide">Its grade is <b>' + t.grade + '</b>. Turn spoiler-safe off to read the guide now, or earn it in-game and tick it off here.</p>';
    return;
  }
  const steps = t.steps.map(function (st, i) {
    return "<li>" + esc(st.text) + " " + citeLinks(st.cites) + "</li>";
  }).join("");
  const srcs = t.sources.map(function (n) {
    const s = sourceByNumber(n);
    return s ? "[" + n + "] " + esc(s.name) : "[" + n + "]";
  }).join(" · ");
  $("detail").innerHTML = '<div class="detailhead"><h2>' + gradeBadge(t) + esc(t.name) + "</h2>" +
    '<p class="desc">Official: “' + esc(t.description) + "” — " + t.grade +
    (t.hidden ? " · hidden on PlayStation until earned" : " · visible on PlayStation") + "</p></div>" +
    '<p class="guide">' + esc(t.guide) + "</p>" +
    '<ol class="steps">' + steps + "</ol>" +
    meditationCounter(t) +
    disputeBoxFor(t) +
    '<p class="fine">Sources for this guide: ' + srcs + ". Full list on the Sources page.</p>";
}

function renderSourcesMini() {
  $("srccount").textContent = "(" + sourceList.length + ")";
  $("srclist").innerHTML = sourceList.map(function (s) {
    return "<li><b>[" + s.n + "]</b> " + esc(s.name) + ' — <span class="cb">cited by ' + citedByCount(s.n) + "/55</span></li>";
  }).join("");
}
function renderRoadmapMini() {
  $("roadmapmini").innerHTML = roadmapStages.map(function (st) {
    const done = st.trophies.filter(function (id) { return save.earned.indexOf(id) !== -1; }).length;
    const pct = Math.round((done / st.trophies.length) * 100);
    return '<li><span class="st">' + st.code + "</span> " + esc(st.title) +
      ' <span class="cb">' + done + "/" + st.trophies.length + "</span>" +
      '<div class="mini-bar"><i style="width:' + pct + '%"></i></div></li>';
  }).join("");
}
function renderRoadmapView() {
  $("stagestrip").innerHTML = roadmapStages.map(function (st) {
    const done = st.trophies.filter(function (id) { return save.earned.indexOf(id) !== -1; }).length;
    return '<div class="stagecard' + (selectedStage === st.stage ? " sel" : "") + '" data-stage="' + st.stage + '">' +
      '<div class="code">' + st.code + "</div><h3>" + esc(st.title) + "</h3>" +
      "<p>" + esc(st.goal) + "</p>" +
      '<div class="cnt">' + done + "/" + st.trophies.length + " earned</div></div>";
  }).join("");
  const st = roadmapStages.find(function (x) { return x.stage === selectedStage; }) || roadmapStages[0];
  const items = st.trophies.map(function (id) {
    const t = trophyById(id);
    if (!t) { return ""; }
    return "<li>" + gradeBadge(t) + (isEarned(t) ? "✓ " : "") + esc(t.name) +
      ' <span class="fine">— ' + esc(t.description) + "</span></li>";
  }).join("");
  $("stagedetail").innerHTML = '<div class="stagedetail"><h3>' + st.code + " — " + esc(st.title) + "</h3>" +
    "<p>" + esc(st.goal) + "</p>" +
    '<p class="safe" style="color:#ffe9a8">Tip: ' + esc(st.tip) + "</p><ul>" + items + "</ul></div>";
}
function renderMissables() {
  const cards = [
    { cls: "hot", title: "Possibly missable — Strangers & Freaks", body: "Yago’s “Race Against Yago” is time-sensitive and can lock you out of Yago’s missions. Five guides count 1 possibly missable trophy; this is the one.", safe: "Do it the moment the hourglass icon appears in Chapter 3. Save first. [1][17][12]" },
    { cls: "warm", title: "Watch — Positive Mental Attitude", body: "Whether the Chapter 1 balcony meditation counts is disputed: PowerPyx calls it pending, OutputLag says it counts, eGamers reports the author unsure.", safe: "Meditate on the balcony in Chapter 1 and keep a manual Chapter 1 save until the trophy pops. [1][11][14]" },
    { cls: "warm", title: "Watch — Catch Me If You Can", body: "Some top-10 lists add this as a second missable. The departure itself is a one-shot attempt at VCIA.", safe: "Save before the flight, and use a plane docked at a boarding bridge. [1][17]" }
  ];
  $("misscards").innerHTML = cards.map(function (c) {
    return '<div class="misscard ' + c.cls + '"><h3>' + c.title + "</h3><p>" + c.body + '</p><p class="safe">Safe play: ' + c.safe + "</p></div>";
  }).join("");
  $("matrix").innerHTML = trophies.map(function (t) {
    const cls = t.missable === "possible" ? "miss" : (t.missable === "watch" ? "watch" : "");
    const flag = t.missable === "possible" ? "MISSABLE" : (t.missable === "watch" ? "WATCH" : "safe");
    return '<div class="cell ' + cls + '"><div class="cn">' + esc(t.name) + "</div><div>" + t.grade + " · " + flag + "</div></div>";
  }).join("");
}
function renderSourcesFull() {
  $("srcfull").innerHTML = sourceList.map(function (s) {
    return "<li><b>[" + s.n + "]</b> <a href=\"" + s.url + "\" target=\"_blank\" rel=\"noopener\">" + esc(s.name) + "</a> — " +
      '<span class="cb">cited by ' + citedByCount(s.n) + "/55 guides</span><br>" +
      '<span class="depth">' + esc(s.depth) + ". Read " + esc(s.read) + ".</span></li>";
  }).join("");
  $("excluded").innerHTML = (sourceMeta.excluded || []).map(function (x) {
    return "<li><b>" + esc(x.name) + ".</b> " + esc(x.reason) + (x.url ? ' <a href="' + x.url + '" target="_blank" rel="noopener">Link</a>' : "") + "</li>";
  }).join("");
  $("disputes").innerHTML = disputeList.map(function (d) {
    const versions = d.versions.map(function (v) {
      return '<p class="ver"><b>' + esc(v.label) + ":</b> " + esc(v.text) + " " + citeLinks(v.sources) + "</p>";
    }).join("");
    return '<div class="dispute"><h3>' + d.id + " — " + esc(d.title) + "</h3>" + versions +
      '<p class="safe">Safe play: ' + esc(d.safe) + "</p></div>";
  }).join("");
}

function renderExportPreview() {
  $("exportPreview").value = JSON.stringify(save);
  $("savestate").textContent = "Saved in this browser: " + save.earned.length + "/55 earned" +
    (save.progress[28] ? ", meditation " + (save.progress[28] || 0) + "/18" : "") + ".";
}
function exportSave() {
  const blob = new Blob([JSON.stringify(save, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "neon-palm-v3-save.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  showToast("Save exported: " + save.earned.length + "/55 earned.");
}
function importSave(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch (e) { showToast("Import failed: not valid JSON."); return false; }
  if (!parsed || !Array.isArray(parsed.earned)) { showToast("Import failed: no earned list found."); return false; }
  const clean = parsed.earned.filter(function (id) { return trophyById(id); });
  save = { earned: clean, progress: parsed.progress || {} };
  persistSave();
  renderAll();
  showToast("Save imported: " + clean.length + "/55 earned.", saveDemo);
  return true;
}

function renderAll() {
  renderAuditStrip();
  renderPlatinum();
  renderChips();
  renderChecklist();
  renderGuideDetail();
  renderSourcesMini();
  renderRoadmapMini();
  renderRoadmapView();
  renderMissables();
  renderSourcesFull();
  renderExportPreview();
  $("spoilerToggle").checked = spoilerOn;
}

function switchView(name) {
  document.querySelectorAll(".tab").forEach(function (b) {
    b.classList.toggle("active", b.dataset.view === name);
  });
  document.querySelectorAll(".view").forEach(function (v) {
    v.classList.toggle("active", v.id === "view-" + name);
  });
  $("toolbar").style.display = name === "guide" ? "" : "none";
}
function applyHash() {
  const hash = (location.hash || "#guide").replace("#", "");
  saveDemo = hash === "spoilers-save";
  if (hash === "roadmap" || hash === "missables" || hash === "sources") {
    switchView(hash);
  } else {
    switchView("guide");
    if (saveDemo) {
      spoilerOn = true;
      persistSpoiler();
      selectedId = 7;
      const side = $("sidecol");
      const panel = $("panel-save");
      side.insertBefore(panel, side.firstChild);
    }
  }
  renderAll();
  if (saveDemo) {
    importSave(JSON.stringify(save));
  }
}

function bindEvents() {
  document.addEventListener("click", function (e) {
    const chip = e.target.closest("[data-filter]");
    if (chip) { activeFilter = chip.dataset.filter; renderChips(); renderChecklist(); return; }
    const tab = e.target.closest(".tab");
    if (tab) { location.hash = tab.dataset.view; return; }
    const row = e.target.closest("#list li[data-id]");
    if (row && !e.target.matches("input[data-check]")) {
      selectedId = parseInt(row.dataset.id, 10);
      renderChecklist();
      renderGuideDetail();
      return;
    }
    const check = e.target.closest("input[data-check]");
    if (check) {
      const id = parseInt(check.dataset.check, 10);
      if (check.checked && save.earned.indexOf(id) === -1) { save.earned.push(id); }
      if (!check.checked) { save.earned = save.earned.filter(function (x) { return x !== id; }); }
      persistSave();
      renderChecklist();
      renderGuideDetail();
      renderRoadmapMini();
      renderRoadmapView();
      return;
    }
    const med = e.target.closest("[data-med]");
    if (med) {
      const next = Math.min(18, Math.max(0, (save.progress[28] || 0) + parseInt(med.dataset.med, 10)));
      save.progress[28] = next;
      persistSave();
      renderGuideDetail();
      renderChecklist();
      return;
    }
    const stage = e.target.closest("[data-stage]");
    if (stage) {
      selectedStage = parseInt(stage.dataset.stage, 10);
      renderRoadmapView();
      return;
    }
    const cite = e.target.closest("a.cite");
    if (cite) { location.hash = "sources"; return; }
  });
  $("search").addEventListener("input", function (e) { searchText = e.target.value; renderChecklist(); });
  $("spoilerToggle").addEventListener("change", function (e) {
    spoilerOn = e.target.checked;
    persistSpoiler();
    renderChecklist();
    renderGuideDetail();
  });
  $("earnedOnly").addEventListener("change", function (e) { earnedOnly = e.target.checked; renderChecklist(); });
  $("exportBtn").addEventListener("click", exportSave);
  $("importTextBtn").addEventListener("click", function () { importSave($("importText").value); });
  $("importFile").addEventListener("change", function (e) {
    const file = e.target.files && e.target.files[0];
    if (!file) { return; }
    const reader = new FileReader();
    reader.onload = function () { importSave(String(reader.result)); };
    reader.readAsText(file);
  });
  window.addEventListener("hashchange", applyHash);
}

loadSpoiler();
loadData().then(function () {
  loadSave();
  bindEvents();
  applyHash();
}).catch(function (err) {
  $("audit").textContent = "Could not load the guide data. Serve app/ over HTTP and reload. (" + err.message + ")";
});
