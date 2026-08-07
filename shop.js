'use strict';
/* ================================================================
   炉石网页版 · 多扩展包商店与开包系统 (shop.js)
   ================================================================ */

const GOLD_KEY = 'hs_gold';
const PACKS_KEY = 'hs_unopened_packs_data';

const expKeys = ['classic', 'ancient', 'shadow'];
let currentExpIdx = 0; // 当前选中的扩展包索引

/* 1. 金币与多卡包存储 */
function getGold() {
  const g = localStorage.getItem(GOLD_KEY);
  if (g !== null) return parseInt(g);
  saveGold(1000000);
  return 1000000;
}

function saveGold(amount) {
  localStorage.setItem(GOLD_KEY, amount);
  updateGoldUI();
}

function getPacksData() {
  try {
    const raw = localStorage.getItem(PACKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e){}
  return { classic: 0, ancient: 0, shadow: 0 };
}

function savePacksData(data) {
  localStorage.setItem(PACKS_KEY, JSON.stringify(data));
  updateGoldUI();
}

function updateGoldUI() {
  const gold = getGold();
  const packsData = getPacksData();
  const curExp = expKeys[currentExpIdx];
  const curPackCount = packsData[curExp] || 0;

  if ($('userGold')) $('userGold').textContent = gold;
  if ($('shopUserGold')) $('shopUserGold').textContent = gold;
  if ($('unopenedCount')) $('unopenedCount').textContent = curPackCount;
  if ($('stageUnopenedCount')) $('stageUnopenedCount').textContent = curPackCount;

  // 渲染扩展包信息
  const expInfo = EXPANSIONS[curExp];
  if ($('expPackArt')) $('expPackArt').textContent = expInfo.art;
  if ($('expPackName')) $('expPackName').textContent = expInfo.name;
  if ($('expPackDesc')) $('expPackDesc').textContent = expInfo.desc;

  // 动态显示金币价格与 3D 金币图标
  const unitCost = expInfo.cost || 100;
  if ($('price1')) $('price1').innerHTML = `${unitCost * 1} <span class="gold-coin"></span>`;
  if ($('price5')) $('price5').innerHTML = `${unitCost * 5} <span class="gold-coin"></span>`;
  if ($('price10')) $('price10').innerHTML = `${unitCost * 10} <span class="gold-coin"></span>`;
  if ($('price50')) $('price50').innerHTML = `${unitCost * 50} <span class="gold-coin"></span>`;

  // 渲染扩展包收集进度
  const setCardKeys = Object.keys(CARDS).filter(k => !CARDS[k]._helper && (CARDS[k].set === curExp || curExp === 'classic'));
  let ownedCount = 0;
  try {
    const col = JSON.parse(localStorage.getItem('hs_collection') || '{"cards":{}}');
    setCardKeys.forEach(k => {
      if (col.cards && col.cards[k] > 0) ownedCount++;
    });
  } catch(e){}

  if ($('expProgressBadge')) {
    $('expProgressBadge').textContent = `收集进度：${ownedCount} / ${setCardKeys.length} 张`;
  }
}

/* 扩展包左右切换 */
function switchPack(dir) {
  currentExpIdx = (currentExpIdx + dir + expKeys.length) % expKeys.length;
  sfx.draw();
  updateGoldUI();
}

/* 通用金边美化提示弹窗 (替换原生的 alert) */
function showShopNotice(title, text) {
  const modal = $('colModal');
  if (modal) {
    if ($('cmTitle')) $('cmTitle').textContent = title;
    if ($('cmText')) $('cmText').textContent = text;
    if ($('cmCancel')) $('cmCancel').style.display = 'none';
    if ($('cmConfirm')) $('cmConfirm').textContent = '知道了';
    modal.classList.add('show');
    $('cmConfirm').onclick = () => modal.classList.remove('show');
  } else {
    alert(text);
  }
}

/* 2. 购买卡包 */
function buyPacks(count) {
  const curExp = expKeys[currentExpIdx];
  const expInfo = EXPANSIONS[curExp];
  const price = count * expInfo.cost;
  const currentGold = getGold();

  if (currentGold < price) {
    showShopNotice('金币不足', `购买 ${count} 包「${expInfo.name}」需要 ${price} 金币，你当前只有 ${currentGold} 金币！`);
    return;
  }

  saveGold(currentGold - price);
  const packsData = getPacksData();
  packsData[curExp] = (packsData[curExp] || 0) + count;
  savePacksData(packsData);
  sfx.play();
}

/* 3. 生成对应扩展包的卡牌 (每包5张，保底1蓝或更好) */
function generatePackCards() {
  const curExp = expKeys[currentExpIdx];
  const expPool = Object.keys(CARDS).filter(k => !CARDS[k]._helper && CARDS[k].set === curExp);

  const packKeys = [];
  const rollRarity = (guaranteed) => {
    const r = Math.random();
    if (r < 0.04) return 'legendary';
    if (r < 0.12) return 'epic';
    if (r < 0.32 || guaranteed) return 'rare';
    return 'common';
  };

  const drawByRarity = (rarity) => {
    const pool = expPool.filter(k => CARDS[k].rarity === rarity);
    if (!pool.length) return expPool[randi(0, expPool.length - 1)];
    return pool[randi(0, pool.length - 1)];
  };

  packKeys.push(drawByRarity(rollRarity(true)));
  for (let i = 0; i < 4; i++) {
    packKeys.push(drawByRarity(rollRarity(false)));
  }

  return packKeys;
}

/* 批量开包支持 */
function openMassPacks(count) {
  const curExp = expKeys[currentExpIdx];
  const packsData = getPacksData();
  const available = packsData[curExp] || 0;

  if (available < count) {
    showShopNotice('卡包不足', `你当前拥有的「${EXPANSIONS[curExp].name}」不足 ${count} 包，请先购买！`);
    return;
  }

  packsData[curExp] -= count;
  savePacksData(packsData);

  let legCount = 0, epicCount = 0, rareCount = 0, commonCount = 0;
  const cardCountsMap = {};

  for (let i = 0; i < count; i++) {
    const pack = generatePackCards();
    pack.forEach(k => {
      cardCountsMap[k] = (cardCountsMap[k] || 0) + 1;
      const r = CARDS[k].rarity;
      if (r === 'legendary') legCount++;
      else if (r === 'epic') epicCount++;
      else if (r === 'rare') rareCount++;
      else commonCount++;

      try {
        const col = JSON.parse(localStorage.getItem('hs_collection') || '{"dust":10000,"cards":{}}');
        if (!col.cards) col.cards = {};
        col.cards[k] = (col.cards[k] || 0) + 1;
        localStorage.setItem('hs_collection', JSON.stringify(col));
      } catch(e){}
    });
  }

  $('stLegCount').textContent = legCount;
  $('stEpicCount').textContent = epicCount;
  $('stRareCount').textContent = rareCount;
  $('stCommonCount').textContent = commonCount;
  $('massOpenedTitle').textContent = `共开启 ${count} 包「${EXPANSIONS[curExp].name}」`;

  const grid = $('massCardsGrid');
  grid.innerHTML = '';

  const uniqueKeys = Object.keys(cardCountsMap);
  const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3, free: 4 };
  uniqueKeys.sort((a, b) => (rarityOrder[CARDS[a].rarity] || 5) - (rarityOrder[CARDS[b].rarity] || 5));

  uniqueKeys.forEach(key => {
    const d = CARDS[key];
    const num = cardCountsMap[key];
    const badge = document.createElement('div');
    badge.className = `loot-badge ${d.rarity || 'common'}`;
    badge.innerHTML = `<span class="loot-cost">${d.cost}</span><span class="loot-name">${d.name}</span><span class="loot-count">×${num}</span>`;
    grid.appendChild(badge);
  });

  $('shopModal').style.display = 'none';
  $('massSummaryModal').style.display = 'flex';
  sfx.win();
}

