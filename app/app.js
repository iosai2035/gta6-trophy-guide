// Leonida Trophy Guide — offline guide and tracker for the 55 GTA VI trophies.
// Loads data/trophies.json and data/checklist.json (both plain files under app/),
// saves progress in localStorage, and never makes a network request of its own.
const EARNED_KEY = 'gta6-trophy-earned';
const CHECK_KEY = 'gta6-checklist-done';
const SPOILER_KEY = 'gta6-spoilers';

const cardsEl = document.getElementById('cards');
const resultCountEl = document.getElementById('resultCount');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('gradeFilter');
const kindEl = document.getElementById('kindFilter');
const hiddenEl = document.getElementById('hiddenFilter');
const statusEl = document.getElementById('statusFilter');
const spoilerEl = document.getElementById('spoilerToggle');
const spoilerLabelEl = document.getElementById('spoilerLabel');

let trophies = [];
let sources = {};
let checklist = null;
let earned = new Set(readJson(EARNED_KEY, []));
let checklistDone = new Set(readJson(CHECK_KEY, []));
let spoilersOn = readSpoilerSetting();

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function readSpoilerSetting() {
  const raw = localStorage.getItem(SPOILER_KEY);
  if (raw === null) return true;
  return raw === '1';
}

function saveEarned() {
  localStorage.setItem(EARNED_KEY, JSON.stringify([...earned]));
}

function saveChecklist() {
  localStorage.setItem(CHECK_KEY, JSON.stringify([...checklistDone]));
}

function saveSpoilers() {
  localStorage.setItem(SPOILER_KEY, spoilersOn ? '1' : '0');
}

async function loadGuideData() {
  const [trophyDoc, checklistDoc] = await Promise.all([
    (await fetch('data/trophies.json')).json(),
    (await fetch('data/checklist.json')).json(),
  ]);
  trophies = trophyDoc.trophies;
  sources = trophyDoc.sources;
  checklist = checklistDoc;
}

function trophyById(id) {
  return trophies.find((t) => t.id === id);
}

function isHiddenFromViewer(t) {
  return spoilersOn && t.hidden && !earned.has(t.id);
}

function kindLabel(kind) {
  const labels = {
    story: 'Story',
    side: 'Side character',
    activity: 'Activity',
    collectible: 'Collectible',
    crime: 'Crime',
    exploration: 'Exploration',
    'easter-egg': 'Easter egg',
    platinum: 'Platinum path',
  };
  return labels[kind] ?? kind;
}

function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

function formatTarget(t) {
  if (t.target == null) return '';
  if (t.total != null && t.total !== t.target) return `${t.target} of ${t.total}`;
  if (t.target >= 100000) return `$${t.target.toLocaleString('en-US')}`;
  return `${t.target}`;
}

