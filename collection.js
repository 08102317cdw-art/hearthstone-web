'use strict';
/* ================================================================
   炉石网页版 · 我的收藏模块  (collection.js)
   依赖：game.js（全局 CARDS / cardHTML / $ / sfx / stagePos / scale）
   ================================================================ */

const COL_KEY = 'hs_collection';
const DECK_KEY = 'hs_decks';

function loadCollection() {
  try {
    const raw = localStorage.getItem(COL_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { }
  const init = { dust: 10000, cards: {} };
  DECK_LIST.forEach(k => {
    if (CARDS[k].rarity === 'free') init.cards[k] = 2;
  });
  saveCollection(init);
  return init;
}

function saveCollection(col) {
  localStorage.setItem(COL_KEY, JSON.stringify(col));
}

function loadDecks() {
  try {
    const raw = localStorage.getItem(DECK_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { }
  const init = { decks: [], activeDeckId: null };
  saveDecks(init);
  return init;
}

function saveDecks(dd) {
  localStorage.setItem(DECK_KEY, JSON.stringify(dd));
}

/* ================= 全局状态 ================= */
let colData = null;
let deckData = null;
let curDeck = null;

let curPage = 0;             // 当前展幅页码 (从0开始)
const CARDS_PER_PAGE = 8;    // 单页8张 (2行x4列)，双页展幅共16张

let filters = {
  rarity: 'all',
  type: 'all',
  cost: null,
  mech: null,
  search: ''
};
let craftMode = false;

/* ================= 辅助函数 ================= */
const DUST_COST = { free: 0, common: 40, rare: 100, epic: 400, legendary: 1600 };
const DUST_REFUND = { free: 0, common: 5, rare: 20, epic: 100, legendary: 400 };

/* 修正拥有量逻辑：所有 free 免费基础卡默认拥有 2 张 */
function getOwned(key) {
  const d = CARDS[key];
  if (d && d.rarity === 'free') return 2;
  return (colData && colData.cards && colData.cards[key]) || 0;
}

function isOwned(key) {
  return getOwned(key) > 0;
}

function getCardKeys() {
  return DECK_LIST;
}

function canDisenchant(key) {
  const owned = getOwned(key);
  if (owned <= 0) return false;
  const d = CARDS[key];
  if (d.rarity === 'free') return false;
  const max = d.rarity === 'legendary' ? 1 : 2;
  return owned > max;
}

function getDisenchantInfo() {
  const result = { keys: [], totalDust: 0 };
  getCardKeys().forEach(key => {
    if (canDisenchant(key)) {
      const d = CARDS[key];
      const owned = getOwned(key);
      const max = d.rarity === 'legendary' ? 1 : 2;
      const extra = owned - max;
      result.keys.push(key);
      result.totalDust += extra * (DUST_REFUND[d.rarity] || 5);
    }
  });
  return result;
}

function getCollectedCount() {
  let count = 0;
  getCardKeys().forEach(k => { if (isOwned(k)) count++; });
  return count;
}

/* ================= 筛选逻辑 ================= */
const ALL_MECHS = ['taunt','charge','rush','shield','windfury','lifesteal','poisonous','stealth',
  'reborn','spellDamage','bc','dr','freeze','missiles','dmgAll','draw','heal','buff'];
const MECH_LABELS = {
  taunt:'嘲讽', charge:'冲锋', rush:'突袭', shield:'圣盾', windfury:'风怒',
  lifesteal:'吸血', poisonous:'剧毒', stealth:'潜行', reborn:'复生',
  spellDamage:'法伤', bc:'战吼', dr:'亡语', freeze:'冻结', missiles:'飞弹',
  dmgAll:'AOE', draw:'抽牌', heal:'治疗', buff:'增益'
};

function cardHasMech(key, mech) {
  const d = CARDS[key];
  if (mech === 'bc') return !!d.bc;
  if (mech === 'dr') return !!d.dr;
  if (mech === 'freeze') return !!(d.freeze || d.freezeAll || (d.bc && d.bc.freeze));
  if (mech === 'dmgAll') return !!(d.dmgAll || (d.bc && d.bc.dmgAll) || (d.dr && d.dr.dmgAll));
  if (mech === 'draw') return !!(d.draw || (d.bc && d.bc.draw) || (d.dr && d.dr.draw));
  if (mech === 'heal') return !!(d.heal || (d.bc && (d.bc.heal || d.bc.healHero || d.bc.healAll)) || (d.dr && d.dr.healHero));
  if (mech === 'buff') return !!(d.buff || (d.bc && (d.bc.buffFriendly || d.bc.buffBoard)));
  if (mech === 'missiles') return !!d.missiles;
  if (mech === 'spellDamage') return !!d.spellDamage;
  return !!d[mech];
}

function getFilteredKeys() {
  let keys = getCardKeys();
  const { rarity, type, cost, mech, search } = filters;

  if (rarity !== 'all') keys = keys.filter(k => CARDS[k].rarity === rarity);
  if (type !== 'all') keys = keys.filter(k => CARDS[k].type === type);
  if (cost !== null) {
    if (cost === 7) keys = keys.filter(k => CARDS[k].cost >= 7);
    else keys = keys.filter(k => CARDS[k].cost === cost);
  }
  if (mech) keys = keys.filter(k => cardHasMech(k, mech));
  if (search) {
    const s = search.toLowerCase();
    keys = keys.filter(k => {
      const d = CARDS[k];
      return d.name.includes(s) || d.text.toLowerCase().includes(s) ||
        (d.race && d.race.includes(s)) || (d.spellSchool && d.spellSchool.includes(s)) ||
        (d.rarity && d.rarity.includes(s));
    });
  }

  const rarityOrder = { legendary:0, epic:1, rare:2, common:3, free:4 };
  keys.sort((a, b) => {
    const da = CARDS[a], db = CARDS[b];
    if (da.cost !== db.cost) return da.cost - db.cost;
    const ra = rarityOrder[da.rarity] || 5, rb = rarityOrder[db.rarity] || 5;
    if (ra !== rb) return ra - rb;
    return da.name.localeCompare(db.name);
  });
  return keys;
}

/* ================= 渲染 ================= */
function renderFilters() {
  const rarities = ['all', 'free', 'common', 'rare', 'epic', 'legendary'];
  const rarityLabels = { all:'全部', free:'免费', common:'普通', rare:'稀有', epic:'史诗', legendary:'传说' };
  const rf = $('rarityFilters');
  rf.innerHTML = '';
  rarities.forEach(r => {
    const btn = document.createElement('button');
    btn.className = 'col-fbtn' + (filters.rarity === r ? ' sel' : '');
    btn.textContent = rarityLabels[r];
    btn.onclick = () => { filters.rarity = r; curPage = 0; refreshAll(); };
    rf.appendChild(btn);
  });

  const tf = $('typeFilters');
  tf.innerHTML = '';
  [{v:'all',l:'全部'},{v:'m',l:'随从'},{v:'s',l:'法术'},{v:'w',l:'武器'}].forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'col-fbtn' + (filters.type === t.v ? ' sel' : '');
    btn.textContent = t.l;
    btn.onclick = () => { filters.type = t.v; curPage = 0; refreshAll(); };
    tf.appendChild(btn);
  });

  const cf = $('costFilters');
  cf.innerHTML = '';
  [{v:null,l:'全部'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'},{v:4,l:'4'},{v:5,l:'5'},{v:6,l:'6'},{v:7,l:'7+'}].forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'col-cost-btn' + (filters.cost === c.v ? ' sel' : '');
    btn.textContent = c.l;
    btn.onclick = () => { filters.cost = c.v; curPage = 0; refreshAll(); };
    cf.appendChild(btn);
  });

  const mf = $('mechFilters');
  mf.innerHTML = '';
  [{v:null,l:'全部'}].concat(ALL_MECHS.map(m => ({v:m, l:MECH_LABELS[m] || m}))).forEach(m => {
    const btn = document.createElement('button');
    btn.className = 'col-mbtn' + (filters.mech === m.v ? ' sel' : '');
    btn.textContent = m.l;
    btn.onclick = () => { filters.mech = m.v; curPage = 0; refreshAll(); };
    mf.appendChild(btn);
  });
}

function renderGrid() {
  const keys = getFilteredKeys();
  const totalCards = keys.length;
  const perSpread = CARDS_PER_PAGE * 2; // 每展开双页容纳 16 张牌
  const totalPages = Math.ceil(totalCards / perSpread) || 1;

  // 边界校验
  if (curPage >= totalPages) curPage = totalPages - 1;
  if (curPage < 0) curPage = 0;

  const pageLeft = $('pageLeft');
  const pageRight = $('pageRight');
  pageLeft.innerHTML = '';
  pageRight.innerHTML = '';

  if (totalCards === 0) {
    $('colEmpty').style.display = 'block';
    $('pageIndicator').textContent = '第 0 / 0 页';
    $('prevPageBtn').disabled = true;
    $('nextPageBtn').disabled = true;
    return;
  }
  $('colEmpty').style.display = 'none';

  // 计算左右页卡牌切片
  const startIdx = curPage * perSpread;
  const leftKeys = keys.slice(startIdx, startIdx + CARDS_PER_PAGE);
  const rightKeys = keys.slice(startIdx + CARDS_PER_PAGE, startIdx + perSpread);

  function createCardWrap(key) {
    const owned = getOwned(key);
    const wrap = document.createElement('div');
    wrap.className = 'col-card-wrap';
    wrap.dataset.key = key;
    wrap.dataset.owned = owned;
    const cls = owned === 0 ? 'not-owned' : '';
    wrap.innerHTML = cardHTML(key, cls);

    if (owned > 0) {
      const badge = document.createElement('div');
      badge.className = 'col-owned-badge';
      badge.textContent = '×' + owned;
      wrap.appendChild(badge);
    }
    return wrap;
  }

  leftKeys.forEach(k => pageLeft.appendChild(createCardWrap(k)));
  rightKeys.forEach(k => pageRight.appendChild(createCardWrap(k)));

  // 更新页码状态与按钮启用
  $('pageIndicator').textContent = `第 ${curPage + 1} / ${totalPages} 页`;
  $('prevPageBtn').disabled = curPage === 0;
  $('nextPageBtn').disabled = curPage >= totalPages - 1;
}

/* 全局翻页函数 (确保 HTML onclick 100% 调得动) */
window.turnPage = function(dir) {
  const keys = getFilteredKeys();
  const perSpread = CARDS_PER_PAGE * 2; // 16张/双页
  const totalPages = Math.ceil(keys.length / perSpread) || 1;

  let targetPage = curPage + dir;
  if (targetPage < 0) targetPage = 0;
  if (targetPage >= totalPages) targetPage = totalPages - 1;

  if (targetPage !== curPage) {
    curPage = targetPage;
    if (typeof sfx !== 'undefined' && sfx.draw) sfx.draw(); // 播放刷牌音效
    renderGrid();
  }
};

let colDrag = null;
let colDragDragging = false;
let colDragJustEnded = false;

/* 事件委托绑定 */
$('colGridWrap').addEventListener('pointerdown', function(e) {
  const wrap = e.target.closest('.col-card-wrap');
  if (!wrap) return;
  const key = wrap.dataset.key;
  const owned = getOwned(key);
  if (!key || owned <= 0) return;
  if (e.button !== 0) return;
  onCardDragStart(e, key, wrap);
});

$('colGridWrap').addEventListener('click', function(e) {
  if (colDragDragging || colDragJustEnded) return;
  const wrap = e.target.closest('.col-card-wrap');
  if (!wrap) return;
  const key = wrap.dataset.key;
  if (!key) return;
  onCardClick(key);
});

$('colGridWrap').addEventListener('contextmenu', function(e) {
  const wrap = e.target.closest('.col-card-wrap');
  if (!wrap) return;
  const key = wrap.dataset.key;
  const owned = getOwned(key);
  if (!key || owned <= 0) return;
  if (canDisenchant(key)) {
    e.preventDefault();
    const d = CARDS[key];
    const refund = DUST_REFUND[d.rarity] || 5;
    showModal('分解卡牌',
      '确定要分解一张「' + d.name + '」吗？\n可获得 ' + refund + ' 奥术之尘',
      function() {
        colData.cards[key] = Math.max(0, owned - 1);
        saveCollection(colData);
        refreshAll();
      });
  }
});

function renderDeckPanel() {
  const list = $('deckCardList');
  const hasDeck = curDeck && curDeck.cards;
  if (!hasDeck) {
    list.innerHTML = '<div style="color:#8a7a5a;text-align:center;padding:20px;">点击卡牌或拖拽到此<br>自动开始组牌</div>';
    $('deckStats').textContent = '📊 卡牌：0/30';
    return;
  }

  list.innerHTML = '';
  const entries = Object.entries(curDeck.cards).filter(([,v]) => v > 0);
  entries.sort((a, b) => {
    const da = CARDS[a[0]], db = CARDS[b[0]];
    return da.cost - db.cost || da.name.localeCompare(db.name);
  });

  entries.forEach(([key, count]) => {
    const d = CARDS[key];
    const entry = document.createElement('div');
    entry.className = 'deck-card-entry';
    entry.innerHTML = `
      <div class="dc-cost">${d.cost}</div>
      <div class="dc-name">${d.name}</div>
      <div class="dc-count">×${count}</div>
    `;
    entry.onclick = () => {
      curDeck.cards[key] = (curDeck.cards[key] || 0) - 1;
      if (curDeck.cards[key] <= 0) delete curDeck.cards[key];
      renderDeckPanel();
    };
    list.appendChild(entry);
  });

  const total = Object.values(curDeck.cards).reduce((a, b) => a + b, 0);
  $('deckStats').textContent = `📊 卡牌：${total}/30`;
  if (total === 30) $('deckStats').style.color = '#2ecc40';
  else if (total >= 25) $('deckStats').style.color = '#ffe27a';
  else $('deckStats').style.color = '#b09a6e';
}

function showDeckErrorHint(msg) {
  const st = $('deckStats');
  if (!st) return;
  st.textContent = '⚠️ ' + (msg || '无法添加');
  st.style.color = '#ff5a5a';
  setTimeout(() => renderDeckPanel(), 1200);
}

function renderDeckSelect() {
  const sel = $('deckSelect');
  sel.innerHTML = '<option value="">+ 新建套牌</option>';
  (deckData.decks || []).forEach((dk) => {
    const opt = document.createElement('option');
    opt.value = dk.id;
    const total = Object.values(dk.cards || {}).reduce((a, b) => a + b, 0);
    opt.textContent = `${dk.name} (${total}/30)`;
    if (dk.id === deckData.activeDeckId) opt.textContent = '⭐ ' + opt.textContent;
    if (curDeck && dk.id === curDeck.id) opt.selected = true;
    sel.appendChild(opt);
  });
}

function refreshAll() {
  renderFilters();
  renderGrid();
  renderDeckPanel();
  renderDeckSelect();
  updateStatusBar();
}

function updateStatusBar() {
  $('colDust').textContent = `💎 奥术之尘：${colData.dust || 0}`;
  const collected = getCollectedCount();
  const total = getCardKeys().length;
  $('colProgress').textContent = `📊 收集进度：${collected}/${total}`;
  $('colCraftBtn').classList.toggle('sel', craftMode);
}

/* ================= 卡牌点击交互 (支持无限制作) ================= */
function onCardClick(key) {
  // 1. 制作模式：允许无限次制作该卡牌
  if (craftMode) {
    const d = CARDS[key];
    const cost = DUST_COST[d.rarity] || 40;
    const owned = getOwned(key);

    showModal('制作卡牌',
      `消耗 ${cost} 奥术之尘制作一张「${d.name}」？\n\n当前拥有：${owned} 张 | 剩余奥术之尘：${colData.dust}`,
      () => {
        if (colData.dust < cost) {
          showModal('奥术之尘不足', `制作「${d.name}」需要 ${cost} 尘，当前只有 ${colData.dust} 尘。`, null, true);
          return;
        }
        colData.dust -= cost;
        if (!colData.cards) colData.cards = {};
        colData.cards[key] = (colData.cards[key] || 0) + 1;
        saveCollection(colData);
        refreshAll();
        sfx.play();
      });
    return;
  }

  // 2. 普通模式：点击将卡牌加入套牌
  if (isOwned(key)) {
    if (!curDeck) createDeck();
    const result = canAddToDeck(key);
    if (result.ok) {
      curDeck.cards[key] = (curDeck.cards[key] || 0) + 1;
      renderDeckPanel();
      renderGrid();
      sfx.play();
    } else {
      sfx.error();
      showDeckErrorHint(result.reason);
    }
  }
}

/* ================= 拖拽系统 ================= */
function isCollectionVisible() {
  return $('collection').style.display === 'flex';
}

function onCardDragStart(e, key, el) {
  if (!isCollectionVisible()) return;
  colDrag = {
    el, key,
    sx: e.clientX, sy: e.clientY,
    clone: null, dragging: false
  };
  colDragDragging = false;
  colDragJustEnded = false;
}

document.addEventListener('pointermove', function(e) {
  if (!colDrag || !isCollectionVisible()) return;
  const dx = e.clientX - colDrag.sx;
  const dy = e.clientY - colDrag.sy;

  if (!colDrag.dragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
    colDrag.dragging = true;
    colDragDragging = true;
    const clone = document.createElement('div');
    clone.className = 'col-drag-clone';
    clone.innerHTML = cardHTML(colDrag.key, 'dragging');
    clone.style.position = 'absolute';
    clone.style.zIndex = '300';
    clone.style.pointerEvents = 'none';
    clone.style.transform = 'scale(0.95)';
    clone.style.transformOrigin = '50% 50%';
    const pos = stagePos(e);
    clone.style.left = (pos.x - 66) + 'px';
    clone.style.top = (pos.y - 93) + 'px';
    $('stage').appendChild(clone);
    colDrag.clone = clone;
    sfx.draw();
  }

  if (colDrag.dragging && colDrag.clone) {
    const pos = stagePos(e);
    colDrag.clone.style.left = (pos.x - 66) + 'px';
    colDrag.clone.style.top = (pos.y - 93) + 'px';

    // 拖拽悬停高亮套牌面板
    const panel = document.querySelector('.col-right');
    if (panel) {
      const pr = panel.getBoundingClientRect();
      const isOver = (e.clientX >= pr.left && e.clientX <= pr.right && e.clientY >= pr.top && e.clientY <= pr.bottom);
      panel.style.borderColor = isOver ? '#ffd970' : '#4a3018';
      panel.style.boxShadow = isOver ? '0 0 16px rgba(255,217,112,0.5)' : '';
    }
  }
});

document.addEventListener('pointerup', function(e) {
  if (!colDrag || !isCollectionVisible()) return;

  const panel = document.querySelector('.col-right');
  if (panel) {
    panel.style.borderColor = '#4a3018';
    panel.style.boxShadow = '';
  }

  if (colDrag.dragging && colDrag.clone) {
    colDrag.clone.remove();

    const pr = panel ? panel.getBoundingClientRect() : null;
    const cx = e.clientX, cy = e.clientY;

    if (pr && cx >= pr.left && cx <= pr.right && cy >= pr.top && cy <= pr.bottom) {
      if (!curDeck) createDeck();
      const result = canAddToDeck(colDrag.key);
      if (result.ok) {
        curDeck.cards[colDrag.key] = (curDeck.cards[colDrag.key] || 0) + 1;
        renderDeckPanel();
        renderGrid();
        sfx.play();
      } else {
        sfx.error();
        showDeckErrorHint(result.reason);
      }
    }
    colDragJustEnded = true;
    setTimeout(function() { colDragJustEnded = false; }, 100);
  }

  colDrag = null;
  colDragDragging = false;
});

/* ================= 套牌管理 ================= */
function canAddToDeck(key) {
  if (!curDeck) return { ok: false, reason: '请先新建或选择套牌' };
  const d = CARDS[key];
  const current = curDeck.cards[key] || 0;
  const maxPerCard = d.rarity === 'legendary' ? 1 : 2;
  if (current >= maxPerCard) return { ok: false, reason: `「${d.name}」已达单卡上限(${maxPerCard}张)` };
  const total = Object.values(curDeck.cards).reduce((a, b) => a + b, 0);
  if (total >= 30) return { ok: false, reason: '套牌已满30张' };
  if (current >= getOwned(key)) return { ok: false, reason: `「${d.name}」拥有数量不足` };
  return { ok: true };
}

function createDeck() {
  const id = 'deck_' + Date.now();
  const deckNum = (deckData.decks ? deckData.decks.length : 0) + 1;
  const deck = { id, name: `自定义套牌 ${deckNum}`, cards: {} };
  if (!deckData.decks) deckData.decks = [];
  deckData.decks.push(deck);
  deckData.activeDeckId = id;
  curDeck = deck;
  saveDecks(deckData);
  refreshAll();
}

function deleteDeck(id) {
  showModal('删除套牌', '确定要删除这套牌吗？此操作不可撤销。', () => {
    deckData.decks = deckData.decks.filter(d => d.id !== id);
    if (deckData.activeDeckId === id) {
      deckData.activeDeckId = deckData.decks.length > 0 ? deckData.decks[0].id : null;
    }
    curDeck = deckData.decks.find(d => d.id === deckData.activeDeckId) || null;
    saveDecks(deckData);
    refreshAll();
  });
}

function renameDeck() {
  if (!curDeck) return;
  const name = prompt('请输入套牌名称：', curDeck.name);
  if (name && name.trim()) {
    curDeck.name = name.trim();
    saveDecks(deckData);
    refreshAll();
  }
}

/* ================= 智能随机补全套牌算法 ================= */
function autoFillDeck(deck) {
  if (!deck) return;
  if (!deck.cards) deck.cards = {};

  let currentTotal = Object.values(deck.cards).reduce((a, b) => a + b, 0);
  if (currentTotal >= 30) return;

  const allKeys = getCardKeys();

  // 获取所有玩家【已拥有】且【未达套牌携带上限】的候选卡牌
  function getValidCandidates() {
    return allKeys.filter(key => {
      const owned = getOwned(key);
      if (owned <= 0) return false;

      const currentInDeck = deck.cards[key] || 0;
      const maxPerDeck = CARDS[key].rarity === 'legendary' ? 1 : 2;

      return currentInDeck < maxPerDeck && currentInDeck < owned;
    });
  }

  let candidates = getValidCandidates();

  // 随机挑选卡牌补满 30 张
  while (currentTotal < 30 && candidates.length > 0) {
    const pickedKey = candidates[randi(0, candidates.length - 1)];
    deck.cards[pickedKey] = (deck.cards[pickedKey] || 0) + 1;
    currentTotal++;
    candidates = getValidCandidates();
  }
}

/* 智能保存与补全套牌触发 */
function saveCurrentDeck() {
  if (!curDeck) return;
  const total = Object.values(curDeck.cards).reduce((a, b) => a + b, 0);

  if (total < 30) {
    showModal('智能补全套牌',
      `当前套牌只有 ${total} / 30 张卡牌。\n\n是否根据你拥有的卡牌【随机自动补满 30 张】并保存？`,
      () => {
        autoFillDeck(curDeck);
        doSaveDeck();
        sfx.win();
      }
    );
  } else {
    doSaveDeck();
  }
}

function doSaveDeck() {
  const idx = deckData.decks.findIndex(d => d.id === curDeck.id);
  if (idx >= 0) {
    deckData.decks[idx] = curDeck;
  }
  deckData.activeDeckId = curDeck.id;
  saveDecks(deckData);
  refreshAll();
  $('deckStats').style.color = '#2ecc40';
  setTimeout(() => renderDeckPanel(), 800);
}

/* ================= 制作/分解 ================= */
function toggleCraftMode() {
  craftMode = !craftMode;
  if (craftMode) {
    filters.rarity = 'all'; filters.type = 'all';
    filters.cost = null; filters.mech = null; filters.search = '';
    $('colSearch').value = '';
  }
  refreshAll();
}

function massDisenchant() {
  const info = getDisenchantInfo();
  if (info.keys.length === 0) {
    showModal('批量分解', '没有多余卡牌可分解。', null, true);
    return;
  }
  showModal('批量分解',
    `共 ${info.keys.length} 种多余卡牌可分解\n预计获得 ${info.totalDust} 奥术之尘\n\n确定分解吗？`,
    () => {
      info.keys.forEach(key => {
        const d = CARDS[key];
        const owned = getOwned(key);
        const max = d.rarity === 'legendary' ? 1 : 2;
        const extra = owned - max;
        colData.cards[key] = max;
        colData.dust += extra * (DUST_REFUND[d.rarity] || 5);
      });
      saveCollection(colData);
      refreshAll();
    });
}

/* ================= 弹窗 ================= */
function showModal(title, text, onConfirm, confirmOnly) {
  $('cmTitle').textContent = title;
  $('cmText').textContent = text;
  $('cmCancel').style.display = confirmOnly ? 'none' : 'inline-block';
  $('cmConfirm').textContent = confirmOnly ? '确定' : '确认';
  $('colModal').classList.add('show');

  $('cmConfirm').onclick = () => {
    $('colModal').classList.remove('show');
    if (onConfirm) onConfirm();
  };
  $('cmCancel').onclick = () => {
    $('colModal').classList.remove('show');
  };
}

/* ================= 界面切换 ================= */
function openCollection() {
  colData = loadCollection();
  deckData = loadDecks();

  // 若无套牌，自动为玩家创建首套预设套牌
  if (!deckData.decks || deckData.decks.length === 0) {
    const id = 'deck_' + Date.now();
    const deck = { id, name: '预设套牌 1', cards: {} };
    deckData.decks = [deck];
    deckData.activeDeckId = id;
    saveDecks(deckData);
  }

  curDeck = deckData.decks.find(d => d.id === deckData.activeDeckId) || deckData.decks[0] || null;
  craftMode = false;
  filters = { rarity: 'all', type: 'all', cost: null, mech: null, search: '' };
  $('colSearch').value = '';

  $('intro').style.display = 'none';
  $('collection').style.display = 'flex';
  refreshAll();
}

function closeCollection() {
  $('collection').style.display = 'none';
  $('intro').style.display = 'flex';
  updateIntroStats();
}

/* ================= 事件绑定 ================= */
$('collectionBtn').onclick = () => {
  ensureAudio();
  openCollection();
};

$('colBackBtn').onclick = closeCollection;

$('colSearch').addEventListener('input', (e) => {
  filters.search = e.target.value.trim();
  curPage = 0;
  refreshAll();
});

/* ================= 智能批量制作 (最大化消耗粉尘补齐缺失卡牌) ================= */
function massCraft() {
  if (!colData) colData = loadCollection();
  let dustLeft = colData.dust || 0;

  if (dustLeft < 40) {
    showModal('批量制作', '当前奥术之尘不足 40 尘，无法制作任何卡牌！', null, true);
    return;
  }

  const allKeys = getCardKeys();
  const craftedSummary = {}; // 记录将要制作的卡牌及张数
  let totalDustSpent = 0;
  let totalCardsCrafted = 0;

  // 优先按照性价比排序 (普通 ➔ 稀有 ➔ 史诗 ➔ 传说)，最大化解锁卡牌种类
  const rarityOrder = { common: 1, rare: 2, epic: 3, legendary: 4, free: 5 };
  const sortKeys = [...allKeys].sort((a, b) => {
    const da = CARDS[a], db = CARDS[b];
    return (rarityOrder[da.rarity] || 5) - (rarityOrder[db.rarity] || 5) || (da.cost - db.cost);
  });

  // 扫描所有未达携带上限的卡牌
  for (const key of sortKeys) {
    const d = CARDS[key];
    if (!d || d.rarity === 'free') continue; // 免费基础卡跳过

    const owned = getOwned(key);
    const maxNeeded = d.rarity === 'legendary' ? 1 : 2; // 传说上限1张，其他上限2张
    const currentTotal = owned + (craftedSummary[key] || 0);

    if (currentTotal < maxNeeded) {
      const cost = DUST_COST[d.rarity] || 40;
      const missingCount = maxNeeded - currentTotal;

      for (let i = 0; i < missingCount; i++) {
        if (dustLeft >= cost) {
          dustLeft -= cost;
          totalDustSpent += cost;
          totalCardsCrafted++;
          craftedSummary[key] = (craftedSummary[key] || 0) + 1;
        } else {
          break; // 粉尘不足以制作该档次卡牌
        }
      }
    }
  }

  if (totalCardsCrafted === 0) {
    showModal('批量制作', '你的所有卡牌均已达到携带上限 (不需要制作)！', null, true);
    return;
  }

  // 生成二次确认的战利品预览文本
  let previewText = `预计消耗 ${totalDustSpent} 奥术之尘，为你补齐 ${totalCardsCrafted} 张缺失卡牌：\n\n`;
  Object.entries(craftedSummary).forEach(([k, count]) => {
    previewText += `• ${CARDS[k].name} × ${count}\n`;
  });

  // 弹出酒馆金边确认弹窗
  showModal('确认批量制作', previewText, () => {
    colData.dust -= totalDustSpent;
    if (!colData.cards) colData.cards = {};

    Object.entries(craftedSummary).forEach(([k, count]) => {
      colData.cards[k] = (colData.cards[k] || 0) + count;
    });

    saveCollection(colData);
    refreshAll();
    sfx.win();
  });
}

$('deckSelect').addEventListener('change', (e) => {
  const id = e.target.value;
  if (!id) { createDeck(); return; }
  curDeck = deckData.decks.find(d => d.id === id) || null;
  deckData.activeDeckId = id;
  saveDecks(deckData);
  refreshAll();
});

$('deckRename').onclick = renameDeck;
$('deckDelete').onclick = () => {
  if (curDeck) deleteDeck(curDeck.id);
};

$('deckSave').onclick = saveCurrentDeck;
$('colCraftBtn').onclick = toggleCraftMode;
$('colMassCraft').onclick = massCraft;
$('colMassDE').onclick = massDisenchant;

// colModal 元素位于 body 中 script 之后，加载时尚未解析，需在 DOMContentLoaded 后绑定
addEventListener('DOMContentLoaded', () => {
  const cm = $('colModal');
  if (!cm) return;
  cm.addEventListener('click', (e) => {
    if (e.target === cm) {
      cm.classList.remove('show');
    }
  });
});

/* 翻页事件已通过 HTML onclick="turnPage(±1)" 内联绑定，无需 JS 二次挂载 */

/* ================= 全局无死角平滑滚轮翻页 ================= */
let isWheelCooling = false;

window.addEventListener('wheel', (e) => {
  const col = document.getElementById('collection');
  if (!col) return;

  // 只要"我的收藏"界面正处于显示状态，即捕获滚轮
  const isVisible = col.style.display === 'flex' || getComputedStyle(col).display !== 'none';
  if (!isVisible) return;

  // 降低触发门槛 (deltaY > 2)，全面兼容普通鼠标滚轮与笔记本触摸板
  if (Math.abs(e.deltaY) > 2 && !isWheelCooling) {
    isWheelCooling = true;

    const dir = e.deltaY > 0 ? 1 : -1; // 向下滑 = 下一页(+1)，向上滑 = 上一页(-1)
    if (typeof window.turnPage === 'function') {
      window.turnPage(dir);
    }

    // 200ms 防抖节流锁
    setTimeout(() => {
      isWheelCooling = false;
    }, 200);
  }
}, { passive: true });

// 键盘 Escape / ◀ ▶ 方向键翻页
addEventListener('keydown', (e) => {
  if (!isCollectionVisible()) return;
  if (e.key === 'Escape') {
    if ($('colModal').classList.contains('show')) {
      $('colModal').classList.remove('show');
    }
  }
  if (e.key === 'ArrowLeft') turnPage(-1);
  if (e.key === 'ArrowRight') turnPage(1);
});
