'use strict';
/* ================================================================
   炉石网页版 · 竞技场模式 (arena.js)
   ================================================================ */

const ARENA_KEY = 'hs_arena_run';

/* 竞技场钥匙级别 */
const ARENA_KEYS = [
  { level: 0, name: '木质钥匙', icon: '🗝️' },
  { level: 1, name: '皮革钥匙', icon: '🗝️' },
  { level: 2, name: '黄铜钥匙', icon: '🗡️' },
  { level: 3, name: '青铜钥匙', icon: '🛡️' },
  { level: 4, name: '白银钥匙', icon: '⚔️' },
  { level: 5, name: '黄金钥匙', icon: '👑' },
  { level: 6, name: '白金钥匙', icon: '🏆' },
  { level: 7, name: '翡翠钥匙', icon: '💎' },
  { level: 8, name: '红宝石钥匙', icon: '❤️' },
  { level: 9, name: '紫晶钥匙', icon: '🔮' },
  { level: 10, name: '钻石钥匙', icon: '💠' },
  { level: 11, name: '麦迪文钥匙', icon: '⚡' },
  { level: 12, name: '光铸锻造钥匙', icon: '🌟' }
];

/* 1. 读取/保存竞技场状态 */
function loadArenaRun() {
  try {
    const raw = localStorage.getItem(ARENA_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e){}
  return { status: 'idle', wins: 0, losses: 0, draftRound: 0, deck: {}, currentChoices: [] };
}

function saveArenaRun(run) {
  localStorage.setItem(ARENA_KEY, JSON.stringify(run));
}

function clearArenaRun() {
  localStorage.removeItem(ARENA_KEY);
}

/* 2. 进入竞技场 (购买门票) */
function enterArena() {
  ensureAudio();
  const run = loadArenaRun();

  if (run.status === 'active' || run.status === 'drafting') {
    openArenaUI();
    return;
  }

  // 检查金币
  const gold = getGold();
  if (gold < 100) {
    showShopNotice('金币不足', '进入竞技场需要 100 金币门票！');
    return;
  }

  // 扣除门票，开启新一轮
  saveGold(gold - 100);
  const newRun = {
    status: 'drafting',
    wins: 0, losses: 0,
    draftRound: 1,
    deck: {},
    currentChoices: []
  };
  saveArenaRun(newRun);
  openArenaUI();
}

/* 3. 选牌 (Draft) 逻辑 - 3选1 */
function generateDraftChoices(round) {
  // 关键轮次（第1、10、20、30轮）必出史诗或传说
  const isKeyRound = [1, 10, 20, 30].includes(round);
  const cardKeys = Object.keys(CARDS).filter(k => !CARDS[k]._helper);

  const rollRarity = () => {
    if (isKeyRound) return Math.random() < 0.4 ? 'legendary' : 'epic';
    const r = Math.random();
    if (r < 0.03) return 'legendary';
    if (r < 0.12) return 'epic';
    if (r < 0.35) return 'rare';
    return 'common';
  };

  const targetRarity = rollRarity();
  let pool = cardKeys.filter(k => CARDS[k].rarity === targetRarity);
  if (pool.length < 3) pool = cardKeys;

  // 随机挑选3张不重复的卡牌
  const choices = [];
  while (choices.length < 3) {
    const k = pool[randi(0, pool.length - 1)];
    if (!choices.includes(k)) choices.push(k);
  }
  return choices;
}

function selectDraftCard(key) {
  const run = loadArenaRun();
  if (run.status !== 'drafting') return;

  run.deck[key] = (run.deck[key] || 0) + 1;
  run.draftRound++;

  if (run.draftRound > 30) {
    run.status = 'active'; // 组牌完成，进入对战匹配状态！
    sfx.win();
  } else {
    sfx.play();
    run.currentChoices = generateDraftChoices(run.draftRound);
  }

  saveArenaRun(run);
  renderArenaUI();
}

/* 4. 渲染竞技场界面 */
function openArenaUI() {
  const run = loadArenaRun();
  if (run.status === 'drafting' && (!run.currentChoices || run.currentChoices.length !== 3)) {
    run.currentChoices = generateDraftChoices(run.draftRound);
    saveArenaRun(run);
  }

  // 彻底隐藏主界面与对战棋盘，防止界面重叠！
  if ($('intro')) $('intro').style.display = 'none';
  $('arenaModal').style.display = 'flex';
  renderArenaUI();
}

/* 关闭竞技场：安全返回主菜单 */
function closeArenaModal() {
  $('arenaModal').style.display = 'none';
  if ($('intro')) $('intro').style.display = 'flex';
  updateIntroStats();
}

/* 1. 渲染竞技场界面 (修复自动重新报名 Bug) */
function renderArenaUI() {
  const run = loadArenaRun();
  const draftArea = $('arenaDraftArea');
  const runArea = $('arenaRunArea');

  // 如果状态为空闲，说明未报名或已结算，隐去竞技场弹窗，不自动开启新一轮
  if (!run || run.status === 'idle') {
    $('arenaModal').style.display = 'none';
    return;
  }

  // 1. 渲染右侧已选套牌清单
  const list = $('arenaDeckList');
  if (list) {
    list.innerHTML = '';
    const entries = Object.entries(run.deck || {});
    let totalCards = 0;
    entries.forEach(([k, count]) => {
      totalCards += count;
      const d = CARDS[k];
      if (!d) return;
      const item = document.createElement('div');
      item.className = 'deck-card-entry';
      item.innerHTML = `<div class="dc-cost">${d.cost}</div><div class="dc-name">${d.name}</div><div class="dc-count">×${count}</div>`;
      list.appendChild(item);
    });
    if ($('arenaDeckStats')) $('arenaDeckStats').textContent = `📊 竞技场套牌：${totalCards}/30`;
  }

  // A. 30 轮 3 选 1 选牌阶段：只显示选牌区，严格隐藏匹配区
  if (run.status === 'drafting') {
    if (draftArea) draftArea.style.setProperty('display', 'flex', 'important');
    if (runArea) runArea.style.setProperty('display', 'none', 'important');

    if ($('arenaRoundTxt')) $('arenaRoundTxt').textContent = `第 ${run.draftRound} / 30 轮（选择1张卡牌）`;
    const choicesBox = $('arenaChoicesBox');
    if (choicesBox) {
      choicesBox.innerHTML = '';
      (run.currentChoices || []).forEach(k => {
        const wrap = document.createElement('div');
        wrap.className = 'col-card-wrap draft-card-wrap';
        wrap.innerHTML = cardHTML(k);
        wrap.onclick = () => selectDraftCard(k);
        choicesBox.appendChild(wrap);
      });
    }
  }
  // B. 组牌完成阶段：隐藏选牌区，只显示匹配区
  else if (run.status === 'active') {
    if (draftArea) draftArea.style.setProperty('display', 'none', 'important');
    if (runArea) runArea.style.setProperty('display', 'flex', 'important');

    const keyInfo = ARENA_KEYS[Math.min(12, run.wins)];
    if ($('arenaKeyIcon')) $('arenaKeyIcon').textContent = keyInfo.icon;
    if ($('arenaKeyName')) $('arenaKeyName').textContent = keyInfo.name;
    if ($('arenaWinsTxt')) $('arenaWinsTxt').textContent = run.wins;
    if ($('arenaLossesTxt')) $('arenaLossesTxt').textContent = `${'❌'.repeat(run.losses)}${'⚪'.repeat(3 - run.losses)}`;

    if ($('startArenaMatchBtn')) $('startArenaMatchBtn').onclick = startArenaMatch;
    if ($('retireArenaBtn')) $('retireArenaBtn').onclick = retireArenaRun;
  }
}

/* 5. 竞技场对战匹配与结算 */
function startArenaMatch() {
  const run = loadArenaRun();
  if (run.status !== 'active') return;

  // 1. 关掉所有 Modal
  $('arenaModal').style.display = 'none';
  $('arenaRewardsModal').style.display = 'none';
  if ($('intro')) $('intro').style.display = 'none';

  // 2. 设置竞技场标记
  state.isArenaMatch = true;

  // 3. 解析竞技场 30 张卡组
  const arenaDeckList = Object.entries(run.deck).flatMap(([k, v]) => Array(v).fill(k));

  // 4. 根据胜场匹配 Boss
  let bossKey = 'mage';
  let diff = 'normal';
  if (run.wins >= 9) { bossKey = 'yogg_boss'; diff = 'nightmare'; }
  else if (run.wins >= 6) { bossKey = 'warlock'; diff = 'heroic'; }
  else if (run.wins >= 3) { bossKey = 'druid'; diff = 'heroic'; }

  selectedBossKey = bossKey;
  selectedDifficulty = diff;

  // 启动对局
  startGame(false, arenaDeckList);
}

/* 6. 竞技场胜负结算 (由 game.js 的 checkWin 调用) */
function handleArenaMatchEnd(win) {
  const run = loadArenaRun();
  if (!run || run.status !== 'active') return;

  if (win) {
    run.wins++;
  } else {
    run.losses++;
  }

  saveArenaRun(run);

  // 达到 12 胜或 3 败，触发开宝箱结算！
  if (run.wins >= 12 || run.losses >= 3) {
    setTimeout(() => {
      openArenaRewards(run.wins);
      clearArenaRun();
    }, 1000);
  }
}

/* 7. 结算宝箱与奖励发放 */
function openArenaRewards(wins) {
  const goldReward = Math.floor(30 + wins * 40 + rand(0, 30)); // 胜场越高金币越多（7胜以上回本）
  const dustReward = Math.floor(15 + wins * 25 + rand(0, 20));
  const packReward = wins >= 12 ? 2 : 1;

  // 发放奖励
  saveGold(getGold() + goldReward);

  try {
    const col = JSON.parse(localStorage.getItem('hs_collection') || '{"cards":{}}');
    col.dust = (col.dust || 0) + dustReward;
    localStorage.setItem('hs_collection', JSON.stringify(col));
  } catch(e){}

  const packsData = getPacksData();
  packsData.classic = (packsData.classic || 0) + packReward;
  savePacksData(packsData);

  // 渲染结算 UI
  $('rewardWinsCount').textContent = wins;
  $('rwGold').textContent = goldReward;
  $('rwDust').textContent = dustReward;
  $('rwPacks').textContent = packReward;

  $('arenaRewardsModal').style.display = 'flex';
  sfx.win();
}

/* 2. 放弃本轮竞技场：彻底关闭选牌框，弹出领奖 */
function retireArenaRun() {
  const run = loadArenaRun();
  if (!run || run.status === 'idle') return;

  const doRetire = () => {
    $('arenaModal').style.display = 'none'; // 彻底隐藏选牌框
    openArenaRewards(run.wins);
    clearArenaRun();
  };

  if (typeof showModal === 'function') {
    showModal('放弃竞技场',
      `确定要放弃当前的竞技场轮次吗？\n当前战绩：${run.wins} 胜 ${run.losses} 负\n\n放弃后将直接结算并发放对应战利品宝箱！`,
      doRetire
    );
  } else {
    if (confirm('确定要放弃本次竞技场吗？将按当前胜场发放结算奖励！')) {
      doRetire();
    }
  }
}

/* 3. 领奖完毕按钮监听：返回主菜单 */
window.addEventListener('DOMContentLoaded', () => {
  if ($('arenaBtn')) $('arenaBtn').onclick = enterArena;
  if ($('closeArenaBtn')) $('closeArenaBtn').onclick = closeArenaModal;
  if ($('startArenaMatchBtn')) $('startArenaMatchBtn').onclick = startArenaMatch;
  if ($('retireArenaBtn')) $('retireArenaBtn').onclick = retireArenaRun;

  if ($('closeRewardsBtn')) {
    $('closeRewardsBtn').onclick = () => {
      $('arenaRewardsModal').style.display = 'none';
      $('arenaModal').style.display = 'none';
      if ($('intro')) $('intro').style.display = 'flex'; // 领完奖励顺畅返回主菜单
      updateGoldUI();
      updateIntroStats();
    };
  }
});