function trophyMatchesFilters(t) {
  const q = searchEl.value.trim().toLowerCase();
  if (q) {
    const hay = [t.name, t.description, t.guide, ...(t.steps ?? []), kindLabel(t.kind)]
      .join(' ').toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
  if (kindEl.value !== 'all' && t.kind !== kindEl.value) return false;
  if (hiddenEl.value === 'visible' && t.hidden) return false;
  if (hiddenEl.value === 'hidden' && !t.hidden) return false;
  if (statusEl.value === 'todo' && earned.has(t.id)) return false;
  if (statusEl.value === 'earned' && !earned.has(t.id)) return false;
  if (statusEl.value === 'missable' && !t.missable) return false;
  if (statusEl.value === 'unconfirmed' && t.status !== 'unconfirmed' && t.status !== 'single-source') return false;
  return true;
}

function flagChips(t) {
  const chips = [];
  if (t.hidden) chips.push(['flag-hidden', 'Hidden']);
  if (t.missable) chips.push(['flag-missable', 'Missable']);
  if (t.status === 'unconfirmed') chips.push(['flag-unconfirmed', 'Method unconfirmed']);
  if (t.status === 'single-source') chips.push(['flag-single', 'Single source']);
  if (earned.has(t.id)) chips.push(['flag-earned', 'Earned ✓']);
  return chips;
}

function buildTrophyCard(t) {
  const hidden = isHiddenFromViewer(t);
  const card = document.createElement('article');
  card.className = 'card' + (earned.has(t.id) ? ' earned' : '');
  card.dataset.trophyId = t.id;

  const top = document.createElement('div');
  top.className = 'card-top';
  const grade = document.createElement('span');
  grade.className = `grade grade-${t.grade}`;
  grade.textContent = gradeLabel(t.grade);
  const kind = document.createElement('span');
  kind.className = 'kind-tag';
  kind.textContent = kindLabel(t.kind);
  top.append(grade, kind);
  card.append(top);

  const title = document.createElement('h3');
  if (hidden) {
    title.textContent = 'Hidden trophy';
    title.className = 'hidden-name';
  } else {
    title.textContent = t.name;
  }
  card.append(title);

  if (!hidden) {
    const desc = document.createElement('p');
    desc.className = 'desc';
    desc.textContent = `“${t.description}”`;
    card.append(desc);
    const teaser = document.createElement('p');
    teaser.className = 'guide-teaser';
    teaser.textContent = t.guide;
    card.append(teaser);
  } else {
    const teaser = document.createElement('p');
    teaser.className = 'guide-teaser hidden-name';
    teaser.textContent = 'This trophy is hidden on PlayStation until it is earned. Turn spoilers off, or earn it, to see its name and guide.';
    card.append(teaser);
  }

  const flags = document.createElement('div');
  flags.className = 'flags';
  for (const [cls, label] of flagChips(t)) {
    const chip = document.createElement('span');
    chip.className = `flag ${cls}`;
    chip.textContent = label;
    flags.append(chip);
  }
  card.append(flags);

  const foot = document.createElement('div');
  foot.className = 'card-foot';
  const target = document.createElement('span');
  target.className = 'target';
  const targetText = formatTarget(t);
  if (targetText) target.textContent = targetText + (t.chapter ? ` · Ch. ${t.chapter}` : '');
  else if (t.chapter) target.textContent = `Chapter ${t.chapter}`;
  foot.append(target);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'earn-btn' + (earned.has(t.id) ? ' earned' : '');
  btn.textContent = earned.has(t.id) ? 'Earned ✓' : 'Mark earned';
  btn.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleEarned(t.id);
  });
  foot.append(btn);
  card.append(foot);

  card.addEventListener('click', () => openTrophyDetail(t.id));
  return card;
}

function renderTrophyCards() {
  const shown = trophies.filter(trophyMatchesFilters);
  cardsEl.replaceChildren(...shown.map(buildTrophyCard));
  resultCountEl.textContent = shown.length === trophies.length
    ? `${trophies.length} trophies`
    : `${shown.length} of ${trophies.length} trophies match`;
}