/* 4. 单包开包 */
let currentPackCards = [];
let flippedCount = 0;

function startOpeningPack() {
  const curExp = expKeys[currentExpIdx];
  const packsData = getPacksData();
  if ((packsData[curExp] || 0) <= 0) {
    showShopNotice('卡包不足', `请先购买「${EXPANSIONS[curExp].name}」！`);
    return;
  }
  packsData[curExp] -= 1;
  savePacksData(packsData);

  $('shopModal').style.display = 'none';
  $('packStage').style.display = 'flex';
  renderPackCardsStage();
}

function renderPackCardsStage() {
  flippedCount = 0;
  $('legBanner').classList.remove('show');
  $('nextPackBtn').style.display = 'none';

  const container = $('packCardsContainer');
  container.innerHTML = '';

  currentPackCards = generatePackCards();

  currentPackCards.forEach((key, index) => {
    const wrap = document.createElement('div');
    wrap.className = 'pack-card-wrap';
    wrap.dataset.rarity = CARDS[key].rarity || 'common';
    wrap.innerHTML = `
      <div class="legendary-rays" id="ray_${index}"></div>
      <div class="pack-card-inner">
        <div class="card-face card-face-back">❖</div>
        <div class="card-face card-face-front">${cardHTML(key)}</div>
      </div>
    `;
    wrap.onclick = () => flipCard(wrap, key, index);
    container.appendChild(wrap);
  });
}

function flipCard(wrapEl, key, index) {
  if (wrapEl.classList.contains('flipped')) return;
  wrapEl.classList.add('flipped');
  flippedCount++;

  try {
    const col = JSON.parse(localStorage.getItem('hs_collection') || '{"cards":{}}');
    if (!col.cards) col.cards = {};
    col.cards[key] = (col.cards[key] || 0) + 1;
    localStorage.setItem('hs_collection', JSON.stringify(col));
  } catch(e){}

  setTimeout(() => {
    const rarity = CARDS[key].rarity;
    if (rarity === 'legendary') {
      sfx.win();
      $('ray_' + index).style.display = 'block';
      $('legBanner').classList.add('show');
    } else if (rarity === 'epic') {
      sfx.boom();
    } else {
      sfx.play();
    }
  }, 200);

  if (flippedCount === 5) {
    setTimeout(() => {
      const packsData = getPacksData();
      if ((packsData[expKeys[currentExpIdx]] || 0) > 0) {
        $('nextPackBtn').style.display = 'inline-block';
      }
    }, 600);
  }
}

/* 事件初始化 */
window.addEventListener('DOMContentLoaded', () => {
  updateGoldUI();

  if ($('shopBtn')) $('shopBtn').onclick = () => { ensureAudio(); updateGoldUI(); $('shopModal').style.display = 'flex'; };
  if ($('shopCloseBtn')) $('shopCloseBtn').onclick = () => $('shopModal').style.display = 'none';
  if ($('startOpenPackBtn')) $('startOpenPackBtn').onclick = startOpeningPack;
  if ($('nextPackBtn')) $('nextPackBtn').onclick = () => { startOpeningPack(); };
  if ($('exitPackStageBtn')) $('exitPackStageBtn').onclick = () => { $('packStage').style.display = 'none'; $('shopModal').style.display = 'flex'; updateGoldUI(); };
  if ($('closeMassSummaryBtn')) $('closeMassSummaryBtn').onclick = () => {
    $('massSummaryModal').style.display = 'none';
    $('shopModal').style.display = 'flex';
    updateGoldUI();
  };
});
