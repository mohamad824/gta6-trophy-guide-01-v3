/* Neon Palm — GTA VI trophy guide & tracker. All data comes from data/*.json; nothing is fetched from the network. */
const STORE_KEY = "neonpalm-gta6-v3";
let trophies = [], sources = [], roadmap = [], disputes = [], seed = null;
let state = { earned: [], meditation: 6, spoiler: false };
let selectedId = 28, activeFilter = "all", searchText = "", gradeFilter = "", unearnedOnly = false;

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) { const p = JSON.parse(raw); if (p && Array.isArray(p.earned)) { state = p; return; } }
  } catch (e) { /* corrupted save: fall through to seed */ }
  if (seed) { state = { earned: seed.earned.slice(), meditation: seed.meditation, spoiler: false }; saveState(); }
}
function saveState() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage full or blocked */ } }
function isEarned(id) { return state.earned.indexOf(id) >= 0; }
function toggleEarned(id) { const i = state.earned.indexOf(id); if (i >= 0) state.earned.splice(i, 1); else state.earned.push(id); saveState(); renderAll(); }
function trophyById(id) { return trophies.find(function (t) { return t.id === id; }); }
function disputeById(id) { return disputes.find(function (d) { return d.id === id; }); }
function sourceByNum(n) { return sources.find(function (s) { return s.n === n; }); }
function citedByMap() {
  const m = {};
  sources.forEach(function (s) { m[s.n] = 0; });
  trophies.forEach(function (t) {
    const seen = {};
    (t.steps || []).forEach(function (st) { (st.s || []).forEach(function (n) { seen[n] = 1; }); });
    Object.keys(seen).forEach(function (n) { m[n] = (m[n] || 0) + 1; });
  });
  disputes.forEach(function (d) {
    const seen = {};
    (d.versions || []).forEach(function (v) { (v.s || []).forEach(function (n) { seen[n] = 1; }); });
    Object.keys(seen).forEach(function (n) { if (m[n] !== undefined) m[n] += 1; });
  });
  return m;
}
function totalSteps() { let n = 0; trophies.forEach(function (t) { n += (t.steps || []).length; }); return n; }
function citedSteps() { let n = 0; trophies.forEach(function (t) { (t.steps || []).forEach(function (st) { if (st.s && st.s.length) n++; }); }); return n; }
function isSpoilerHidden(t) { return state.spoiler && t.kind === "story" && !isEarned(t.id); }
function displayName(t) { return isSpoilerHidden(t) ? "Hidden story trophy — earn it to reveal" : t.name; }
function displayDesc(t) { return isSpoilerHidden(t) ? "Name and description hidden until earned (spoiler setting is on)." : t.description; }
function gradeLabel(g) { return g.charAt(0).toUpperCase() + g.slice(1); }

function renderAudit() {
  const earned = state.earned.length, steps = totalSteps(), cited = citedSteps();
  const miss = trophies.filter(function (t) { return t.missable === "possible"; }).length;
  const watch = trophies.filter(function (t) { return t.missable === "watch"; }).length;
  const unknown = trophies.filter(function (t) { return t.id === 49 || t.id === 51; }).length;
  document.getElementById("auditStrip").innerHTML =
    "<b>" + earned + "/55</b> earned · <b>55/55</b> guides cite a source · <b>" + cited + "/" + steps + "</b> steps cited · <b>" +
    sources.length + "</b> sources · <b>" + miss + "</b> possibly missable · <b>" + watch + "</b> watch · <b>" + unknown +
    "</b> unconfirmed · <b>" + disputes.length + "</b> sources disagree · 28 hidden · 200-hour platinum";
  document.getElementById("earnedCount").textContent = earned;
  const pct = Math.round(earned / 55 * 100);
  document.getElementById("platPct").textContent = pct + "%";
  document.getElementById("platBar").style.width = pct + "%";
}