function renderProgress() {
  const total = trophies.length;
  const done = trophies.filter((t) => earned.has(t.id)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('progressText').textContent = `${done} of ${total} earned`;
  document.getElementById('progressPct').textContent = `${pct}%`;
  document.getElementById('progressBar').style.width = `${pct}%`;
  const byGrade = {};
  for (const t of trophies) {
    byGrade[t.grade] = byGrade[t.grade] ?? { done: 0, total: 0 };
    byGrade[t.grade].total += 1;
    if (earned.has(t.id)) byGrade[t.grade].done += 1;
  }
  document.getElementById('gradeCounts').textContent =
    ['platinum', 'gold', 'silver', 'bronze']
      .map((g) => `${gradeLabel(g)} ${byGrade[g].done}/${byGrade[g].total}`)
      .join(' · ');
}

function toggleEarned(id) {
  if (earned.has(id)) earned.delete(id);
  else earned.add(id);
  saveEarned();
  renderProgress();
  renderTrophyCards();
  const open = document.getElementById('drawer');
  if (!open.hidden) openTrophyDetail(id, true);
}

function renderAll() {
  renderProgress();
  renderTrophyCards();
  renderChecklist();
}

function openTrophyDetail(id, keepOpen) {
  const t = trophyById(id);
  if (!t) return;
  const drawer = document.getElementById('drawer');
  const body = document.getElementById('drawerBody');
  body.replaceChildren();
  const hidden = isHiddenFromViewer(t);

  const top = document.createElement('div');
  top.className = 'card-top';
  const grade = document.createElement('span');
  grade.className = `grade grade-${t.grade}`;
  grade.textContent = gradeLabel(t.grade);
  const kind = document.createElement('span');
  kind.className = 'kind-tag';
  kind.textContent = kindLabel(t.kind);
  top.append(grade, kind);
  body.append(top);

  const title = document.createElement('h2');
  title.id = 'drawerTitle';
  title.textContent = hidden ? 'Hidden trophy' : t.name;
  body.append(title);

  if (hidden) {
    const note = document.createElement('p');
    note.className = 'desc';
    note.textContent = 'This trophy is hidden on PlayStation until it is earned. Turn the spoiler setting off to reveal its name, description and guide.';
    body.append(note);
  } else {
    const desc = document.createElement('p');
    desc.className = 'desc';
    desc.textContent = `“${t.description}”`;
    body.append(desc);

    if (t.missable) {
      const warn = document.createElement('div');
      warn.className = 'warn-box';
      warn.textContent = '⚠ Potentially missable — see the guide below and do the Chapter 1 step before Chapter 1 ends.';
      body.append(warn);
    }
    if (t.status === 'unconfirmed') {
      const warn = document.createElement('div');
      warn.className = 'warn-box';
      warn.textContent = '⚠ Method unconfirmed — no guide site has settled how this trophy unlocks yet. What follows is what is known, not a confirmed method.';
      body.append(warn);
    }
    if (t.status === 'single-source') {
      const warn = document.createElement('div');
      warn.className = 'warn-box';
      warn.textContent = '⚠ Single source — only one guide site reports this method so far; the others still list it as unconfirmed. Treat it as a lead, not a fact.';
      body.append(warn);
    }

    const guideHead = document.createElement('h4');
    guideHead.textContent = 'Guide';
    body.append(guideHead);
    const guide = document.createElement('p');
    guide.className = 'guide-full';
    guide.textContent = t.guide;
    body.append(guide);

    if (t.steps && t.steps.length) {
      const stepsHead = document.createElement('h4');
      stepsHead.textContent = 'Steps';
      body.append(stepsHead);
      const list = document.createElement('ol');
      for (const step of t.steps) {
        const li = document.createElement('li');
        li.textContent = step;
        list.append(li);
      }
      body.append(list);
    }

    if (t.target != null) {
      const targetHead = document.createElement('h4');
      targetHead.textContent = 'Target';
      body.append(targetHead);
      const target = document.createElement('p');
      target.className = 'guide-full';
      target.textContent = formatTarget(t) + (t.chapter ? ` · Chapter ${t.chapter}` : '');
      body.append(target);
    }

    const srcHead = document.createElement('h4');
    srcHead.textContent = 'Sources';
    body.append(srcHead);
    const srcList = document.createElement('ul');
    for (const key of t.sources) {
      const src = sources[key];
      if (!src) continue;
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = src.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = src.name;
      li.append(a);
      srcList.append(li);
    }
    body.append(srcList);
  }

  const actions = document.createElement('div');
  actions.className = 'drawer-actions';
  const earnBtn = document.createElement('button');
  earnBtn.type = 'button';
  earnBtn.className = 'earn-btn' + (earned.has(t.id) ? ' earned' : '');
  earnBtn.textContent = earned.has(t.id) ? 'Earned ✓ — tap to unmark' : 'Mark as earned';
  earnBtn.addEventListener('click', () => toggleEarned(t.id));
  actions.append(earnBtn);
  body.append(actions);

  drawer.hidden = false;
  document.body.style.overflow = 'hidden';
  if (!keepOpen) history.replaceState(null, '', `#trophy-${t.id}`);
}

function closeTrophyDetail() {
  document.getElementById('drawer').hidden = true;
  document.body.style.overflow = '';
  history.replaceState(null, '', location.pathname + location.search);
}

function switchView(view) {
  for (const name of ['guide', 'roadmap', 'checklist']) {
    document.getElementById(`view${name[0].toUpperCase()}${name.slice(1)}`).hidden = name !== view;
    document.getElementById(`tab${name[0].toUpperCase()}${name.slice(1)}`).classList.toggle('active', name === view);
  }
}

function renderChecklist() {
  if (!checklist) return;
  const groupsEl = document.getElementById('checklistGroups');
  groupsEl.replaceChildren();
  let total = 0;
  let done = 0;
  for (const group of checklist.groups) {
    total += group.items.length;
    const groupDone = group.items.filter((i) => checklistDone.has(i.id)).length;
    done += groupDone;
    const section = document.createElement('div');
    section.className = 'check-group';
    const h = document.createElement('h3');
    h.textContent = `${group.name} — ${groupDone} of ${group.items.length} done`;
    section.append(h);
    const share = document.createElement('p');
    share.textContent = `${group.share} of the 100% total.`;
    section.append(share);
    const list = document.createElement('ul');
    list.className = 'check-items';
    for (const item of group.items) {
      const li = document.createElement('li');
      if (checklistDone.has(item.id)) li.className = 'done';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = checklistDone.has(item.id);
      box.setAttribute('aria-label', item.name);
      box.addEventListener('change', () => {
        if (box.checked) checklistDone.add(item.id);
        else checklistDone.delete(item.id);
        saveChecklist();
        renderChecklist();
      });
      const text = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'item-name' + (checklistDone.has(item.id) ? ' done' : '');
      const targetText = item.unit === '$'
        ? `$${item.target.toLocaleString('en-US')}`
        : (item.target === item.total ? `${item.target}` : `${item.target} of ${item.total}`);
      name.textContent = `${targetText} — ${item.name}`;
      if (item.noSlack) {
        const tag = document.createElement('span');
        tag.className = 'noslack-label';
        tag.textContent = ' NO SLACK';
        name.append(tag);
      }
      const detail = document.createElement('div');
      detail.className = 'item-detail';
      detail.textContent = item.detail;
      text.append(name, detail);
      li.append(box, text);
      list.append(li);
    }
    section.append(list);
    groupsEl.append(section);
  }
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('checklistProgressText').textContent = `${done} of ${total} done`;
  document.getElementById('checklistProgressPct').textContent = `${pct}%`;
  document.getElementById('checklistProgressBar').style.width = `${pct}%`;
  document.getElementById('checklistTabNote').textContent = `(${done}/${total})`;
}

function exportProgress() {
  const payload = {
    game: 'Grand Theft Auto VI',
    exportedAt: new Date().toISOString(),
    trophies: [...earned],
    checklist: [...checklistDone],
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importProgress(file) {
  if (!file) return;
  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    alert('That file is not valid progress JSON.');
    return;
  }
  const validIds = new Set(trophies.map((t) => t.id));
  const validCheck = new Set(checklist.groups.flatMap((g) => g.items.map((i) => i.id)));
  if (Array.isArray(payload.trophies)) {
    earned = new Set(payload.trophies.filter((id) => validIds.has(id)));
    saveEarned();
  }
  if (Array.isArray(payload.checklist)) {
    checklistDone = new Set(payload.checklist.filter((id) => validCheck.has(id)));
    saveChecklist();
  }
  renderAll();
}

function resetProgress() {
  if (!confirm('Clear all earned trophies and all 100% checklist ticks?')) return;
  earned = new Set();
  checklistDone = new Set();
  saveEarned();
  saveChecklist();
  renderAll();
}

function applyDeepLink() {
  const params = new URLSearchParams(location.search);
  if (params.get('spoilers') === 'off') {
    spoilersOn = false;
    saveSpoilers();
    spoilerEl.checked = false;
    spoilerLabelEl.textContent = 'All trophies shown, spoilers included';
    renderTrophyCards();
  }
  const view = params.get('view');
  if (view === 'roadmap' || view === 'checklist') switchView(view);
  const match = location.hash.match(/^#trophy-(.+)$/);
  if (match && trophyById(match[1])) openTrophyDetail(match[1], true);
}

function bindControls() {
  searchEl.addEventListener('input', renderTrophyCards);
  gradeEl.addEventListener('change', renderTrophyCards);
  kindEl.addEventListener('change', renderTrophyCards);
  hiddenEl.addEventListener('change', renderTrophyCards);
  statusEl.addEventListener('change', renderTrophyCards);
  spoilerEl.checked = spoilersOn;
  spoilerLabelEl.textContent = spoilersOn
    ? 'Hidden trophies stay hidden until earned'
    : 'All trophies shown, spoilers included';
  spoilerEl.addEventListener('change', () => {
    spoilersOn = spoilerEl.checked;
    saveSpoilers();
    spoilerLabelEl.textContent = spoilersOn
      ? 'Hidden trophies stay hidden until earned'
      : 'All trophies shown, spoilers included';
    renderTrophyCards();
  });
  for (const name of ['guide', 'roadmap', 'checklist']) {
    document.getElementById(`tab${name[0].toUpperCase()}${name.slice(1)}`)
      .addEventListener('click', () => switchView(name));
  }
  document.getElementById('drawerClose').addEventListener('click', closeTrophyDetail);
  document.getElementById('drawerBackdrop').addEventListener('click', closeTrophyDetail);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeTrophyDetail();
  });
  document.getElementById('missableGo').addEventListener('click', () => {
    switchView('guide');
    openTrophyDetail('positive-mental-attitude');
  });
  document.getElementById('exportBtn').addEventListener('click', exportProgress);
  document.getElementById('importFile').addEventListener('change', (event) => {
    importProgress(event.target.files[0]);
    event.target.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', resetProgress);
}

await loadGuideData();
bindControls();
renderAll();
applyDeepLink();