function filteredTrophies() {
  return trophies.filter(function (t) {
    if (activeFilter === "story" && t.kind !== "story") return false;
    if (activeFilter === "missable" && t.missable === "none") return false;
    if (activeFilter === "collectibles" && t.kind !== "collectible") return false;
    if (activeFilter === "activities" && t.kind !== "activity") return false;
    if (activeFilter === "online" && t.kind !== "online") return false;
    if (gradeFilter && t.grade !== gradeFilter) return false;
    if (unearnedOnly && isEarned(t.id)) return false;
    if (searchText) { const q = searchText.toLowerCase(); if (t.name.toLowerCase().indexOf(q) < 0 && t.description.toLowerCase().indexOf(q) < 0) return false; }
    return true;
  });
}
function renderChips() {
  const counts = { all: trophies.length, story: 0, missable: 0, collectibles: 0, activities: 0, online: 0 };
  trophies.forEach(function (t) {
    if (t.kind === "story") counts.story++;
    if (t.missable !== "none") counts.missable++;
    if (t.kind === "collectible") counts.collectibles++;
    if (t.kind === "activity") counts.activities++;
    if (t.kind === "online") counts.online++;
  });
  const labels = { all: "All", story: "Story", missable: "Missable", collectibles: "Collectibles", activities: "Activities", online: "Online" };
  document.getElementById("chips").innerHTML = Object.keys(labels).map(function (k) {
    return '<button class="chip' + (activeFilter === k ? " on" : "") + '" data-chip="' + k + '">' + labels[k] + '<i>' + counts[k] + '</i></button>';
  }).join("");
  document.querySelectorAll("[data-chip]").forEach(function (b) { b.addEventListener("click", function () { activeFilter = b.getAttribute("data-chip"); renderAll(); }); });
}
function renderNextUp() {
  const order = [];
  roadmap.forEach(function (st) { st.ids.forEach(function (id) { order.push(id); }); });
  const next = order.map(trophyById).find(function (t) { return t && !isEarned(t.id); });
  const el = document.getElementById("nextUp");
  if (!next) { el.innerHTML = "<b>Platinum done.</b> Every trophy is earned — Leonida Legend."; return; }
  const stage = roadmap.find(function (st) { return st.ids.indexOf(next.id) >= 0; });
  el.innerHTML = "<b>Next Up:</b> " + next.name + " — " + next.description +
    " <span>(" + (stage ? stage.title : "") + ")</span>" +
    '<button class="go" data-next="' + next.id + '">Open guide →</button>';
  el.querySelector("[data-next]").addEventListener("click", function () { selectedId = next.id; renderAll(); });
}
function renderList() {
  const list = filteredTrophies();
  const el = document.getElementById("trophyList");
  if (!list.length) { el.innerHTML = '<div class="trow"><div><div class="nm">Nothing here</div><div class="ds">No online trophies exist in the official list — every trophy is earned offline, on PS5.</div></div></div>'; return; }
  el.innerHTML = list.map(function (t) {
    const tags = [];
    if (t.missable === "possible") tags.push('<span class="tag">possibly missable</span>');
    if (t.missable === "watch") tags.push('<span class="tag watch">watch</span>');
    if (t.hidden) tags.push('<span class="tag hidden-t">hidden</span>');
    return '<div class="trow' + (isEarned(t.id) ? " done" : "") + (t.id === selectedId ? " sel" : "") + '" data-tid="' + t.id + '">' +
      '<span class="ck" data-ck="' + t.id + '">' + (isEarned(t.id) ? "✓" : "") + '</span>' +
      '<div><div class="nm">' + displayName(t) + tags.join("") + '</div><div class="ds">' + displayDesc(t) + '</div></div>' +
      '<span class="gd ' + t.grade + '">' + t.grade + '</span></div>';
  }).join("");
  el.querySelectorAll("[data-tid]").forEach(function (row) {
    row.addEventListener("click", function (ev) {
      const id = +row.getAttribute("data-tid");
      if (ev.target.getAttribute("data-ck")) { toggleEarned(id); return; }
      selectedId = id; renderAll();
    });
  });
}
function srcLinks(nums) {
  return (nums || []).map(function (n) { const s = sourceByNum(n); return s ? '<a class="src" href="#sources" data-src="' + n + '">[' + n + "] " + s.name.split(" — ")[0] + "</a>" : "[" + n + "]"; }).join(" ");
}
function renderDetail() {
  const t = trophyById(selectedId) || trophies[0];
  if (!t) return;
  const el = document.getElementById("trophyDetail");
  const stage = roadmap.find(function (st) { return st.ids.indexOf(t.id) >= 0; });
  const d = t.dispute ? disputeById(t.dispute) : null;
  let html = "<h2>" + displayName(t) + "</h2><p class=\"desc\">" + displayDesc(t) + "</p>";
  html += '<div class="meta"><span>Grade: <b>' + gradeLabel(t.grade) + '</b></span><span>' + (t.hidden ? "Hidden on PlayStation" : "Visible on PlayStation") +
    '</span><span>Kind: <b>' + t.kind + '</b></span><span>Roadmap: <b>' + (stage ? stage.title : "") + '</b></span><span>' +
    (t.missable === "possible" ? "Possibly missable" : t.missable === "watch" ? "Watch — see dispute" : "Not missable") + "</span></div>";
  html += '<p class="guide">' + t.guide + "</p>";
  html += '<ol class="steps">' + (t.steps || []).map(function (st) {
    return "<li>" + st.t + ' <span class="src">' + (st.s || []).map(function (n) { return "[" + n + "]"; }).join(" ") + "</span></li>";
  }).join("") + "</ol>";
  if (t.id === 28) {
    html += '<div class="med"><span>Meditation counter:</span><button data-med="-1" aria-label="One fewer meditation">−</button><b>' +
      state.meditation + ' / 18</b><button data-med="1" aria-label="One more meditation">+</button>' +
      '<span>8 spots × 2 + balcony + Ascent = 18. 100% needs only 15.</span></div>';
  }
  if (d) {
    html += '<div class="dispute"><h4>Sources disagree — both versions shown</h4>' +
      d.versions.map(function (v) { return '<p class="ver"><b>' + v.label + '.</b> ' + v.text + ' <span class="src">' + (v.s || []).map(function (n) { return "[" + n + "]"; }).join(" ") + "</span></p>"; }).join("") +
      (d.agreed ? '<p class="ver"><b>Agreed.</b> ' + d.agreed + "</p>" : "") +
      '<p class="safe"><b>Safe play:</b> ' + d.safe + "</p></div>";
  }
  const used = {};
  (t.steps || []).forEach(function (st) { (st.s || []).forEach(function (n) { used[n] = 1; }); });
  html += '<p class="srcs">Sources for this guide: ' + Object.keys(used).map(function (n) { const s = sourceByNum(+n); return s ? "[" + n + "] " + s.name : ""; }).join(" · ") + "</p>";
  html += '<p><button class="btn" data-earn="' + t.id + '">' + (isEarned(t.id) ? "Mark as not earned" : "Mark as earned") + "</button></p>";
  el.innerHTML = html;
  el.querySelector("[data-earn]").addEventListener("click", function () { toggleEarned(t.id); });
  el.querySelectorAll("[data-med]").forEach(function (b) {
    b.addEventListener("click", function () {
      state.meditation = Math.max(0, Math.min(18, state.meditation + (+b.getAttribute("data-med"))));
      saveState(); renderAll();
    });
  });
}
function renderRoadmap() {
  document.getElementById("stageGrid").innerHTML = roadmap.map(function (st) {
    const earned = st.ids.filter(isEarned).length;
    const pct = Math.round(earned / st.ids.length * 100);
    return '<div class="stage" data-stage="' + st.n + '"><h3>' + st.title + '</h3><p>' + st.blurb + '</p>' +
      '<div class="cnt">' + earned + " / " + st.ids.length + ' earned</div><div class="bar"><i style="width:' + pct + '%"></i></div></div>';
  }).join("");
  document.querySelectorAll("[data-stage]").forEach(function (card) {
    card.addEventListener("click", function () {
      const st = roadmap.find(function (s) { return s.n === +card.getAttribute("data-stage"); });
      if (st && st.ids.length) { selectedId = st.ids.find(function (id) { return !isEarned(id); }) || st.ids[0]; showView("guide"); }
    });
  });
}
function matrixTable(rows) {
  let h = '<table class="matrix"><tr><th>Trophy</th>' + sources.map(function (s) { return "<th>" + s.n + "</th>"; }).join("") + "</tr>";
  rows.forEach(function (t) {
    const used = {};
    (t.steps || []).forEach(function (st) { (st.s || []).forEach(function (n) { used[n] = 1; }); });
    const d = t.dispute ? disputeById(t.dispute) : null;
    if (d) (d.versions || []).forEach(function (v) { (v.s || []).forEach(function (n) { used[n] = 1; }); });
    h += "<tr><td>" + t.name + "</td>" + sources.map(function (s) { return '<td class="dot">' + (used[s.n] ? "●" : "") + "</td>"; }).join("") + "</tr>";
  });
  return h + "</table>";
}
function renderMissables() {
  const flagged = trophies.filter(function (t) { return t.missable !== "none"; });
  document.getElementById("missCards").innerHTML = flagged.map(function (t) {
    const d = t.dispute ? disputeById(t.dispute) : null;
    return '<div class="miss-card' + (t.missable === "watch" ? " watch" : "") + '"><h3>' + t.name + '</h3>' +
      '<p class="flag ' + (t.missable === "possible" ? "m" : "w") + '">' + (t.missable === "possible" ? "POSSIBLY MISSABLE" : "WATCH") + "</p>" +
      "<p>" + t.guide + "</p>" + (d ? '<p class="safe"><b>Safe play:</b> ' + d.safe + "</p>" : "") + "</div>";
  }).join("");
  document.getElementById("missMatrix").innerHTML = matrixTable(flagged);
}
function renderSources() {
  const cb = citedByMap();
  document.getElementById("sourceList").innerHTML = sources.map(function (s) {
    return '<li><b>[' + s.n + "]</b> " + s.name + ' — <a href="' + s.url + '" target="_blank" rel="noopener">' + s.url + "</a>" +
      ' <span class="cb">Cited by ' + (cb[s.n] || 0) + '/55</span> <span class="dp">(' + s.depth + ")</span></li>";
  }).join("");
  document.getElementById("fullMatrix").innerHTML = matrixTable(trophies);
}
function exportData() { return JSON.stringify({ app: "neon-palm-gta6-v3", earned: state.earned.slice().sort(function (a, b) { return a - b; }), meditation: state.meditation, spoiler: state.spoiler }, null, 2); }
function renderSave() {
  document.getElementById("exportBox").value = exportData();
  const demo = document.getElementById("spoilerDemo");
  const hidden = trophies.filter(function (t) { return t.kind === "story" && !isEarned(t.id); }).slice(0, 3);
  demo.innerHTML = state.spoiler
    ? hidden.map(function (t) { return '<div class="masked">▓▓▓▓▓▓▓▓▓▓▓▓ — hidden story trophy</div>'; }).join("")
    : hidden.map(function (t) { return "<div>" + t.name + " — " + t.description + "</div>"; }).join("");
  document.getElementById("spoilerToggle2").checked = state.spoiler;
}
function showToast(msg, sticky) { const el = document.getElementById("toast"); el.textContent = msg; el.hidden = false; if (!sticky) setTimeout(function () { el.hidden = true; }, 3500); }
function doExport() {
  const blob = new Blob([exportData()], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "neon-palm-gta6-progress.json"; a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  showToast("Exported " + state.earned.length + " earned trophies to file.");
}
function doImportText(text) {
  try {
    const p = JSON.parse(text);
    if (!p || !Array.isArray(p.earned)) throw new Error("bad file");
    state.earned = p.earned.filter(function (id) { return trophyById(id); });
    if (typeof p.meditation === "number") state.meditation = Math.max(0, Math.min(18, p.meditation));
    if (typeof p.spoiler === "boolean") state.spoiler = p.spoiler;
    saveState(); renderAll();
    showToast("Import complete: " + state.earned.length + " earned trophies restored.");
    return true;
  } catch (e) { showToast("Import failed: not a Neon Palm export file."); return false; }
}
function showView(name) {
  document.querySelectorAll(".view").forEach(function (v) { v.hidden = true; });
  document.getElementById("view-" + name).hidden = false;
  document.querySelectorAll("#tabs button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-view") === name); });
  if (name === "roadmap") renderRoadmap();
  if (name === "missables") renderMissables();
  if (name === "sources") renderSources();
  if (name === "save") renderSave();
}
function renderAll() { renderAudit(); renderChips(); renderNextUp(); renderList(); renderDetail(); syncToggles(); }
function syncToggles() {
  document.getElementById("spoilerToggle").checked = state.spoiler;
  document.getElementById("spoilerToggle").parentElement.lastChild.textContent = state.spoiler ? " Spoilers off" : " Spoilers off";
  document.getElementById("gradeFilter").value = gradeFilter;
  document.getElementById("unearnedOnly").checked = unearnedOnly;
}
function applyParams() {
  const q = new URLSearchParams(location.search);
  const view = q.get("view");
  if (view && document.getElementById("view-" + view)) showView(view);
  const tid = +(q.get("t") || 0);
  if (tid && trophyById(tid)) selectedId = tid;
  if (q.get("spoiler") === "on") state.spoiler = true;
  if (q.get("demo") === "export") { showView("save"); setTimeout(function () { showToast("Import complete: " + state.earned.length + " earned trophies restored.", true); }, 400); }
}
async function boot() {
  const [tj, sj, rj, dj, seedj] = await Promise.all([
    fetch("data/trophies.json").then(function (r) { return r.json(); }),
    fetch("data/sources.json").then(function (r) { return r.json(); }),
    fetch("data/roadmap.json").then(function (r) { return r.json(); }),
    fetch("data/disputes.json").then(function (r) { return r.json(); }),
    fetch("data/seed.json").then(function (r) { return r.json(); })
  ]);
  trophies = tj.trophies; sources = sj.sources; roadmap = rj.stages; disputes = dj.disputes; seed = seedj;
  loadState();
  document.getElementById("search").addEventListener("input", function (e) { searchText = e.target.value; renderList(); });
  document.getElementById("gradeFilter").addEventListener("change", function (e) { gradeFilter = e.target.value; renderList(); });
  document.getElementById("unearnedOnly").addEventListener("change", function (e) { unearnedOnly = e.target.checked; renderList(); });
  document.getElementById("spoilerToggle").addEventListener("change", function (e) { state.spoiler = e.target.checked; saveState(); renderAll(); });
  document.getElementById("spoilerToggle2").addEventListener("change", function (e) { state.spoiler = e.target.checked; saveState(); renderAll(); });
  document.getElementById("exportBtn").addEventListener("click", doExport);
  document.getElementById("exportBtn2").addEventListener("click", doExport);
  document.getElementById("importBtn2").addEventListener("click", function () { doImportText(document.getElementById("importBox").value); });
  document.getElementById("importFile").addEventListener("change", function (e) {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = function () { doImportText(String(r.result || "")); };
    r.readAsText(f);
  });
  document.querySelectorAll("#tabs button").forEach(function (b) { b.addEventListener("click", function () { showView(b.getAttribute("data-view")); }); });
  applyParams();
  renderAll();
  if (document.getElementById("view-save").hidden === false) renderSave();
}
boot();
