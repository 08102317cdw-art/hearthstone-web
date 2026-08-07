'use strict';
/* ================= 工具 ================= */
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
let uidSeq = 1;
const uid = () => uidSeq++;

let currentGameId = 0; // 游戏局次标识，防止中断后残余异步任务碰撞

const PROFILE_KEY = 'hs_profile';
const BATTLE_SAVE_KEY = 'hs_battle_save';

let scale = 1;
function fit() {
  scale = Math.min(innerWidth / 1600, innerHeight / 900);
  $('stage').style.transform = `translate(-50%,-50%) scale(${scale})`;
}
addEventListener('resize', fit); fit();

function stagePos(e) {
  const sr = $('stage').getBoundingClientRect();
  return { x: (e.clientX - sr.left) / scale, y: (e.clientY - sr.top) / scale };
}
function elCenter(el) {
  const r = el.getBoundingClientRect(), sr = $('stage').getBoundingClientRect();
  return { x: (r.left + r.width / 2 - sr.left) / scale, y: (r.top + r.height / 2 - sr.top) / scale };
}

/* ================= 档案与局内存档系统 ================= */
function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return { wins: 0, losses: 0, streak: 0, gamesPlayed: 0 };
}

function saveProfile(prof) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(prof));
}

/* ================= 出牌历史记录系统 (防止未定义崩溃) ================= */

function updateIntroStats() {
  const prof = loadProfile();
  if ($('profWins')) $('profWins').textContent = prof.wins || 0;
  const total = prof.gamesPlayed || 0;
  const rate = total > 0 ? Math.round(((prof.wins || 0) / total) * 100) : 0;
  if ($('profWinRate')) $('profWinRate').textContent = rate + '%';
  if ($('profStreak')) $('profStreak').textContent = prof.streak || 0;

  try {
    const dd = JSON.parse(localStorage.getItem('hs_decks') || '{}');
    const activeDeck = dd.decks && dd.decks.find(d => d.id === dd.activeDeckId);
    if ($('profDeck')) $('profDeck').textContent = activeDeck ? activeDeck.name : '预设基础套牌';
  } catch(e) {
    if ($('profDeck')) $('profDeck').textContent = '预设基础套牌';
  }

  // 检测是否存在未完成的对局存档
  const hasSave = !!localStorage.getItem(BATTLE_SAVE_KEY);
  if ($('resumeBtn')) $('resumeBtn').style.display = hasSave ? 'inline-block' : 'none';
}

function saveBattleState() {
  if (!state.started || state.over) return;
  try {
    const saveData = {
      turn: state.turn,
      num: state.num,
      me: state.me,
      ai: state.ai
    };
    localStorage.setItem(BATTLE_SAVE_KEY, JSON.stringify(saveData));
  } catch (e) { }
}

function clearBattleState() {
  localStorage.removeItem(BATTLE_SAVE_KEY);
  if ($('resumeBtn')) $('resumeBtn').style.display = 'none';
}

/* ================= 音效 ================= */
let AC = null, master = null;
function ensureAudio() {
  if (AC) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.35; master.connect(AC.destination);
  } catch (e) { AC = null; }
}
function tone(f, d, type, g, slide) {
  if (!AC) return;
  const o = AC.createOscillator(), gn = AC.createGain();
  o.type = type || 'sine'; o.frequency.value = f;
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), AC.currentTime + d);
  gn.gain.value = g || 0.2;
  gn.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + d);
  o.connect(gn); gn.connect(master);
  o.start(); o.stop(AC.currentTime + d + 0.02);
}
function noise(d, fq, g, type) {
  if (!AC) return;
  const n = Math.floor(AC.sampleRate * d), buf = AC.createBuffer(1, n, AC.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = AC.createBufferSource(); src.buffer = buf;
  const f = AC.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = fq;
  const gn = AC.createGain(); gn.gain.value = g || 0.3;
  src.connect(f); f.connect(gn); gn.connect(master); src.start();
}
const sfx = {
  draw() { tone(500, 0.1, 'sine', 0.12, 900); },
  play() { noise(0.08, 1400, 0.2); tone(240, 0.12, 'triangle', 0.15, 180); },
  impact() { noise(0.14, 500, 0.5); tone(110, 0.16, 'square', 0.22, 60); },
  whoosh() { noise(0.28, 900, 0.3, 'bandpass'); },
  boom() { noise(0.5, 260, 0.65); tone(70, 0.4, 'sine', 0.3, 40); },
  death() { tone(380, 0.4, 'sawtooth', 0.14, 70); },
  heal() { tone(520, 0.28, 'sine', 0.16, 940); tone(780, 0.34, 'sine', 0.1, 1200); },
  shieldPop() { tone(1150, 0.12, 'triangle', 0.2, 500); noise(0.08, 2400, 0.15, 'highpass'); },
  buff() { tone(440, 0.14, 'sine', 0.14, 660); tone(660, 0.22, 'sine', 0.12, 880); },
  turn() { tone(440, 0.16, 'triangle', 0.16); setTimeout(() => tone(660, 0.22, 'triangle', 0.16), 110); },
  error() { tone(140, 0.18, 'square', 0.14, 100); },
  power() { tone(300, 0.2, 'sawtooth', 0.12, 600); },
  win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.4, 'triangle', 0.2), i * 160)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.45, 'sawtooth', 0.12), i * 200)); }
};

/* ================= 卡牌定义 ================= */

/* ============ Boss 30 张完整主题套牌数据库 ============ */
const BOSSES = {
  mage: {
    name: '烈焰法师 · 萨拉',
    art: '🧙‍♀️',
    desc: '擅长使用冰霜与火球术猛烈轰炸。',
    hp: { normal: 30, heroic: 45, nightmare: 60 },
    powerName: '火焰冲击',
    deck: [
      'fireball', 'fireball', 'frostbolt', 'frostbolt', 'missiles', 'missiles',
      'pyro', 'pyro', 'flamestorm', 'flamestorm', 'pyroblast', 'pyroblast',
      'frost_shock', 'frost_shock', 'arcane_intellect', 'arcane_intellect',
      'frost_nova', 'frost_nova', 'blizzard', 'blizzard', 'ogre_magi', 'ogre_magi',
      'dalaran_mage', 'dalaran_mage', 'babbling_book', 'babbling_book',
      'azure_drake', 'azure_drake', 'blizzard_orb', 'blizzard_orb'
    ]
  },
  druid: {
    name: '咆哮德鲁伊 · 塞纳留斯',
    art: '🧌',
    desc: '野性成长快速提速，召唤庞大的远古巨兽。',
    hp: { normal: 35, heroic: 50, nightmare: 70 },
    powerName: '野性咆哮',
    deck: [
      'wild_growth', 'wild_growth', 'ironfur_grizzly', 'ironfur_grizzly',
      'croc', 'croc', 'river_crocolisk', 'river_crocolisk', 'ogre', 'ogre',
      'golem', 'golem', 'wanderer', 'wanderer', 'gatekeeper', 'gatekeeper',
      'ancient', 'ancient', 'magma', 'magma', 'sea_giant', 'sea_giant',
      'ragnaros', 'stormwind_champion', 'stormwind_champion', 'sunwalker', 'sunwalker',
      'shattered_sun', 'shattered_sun', 'pump'
    ]
  },
  warlock: {
    name: '亡灵术士 · 克尔苏加德',
    art: '💀',
    desc: '掌控亡语与复生，铺满不死军团。',
    hp: { normal: 40, heroic: 60, nightmare: 85 },
    powerName: '通灵术',
    deck: [
      'loot_hoarder', 'loot_hoarder', 'stubborn_snail', 'stubborn_snail',
      'harvest_golem', 'harvest_golem', 'boomer', 'boomer', 'cairne_bloodhoof',
      'sylvanas', 'twisting_nether', 'twisting_nether', 'imp', 'imp',
      'vampiric_seductress', 'vampiric_seductress', 'brawl', 'brawl',
      'spellbreaker', 'spellbreaker', 'mind_control', 'mind_control',
      'doomsayer', 'doomsayer', 'elven_archer', 'elven_archer',
      'senjin_shieldmasta', 'senjin_shieldmasta', 'worgen_infiltrator', 'worgen_infiltrator'
    ]
  },
  yogg_boss: {
    name: '混沌魔王 · 尤格-萨隆',
    art: '🐙',
    desc: '充满混沌与奇迹，每回合都会随机施放混乱法术！',
    hp: { normal: 50, heroic: 80, nightmare: 120 },
    powerName: '混沌狂潮',
    deck: [
      'yogg', 'kiljaeden', 'brawl', 'brawl', 'twisting_nether', 'twisting_nether',
      'missiles', 'missiles', 'storm', 'storm', 'blizzard', 'blizzard',
      'arcane_intellect', 'arcane_intellect', 'babbling_book', 'babbling_book',
      'fireball', 'fireball', 'frostbolt', 'frostbolt', 'frost_nova', 'frost_nova',
      'polymorph', 'polymorph', 'firedart', 'firedart', 'holylight', 'holylight',
      'pyroblast', 'synthesize'
    ]
  }
};

let selectedLobbyDeckId = null;
let selectedBossKey = 'mage';
let selectedDifficulty = 'normal';


/* ================= 状态 ================= */
const state = {
  me: null, ai: null, turn: 'me', num: 0, over: false, busy: true, started: false, isArenaMatch: false
};
function other(s) { return s === 'me' ? 'ai' : 'me'; }

/* 安全状态获取器（防止退出游戏后残余回调抛异常） */
function P(s) {
  return state[s] || { hp: 0, armor: 0, mana: 0, maxMana: 0, deck: [], hand: [], board: [], fatigue: 0, powerUsed: false, weapon: null, secrets: [] };
}

/* 自动补全卡组至 30 张防空牌 */
function padDeckTo30(customDeck) {
  const deck = [];
  if (customDeck && customDeck.length > 0) {
    customDeck.forEach(k => deck.push(k));
  }

  // 如果不足 30 张，按现有卡牌循环复制补满 30 张
  let i = 0;
  const basePool = (customDeck && customDeck.length > 0) ? customDeck : DECK_LIST;
  while (deck.length < 30) {
    deck.push(basePool[i % basePool.length]);
    i++;
  }
  return deck;
}

function newPlayer(customDeck) {
  // 确保不论玩家还是 AI，初始牌库都拥有 30 张卡牌！
  const deck = padDeckTo30(customDeck);

  // 洗牌 (Fisher-Yates Shuffle)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = randi(0, i);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return { hp: 30, armor: 0, mana: 0, maxMana: 0, deck, hand: [], board: [], fatigue: 0, powerUsed: false, weapon: null, weaponAttacksThisTurn: 0,
    secrets: [], cardsPlayedThisTurn: 0, drewThisTurn: 0 };
}

function mkMinion(key) {
  const d = CARDS[key];
  return { uid: uid(), key, name: d.name, art: d.art, atk: d.atk, hp: d.hp, maxHp: d.hp,
    taunt: !!d.taunt, shield: !!d.shield, charge: !!d.charge, rush: !!d.rush,
    windfury: !!d.windfury, lifesteal: !!d.lifesteal, poisonous: !!d.poisonous,
    stealth: !!d.stealth, spellDamage: d.spellDamage || 0, reborn: !!d.reborn,
    race: d.race || '', rarity: d.rarity || 'common',
    cantAttack: !!d.cantAttack,
    onDamageCthunBuff: d.onDamageCthunBuff || null,
    sleep: !d.charge && !d.rush, attacked: false, attacksThisTurn: 0, hasReborn: !!d.reborn,
    frozen: false, silenced: false };
}

function silenceMinion(m) {
  m.taunt = false; m.shield = false; m.charge = false; m.rush = false;
  m.windfury = false; m.lifesteal = false; m.poisonous = false;
  m.stealth = false; m.reborn = false; m.hasReborn = false;
  m.spellDamage = 0; m.silenced = true;
  const base = CARDS[m.key];
  m.atk = base.atk;
  m.hp = Math.min(m.hp, base.hp);
  m.maxHp = base.hp;
}

/* 检查己方战场是否有铜须/瑞文合体卡 */
function hasDoubleBC(side) {
  return P(side).board.some(m => !m.silenced && (CARDS[m.key].doubleBoth || CARDS[m.key].doubleBC));
}

function hasDoubleDR(side) {
  return P(side).board.some(m => !m.silenced && (CARDS[m.key].doubleBoth || CARDS[m.key].doubleDR));
}

/* ================= 渲染 ================= */
function minionEl(side, u) {
  return document.querySelector(`#${side === 'me' ? 'myRow' : 'enemyRow'} .minion[data-uid="${u}"]`);
}
function heroEl(side) { return $(side === 'me' ? 'myHero' : 'enemyHero'); }

function cardHTML(key, cls, override) {
  const d = CARDS[key];
  if (!d) return '';
  // 随从显示 攻击/生命；武器显示 攻击/耐久 (override 可覆盖身材显示，如克苏恩 buff 后)
  const aVal = (override && override.atk !== undefined) ? override.atk : d.atk;
  const hpVal = (override && override.hp !== undefined) ? override.hp : (d.type === 'w' ? d.durability : d.hp);
  const stats = d.type === 'm' ? `<div class="cAtk">${aVal}</div><div class="cHp">${hpVal}</div>`
    : d.type === 'w' ? `<div class="cAtk">${aVal}</div><div class="cDur">${hpVal}</div>` : '';

  // 宝石渲染 (免费卡不显示宝石)
  const gemHTML = (d.rarity && d.rarity !== 'free') ? `<div class="cGem ${d.rarity}"></div>` : '';

  // 超长文本与超长名称自适应字号
  const nameCls = d.name.length > 7 ? 'small-name' : '';
  const textCls = d.text && d.text.length > 22 ? 'small-text' : '';

  return `<div class="card ${d.type === 's' ? 'spell' : d.type === 'w' ? 'weapon' : ''} ${d.secret ? 'secret' : ''} ${cls || ''}">
    <div class="cCost">${d.cost}</div>
    <div class="cArt">${d.art}</div>
    ${gemHTML}
    <div class="cName ${nameCls}">${d.name}</div>
    <div class="cText ${textCls}">${d.text}</div>
    ${stats}
  </div>`;
}

function renderBoardRow(side) {
  const row = $(side === 'me' ? 'myRow' : 'enemyRow');
  if (!row) return;
  row.innerHTML = '';
  P(side).board.forEach(m => {
    const el = document.createElement('div');
    el.className = 'minion';
    if (m.taunt) el.className += ' taunt';
    if (m.shield) el.className += ' shield';
    if (m.poisonous) el.className += ' poisonous';
    if (m.windfury) el.className += ' windfury';
    if (m.lifesteal) el.className += ' lifesteal';
    if (m.stealth) el.className += ' stealth';
    if (m.reborn && m.hasReborn) el.className += ' reborn';
    if (m.frozen) el.className += ' frozen';
    if (m.silenced) el.className += ' silenced';
    if (m.sleep && side === 'me') el.className += ' sleepz';
    const canAtkLimit = m.windfury ? 2 : 1;
    if (side === 'me' && state.turn === 'me' && !state.busy && !m.sleep && m.attacksThisTurn < canAtkLimit && m.atk > 0 && !m.cantAttack) {
      el.className += ' canAtk';
    }
    if (m.justSpawned) { el.className += ' spawn'; m.justSpawned = false; }
    el.dataset.uid = m.uid;
    el.innerHTML = `<div class="mBody"><div class="mArt">${m.art}</div></div>
      <div class="mAtk">${m.atk}</div><div class="mHp ${m.hp < m.maxHp ? 'hurt' : ''}">${m.hp}</div>
      ${m.spellDamage > 0 ? `<div class="sdBadge">+${m.spellDamage}</div>` : ''}`;
    row.appendChild(el);
  });
}

function layoutHand() {
  const hand = P('me').hand, box = $('myHand');
  if (!box) return;
  box.innerHTML = '';
  const n = hand.length;
  const gap = Math.min(100, 620 / Math.max(n, 1));
  hand.forEach((c, i) => {
    const d = CARDS[c.key];
    const wrap = document.createElement('div');
    // 克苏恩在手牌中实时展示 buff 后的身材
    const override = (c.key === 'cthun' && c.customAtk !== undefined) ? { atk: c.customAtk, hp: c.customHp } : null;
    wrap.innerHTML = cardHTML(c.key, '', override);
    const el = wrap.firstElementChild;
    // 显示折扣后的费用
    const displayCost = Math.max(0, d.cost - (c.costMod || 0));
    if (c.costMod) {
      el.querySelector('.cCost').textContent = displayCost;
      el.querySelector('.cCost').style.background = 'radial-gradient(circle at 35% 30%, #8fffa0, #22aa44 60%, #0a5a20)';
    }
    el.dataset.huid = c.uid;
    const off = i - (n - 1) / 2;
    const x = 790 + off * gap - 66;
    const y = 762 + Math.pow(Math.abs(off), 1.6) * 7;
    const a = off * Math.min(4.5, 30 / Math.max(n, 1));
    el.style.left = x + 'px'; el.style.top = y + 'px';
    el.style.transformOrigin = '50% 100%';
    el.style.zIndex = 40 + i;
    const base = `rotate(${a}deg)`;
    el.style.transform = base;
    el.dataset.base = base;
    if (state.turn === 'me' && !state.busy && canPlay(c)) el.classList.add('playable');
    if (selected && selected.kind === 'hand' && selected.c.uid === c.uid) {
      el.classList.add('selCard');
      el.style.transform = 'translateY(-46px) scale(1.18)'; el.style.zIndex = 90;
    }
    el.onmouseenter = () => {
      if (dragControl || (selected && selected.kind === 'hand')) return;
      clearTimeout(el._hoverOut);
      el._hoverIn = setTimeout(() => {
        el.style.transform = 'translateY(-60px) scale(1.22)'; el.style.zIndex = 95;
      }, 100);
    };
    el.onmouseleave = () => {
      if (dragControl || (selected && selected.kind === 'hand' && selected.c.uid === c.uid)) return;
      clearTimeout(el._hoverIn);
      el._hoverOut = setTimeout(() => {
        el.style.transform = el.dataset.base; el.style.zIndex = 40 + i;
      }, 60);
    };
    box.appendChild(el);
  });
}

function layoutEnemyHand() {
  const n = P('ai').hand.length, box = $('enemyHand');
  if (!box) return;
  box.innerHTML = '';
  const gap = Math.min(70, 420 / Math.max(n, 1));
  for (let i = 0; i < n; i++) {
    const off = i - (n - 1) / 2;
    const el = document.createElement('div');
    el.className = 'cardBack';
    el.style.left = (745 + off * gap - 55) + 'px';
    el.style.top = (-74 - Math.pow(Math.abs(off), 1.6) * 5) + 'px';
    el.style.transform = `rotate(${-off * 4}deg)`;
    el.style.transformOrigin = '50% 0%';
    box.appendChild(el);
  }
}

function renderHero(side) {
  const p = P(side), el = heroEl(side);
  if (!el) return;
  el.querySelector('.hHp').textContent = p.hp;
  const ar = el.querySelector('.hArmor');
  ar.style.display = p.armor > 0 ? 'block' : 'none'; ar.textContent = p.armor;

  // 武器攻击力 / 耐久度显示
  const wAtk = el.querySelector('.hWeaponAtk');
  const wDur = el.querySelector('.hWeaponDur');
  if (p.weapon) {
    if (wAtk) { wAtk.style.display = 'block'; wAtk.textContent = p.weapon.atk; }
    if (wDur) { wDur.style.display = 'block'; wDur.textContent = p.weapon.durability; }
    // 英雄可攻击状态 (风怒武器最多攻击2次)
    const canAtkLimit = (CARDS[p.weapon.key].windfury ? 2 : 1);
    const atkCount = p.weaponAttacksThisTurn || 0;
    const canAtk = side === 'me' && state.turn === 'me' && !state.busy
      && atkCount < canAtkLimit && p.weapon.atk > 0 && p.weapon.durability > 0;
    el.classList.toggle('canAtk', canAtk);
  } else {
    if (wAtk) wAtk.style.display = 'none';
    if (wDur) wDur.style.display = 'none';
    el.classList.remove('canAtk');
  }

  const pw = $(side === 'me' ? 'myPower' : 'enemyPower');
  if (pw) {
    pw.classList.toggle('used', p.powerUsed);
    pw.classList.toggle('usable', side === 'me' && state.turn === 'me' && !state.busy && !p.powerUsed && p.mana >= 2);
  }
}

/* ================= 修正法力水晶渲染 (上限锁定 10 颗) ================= */
function renderMana() {
  const me = P('me'), ai = P('ai');
  const bar = $('myManaBar');
  if (!bar) return;

  // 1. 文本数字精准显示实际法力值（如：100/100）
  bar.innerHTML = `<span id="myManaTxt">${me.mana}/${me.maxMana}</span>`;

  // 2. 视觉水晶图标最多只渲染 10 颗，超出部分不再横向平铺增加！
  const visualMaxGems = Math.min(10, me.maxMana);
  const visualActiveGems = Math.min(visualMaxGems, me.mana);
  const prevActive = renderMana._prevActive;

  for (let i = 0; i < visualMaxGems; i++) {
    const g = document.createElement('div');
    const active = i < visualActiveGems;
    g.className = 'gem' + (active ? '' : ' off');
    // 3. 视觉：本次新填充的水晶逐颗弹入（错峰延迟）
    if (active && prevActive !== undefined && i >= prevActive) {
      g.classList.add('filling');
      g.style.animationDelay = ((i - prevActive) * 0.08) + 's';
    }
    bar.appendChild(g);
  }
  renderMana._prevActive = visualActiveGems;

  $('enemyManaTxt').textContent = `${ai.mana}/${ai.maxMana} 💎`;
}

/* 渲染已挂载的奥秘：以"?"形态悬浮在英雄旁 */
function renderSecrets() {
  ['me', 'ai'].forEach(side => {
    const box = $(side === 'me' ? 'mySecrets' : 'enemySecrets');
    if (!box) return;
    box.innerHTML = '';
    (P(side).secrets || []).forEach(s => {
      const el = document.createElement('div');
      el.className = 'secretCard';
      el.textContent = '❓';
      // 自己的奥秘：悬停显示名称与卡牌预览，便于玩家记忆
      if (side === 'me' && CARDS[s.key]) {
        const tip = document.createElement('div');
        tip.className = 'scTip';
        tip.textContent = CARDS[s.key].name;
        el.appendChild(tip);
        el.addEventListener('mouseenter', () => {
          const c = elCenter(el);
          showCardPreview(s.key, c.x, c.y);
        });
        el.addEventListener('mouseleave', hideCardPreview);
      }
      box.appendChild(el);
    });
  });
}

function render() {
  if (!state.started) return;
  renderBoardRow('me'); renderBoardRow('ai');
  layoutHand(); layoutEnemyHand();
  renderHero('me'); renderHero('ai');
  renderSecrets();
  renderMana();
  $('myDeck').querySelector('.dkN').textContent = P('me').deck.length;
  $('enemyDeck').querySelector('.dkN').textContent = P('ai').deck.length;
  // 空牌库时红色疲劳警告
  $('myDeck').classList.toggle('fatigue-warn', P('me').deck.length === 0);
  $('enemyDeck').classList.toggle('fatigue-warn', P('ai').deck.length === 0);
  const btn = $('endTurn');
  btn.disabled = !(state.turn === 'me' && !state.busy) || state.over;
  btn.textContent = state.turn === 'me' ? '结束回合' : '敌方回合…';
  btn.classList.toggle('pulse', state.turn === 'me' && !state.busy && !state.over);

  // 关键操作更新存档
  saveBattleState();
}

/* ================= FX ================= */
function fxAdd(el) { $('fxLayer').appendChild(el); return el; }
function dmgNum(x, y, n, heal) {
  const el = document.createElement('div');
  el.className = 'dmgNum' + (heal ? ' heal' : '');
  el.textContent = (heal ? '+' : '-') + n;
  el.style.left = x + 'px'; el.style.top = y + 'px';
  fxAdd(el); setTimeout(() => el.remove(), 950);
}
function boomAt(x, y, small) {
  const el = document.createElement('div');
  el.className = 'boom';
  el.style.left = x + 'px'; el.style.top = y + 'px';
  if (small) el.style.width = el.style.height = '70px';
  fxAdd(el); setTimeout(() => el.remove(), 480);
}
function sparks(x, y, color, n) {
  for (let i = 0; i < (n || 10); i++) {
    const el = document.createElement('div');
    el.className = 'spark';
    el.style.left = x + 'px'; el.style.top = y + 'px';
    el.style.background = color;
    el.style.boxShadow = `0 0 8px ${color}`;
    fxAdd(el);
    const a = rand(0, Math.PI * 2), sp = rand(60, 190);
    el.animate([
      { transform: 'translate(-50%,-50%)', opacity: 1 },
      { transform: `translate(${Math.cos(a) * sp - 50}%,${Math.sin(a) * sp - 50}%) translate(${Math.cos(a) * sp}px,${Math.sin(a) * sp + 40}px)`, opacity: 0 }
    ], { duration: rand(350, 650), easing: 'ease-out' });
    setTimeout(() => el.remove(), 660);
  }
}
/* 冻结视觉：目标随从身上爆出冰晶粒子（配合 .frozen 冰蓝滤镜） */
function freezeFX(side, uid) {
  const el = minionEl(side, uid);
  if (!el) return;
  const c = elCenter(el);
  sparks(c.x, c.y, '#88ccff', 8);
  sparks(c.x, c.y - 12, '#ddf2ff', 5);
}
/* 护甲视觉：英雄旁金色粒子 + 护甲数字脉冲 */
function armorFX(side) {
  const hEl = heroEl(side);
  if (!hEl) return;
  const c = elCenter(hEl);
  sparks(c.x, c.y + 10, '#ffd970', 10);
  const arEl = hEl.querySelector('.hArmor');
  if (arEl) {
    arEl.classList.remove('pulse'); void arEl.offsetWidth;
    arEl.classList.add('pulse');
    setTimeout(() => arEl.classList.remove('pulse'), 450);
  }
}
/* AOE 法术全屏覆盖闪光（按法术派系着色） */
function aoeFlash(school) {
  const cls = school === 'frost' ? 'rgba(120,200,255,0.45)'
    : school === 'shadow' ? 'rgba(140,60,220,0.4)'
    : school === 'holy' ? 'rgba(255,225,110,0.42)'
    : 'rgba(255,170,60,0.5)';
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;inset:0;z-index:89;pointer-events:none;'
    + `background:radial-gradient(circle, ${cls} 0%, transparent 72%);`
    + 'animation:flashOverlay 0.6s ease-out forwards;';
  fxAdd(overlay);
  setTimeout(() => overlay.remove(), 700);
}

async function projectile(from, to, cls, dur) {
  sfx.whoosh();
  const el = document.createElement('div');
  el.className = 'fireball ' + (cls || '');
  el.style.left = from.x + 'px'; el.style.top = from.y + 'px';
  fxAdd(el);
  el.animate([
    { left: from.x + 'px', top: from.y + 'px' },
    { left: to.x + 'px', top: to.y + 'px' }
  ], { duration: dur || 380, easing: 'ease-in' });
  await sleep(dur || 380);
  el.remove();
}
/* 视觉：随从卡牌从手牌位置沿弧线飞向战场 */
async function cardFlyToBoard(from, toEl, cardKey) {
  const wrap = document.createElement('div');
  wrap.innerHTML = cardHTML(cardKey);
  const card = wrap.firstElementChild;
  card.className += ' card-fly-in'; // 追加而非覆盖，保留 .card 类与完整牌面样式
  card.style.left = from.x + 'px';
  card.style.top = from.y + 'px';
  const toC = elCenter(toEl);
  const dx = toC.x - 66 - from.x;
  const dy = toC.y - 93 - from.y;
  card.style.setProperty('--dx', dx + 'px');
  card.style.setProperty('--dy', dy + 'px');
  card.style.setProperty('--mx', (dx * 0.5) + 'px');
  card.style.setProperty('--my', (dy * 0.5 - 55) + 'px');
  fxAdd(card);
  await sleep(400);
  card.style.transition = 'opacity .18s';
  card.style.opacity = '0';
  setTimeout(() => card.remove(), 200);
}

/* 视觉：对手打出奥秘时，飞入一张神秘"?"卡（炉石传说：奥秘对对手是秘密，绝不暴露牌面） */
async function secretPlayFX() {
  const el = document.createElement('div');
  el.className = 'secret-play-fx';
  el.textContent = '❓';
  const from = { x: 745, y: 20 }; // 敌方手牌区上方（与 showcase 起点一致）
  el.style.left = (from.x - 29) + 'px';
  el.style.top = (from.y - 41) + 'px';
  fxAdd(el);
  sfx.play();
  void el.offsetWidth;
  // 飞向敌方奥秘槽 (#enemySecrets: 380,120)，落位后微缩成普通奥秘卡
  el.style.left = (380 - 29) + 'px';
  el.style.top = (120 - 41) + 'px';
  el.style.transform = 'scale(0.92)';
  await sleep(620);
  el.remove();
}

/* 视觉：被召唤的随从从来源位置（默认该方英雄）飞入战场槽位 */
async function summonWithFX(side, m, from) {
  if (!m || m.hp <= 0) return;
  const src = from || elCenter(heroEl(side));
  render();
  const toEl = minionEl(side, m.uid);
  if (!toEl) return;
  toEl.style.opacity = '0';
  toEl.style.animation = 'none'; // 抑制 spawnPop，改用卡牌弧线飞入
  await cardFlyToBoard({ x: src.x - 33, y: src.y - 40 }, toEl, m.key);
  toEl.style.opacity = '';
  toEl.style.animation = '';
  void toEl.offsetWidth;
  toEl.classList.add('spawn');
}

async function showBanner(txt) {
  const b = $('banner');
  b.querySelector('.bnTxt').textContent = txt;
  b.classList.remove('show'); void b.offsetWidth;
  b.classList.add('show');
  await sleep(1150);
  b.classList.remove('show');
}
async function showcase(key, from, hold) {
  const wrap = document.createElement('div');
  wrap.innerHTML = cardHTML(key);
  const el = wrap.firstElementChild;
  el.style.left = (from ? from.x - 66 : 734) + 'px';
  el.style.top = (from ? from.y - 93 : 60) + 'px';
  el.style.transition = 'left .3s ease, top .3s ease, transform .3s ease';
  el.style.zIndex = 96;
  fxAdd(el);
  void el.offsetWidth;
  el.style.left = '734px'; el.style.top = '300px';
  el.style.transform = 'scale(1.5)';
  el.style.boxShadow = '0 0 30px 8px rgba(255,220,120,0.65)';
  sfx.play();
  await sleep(hold || 850);
  el.style.transform = 'scale(0.6)'; el.style.opacity = '0';
  await sleep(220);
  el.remove();
}

/* ================= 抽牌 / 疲劳 ================= */
async function drawCard(side, n, quiet) {
  const myGameId = currentGameId;
  const p = P(side);
  for (let i = 0; i < (n || 1); i++) {
    if (currentGameId !== myGameId || state.over) return;
    if (p.deck.length === 0) {
      p.fatigue++;
      const hel = heroEl(side), c = elCenter(hel);
      dealDamage({ kind: 'hero', side }, p.fatigue, true);
      dmgNum(c.x, c.y, p.fatigue);
      sfx.impact();
      render();
      if (checkWin()) return;
      await sleep(400);
      continue;
    }
    const key = p.deck.pop();
    p.drewThisTurn = (p.drewThisTurn || 0) + 1; // 记录抽牌数（洗劫奥秘判定用）
    // 视觉：抽牌瞬间牌库轻微弹跳
    const deckPile = $(side === 'me' ? 'myDeck' : 'enemyDeck');
    if (deckPile) {
      deckPile.classList.remove('pulse'); void deckPile.offsetWidth;
      deckPile.classList.add('pulse');
      setTimeout(() => deckPile.classList.remove('pulse'), 350);
    }
    if (!quiet) {
      sfx.draw();
      const deckEl = $(side === 'me' ? 'myDeck' : 'enemyDeck');
      const from = elCenter(deckEl);
      const el = document.createElement('div');
      el.className = 'cardBack';
      el.style.left = (from.x - 55) + 'px'; el.style.top = (from.y - 77) + 'px';
      el.style.transition = 'left .35s ease, top .35s ease, transform .35s ease, opacity .3s';
      el.style.zIndex = 97;
      fxAdd(el);
      void el.offsetWidth;
      if (side === 'me') { el.style.left = '1180px'; el.style.top = '740px'; el.style.transform = 'scale(1.15) rotate(6deg)'; }
      else { el.style.left = '900px'; el.style.top = '-60px'; el.style.transform = 'scale(0.9) rotate(-6deg)'; }
      await sleep(360);
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 250);
    }
    if (p.hand.length >= 10) {
      const c2 = elCenter($(side === 'me' ? 'myDeck' : 'enemyDeck'));
      sparks(c2.x, c2.y, '#ff8030', 14);
    } else {
      p.hand.push({ uid: uid(), key });
    }
    render();
  }
}

/* ================= 伤害结算 ================= */
function dealDamage(t, n, noNum, source) {
  if (n <= 0) return 0;
  let actualDmg = 0;
  if (t.kind === 'minion') {
    if (t.m.shield) {
      t.m.shield = false;
      sfx.shieldPop();
      const el = minionEl(t.side, t.m.uid);
      if (el) { const c = elCenter(el); sparks(c.x, c.y, '#ffe27a', 12); }
      return 0;
    }
    actualDmg = Math.min(t.m.hp, n);
    t.m.hp -= n;
    if (!noNum) {
      const el = minionEl(t.side, t.m.uid);
      if (el) { const c = elCenter(el); dmgNum(c.x, c.y, n); el.classList.add('shake'); }
    }
    if (source && source.kind === 'minion' && source.m && source.m.poisonous && actualDmg > 0) {
      t.m.hp = 0;
    }
    if (source && source.kind === 'minion' && source.m && source.m.lifesteal && actualDmg > 0) {
      healTarget({ kind: 'hero', side: source.side }, actualDmg);
    }
    // 狂热狂信徒受到伤害触发克苏恩 Buff
    if (t.m.onDamageCthunBuff && actualDmg > 0) {
      buffCThun(t.side, t.m.onDamageCthunBuff[0], t.m.onDamageCthunBuff[1]);
    }
  } else {
    const p = P(t.side);
    let left = n;
    if (p.armor > 0) { const ab = Math.min(p.armor, left); p.armor -= ab; left -= ab; }
    p.hp -= left;
    actualDmg = n;
    if (!noNum) {
      const el = heroEl(t.side), c = elCenter(el);
      dmgNum(c.x, c.y, n); el.classList.add('shake');
      // 视觉：英雄受击红光反馈
      el.classList.add('hurt-flash');
      setTimeout(() => { el.classList.remove('shake'); el.classList.remove('hurt-flash'); }, 350);
    }
    if (source && source.kind === 'minion' && source.m && source.m.lifesteal) {
      healTarget({ kind: 'hero', side: source.side }, n);
    }
  }
  return actualDmg;
}

function healTarget(t, n) {
  if (t.kind === 'minion') {
    const before = t.m.hp;
    t.m.hp = Math.min(t.m.maxHp, t.m.hp + n);
    const el = minionEl(t.side, t.m.uid);
    if (el) { const c = elCenter(el); dmgNum(c.x, c.y, t.m.hp - before, true); }
  } else {
    const p = P(t.side), before = p.hp;
    p.hp = Math.min(30, p.hp + n);
    const c = elCenter(heroEl(t.side));
    dmgNum(c.x, c.y, p.hp - before, true);
  }
  sfx.heal();
}

/* 通用亡语效果结算 (供随从死亡 / 武器损坏 / 替换时复用) */
async function triggerDeathrattle(callee, dr) {
  if (!dr) return;
  // 瑞文戴尔双倍亡语判定
  const drTimes = hasDoubleDR(callee) ? 2 : 1;
  for (let drIter = 0; drIter < drTimes; drIter++) {
    if (drIter > 0) await sleep(150);
    if (dr.dmgRandom) {
      const foe = other(callee);
      const pool = P(foe).board.map(m => ({ kind: 'minion', side: foe, m }));
      pool.push({ kind: 'hero', side: foe });
      const t = pool[randi(0, pool.length - 1)];
      const tel = t.kind === 'minion' ? minionEl(t.side, t.m.uid) : heroEl(t.side);
      if (tel) { const c = elCenter(tel); boomAt(c.x, c.y); }
      sfx.boom();
      dealDamage(t, dr.dmgRandom);
      render();
      await sleep(300);
    }
    if (dr.summon) {
      const skey = typeof dr.summon === 'string' ? dr.summon : dr.summon.key;
      const cnt = typeof dr.summon === 'object' && dr.summon.count ? dr.summon.count : 1;
      const summons = [];
      for (let i = 0; i < cnt; i++) {
        if (P(callee).board.length < 7) {
          const sm = mkMinion(skey); sm.justSpawned = true;
          P(callee).board.push(sm);
          summons.push(sm);
        }
      }
      render(); await sleep(200);
      // 视觉：亡语召唤随从从该方英雄位置飞入战场
      const src = elCenter(heroEl(callee));
      for (const sm of summons) {
        if (sm.hp > 0) {
          const toEl = minionEl(callee, sm.uid);
          if (toEl) {
            toEl.style.opacity = '0'; toEl.style.animation = 'none';
            await cardFlyToBoard({ x: src.x - 33, y: src.y - 40 }, toEl, sm.key);
            toEl.style.opacity = ''; toEl.style.animation = '';
            void toEl.offsetWidth; toEl.classList.add('spawn');
          }
        }
      }
    }
    if (dr.draw) { await drawCard(callee, dr.draw); await sleep(200); }
    if (dr.dmgAll) {
      const foe = other(callee);
      P(foe).board.forEach(m => dealDamage({kind:'minion', side:foe, m}, dr.dmgAll));
      render(); await sleep(200);
    }
    if (dr.healHero) { healTarget({kind:'hero', side:callee}, dr.healHero); }
    if (dr.gainArmor) { P(callee).armor = (P(callee).armor || 0) + dr.gainArmor; sfx.buff(); armorFX(callee); }

    // 希尔瓦娜斯亡语：随机偷取敌方随从
    if (dr.mindControl) {
      const foe = other(callee);
      if (P(foe).board.length > 0 && P(callee).board.length < 7) {
        const stolen = P(foe).board[randi(0, P(foe).board.length - 1)];
        // 视觉：暗影漩涡吞噬被偷随从
        const srcEl = minionEl(foe, stolen.uid);
        if (srcEl) {
          const sc = elCenter(srcEl);
          FX.vortex(sc.x, sc.y);
          sparks(sc.x, sc.y, '#6a20a0', 16);
          await sleep(350);
        }
        P(foe).board.splice(P(foe).board.indexOf(stolen), 1);
        stolen.sleep = true;
        P(callee).board.push(stolen);
        sfx.power();
        // 视觉：被偷随从从新方英雄位置飞入战场
        await summonWithFX(callee, stolen);
        render(); await sleep(300);
      }
    }
  }
}

async function checkDeaths() {
  const myGameId = currentGameId;
  let acted = true;
  while (acted) {
    if (currentGameId !== myGameId || state.over) return;
    acted = false;
    let dead = [];
    ['me', 'ai'].forEach(side => {
      P(side).board.forEach(m => { if (m.hp <= 0) dead.push({ side, m }); });
    });
    if (!dead.length) break;
    acted = true;
    const reborned = [];
    dead.forEach(d => {
      if (d.m.reborn && d.m.hasReborn) {
        d.m.hp = 1; d.m.hasReborn = false;
        const el = minionEl(d.side, d.m.uid);
        if (el) { const c = elCenter(el); sparks(c.x, c.y, '#6ad0ff', 16); }
        reborned.push(d);
      }
    });
    dead = dead.filter(d => !reborned.includes(d));
    if (!dead.length && reborned.length) { render(); continue; }
    // 记录克苏恩死亡 (厄运召唤者复活判定用)
    dead.forEach(d => {
      if (d.m.key === 'cthun') P(d.side).cthunDied = true;
    });
    sfx.death();
    dead.forEach(d => {
      const el = minionEl(d.side, d.m.uid);
      if (el) {
        el.classList.add('dying');
        // 视觉：死亡瞬间灵魂碎片爆散 + 灵体淡色上升
        const c = elCenter(el);
        sparks(c.x, c.y, '#6a4a8a', 10);
        sparks(c.x, c.y - 18, '#c0b0d0', 6);
      }
    });
    await sleep(460);
    dead.forEach(d => {
      const b = P(d.side).board, i = b.indexOf(d.m);
      if (i >= 0) b.splice(i, 1);
    });
    render();
    // 奥秘：友方随从死亡触发 镜像复制（每方最多触发一次）
    const dupSides = [...new Set(dead.filter(d =>
      (P(d.side).secrets || []).some(s => CARDS[s.key] && CARDS[s.key].secretKind === 'duplicate')
    ).map(d => d.side))];
    for (const sd of dupSides) {
      const victim = dead.find(d => d.side === sd);
      if (victim) await checkSecrets(sd, 'death', { minion: victim.m, side: sd });
    }
    for (const d of dead) {
      if (d.m.silenced) continue;
      const dr = CARDS[d.m.key].dr;
      if (!dr) continue;
      await triggerDeathrattle(d.side, dr);
    }
  }
  checkWin();
}

/* 结算与战利品展示 */
function checkWin() {
  if (state.over || !state.started) return true;
  const meDead = P('me').hp <= 0, aiDead = P('ai').hp <= 0;
  if (!meDead && !aiDead) return false;
  state.over = true; state.busy = true;

  clearBattleState();
  const win = !meDead;

  // 1. 计算金币与粉尘奖励
  const prof = loadProfile();
  prof.gamesPlayed = (prof.gamesPlayed || 0) + 1;

  let goldReward = 0;
  let dustReward = 0;

  if (win) {
    prof.wins = (prof.wins || 0) + 1;
    prof.streak = (prof.streak || 0) + 1;
    goldReward = 30 + Math.min((prof.streak - 1) * 10, 50);
    dustReward = 50;
  } else {
    prof.losses = (prof.losses || 0) + 1;
    prof.streak = 0;
    goldReward = 10;
    dustReward = 15;
  }
  saveProfile(prof);

  // 发放资产
  saveGold(getGold() + goldReward);
  try {
    const col = JSON.parse(localStorage.getItem('hs_collection') || '{"cards":{}}');
    col.dust = (col.dust || 0) + dustReward;
    localStorage.setItem('hs_collection', JSON.stringify(col));
  } catch(e) {}

  // 竞技场结算钩子
  if (state.isArenaMatch) {
    state.isArenaMatch = false;
    if (typeof handleArenaMatchEnd === 'function') handleArenaMatchEnd(win);
  }

  // 2. 弹出战局战利品总结 Modal
  setTimeout(() => {
    if ($('btLootTitle')) $('btLootTitle').textContent = win ? '🏆 战局胜利！' : '🛡️ 遗憾战败';
    if ($('btLootSub')) $('btLootSub').textContent = win ? `精彩的对局！当前连胜: 🔥 ${prof.streak}` : '再接再厉，去商店开包提升实力吧！';
    if ($('btGold')) $('btGold').textContent = goldReward;
    if ($('btDust')) $('btDust').textContent = dustReward;

    $('battleLootModal').style.display = 'flex';
    win ? sfx.win() : sfx.lose();
  }, 600);

  render();
  return true;
}

/* 绑定战利品领取按钮 */
window.addEventListener('DOMContentLoaded', () => {
  if ($('claimBattleLootBtn')) {
    $('claimBattleLootBtn').onclick = () => {
      $('battleLootModal').style.display = 'none';
      backToMenu();
    };
  }
});

/* 增强版法术伤害计算（支持西芙多系加成） */
function spellPower(side) {
  let sp = P(side).board.reduce((s, m) => s + (m.spellDamage || 0), 0);

  // 西芙 (Sif) 多系派系加成计算
  P(side).board.forEach(m => {
    if (!m.silenced && CARDS[m.key] && CARDS[m.key].spellSchoolSynergy) {
      const schools = P(side).castSchools ? P(side).castSchools.size : 0;
      sp += schools; // 施放过几个派系，法伤额外加几点！
    }
  });

  return sp;
}

/* ================= 攻击 ================= */
async function doAttack(side, attacker, target) {
  const isHero = attacker.kind === 'hero';
  let aEl = isHero ? heroEl(side) : minionEl(side, attacker.m.uid);
  if (!aEl) return;
  let tEl = target.kind === 'minion' ? minionEl(target.side, target.m.uid) : heroEl(target.side);
  if (!tEl) return;

  const p = P(side);

  // ===== 奥秘触发：受到攻击（分裂映像/冰霜护盾）与敌方随从攻击（背叛突袭） =====
  if ((P(target.side).secrets || []).length) {
    await checkSecrets(target.side, 'attacked', { target });
    if (state.over) return;
    // 敌方随从发起的攻击触发 背叛突袭
    if (!isHero) {
      await checkSecrets(target.side, 'enemyAttacks', { attacker: { kind: 'minion', side, m: attacker.m } });
      if (state.over) return;
    }
    // 若目标或攻击者在奥秘结算中死亡，则中止本次攻击
    if (target.kind === 'minion' && target.m.hp <= 0) return;
    if (!isHero && attacker.m.hp <= 0) return;
    // 奥秘结算可能触发了重渲染，重新获取元素引用
    aEl = isHero ? heroEl(side) : minionEl(side, attacker.m.uid);
    tEl = target.kind === 'minion' ? minionEl(target.side, target.m.uid) : heroEl(target.side);
    if (!aEl || !tEl) return;
  }

  if (isHero) {
    // 英雄攻击：消耗武器耐久
    if (!p.weapon || p.weapon.durability <= 0) { sfx.error(); return; }
    p.weaponAttacksThisTurn = (p.weaponAttacksThisTurn || 0) + 1;
    p.weapon.durability--;
    // 视觉：耐久数字红色闪烁提示消耗
    const wDurEl = heroEl(side).querySelector('.hWeaponDur');
    if (wDurEl) {
      wDurEl.classList.remove('dur-hit'); void wDurEl.offsetWidth;
      wDurEl.classList.add('dur-hit');
      setTimeout(() => wDurEl.classList.remove('dur-hit'), 400);
    }
    // 武器攻击时触发的效果 (真银圣剑：为英雄恢复2点生命)
    const wd = CARDS[p.weapon.key];
    if (wd.onHeroAttack && wd.onHeroAttack.heal) {
      healTarget({ kind: 'hero', side }, wd.onHeroAttack.heal);
    }
  } else {
    attacker.m.attacksThisTurn = (attacker.m.attacksThisTurn || 0) + 1;
    attacker.m.attacked = attacker.m.attacksThisTurn >= (attacker.m.windfury ? 2 : 1);
  }

  const a = elCenter(aEl), t = elCenter(tEl);
  const dx = (t.x - a.x) * 0.88, dy = (t.y - a.y) * 0.88;

  // ===== 阶段1：蓄力（攻击者后缩 + 目标高亮预警）=====
  aEl.style.zIndex = 60;
  aEl.style.transition = 'transform 0.1s ease-in';
  aEl.style.transform = `translate(${-dx * 0.12}px, ${-dy * 0.12}px) scale(0.94)`;
  tEl.style.transition = 'filter 0.1s';
  tEl.style.filter = 'brightness(1.35) saturate(1.15)';
  await sleep(110);

  // ===== 阶段2：冲刺（快速弧线 + 沿路径粒子拖尾）=====
  aEl.style.transition = 'transform 0.16s cubic-bezier(0.25, 1, 0.5, 0.8)';
  aEl.style.transform = `translate(${dx * 1.08}px, ${dy * 1.08}px) scale(1.1)`;
  // 沿冲刺路径撒拖尾粒子（弧线轨迹）
  const steps = 5;
  for (let s = 1; s <= steps; s++) {
    const ratio = s / steps;
    const tx = a.x + dx * ratio, ty = a.y + dy * ratio - 22 * Math.sin(ratio * Math.PI);
    const trail = document.createElement('div');
    trail.className = 'atk-trail';
    trail.style.left = tx + 'px'; trail.style.top = ty + 'px';
    fxAdd(trail);
    setTimeout(() => trail.remove(), 450);
  }
  await sleep(170);

  // ===== 阶段3：撞击（闪光 + 目标击退 + 粒子爆散 + 结算伤害）=====
  sfx.impact();
  aEl.style.animation = 'impactFlash 0.28s ease-out';
  tEl.style.transition = '';
  tEl.style.filter = '';
  tEl.style.animation = 'knockback 0.4s ease-out';
  tEl.style.setProperty('--kbx', (dx * 0.07) + 'px');
  tEl.style.setProperty('--kby', (dy * 0.07) + 'px');
  boomAt(t.x, t.y, true);
  sparks(t.x, t.y, '#ffb040', 14);

  const atkVal = isHero ? p.weapon.atk : attacker.m.atk;
  const srcRef = isHero ? { kind: 'hero', side } : { kind: 'minion', side, m: attacker.m };
  dealDamage(target, atkVal, false, srcRef);

  if (target.kind === 'minion' && target.m.atk > 0) {
    if (isHero) {
      // 随从反击伤害打在英雄身上 (角斗士长弓：攻击时免疫反击)
      const wd = p.weapon ? CARDS[p.weapon.key] : null;
      const immune = !!(wd && wd.onHeroAttack && wd.onHeroAttack.immune);
      if (!immune) { dealDamage({ kind: 'hero', side }, target.m.atk, false, target.m); sparks(a.x, a.y, '#ff6040', 8); }
    } else {
      dealDamage({ kind: 'minion', side, m: attacker.m }, target.m.atk, false, target.m);
      sparks(a.x, a.y, '#ff6040', 8);
    }
  }
  await sleep(200);

  // ===== 阶段4：弹回（攻击者回到原位）=====
  if (!isHero && attacker.m.stealth) {
    attacker.m.stealth = false;
    // 视觉：破隐暗色粒子（潜行随从攻击后现形）
    sparks(a.x, a.y, '#9a9a9a', 8);
    sparks(a.x, a.y - 10, '#d0d0d0', 5);
  }
  aEl.style.animation = '';
  aEl.style.transition = 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)';
  aEl.style.transform = '';
  await sleep(240);
  aEl.style.zIndex = '';
  tEl.style.animation = '';
  tEl.classList.remove('shake');
  render();

  // 英雄攻击后武器耐久归零：销毁武器并触发亡语
  if (isHero && p.weapon && p.weapon.durability <= 0) {
    const wd = CARDS[p.weapon.key];
    p.weapon = null;
    sfx.shieldPop();
    // 视觉：武器粉碎碎片粒子
    const hC = elCenter(heroEl(side));
    sparks(hC.x + 40, hC.y + 20, '#ff6040', 10);
    sparks(hC.x + 40, hC.y + 20, '#cccccc', 6);
    render();
    if (wd && wd.dr) await triggerDeathrattle(side, wd.dr);
  }

  await checkDeaths();
  render();
}

/* ================= 出牌 ================= */
function canPlay(c) {
  const p = P('me'), d = CARDS[c.key];
  const cost = Math.max(0, d.cost - (c.costMod || 0));
  if (cost > p.mana) return false;
  if (d.type === 'm' && p.board.length >= 7) return false;
  if (d.type === 's' && d.buff) {
    if (d.target === 'minion' && P('me').board.length + P('ai').board.length === 0) return false;
  }
  // 武器牌不占用战场格，替换机制下始终可打出
  if (d.type === 'w') return true;
  return true;
}
function needTarget(d) {
  if (d.type === 's') return !!d.target;
  if (d.bc && d.bc.target) return true;
  if (d.bc && d.bc.buffFriendly) return true;
  if (d.bc && d.bc.freeze) return true;
  if (d.bc && d.bc.silence) return true;
  if (d.bc && d.bc.setHeroHp) return true;
  if (d.bc && d.bc.yoggSpells) return false;
  return false;
}

/* ================= 全局克苏恩古神 Buff 引擎 ================= */
function buffCThun(side, atkAdd, hpAdd) {
  const p = P(side);
  p.cthunAtkBonus = (p.cthunAtkBonus || 0) + atkAdd;
  p.cthunHpBonus = (p.cthunHpBonus || 0) + hpAdd;

  const currentCthunAtk = 6 + p.cthunAtkBonus;
  const currentCthunHp = 6 + p.cthunHpBonus;

  // 1. 更新手牌中的克苏恩属性 (实时记录 buff 后身材)
  let handHasCthun = false;
  p.hand.forEach(c => {
    if (c.key === 'cthun') {
      c.customAtk = currentCthunAtk;
      c.customHp = currentCthunHp;
      handHasCthun = true;
    }
  });

  // 2. 更新战场上的克苏恩属性
  let boardHasCthun = false;
  p.board.forEach(m => {
    if (m.key === 'cthun') {
      m.atk += atkAdd;
      m.hp += hpAdd;
      m.maxHp += hpAdd;
      boardHasCthun = true;
      const mEl = minionEl(side, m.uid);
      if (mEl) FX.sparks(elCenter(mEl).x, elCenter(mEl).y, '#aa20ff', 15);
    }
  });

  // 3. 播报古神低语与粒子特效
  sfx.buff();
  const heroPos = elCenter(heroEl(side));
  FX.sparks(heroPos.x, heroPos.y, '#aa20ff', 20);

  // 4. 手牌中的克苏恩：实时刷新渲染展示 buff 后身材
  if (handHasCthun && side === 'me') layoutHand();

  // 4.5 战场上的克苏恩：刷新战场 DOM 展示 buff 后身材
  if (boardHasCthun) renderBoardRow(side);

  // 5. 牌库中的克苏恩：从牌库飞出展示动画 (展示当前 buff 后身材)
  if (p.deck.includes('cthun')) {
    showcaseCthunInDeck(side, currentCthunAtk, currentCthunHp);
  }

  // 提示会自动消失
  setHint(`古神克苏恩获得了 +${atkAdd}/+${hpAdd}！(当前攻击力: ${currentCthunAtk} / 生命值: ${currentCthunHp})`);
  setTimeout(() => setHint(''), 2500);
}

/* 克苏恩在牌库时：buff 后从牌库飞出展示当前身材再消失 */
function showcaseCthunInDeck(side, atk, hp) {
  try {
    const deckEl = $(side === 'me' ? 'myDeck' : 'enemyDeck');
    if (!deckEl) return;
    const from = elCenter(deckEl);
    const wrap = document.createElement('div');
    wrap.innerHTML = cardHTML('cthun', '', { atk, hp });
    const el = wrap.firstElementChild;
    el.style.left = (from.x - 66) + 'px';
    el.style.top = (from.y - 93) + 'px';
    el.style.transition = 'left .35s ease, top .35s ease, transform .35s ease';
    el.style.zIndex = 96;
    fxAdd(el);
    void el.offsetWidth;
    el.style.left = '734px'; el.style.top = '300px';
    el.style.transform = 'scale(1.6)';
    el.style.boxShadow = '0 0 30px 8px rgba(170,32,255,0.75)';
    sfx.power();
    // 展示 1 秒后缩回消失
    setTimeout(() => {
      el.style.transform = 'scale(0.6)'; el.style.opacity = '0';
      setTimeout(() => el.remove(), 220);
    }, 1000);
  } catch(e) {}
}

/* 获取当前玩家克苏恩的攻击力 (基础 6 点 + 累计 Buff) */
function getCThunAtk(side) {
  return 6 + (P(side).cthunAtkBonus || 0);
}

/* ================= 原汁原味【发现 (Discover)】引擎 ================= */
function getDiscoverPool(typeFilter) {
  const allKeys = Object.keys(CARDS).filter(k => !CARDS[k]._helper);

  if (typeFilter === 'spell') return allKeys.filter(k => CARDS[k].type === 's');
  if (typeFilter === 'minion') return allKeys.filter(k => CARDS[k].type === 'm');
  if (typeFilter === 'weapon') return allKeys.filter(k => CARDS[k].type === 'w');
  if (typeFilter === 'cthunCultist') return allKeys.filter(k => ['beckoner_of_evil', 'twilight_elder', 'crazed_worshipper', 'klaxxi_amber_weaver', 'blade_of_cthun'].includes(k));
  if (typeFilter === 'dragon') return allKeys.filter(k => CARDS[k].race === 'dragon');
  if (typeFilter === 'taunt') return allKeys.filter(k => CARDS[k].taunt);
  if (typeFilter === 'cost3') return allKeys.filter(k => CARDS[k].cost === 3);
  if (typeFilter === 'legendary') return allKeys.filter(k => CARDS[k].rarity === 'legendary');

  return allKeys;
}

async function triggerDiscover(side, typeFilter, titleTxt) {
  const pool = getDiscoverPool(typeFilter);

  // 1. AI 触发：直接随机挑选 1 张放入手牌
  if (side === 'ai') {
    if (pool.length && P('ai').hand.length < 10) {
      const chosen = pool[randi(0, pool.length - 1)];
      P('ai').hand.push({ uid: uid(), key: chosen });
      sfx.draw();
    }
    return;
  }

  // 2. 玩家触发：弹出 3D 三选一发现界面
  const choices = [];
  while (choices.length < 3 && pool.length > 0) {
    const k = pool[randi(0, pool.length - 1)];
    if (!choices.includes(k)) choices.push(k);
  }

  return new Promise(resolve => {
    const modal = $('discoverModal');
    const container = $('discoverContainer');
    if (!modal || !container) { resolve(); return; }

    if ($('discoverTitle')) $('discoverTitle').textContent = titleTxt || '🔍 发现一张卡牌 (选择1张加入手牌)';
    container.innerHTML = '';

    choices.forEach(key => {
      const wrap = document.createElement('div');
      wrap.className = 'col-card-wrap discover-card-wrap';
      wrap.innerHTML = cardHTML(key);
      wrap.onclick = () => {
        modal.style.display = 'none';
        if (P('me').hand.length < 10) {
          P('me').hand.push({ uid: uid(), key });
          sfx.draw();
          FX.sparks(elCenter(wrap).x || 800, 450, '#ffd970', 25);
        }
        render();
        resolve();
      };
      container.appendChild(wrap);
    });

    modal.style.display = 'flex';
    sfx.play();
  });
}

/* ================= 奥秘 (Secret) 系统引擎 ================= */
/* 奥秘打出后挂载在英雄旁（显示"?"），满足触发条件时自动揭示并结算。 */

// 判断某奥秘是否匹配当前触发事件
function secretMatches(kind, evt, ctx) {
  switch (kind) {
    case 'counterspell':      return evt === 'cast';
    case 'netherwind_portal': return evt === 'cast';
    case 'spellbender':       return evt === 'cast' && ctx.target && ctx.target.kind === 'minion';
    case 'duplicate':         return evt === 'death' && !!ctx.minion;
    case 'splitting_image':   return evt === 'attacked' && ctx.target.kind === 'minion';
    case 'ice_barrier':       return evt === 'attacked' && ctx.target.kind === 'hero';
    case 'snipe':             return evt === 'playedMinion';
    case 'pressure_plate':    return evt === 'playedMinion';
    case 'rat_trap':          return evt === 'cardPlayed' && (ctx.count || 0) >= 3;
    case 'sudden_betrayal':   return evt === 'enemyAttacks' && !!ctx.attacker;
    case 'plagiarize':        return evt === 'turnStart';
  }
  return false;
}

/* 奥秘揭示动画：从英雄旁飞出展示卡牌身份后消失 */
async function revealSecret(defender, key) {
  // 视觉：揭示瞬间屏幕暗角，突出奥秘卡
  const vign = document.createElement('div');
  vign.style.cssText = 'position:absolute;inset:0;z-index:95;pointer-events:none;'
    + 'background:radial-gradient(ellipse at 50% 42%, transparent 40%, rgba(25,12,45,0.55) 100%);'
    + 'animation:vignetteIn 0.85s ease-out forwards;';
  fxAdd(vign);
  setTimeout(() => vign.remove(), 880);
  const container = $(defender === 'me' ? 'mySecrets' : 'enemySecrets');
  const from = container && container.children.length ? elCenter(container) : { x: 800, y: defender === 'me' ? 700 : 150 };
  const wrap = document.createElement('div');
  wrap.innerHTML = cardHTML(key);
  const el = wrap.firstElementChild;
  el.style.left = (from.x - 66) + 'px';
  el.style.top = (from.y - 93) + 'px';
  el.style.transition = 'left .3s ease, top .3s ease, transform .3s ease';
  el.style.zIndex = 96;
  fxAdd(el);
  void el.offsetWidth;
  el.style.left = '734px'; el.style.top = '300px';
  el.style.transform = 'scale(1.6)';
  el.style.boxShadow = '0 0 30px 8px rgba(170,120,255,0.8)';
  sfx.power();
  await sleep(800);
  el.style.transform = 'scale(0.7)'; el.style.opacity = '0';
  setTimeout(() => el.remove(), 220);
}

/* 结算单个奥秘的实际效果 */
async function resolveSecretEffect(defender, key, ctx) {
  const foe = other(defender);
  const p = P(defender);
  const kind = CARDS[key] ? CARDS[key].secretKind : null;
  let summoned = null; // 本次结算召唤的随从（结尾统一做飞入动画）
  switch (kind) {
    case 'counterspell': {
      sfx.error();
      FX.vortex(elCenter(heroEl(defender)).x, elCenter(heroEl(defender)).y);
      setHint('法术被反制了！');
      setTimeout(() => setHint(''), 1800);
      break;
    }
    case 'netherwind_portal': {
      // 召唤一个与法术消耗相同的随机随从
      const pool = Object.keys(CARDS).filter(k => CARDS[k].type === 'm' && !CARDS[k]._helper && CARDS[k].cost === (ctx.cost || 0));
      if (pool.length && p.board.length < 7) {
        const sm = mkMinion(pool[randi(0, pool.length - 1)]);
        sm.justSpawned = true;
        p.board.push(sm);
        sfx.power();
        const pos = elCenter(heroEl(defender));
        FX.vortex(pos.x, pos.y);
        summoned = sm;
      }
      break;
    }
    case 'spellbender': {
      // 召唤1/3咒术师并将法术重定向给它（由调用方通过 ctx._newTarget 获取新目标）
      if (ctx.target && ctx.target.kind === 'minion' && p.board.length < 7) {
        const sb = mkMinion('spellbender_minion');
        sb.justSpawned = true;
        p.board.push(sb);
        sfx.power();
        ctx._newTarget = { kind: 'minion', side: defender, m: sb };
        summoned = sb;
      }
      break;
    }
    case 'duplicate': {
      const m = ctx.minion;
      if (m && CARDS[m.key] && !CARDS[m.key]._helper && p.hand.length <= 8) {
        p.hand.push({ uid: uid(), key: m.key });
        p.hand.push({ uid: uid(), key: m.key });
        sfx.draw();
      }
      break;
    }
    case 'splitting_image': {
      const m = ctx.target.m;
      if (p.board.length < 7 && CARDS[m.key]) {
        const copy = mkMinion(m.key);
        copy.atk = m.atk; copy.hp = m.hp; copy.maxHp = m.maxHp;
        copy.taunt = m.taunt; copy.shield = m.shield; copy.sleep = true;
        copy.justSpawned = true;
        p.board.push(copy);
        sfx.power();
        summoned = copy;
      }
      break;
    }
    case 'ice_barrier': {
      p.armor = (p.armor || 0) + 8;
      sfx.shieldPop();
      armorFX(defender); // 视觉：护甲金色粒子 + 数字脉冲
      break;
    }
    case 'snipe': {
      const m = ctx.minion;
      if (m.hp > 0) {
        // 视觉：飞弹从奥秘槽射向目标随从
        const mEl = minionEl(foe, m.uid);
        if (mEl) {
          const secBox = $(defender === 'me' ? 'mySecrets' : 'enemySecrets');
          const secC = secBox && secBox.firstElementChild ? elCenter(secBox.firstElementChild) : elCenter(heroEl(defender));
          const tC = elCenter(mEl);
          await projectile({ x: secC.x - 10, y: secC.y - 20 }, { x: tC.x, y: tC.y }, '', 300);
          await sleep(320);
          boomAt(tC.x, tC.y, true);
        }
        dealDamage({ kind: 'minion', side: foe, m }, 4);
      }
      break;
    }
    case 'pressure_plate': {
      const targets = P(foe).board.filter(m => m.atk <= 3 && m.hp > 0);
      if (targets.length) {
        const victim = targets[randi(0, targets.length - 1)];
        // 视觉：飞弹从奥秘槽射向目标随从
        const vEl = minionEl(foe, victim.uid);
        if (vEl) {
          const secBox = $(defender === 'me' ? 'mySecrets' : 'enemySecrets');
          const secC = secBox && secBox.firstElementChild ? elCenter(secBox.firstElementChild) : elCenter(heroEl(defender));
          const tC = elCenter(vEl);
          await projectile({ x: secC.x - 10, y: secC.y - 20 }, { x: tC.x, y: tC.y }, '', 300);
          await sleep(320);
          boomAt(tC.x, tC.y, true);
        }
        victim.hp = 0;
        sfx.boom();
      }
      break;
    }
    case 'rat_trap': {
      if (p.board.length < 7) {
        const rat = mkMinion('rat_6_6');
        rat.justSpawned = true;
        p.board.push(rat);
        sfx.power();
        summoned = rat;
      }
      break;
    }
    case 'sudden_betrayal': {
      // 召唤2/1蛛魔并立即攻击攻击者
      const attackerM = ctx.attacker.m;
      if (p.board.length < 7 && attackerM && attackerM.hp > 0) {
        const nb = mkMinion('nerubian_2_1');
        nb.justSpawned = true;
        p.board.push(nb);
        sfx.power();
        summoned = nb;
        dealDamage({ kind: 'minion', side: foe, m: attackerM }, 2);
        if (attackerM.hp > 0 && attackerM.atk > 0) dealDamage({ kind: 'minion', side: defender, m: nb }, attackerM.atk);
      }
      break;
    }
    case 'plagiarize': {
      // 将牌库顶牌的两张复制加入手牌
      if (p.deck.length) {
        const topKey = p.deck[p.deck.length - 1];
        if (CARDS[topKey] && !CARDS[topKey]._helper && p.hand.length <= 8) {
          p.hand.push({ uid: uid(), key: topKey });
          p.hand.push({ uid: uid(), key: topKey });
          sfx.draw();
        }
      }
      break;
    }
  }
  if (summoned) {
    await summonWithFX(defender, summoned); // 视觉：奥秘召唤的随从从英雄位置飞入战场
  } else {
    render();
  }
  await checkDeaths();
  render();
}

/* 奥秘触发入口：defender 为奥秘持有者，evt 为事件类型，ctx 为上下文。
   从最新到最旧检查，同一事件只触发一个奥秘。返回是否触发了。 */
async function checkSecrets(defender, evt, ctx) {
  const sList = P(defender).secrets;
  if (!state.started || state.over || !sList || !sList.length) return false;
  for (let i = sList.length - 1; i >= 0; i--) {
    const s = sList[i];
    const d = CARDS[s.key];
    if (!d || !d.secret) continue;
    if (!secretMatches(d.secretKind, evt, ctx)) continue;
    sList.splice(i, 1);   // 触发后奥秘失效
    if (ctx) ctx._triggeredKind = d.secretKind; // 记录实际触发的奥秘种类
    render();
    await revealSecret(defender, s.key);
    await resolveSecretEffect(defender, s.key, ctx);
    return true;
  }
  return false;
}

/* 对手在一回合内打出 ≥3 张牌时触发 巨鼠陷阱 */
async function checkRatTrap(side) {
  const p = P(side);
  if (!p.cardsPlayedThisTurn || p.cardsPlayedThisTurn < 3) return;
  if (!(P(other(side)).secrets || []).some(s => CARDS[s.key] && CARDS[s.key].secretKind === 'rat_trap')) return;
  await checkSecrets(other(side), 'cardPlayed', { count: p.cardsPlayedThisTurn, side });
}

async function playMinionCard(side, c, insertIdx, target) {
  const p = P(side), d = CARDS[c.key];
  const cost = Math.max(0, d.cost - (c.costMod || 0));
  // ===== 视觉：记录玩家手牌卡牌的起飞位置（用于随从飞入动画）=====
  let flyFrom = null;
  if (side === 'me' && state.started) {
    const handEl = document.querySelector(`#myHand .card[data-huid="${c.uid}"]`);
    if (handEl) {
      const r = handEl.getBoundingClientRect(), sr = $('stage').getBoundingClientRect();
      flyFrom = { x: (r.left + r.width / 2 - sr.left) / scale - 66, y: (r.top + r.height / 2 - sr.top) / scale - 93 };
    }
  }
  p.mana -= cost;
  p.hand.splice(p.hand.indexOf(c), 1);
  const m = mkMinion(c.key);
  m.justSpawned = true;
  if (insertIdx == null || insertIdx > p.board.length) insertIdx = p.board.length;
  p.board.splice(insertIdx, 0, m);
  sfx.play();
  render();
  HistoryLog.add(side, c.key, '打出随从');

  // 记录本回合打出的牌数（巨鼠陷阱计数）
  p.cardsPlayedThisTurn = (p.cardsPlayedThisTurn || 0) + 1;

  // 对手奥秘触发：狙击 / 压板陷阱
  if ((P(other(side)).secrets || []).length) {
    await checkSecrets(other(side), 'playedMinion', { minion: m, side });
    if (state.over) return;
    if (m.hp <= 0) render();
  }
  // 对手奥秘：巨鼠陷阱（本回合第3张牌）
  await checkRatTrap(side);
  if (state.over) return;

  // ===== 视觉：随从从手牌位置沿弧线飞入战场（若已被奥秘击杀则跳过）=====
  const mEl = minionEl(side, m.uid);
  if (mEl && flyFrom && m.hp > 0 && !state.over) {
    mEl.style.opacity = '0';
    mEl.style.animation = 'none';
    await cardFlyToBoard(flyFrom, mEl, c.key);
    mEl.style.opacity = '';
    mEl.style.animation = '';
    void mEl.offsetWidth;
    mEl.classList.add('spawn');
  }

  // 记录本回合打出过元素
  if (d.race === 'elemental') {
    p.playedElementalThisTurn = true;
  }

  // 传说随从登场触发全屏震动与金光特效！（随从已被奥秘击杀则跳过）
  if (d.rarity === 'legendary' && m.hp > 0) {
    const mEl = minionEl(side, m.uid);
    if (mEl) {
      const pos = elCenter(mEl);
      FX.legendaryBurst(pos.x, pos.y);
      FX.shake('light');
    }
  }

  /* 战吼结算（支持铜须双倍战吼；若随从已被奥秘击杀则不触发战吼） */
  if (d.bc && m.hp > 0) {
    await sleep(200);
    const bcTimes = hasDoubleBC(side) ? 2 : 1;

    for (let bcIter = 0; bcIter < bcTimes; bcIter++) {
      if (bcIter > 0) await sleep(150);
      if (d.bc.draw) await drawCard(side, d.bc.draw);
      if (d.bc.healHero) healTarget({ kind: 'hero', side }, d.bc.healHero);
      if (d.bc.heal && target) {
        healTarget(target, d.bc.heal);
        const tEl = target.kind === 'minion' ? minionEl(target.side, target.m.uid) : heroEl(target.side);
        if (tEl) { const tc = elCenter(tEl); sparks(tc.x, tc.y, '#ffe88a', 14); }
      }
      if (d.bc.silence && target && target.kind === 'minion') {
        silenceMinion(target.m);
        const tEl = minionEl(target.side, target.m.uid);
        if (tEl) { const tc = elCenter(tEl); sparks(tc.x, tc.y, '#a0a0a0', 14); }
      }
      if (d.bc.buffFriendly && target && target.kind === 'minion') {
        target.m.atk += d.bc.buffFriendly[0];
        target.m.hp += d.bc.buffFriendly[1];
        target.m.maxHp += d.bc.buffFriendly[1];
        sfx.buff();
        // 视觉：绿色强化粒子在目标随从身上爆发
        const bEl = minionEl(target.side, target.m.uid);
        if (bEl) { const bc2 = elCenter(bEl); sparks(bc2.x, bc2.y, '#8aff8a', 14); }
      }
      if (d.bc.summon) {
        const skey = typeof d.bc.summon === 'string' ? d.bc.summon : d.bc.summon.key;
        if (p.board.length < 7) {
          const sm = mkMinion(skey); sm.justSpawned = true;
          p.board.push(sm);
        }
      }
      if (d.bc.dmg && target) {
        const sEl = minionEl(side, m.uid), tEl = target.kind === 'minion' ? minionEl(target.side, target.m.uid) : heroEl(target.side);
        if (sEl && tEl) await projectile(elCenter(sEl), elCenter(tEl), '', 320);
        const c2 = tEl ? elCenter(tEl) : null;
        if (c2) boomAt(c2.x, c2.y, true);
        sfx.boom();
        dealDamage(target, d.bc.dmg);
      }

      // 尤格-萨隆大导演战吼翻倍（直接轰出 10 发随机法术！）
      if (d.bc.yoggSpells) {
        const allSpells = Object.keys(CARDS).filter(k => CARDS[k].type === 's');
        for (let i = 0; i < d.bc.yoggSpells; i++) {
          if (state.over) break;
          const skey = allSpells[randi(0, allSpells.length - 1)];
          const sd = CARDS[skey];
          let t = null;
          if (sd.target) {
            const pool = [];
            ['me', 'ai'].forEach(s => {
              P(s).board.forEach(bm => pool.push({ kind: 'minion', side: s, m: bm }));
              if (sd.target === 'any') pool.push({ kind: 'hero', side: s });
            });
            if (pool.length) t = pool[randi(0, pool.length - 1)];
          }
          await showcase(skey, elCenter(heroEl(side)), 600);
          await castSpellCard(side, { uid: uid(), key: skey }, t, true);
          await sleep(300);
        }
      }

      // 阿莱克丝塔萨 (红龙)：设定生命值为 15 点
      if (d.bc.setHeroHp && target && target.kind === 'hero') {
        const hp = P(target.side);
        hp.hp = d.bc.setHeroHp;
        sfx.heal();
        dmgNum(elCenter(heroEl(target.side)).x, elCenter(heroEl(target.side)).y, d.bc.setHeroHp, true);
      }

      // 随机法术牌加入手牌 (唠叨的魔典)
      if (d.bc.addRandomSpell) {
        const spells = Object.keys(CARDS).filter(k => CARDS[k].type === 's');
        const skey = spells[randi(0, spells.length - 1)];
        if (P(side).hand.length < 10) {
          P(side).hand.push({ uid: uid(), key: skey });
          sfx.draw();
        }
      }

      // 滑冰元素：吸收攻击力为护甲
      if (d.bc.gainArmorFromTargetAtk && target && target.kind === 'minion') {
        const armorGain = target.m.atk;
        p.armor = (p.armor || 0) + armorGain;
        armorFX(side); // 视觉：护甲金色粒子
        target.m.frozen = true;
        sfx.shieldPop();
        freezeFX(target.side, target.m.uid);
      }

      // 涌动熔岩：元素链判定
      if (d.bc.elementChainDmg && target) {
        if (p.playedElementalLastTurn) {
          dealDamage(target, d.bc.elementChainDmg);
          sfx.boom();
        } else {
          setHint('上回合未打出过元素，连击未触发！');
        }
      }

      // 梅尔萨杜恩：切分元素牌为两张 (1) 费
      if (d.bc.splitElemental) {
        const elementalsInDeck = p.deck.filter(k => CARDS[k].race === 'elemental');
        if (elementalsInDeck.length > 0) {
          const ek = elementalsInDeck[randi(0, elementalsInDeck.length - 1)];
          p.deck.splice(p.deck.indexOf(ek), 1);
          if (p.hand.length < 10) p.hand.push({ uid: uid(), key: ek, costMod: CARDS[ek].cost - 1 });
          if (p.hand.length < 10) p.hand.push({ uid: uid(), key: ek, costMod: CARDS[ek].cost - 1 });
          sfx.draw();
        }
      }

      // 始祖幼龙等：战吼对全场敌方随从造成伤害
      if (d.bc.dmgAll) {
        const foe = other(side);
        sfx.boom();
        P(foe).board.forEach(m => {
          const el = minionEl(foe, m.uid);
          if (el) { const cc = elCenter(el); boomAt(cc.x, cc.y); }
        });
        await sleep(180);
        P(foe).board.forEach(m => dealDamage({ kind: 'minion', side: foe, m }, d.bc.dmgAll));
      }

      // 死亡之翼：清场+丢弃手牌
      if (d.bc.destroyAllOtherMinions) {
        FX.shake('heavy');
        FX.vortex(800, 450);
        P('me').board.forEach(bm => { if (bm.uid !== m.uid) bm.hp = 0; });
        P('ai').board.forEach(bm => { if (bm.uid !== m.uid) bm.hp = 0; });
        await checkDeaths();
      }
      if (d.bc.discardHand) {
        P(side).hand = [];
        render();
      }

      /* ===== 克苏恩体系组件战吼响应 ===== */

      // 1. 给克苏恩加属性 (招募官 / 眼魔)
      if (d.bc.buffCthun) {
        buffCThun(side, d.bc.buffCthun[0], d.bc.buffCthun[1]);
      }

      // 2. 克苏恩动态机关枪扫射 (弹幕数量等于当前攻击力)
      if (d.bc.cthunDynamicMissiles) {
        const cthunAtk = m.atk + (P(side).cthunAtkBonus || 0);
        m.atk = cthunAtk;
        m.hp = m.hp + (P(side).cthunHpBonus || 0);
        m.maxHp = m.hp;

        FX.shake('heavy');
        const foe = other(side);
        for (let i = 0; i < cthunAtk; i++) {
          if (state.over) break;
          const pool = P(foe).board.filter(x => x.hp > 0).map(x => ({ kind: 'minion', side: foe, m: x }));
          pool.push({ kind: 'hero', side: foe });
          const t = pool[randi(0, pool.length - 1)];
          const tel = t.kind === 'minion' ? minionEl(t.side, t.m.uid) : heroEl(t.side);
          const tc = tel ? elCenter(tel) : { x: 800, y: 450 };
          await projectile(elCenter(minionEl(side, m.uid)), tc, 'shadow', 180);
          boomAt(tc.x, tc.y, true);
          dealDamage(t, 1);
          render();
        }
      }

      // 3. 双子皇帝：克苏恩攻击力 >= 10 召唤兄弟
      if (d.bc.summonTwin) {
        if (getCThunAtk(side) >= (d.bc.cthunCheckReq || 10)) {
          if (p.board.length < 7) {
            const twin = mkMinion('twin_emperor_veklor_sub');
            twin.justSpawned = true;
            p.board.push(twin);
            sfx.power();
            const twinEl = minionEl(side, twin.uid);
            if (twinEl) FX.legendaryBurst(elCenter(twinEl).x, elCenter(twinEl).y);
          }
        } else {
          setHint('克苏恩攻击力不足 10 点，双子并未响应！');
        }
      }

      // 4. 克拉克西琥珀织者：克苏恩攻击力 >= 10 获得+5血与嘲讽
      if (d.bc.selfBuffHpTaunt) {
        if (getCThunAtk(side) >= (d.bc.cthunCheckReq || 10)) {
          m.hp += d.bc.selfBuffHpTaunt;
          m.maxHp += d.bc.selfBuffHpTaunt;
          m.taunt = true;
          sfx.buff();
        }
      }

      // 5. 克苏恩之刃：斩杀敌方随从并吸取其攻血给克苏恩！
      if (d.bc.destroyAndAbsorbToCthun && target && target.kind === 'minion') {
        const absorbedAtk = target.m.atk;
        const absorbedHp = target.m.hp;
        target.m.hp = 0;
        await checkDeaths();
        buffCThun(side, absorbedAtk, absorbedHp);
        FX.vortex(elCenter(minionEl(side, m.uid)).x, elCenter(minionEl(side, m.uid)).y);
      }

      // 6. 厄运召唤者：若克苏恩已死亡则将其复活洗入牌库并 +3/+3
      if (d.bc.resurrectCthun) {
        if (p.cthunDied) {
          // 洗入牌库随机位置：避免抽牌用 pop() 从末尾取而必被立刻抽走
          p.deck.splice(randi(0, p.deck.length), 0, 'cthun');
          p.cthunDied = false; // 复活后重置死亡标记
          buffCThun(side, 3, 3); // 会触发牌库中的克苏恩飞出动画
          sfx.power();
          const mEl = minionEl(side, m.uid);
          if (mEl) FX.vortex(elCenter(mEl).x, elCenter(mEl).y);
          setHint('克苏恩已复活并洗入你的牌库！(+3/+3)');
          setTimeout(() => setHint(''), 2500);
        } else {
          setHint('克苏恩尚未死亡，无法复活！');
          setTimeout(() => setHint(''), 2000);
        }
      }

      // 7. 发现克苏恩组件牌 (真正的三选一发现)
      if (d.bc.discoverCthunCultist) {
        await triggerDiscover(side, 'cthunCultist', '👁️ 发现一张克苏恩组件牌');
      }

      // 火车王里诺艾：给对手召唤2个野猪
      if (d.bc.summonEnemyBoars) {
        const foe = other(side);
        for (let i = 0; i < d.bc.summonEnemyBoars; i++) {
          if (P(foe).board.length < 7) {
            const boar = mkMinion('boar');
            boar.justSpawned = true;
            P(foe).board.push(boar);
          }
        }
      }

      // 卡扎库斯：暴风雪 + 回血
      if (d.bc.kazakusPotion) {
        FX.iceFlash();
        const foe = other(side);
        P(foe).board.forEach(fm => {
          fm.frozen = true;
          freezeFX(foe, fm.uid);
          dealDamage({ kind: 'minion', side: foe, m: fm }, 2);
        });
        healTarget({ kind: 'hero', side }, 8);
      }

      // 暗影收割者：消灭血量 >= 6 的大怪
      if (d.bc.destroyBigMinions) {
        FX.shake('light');
        ['me', 'ai'].forEach(s => {
          P(s).board.forEach(bm => {
            if (bm.hp >= d.bc.destroyBigMinions) bm.hp = 0;
          });
        });
        await checkDeaths();
      }

      // 马鲁特拉：冰冻全场敌方随从并造成4点伤害
      if (d.bc.freezeAllDmg) {
        FX.iceFlash();
        const foe = other(side);
        P(foe).board.forEach(fm => {
          fm.frozen = true;
          freezeFX(foe, fm.uid);
          dealDamage({ kind: 'minion', side: foe, m: fm }, d.bc.freezeAllDmg);
        });
      }

      // 随从战吼发现 (河湾猎鳄 / 荒野守卫者 / 精金巨人 / 石丘防御者 / 宝石甲虫 / 探险家等)
      if (d.bc.discoverType) {
        const titles = { minion: '🔍 发现一张随从牌', dragon: '🐉 发现一张龙牌', spell: '📜 发现一张法术牌', taunt: '🛡️ 发现一张嘲讽随从', cost3: '③ 发现一张3费卡牌', legendary: '⭐ 发现一张传说卡牌' };
        await triggerDiscover(side, d.bc.discoverType, titles[d.bc.discoverType]);
      }

      // 随从战吼加护甲 (重装食人魔)
      if (d.bc.gainArmor) {
        P(side).armor = (P(side).armor || 0) + d.bc.gainArmor;
        sfx.buff();
        armorFX(side); // 视觉：护甲金色粒子
      }

      // 随从战吼冻结 (冰风巨魔)
      if (d.bc.freezeTarget && target && target.kind === 'minion') {
        target.m.frozen = true;
        sfx.shieldPop();
        freezeFX(target.side, target.m.uid);
      }

      render();
      await checkDeaths();
    }
  }
  render();
}

/* ================= 打出武器牌 ================= */
async function playWeaponCard(side, c, target) {
  const p = P(side), d = CARDS[c.key];
  const cost = Math.max(0, d.cost - (c.costMod || 0));
  p.mana -= cost;
  p.hand.splice(p.hand.indexOf(c), 1);
  render();
  HistoryLog.add(side, c.key, '装备武器');

  // 记录本回合打出的牌数（巨鼠陷阱计数）
  p.cardsPlayedThisTurn = (p.cardsPlayedThisTurn || 0) + 1;
  await checkRatTrap(side);
  if (state.over) return;

  // 1. 旧武器销毁：先触发亡语再替换
  if (p.weapon) {
    const oldData = CARDS[p.weapon.key];
    if (oldData && oldData.dr) {
      await triggerDeathrattle(side, oldData.dr);
    }
    p.weapon = null;
  }

  // 2. 装备新武器
  p.weapon = { key: c.key, atk: d.atk, durability: d.durability };
  p.weaponAttacksThisTurn = 0;
  sfx.play();
  render();
  // 视觉：武器卡实体从手牌旋转飞入英雄武器槽（衔接后续数字旋入）
  if (side === 'me') {
    const handPos = { x: 790, y: 730 }; // 己方手牌区中心偏下
    const heroC = elCenter(heroEl(side));
    const wAtkEl = document.querySelector('#myHero .hWeaponAtk');
    const target = wAtkEl ? elCenter(wAtkEl) : { x: heroC.x - 30, y: heroC.y - 60 };
    const wrap = document.createElement('div');
    wrap.innerHTML = cardHTML(c.key);
    const card = wrap.firstElementChild;
    card.className += ' weapon-fly-fx';
    card.style.left = (handPos.x - 66) + 'px';
    card.style.top = (handPos.y - 93) + 'px';
    fxAdd(card);
    void card.offsetWidth;
    card.style.left = (target.x - 22) + 'px';
    card.style.top = (target.y - 25) + 'px';
    card.style.transform = 'scale(0.3) rotate(270deg)';
    await sleep(470);
    card.style.opacity = '0';
    setTimeout(() => card.remove(), 200);
  }
  // 视觉：武器攻/耐久数字旋入动画
  if (side === 'me') {
    const wAtkEl = document.querySelector('#myHero .hWeaponAtk');
    if (wAtkEl) {
      wAtkEl.classList.add('weapon-equip');
      setTimeout(() => wAtkEl.classList.remove('weapon-equip'), 500);
    }
  }

  // 3. 武器战吼结算 (萨弗拉斯·炎魔之手等)
  if (d.bc) {
    await sleep(200);
    if (d.bc.dmg && target) {
      const tEl = target.kind === 'minion' ? minionEl(target.side, target.m.uid) : heroEl(target.side);
      if (tEl) {
        const from = elCenter(heroEl(side)), to = elCenter(tEl);
        await projectile(from, to, '', 320);
        boomAt(to.x, to.y, true);
      }
      sfx.boom();
      dealDamage(target, d.bc.dmg);
      render();
      await checkDeaths();
    }
    if (d.bc.dmgAll) {
      const foe = other(side);
      P(foe).board.forEach(m => dealDamage({ kind: 'minion', side: foe, m }, d.bc.dmgAll));
      render();
    }
  }

  render();
}

async function castSpellCard(side, c, target, free) {
  const p = P(side), d = CARDS[c.key];
  const cost = Math.max(0, d.cost - (c.costMod || 0));
  if (!free) p.mana -= cost; // free=true：免费施法（尤格-萨隆随机法术不消耗法力）
  p.hand.splice(p.hand.indexOf(c), 1);
  render();
  // 历史记录：敌方奥秘不记录具体卡名，仅显示"?"且不可预览牌面（炉石传说信息隐藏）
  if (d.secret && side === 'ai') {
    HistoryLog.add(side, null, '施放奥秘', '❓');
  } else {
    HistoryLog.add(side, c.key, '施放法术');
  }

  // 记录施放过的法术派系 (火焰/冰霜/奥术/暗影等)
  if (d.spellSchool) {
    if (!p.castSchools) p.castSchools = new Set();
    p.castSchools.add(d.spellSchool);
  }

  // 记录本回合打出的牌数（巨鼠陷阱计数）
  p.cardsPlayedThisTurn = (p.cardsPlayedThisTurn || 0) + 1;

  // 对手奥秘：巨鼠陷阱（本回合第3张牌）
  await checkRatTrap(side);
  if (state.over) return;

  // ===== 奥秘：打出后挂载在英雄旁，不立即结算 =====
  if (d.secret) {
    if (p.secrets.length >= 5) p.secrets.shift(); // 最多同时存在5个，超出摧毁最旧的
    p.secrets.push({ uid: uid(), key: c.key });
    sfx.play();
    render();
    // 视觉：己方打出奥秘——神秘"?"卡从手牌飞入我方奥秘槽（与敌方对称，不暴露内容）
    if (side === 'me') {
      const mySec = document.getElementById('mySecrets');
      if (mySec) {
        const sr = document.getElementById('stage').getBoundingClientRect();
        const secRect = mySec.getBoundingClientRect();
        const toX = (secRect.left + 29 - sr.left) / scale;
        const toY = (secRect.top + 41 - sr.top) / scale;
        const el = document.createElement('div');
        el.className = 'secret-play-fx';
        el.textContent = '❓';
        el.style.left = (790 - 29) + 'px';
        el.style.top = (730 - 41) + 'px';
        fxAdd(el);
        void el.offsetWidth;
        el.style.left = toX + 'px';
        el.style.top = toY + 'px';
        await sleep(620);
        el.remove();
      }
    }
    return;
  }

  // ===== 对手奥秘拦截（法术反制 / 咒术师 / 虚灵传送门） =====
  const foeS = (P(other(side)).secrets || []);
  if (foeS.length) {
    const kinds = foeS.map(s => (CARDS[s.key] || {}).secretKind);
    const spellOnMinion = !!(target && target.kind === 'minion');
    const castSecretActive = kinds.includes('counterspell') || kinds.includes('netherwind_portal')
      || (spellOnMinion && kinds.includes('spellbender'));
    if (castSecretActive) {
      const ctx = { key: c.key, cost, target };
      const triggered = await checkSecrets(other(side), 'cast', ctx);
      if (triggered) {
        // 反制：法术被反制，不结算
        if (ctx._triggeredKind === 'counterspell') return;
        // 咒术师：重定向法术目标到新召唤的1/3咒术师
        if (ctx._triggeredKind === 'spellbender' && ctx._newTarget) target = ctx._newTarget;
        // 虚灵传送门：已召唤同消耗随从，法术照常结算
      }
    }
  }

  // 元素凝聚 (随机3张元素牌加入手牌)
  if (d.addElementals) {
    const elementals = Object.keys(CARDS).filter(k => CARDS[k].race === 'elemental');
    for (let i = 0; i < d.addElementals; i++) {
      if (p.hand.length < 10) {
        const ek = elementals[randi(0, elementals.length - 1)];
        p.hand.push({ uid: uid(), key: ek });
      }
    }
    sfx.draw();
  }

  // 回响回音 (召唤攻击力相同但1血的复制)
  if (d.copyMinion1Hp && target && target.kind === 'minion') {
    if (p.board.length < 7) {
      const copy = mkMinion(target.m.key);
      copy.atk = target.m.atk;
      copy.hp = 1; copy.maxHp = 1;
      copy.justSpawned = true;
      p.board.push(copy);
      sfx.play();
      await summonWithFX(side, copy); // 视觉：回响复制随从飞入战场
    }
  }

  const srcC = elCenter(heroEl(side));
  const sp = spellPower(side);

  // 变形术 (变羊)
  if (d.transform && target && target.kind === 'minion') {
    // 视觉：暗影变形能量飞向目标
    const tfEl = minionEl(target.side, target.m.uid);
    if (tfEl) await projectile(srcC, elCenter(tfEl), 'shadow', 300);
    const tm = target.m;
    tm.key = d.transform;
    const base = CARDS[d.transform];
    tm.name = base.name; tm.art = base.art;
    tm.atk = base.atk; tm.hp = base.hp; tm.maxHp = base.hp;
    silenceMinion(tm); // 清除原技能
    sfx.shieldPop();
    const tEl = minionEl(target.side, tm.uid);
    if (tEl) sparks(elCenter(tEl).x, elCenter(tEl).y, '#6ad0ff', 16);
    render();
    await checkDeaths();
    render();
    return;
  }

  // 精神控制 (获得敌方随从控制权)
  if (d.mindControl && target && target.kind === 'minion') {
    // 视觉：暗影束缚飞向目标
    const mcEl = minionEl(target.side, target.m.uid);
    if (mcEl) await projectile(srcC, elCenter(mcEl), 'shadow', 300);
    const srcSide = target.side;
    const dstSide = other(srcSide);
    if (P(dstSide).board.length < 7) {
      const idx = P(srcSide).board.indexOf(target.m);
      if (idx >= 0) {
        const [stolen] = P(srcSide).board.splice(idx, 1);
        stolen.sleep = true;
        P(dstSide).board.push(stolen);
        sfx.power();
      }
    }
    render();
    await checkDeaths();
    render();
    return;
  }

  // 野性成长 (法力水晶+1)
  if (d.gainMana) {
    const pl = P(side);
    pl.maxMana = Math.min(10, pl.maxMana + d.gainMana);
    pl.mana = Math.min(pl.maxMana, pl.mana + d.gainMana);
    sfx.buff();
  }

  // 星界沟通 (直接满水晶)
  if (d.gainMaxMana) {
    const pl = P(side);
    pl.maxMana = 10;
    pl.mana = 10;
    sfx.buff();
  }

  // 丢弃手牌 (星界沟通/死亡之翼法术)
  if (d.discardHand) {
    P(side).hand = [];
    render();
  }

  // 法术直接发现 (太古符文)
  if (d.discoverType) {
    const titles = { spell: '📜 发现一张法术牌', minion: '🔍 发现一张随从牌', dragon: '🐉 发现一张龙牌', taunt: '🛡️ 发现一张嘲讽随从', cost3: '③ 发现一张3费卡牌', legendary: '⭐ 发现一张传说卡牌' };
    await triggerDiscover(side, d.discoverType, titles[d.discoverType]);
  }

  if (d.draw) { await drawCard(side, d.draw); }
  if (d.dmg && target) {
    const tEl = target.kind === 'minion' ? minionEl(target.side, target.m.uid) : heroEl(target.side);
    const tc = tEl ? elCenter(tEl) : srcC;
    const totalDmg = d.dmg + sp;
    await projectile(srcC, tc, d.fxc || '', 400);
    boomAt(tc.x, tc.y);
    sfx.boom();
    dealDamage(target, totalDmg);
    if (d.freeze && target.kind === 'minion' && target.m.hp > 0) {
      target.m.frozen = true;
      const tEl2 = minionEl(target.side, target.m.uid);
      if (tEl2) {
        tEl2.classList.add('frozen');
        const fc2 = elCenter(tEl2);
        sparks(fc2.x, fc2.y, '#88ccff', 8);
        sparks(fc2.x, fc2.y - 12, '#ddf2ff', 5);
      }
    }
  } else if (d.heal && target) {
    const tEl = target.kind === 'minion' ? minionEl(target.side, target.m.uid) : heroEl(target.side);
    const tc = tEl ? elCenter(tEl) : srcC;
    await projectile(srcC, tc, 'holy', 380);
    sparks(tc.x, tc.y, '#ffe88a', 14);
    healTarget(target, d.heal);
  } else if (d.buff && target && target.kind === 'minion') {
    const tEl = minionEl(target.side, target.m.uid);
    if (tEl) {
      const tc = elCenter(tEl);
      // 视觉：神圣能量飞向目标并洒下金光
      await projectile(srcC, tc, 'holy', 300);
      sparks(tc.x, tc.y, '#8aff8a', 14);
    }
    target.m.atk += d.buff[0]; target.m.hp += d.buff[1]; target.m.maxHp += d.buff[1];
    sfx.buff();
  } else if (d.brawl) {
    // 绝命乱斗：随机选择场上一个随从存活，消灭其他所有随从 (含己方)
    const allMinions = [];
    ['me', 'ai'].forEach(s => {
      P(s).board.forEach(m => allMinions.push({ side: s, m }));
    });
    if (allMinions.length) {
      sfx.boom();
      aoeFlash(d.spellSchool);
      FX.shake('heavy');
      const survivor = allMinions[randi(0, allMinions.length - 1)];
      allMinions.forEach(x => {
        const el = minionEl(x.side, x.m.uid);
        if (el) { const c = elCenter(el); boomAt(c.x, c.y); }
      });
      await sleep(380);
      allMinions.forEach(x => {
        if (x.m !== survivor.m) x.m.hp = 0;
      });
      const sEl = minionEl(survivor.side, survivor.m.uid);
      if (sEl) FX.sparks(elCenter(sEl).x, elCenter(sEl).y, '#ffe88a', 20);
      setHint('绝命乱斗！' + CARDS[survivor.m.key].name + ' 存活了下来！');
      setTimeout(() => setHint(''), 2500);
    }
  } else if (d.dmgAll) {
    // 扭曲虚空 (dmgAll>=10)：消灭所有随从（含己方）；其余 AOE 只对敌方随从造成伤害
    const isFullClear = d.dmgAll >= 10;
    sfx.boom();
    aoeFlash(d.spellSchool);
    if (isFullClear) FX.shake('heavy');
    const sides = isFullClear ? ['me', 'ai'] : [other(side)];
    const victims = [];
    sides.forEach(s => P(s).board.forEach(m => victims.push({ kind: 'minion', side: s, m })));
    victims.forEach(x => {
      const el = minionEl(x.side, x.m.uid);
      if (el) { const cc = elCenter(el); boomAt(cc.x, cc.y); }
    });
    await sleep(180);
    if (isFullClear) {
      victims.forEach(x => { x.m.hp = 0; }); // 全场消灭无视圣盾/护甲
      await checkDeaths();
    } else {
      victims.forEach(x => dealDamage({ kind: 'minion', side: x.side, m: x.m }, d.dmgAll + sp));
    }
  } else if (d.missiles) {
    const foe = other(side);
    const totalM = d.missiles + sp;
    for (let i = 0; i < totalM; i++) {
      const pool = P(foe).board.filter(m => m.hp > 0).map(m => ({ kind: 'minion', side: foe, m }));
      pool.push({ kind: 'hero', side: foe });
      const t = pool[randi(0, pool.length - 1)];
      const tEl = t.kind === 'minion' ? minionEl(t.side, t.m.uid) : heroEl(t.side);
      const tc = tEl ? elCenter(tEl) : srcC;
      await projectile(srcC, tc, 'shadow', 260);
      boomAt(tc.x, tc.y, true);
      dealDamage(t, 1);
      render();
    }
  }
  if (d.freezeAll) {
    const foe = other(side);
    sfx.whoosh();
    P(foe).board.forEach(fm => {
      fm.frozen = true;
      const el = minionEl(foe, fm.uid);
      if (el) {
        el.classList.add('frozen');
        const fc3 = elCenter(el);
        sparks(fc3.x, fc3.y, '#88ccff', 6);
      }
    });
    sparks(800, 400, '#88ccff', 20);
  }
  render();
  await checkDeaths();
  render();
}

/* ================= 英雄技能 ================= */
async function useHeroPower(side, target) {
  const p = P(side);
  p.mana -= 2; p.powerUsed = true;
  sfx.power();
  render();
  HistoryLog.add(side, null, '使用英雄技能');
  const from = elCenter($(side === 'me' ? 'myPower' : 'enemyPower'));
  const tEl = target.kind === 'minion' ? minionEl(target.side, target.m.uid) : heroEl(target.side);
  const tc = tEl ? elCenter(tEl) : from;
  // 难度加成：英雄/地狱难度 Boss 英雄技能伤害提升
  let baseHpDmg = 1;
  if (side === 'ai') {
    if (selectedDifficulty === 'heroic') baseHpDmg = 2;
    else if (selectedDifficulty === 'nightmare') baseHpDmg = 3;
  }
  const hpDmg = baseHpDmg + spellPower(side);
  await projectile(from, tc, '', 320);
  boomAt(tc.x, tc.y, true);
  sfx.boom();
  dealDamage(target, hpDmg);
  render();
  await checkDeaths();
  render();
}

/* ================= 回合流程 ================= */
async function startTurn(side) {
  const myGameId = currentGameId;
  if (state.over || currentGameId !== myGameId) return;

  // 1. 触发上个回合结束事件 (大螺丝轰炸 / 索瑞森减费等)
  const prevSide = other(side);
  await EffectSystem.dispatchEvent(GameEvents.ON_TURN_END, { side: prevSide });

  // 亚煞极：回合结束时从牌库拉一个随从到场上
  for (const m of P(prevSide).board.slice()) {
    const d = CARDS[m.key];
    if (d.endTurnEffect && d.endTurnEffect.pullMinionFromDeck) {
      const minionsInDeck = P(prevSide).deck.filter(k => CARDS[k].type === 'm');
      if (minionsInDeck.length > 0 && P(prevSide).board.length < 7) {
        const mk = minionsInDeck[randi(0, minionsInDeck.length - 1)];
        P(prevSide).deck.splice(P(prevSide).deck.indexOf(mk), 1);
        const recruited = mkMinion(mk);
        recruited.justSpawned = true;
        P(prevSide).board.push(recruited);
        sfx.power();
        // 视觉：从牌库位置飞入战场（亚煞极拉随从）
        await summonWithFX(prevSide, recruited, elCenter($(prevSide === 'me' ? 'myDeck' : 'enemyDeck')));
      }
    }
    // 暮光尊者：回合结束时为克苏恩 Buff
    if (d.endTurnEffect && d.endTurnEffect.buffCthun) {
      buffCThun(prevSide, d.endTurnEffect.buffCthun[0], d.endTurnEffect.buffCthun[1]);
    }
  }

  state.turn = side; state.busy = true;
  const p = P(side);
  if (side === 'me') state.num++;
  p.maxMana = Math.min(10, p.maxMana + 1);
  p.mana = p.maxMana;
  p.powerUsed = false;
  p.weaponAttacksThisTurn = 0; // 重置英雄武器攻击状态

  // 奥秘：洗劫（若对手上回合抽了≥2张牌，将牌库顶牌的两张复制加入手牌）
  if ((P(side).secrets || []).some(s => CARDS[s.key] && CARDS[s.key].secretKind === 'plagiarize')) {
    const oppDrew = P(other(side)).drewThisTurn || 0;
    if (oppDrew >= 2) {
      await checkSecrets(side, 'turnStart', { side });
    }
  }

  // 重置本回合计数（对手的计数保留，用于 洗劫 判定）
  p.cardsPlayedThisTurn = 0;
  p.drewThisTurn = 0;

  // 2. 触发本回合开始事件 (末日预言者全场清场等)
  await EffectSystem.dispatchEvent(GameEvents.ON_TURN_START, { side });

  // 跨回合元素链状态传递
  p.playedElementalLastTurn = p.playedElementalThisTurn || false;
  p.playedElementalThisTurn = false;

  p.board.forEach(m => {
    m.sleep = false; m.attacked = false; m.attacksThisTurn = 0;
    if (m.frozen) {
      m.frozen = false; m.sleep = true;
      // 视觉：冰晶碎裂粒子（解冻）
      const fel = minionEl(side, m.uid);
      if (fel) {
        const fc4 = elCenter(fel);
        sparks(fc4.x, fc4.y, '#c0e8ff', 6);
        sparks(fc4.x, fc4.y - 10, '#ffffff', 3);
      }
    }
  });
  render();
  sfx.turn();
  // 视觉：回合过渡覆盖层
  const turnOverlay = document.createElement('div');
  turnOverlay.className = 'turn-overlay';
  fxAdd(turnOverlay);
  setTimeout(() => turnOverlay.remove(), 1100);
  await showBanner(side === 'me' ? '你 的 回 合' : '敌 方 回 合');
  if (currentGameId !== myGameId) return;
  await drawCard(side, 1);
  // 地狱难度：AI 每回合额外多抽 1 张牌
  if (side === 'ai' && selectedDifficulty === 'nightmare') {
    if (currentGameId !== myGameId) return;
    await drawCard(side, 1);
  }
  if (state.over || currentGameId !== myGameId) return;
  if (side === 'me') {
    state.busy = false;
    render();
  } else {
    render();
    await aiTurn();
  }
}

$('endTurn').onclick = async () => {
  if (state.turn !== 'me' || state.busy || state.over) return;
  clearSel();
  state.busy = true;
  render();
  await startTurn('ai');
};

/* 返回主菜单逻辑（彻底重置并防崩溃） */
/* ================= 战术暂停与退出弹窗 ================= */
$('quitBtn').onclick = () => {
  if (state.over || !state.started) { backToMenu(); return; }
  showQuitModal();
};

function showQuitModal() {
  const modal = $('quitModal');
  if (!modal) { backToMenu(); return; }
  modal.classList.add('show');

  $('quitConfirm').onclick = () => {
    modal.classList.remove('show');
    backToMenu();
  };

  $('quitCancel').onclick = () => {
    modal.classList.remove('show');
  };
}

// 点击弹窗黑色背景也可取消
if ($('quitModal')) {
  $('quitModal').addEventListener('click', (e) => {
    if (e.target === $('quitModal')) {
      $('quitModal').classList.remove('show');
    }
  });
}

function backToMenu() {
  if (typeof TestMode !== 'undefined') TestMode.hide(); // 退出时隐藏测试控制台
  HistoryLog.clear(); // 清空上一局的出牌历史记录
  currentGameId++;
  state.over = true;
  state.busy = true;
  state.started = false;

  if ($('quitModal')) $('quitModal').classList.remove('show'); // 确保弹窗关闭
  clearBattleState();
  clearSel();

  $('gameOver').style.display = 'none';
  $('intro').style.display = 'flex';

  $('myRow').innerHTML = '';
  $('enemyRow').innerHTML = '';
  $('myHand').innerHTML = '';
  $('enemyHand').innerHTML = '';
  if ($('mySecrets')) $('mySecrets').innerHTML = '';
  if ($('enemySecrets')) $('enemySecrets').innerHTML = '';

  state.me = null;
  state.ai = null;
  updateIntroStats();
}

/* ================= AI ================= */
function aiLethal() {
  const ai = P('ai');
  let dmg = 0, mana = ai.mana;
  const direct = ai.hand.filter(c => CARDS[c.key].type === 's' && CARDS[c.key].dmg).sort((a, b) => CARDS[b.key].dmg - CARDS[a.key].dmg);
  direct.forEach(c => { const cc = Math.max(0, CARDS[c.key].cost - (c.costMod || 0)); if (cc <= mana) { mana -= cc; dmg += CARDS[c.key].dmg; } });
  if (!ai.powerUsed && mana >= 2) dmg += 1;
  ai.board.forEach(m => { if (!m.sleep && !m.attacked) dmg += m.atk; });
  // 武器攻击力计入斩杀计算
  if (ai.weapon && (ai.weaponAttacksThisTurn || 0) < (CARDS[ai.weapon.key].windfury ? 2 : 1)) dmg += ai.weapon.atk;
  return dmg;
}

/* ================= AI 决策引擎 (支持混沌 Boss 施法) ================= */
async function aiTurn() {
  const myGameId = currentGameId;
  const ai = P('ai'), me = P('me');
  await sleep(500);
  if (currentGameId !== myGameId || state.over) return;

  const myTaunts = () => me.board.filter(m => m.hp > 0 && m.taunt);
  const faceable = () => myTaunts().length === 0;

  async function playSpell(c, target) {
    if (CARDS[c.key].secret) {
      // 奥秘：不展示具体牌面，仅显示神秘"?"飞入（炉石传说：对手的奥秘是秘密）
      await secretPlayFX();
    } else {
      await showcase(c.key, { x: 745, y: 20 }, 900);
    }
    if (currentGameId !== myGameId) return;
    await castSpellCard('ai', c, target);
    await sleep(350);
  }

  let acted = true;
  while (acted && !state.over && currentGameId === myGameId) {
    acted = false;
    const spells = ai.hand.filter(c => CARDS[c.key].type === 's' && Math.max(0, CARDS[c.key].cost - (c.costMod || 0)) <= ai.mana);

    // 1. AI 法术评估与出牌逻辑
    for (const c of spells) {
      const d = CARDS[c.key];
      if (state.over || currentGameId !== myGameId) return;

      // A0. 奥秘：优先挂载（最多5个）
      if (d.secret) {
        if (ai.secrets.length < 5) { await playSpell(c, null); acted = true; break; }
      }

      // A. 变形术 (Polymorph)
      if (d.transform) {
        const bigTarget = me.board.filter(m => !m.stealth).sort((a, b) => (b.atk + b.hp) - (a.atk + a.hp))[0];
        if (bigTarget) { await playSpell(c, { kind: 'minion', side: 'me', m: bigTarget }); acted = true; break; }
      }

      // B. 补充手牌类法术 (元素凝聚 / 唠叨的魔典)
      if (d.addElementals || d.addRandomSpell || d.draw) {
        await playSpell(c, null); acted = true; break;
      }

      // C. 绝命乱斗 / 扭曲虚空 (混沌 Boss 只要场上有随从就果断开砸)
      if (d.brawl) {
        // 双方随从较多时使用绝命乱斗
        if (me.board.length + P('ai').board.length >= 3) {
          await playSpell(c, null); acted = true; break;
        }
      }
      if (d.dmgAll && d.dmgAll >= 10) {
        if (me.board.length >= (selectedBossKey === 'yogg_boss' ? 1 : 2)) {
          await playSpell(c, null); acted = true; break;
        }
      }

      // D. 普通直伤与 AOE 法术
      if (d.dmg) {
        if (faceable() && aiLethal() >= me.hp) { await playSpell(c, { kind: 'hero', side: 'me' }); acted = true; break; }
        const kill = me.board.filter(m => m.hp <= d.dmg && !m.shield && (m.atk >= 3 || m.taunt)).sort((a, b) => b.atk - a.atk)[0];
        if (kill) { await playSpell(c, { kind: 'minion', side: 'me', m: kill }); acted = true; break; }
        if (ai.mana >= 8 || me.hp <= 12) { await playSpell(c, { kind: 'hero', side: 'me' }); acted = true; break; }
      } else if (d.dmgAll) {
        if (me.board.length >= 2) { await playSpell(c, null); acted = true; break; }
      } else if (d.missiles) {
        if (me.board.length >= 1 || me.hp <= 6) { await playSpell(c, null); acted = true; break; }
      } else if (d.heal) {
        if (ai.hp <= 18) { await playSpell(c, { kind: 'hero', side: 'ai' }); acted = true; break; }
      }

      // E. 尤格-萨隆混沌模式：任何能打出的法术随机轰炸！
      if (selectedBossKey === 'yogg_boss') {
        let t = null;
        if (d.target === 'any') {
          const pool = me.board.map(m => ({ kind: 'minion', side: 'me', m }));
          pool.push({ kind: 'hero', side: 'me' });
          t = pool[randi(0, pool.length - 1)];
        }
        await playSpell(c, t); acted = true; break;
      }
    }
    if (acted) continue;

    // 1.5 AI 武器出牌逻辑 (已有更强武器则不换)
    const wpns = ai.hand.filter(c => CARDS[c.key].type === 'w' && Math.max(0, CARDS[c.key].cost - (c.costMod || 0)) <= ai.mana)
      .sort((a, b) => CARDS[b.key].atk - CARDS[a.key].atk);
    if (wpns.length && (!ai.weapon || CARDS[wpns[0].key].atk > ai.weapon.atk)) {
      const wc = wpns[0];
      await showcase(wc.key, { x: 745, y: 20 }, 800);
      if (currentGameId !== myGameId) return;
      let wtarget = null;
      if (CARDS[wc.key].bc && CARDS[wc.key].bc.dmg) {
        const valid = me.board.filter(m => !m.stealth && m.hp <= CARDS[wc.key].bc.dmg && !m.shield).sort((a, b) => b.atk - a.atk)[0];
        wtarget = valid ? { kind: 'minion', side: 'me', m: valid } : { kind: 'hero', side: 'me' };
      }
      await playWeaponCard('ai', wc, wtarget);
      await sleep(350);
      acted = true; continue;
    }

    // 2. AI 随从出牌逻辑
    if (ai.board.length < 7) {
      const ms = ai.hand.filter(c => CARDS[c.key].type === 'm' && Math.max(0, CARDS[c.key].cost - (c.costMod || 0)) <= ai.mana)
        .sort((a, b) => CARDS[b.key].cost - CARDS[a.key].cost);
      if (ms.length) {
        const c = ms[0], d = CARDS[c.key];
        await showcase(c.key, { x: 745, y: 20 }, 800);
        if (currentGameId !== myGameId) return;
        let target = null;
        if (d.bc && d.bc.dmg) {
          const valid = me.board.filter(m => !m.stealth && m.hp <= d.bc.dmg && !m.shield).sort((a, b) => b.atk - a.atk)[0];
          target = valid ? { kind: 'minion', side: 'me', m: valid } : { kind: 'hero', side: 'me' };
        }
        await playMinionCard('ai', c, null, target);
        await sleep(400);
        acted = true; continue;
      }
    }

    // 3. AI 英雄技能逻辑 (包含尤格-萨隆 混沌狂潮)
    if (!ai.powerUsed && ai.mana >= 2) {
      if (selectedBossKey === 'yogg_boss') {
        // 尤格-萨隆专属技能：连续施放 2 个随机法术！
        ai.mana -= 2; ai.powerUsed = true;
        sfx.power(); render();
        addHistory('ai', null, '尤格-萨隆：混沌狂潮！');

        const allSpells = Object.keys(CARDS).filter(k => CARDS[k].type === 's');
        for (let i = 0; i < 2; i++) {
          if (state.over) break;
          const skey = allSpells[randi(0, allSpells.length - 1)];
          await showcase(skey, elCenter($('enemyPower')), 500);
          await castSpellCard('ai', { uid: uid(), key: skey }, null, true);
          await sleep(300);
        }
        acted = true; continue;
      }

      // 普通 Boss 技能逻辑
      const kill1 = me.board.filter(m => m.hp === 1 && !m.shield).sort((a, b) => b.atk - a.atk)[0];
      if (kill1) { await useHeroPower('ai', { kind: 'minion', side: 'me', m: kill1 }); acted = true; continue; }
      if (faceable() && (me.hp <= 10 || ai.mana >= 4)) { await useHeroPower('ai', { kind: 'hero', side: 'me' }); acted = true; continue; }
    }
  }
  if (state.over || currentGameId !== myGameId) return;

  // 4. 攻击阶段
  let guard = 0;
  while (!state.over && guard++ < 20 && currentGameId === myGameId) {
    // 4.0 英雄武器攻击优先
    if (ai.weapon && ai.weapon.atk > 0 && ai.weapon.durability > 0
      && (ai.weaponAttacksThisTurn || 0) < (CARDS[ai.weapon.key].windfury ? 2 : 1)) {
      const wtaunts = myTaunts();
      let wtarget = null;
      if (wtaunts.length) {
        const nonStealth = wtaunts.filter(t => !t.stealth);
        if (nonStealth.length > 0) wtarget = { kind: 'minion', side: 'me', m: nonStealth.sort((a, b) => a.hp - b.hp)[0] };
      } else if (faceable() && aiLethal() >= me.hp) {
        wtarget = { kind: 'hero', side: 'me' };
      } else {
        const wthreat = me.board.filter(m => m.atk >= 4 && !m.shield).sort((a, b) => b.atk - a.atk)[0];
        wtarget = wthreat ? { kind: 'minion', side: 'me', m: wthreat } : { kind: 'hero', side: 'me' };
      }
      if (wtarget) {
        await doAttack('ai', { kind: 'hero' }, wtarget);
        if (state.over || currentGameId !== myGameId) return;
        await sleep(350);
        continue;
      }
    }

    const ready = ai.board.filter(m => !m.sleep && !m.attacked && m.atk > 0);
    if (!ready.length) break;
    const m = ready.sort((a, b) => b.atk - a.atk)[0];
    const taunts = myTaunts();
    let target = null;
    if (taunts.length) {
      const nonStealth = taunts.filter(t => !t.stealth);
      if (nonStealth.length > 0) target = { kind: 'minion', side: 'me', m: nonStealth.sort((a, b) => a.hp - b.hp)[0] };
      else continue;
    } else if (aiLethal() >= me.hp || me.board.length === 0) {
      target = { kind: 'hero', side: 'me' };
    } else {
      const trade = me.board.filter(t => m.atk >= t.hp && !t.shield && (t.atk >= m.hp || t.atk >= 4 || t.hp <= m.atk - 2))
        .sort((a, b) => (b.atk + b.hp) - (a.atk + a.hp))[0];
      const threat = me.board.filter(t => t.atk >= 6 && m.atk >= t.hp)[0];
      if (threat) target = { kind: 'minion', side: 'me', m: threat };
      else if (trade && trade.atk + trade.hp >= m.atk + 2) target = { kind: 'minion', side: 'me', m: trade };
      else target = { kind: 'hero', side: 'me' };
    }
    await doAttack('ai', { kind: 'minion', m }, target);
    if (state.over || currentGameId !== myGameId) return;
    await sleep(350);
  }
  await sleep(500);
  if (!state.over && currentGameId === myGameId) await startTurn('me');
}

/* ================= 统一丝滑拖拽与指向拉线控制系统 ================= */
let selected = null;
let dragControl = null;
let arrowFrom = null;

function inBoardY(y)   { return y > 200 && y < 680; }
function inMinionY(y)  { return y > 380 && y < 640; }

function isDraggable(c) { return canPlay(c); }

function setHint(t) {
  const h = $('hint');
  if (!h) return;
  if (!t) { h.style.display = 'none'; return; }
  h.textContent = t; h.style.display = 'block';
}

function clearSel() {
  selected = null;
  hideArrow(); setHint('');
  document.querySelectorAll('.selAtk').forEach(e => e.classList.remove('selAtk'));
  if (state.started && state.me) {
    layoutHand();
    render();
  }
}

function showArrowFrom(el) {
  arrowFrom = elCenter(el);
  $('arrowPath').style.display = 'block';
}

function hideArrow() {
  arrowFrom = null;
  $('arrowPath').style.display = 'none';
}

/* ================= 全局右键卡牌放大预览 ================= */
function showCardPreview(key, x, y) {
  let pv = $('preview');
  if (!pv) return;
  pv.innerHTML = cardHTML(key);
  pv.style.display = 'block';
  pv.style.position = 'absolute';
  pv.style.zIndex = '350';
  pv.style.transform = 'scale(1.5)';
  pv.style.transformOrigin = 'center center';
  pv.style.pointerEvents = 'none';

  let posX = x || 800;
  let posY = y || 450;
  if (posX > 1300) posX = 1300;
  if (posX < 200) posX = 200;
  if (posY > 700) posY = 700;
  if (posY < 200) posY = 200;

  pv.style.left = (posX - 66) + 'px';
  pv.style.top = (posY - 93) + 'px';
}

function hideCardPreview() {
  let pv = $('preview');
  if (pv) pv.style.display = 'none';
}

/* ================= 1. 按下鼠标：判定卡牌/技能/攻击 ================= */
$('stage').addEventListener('pointerdown', (e) => {
  // 右键卡牌预览
  if (e.button === 2) {
    const mEl = e.target.closest && e.target.closest('.minion');
    const cEl = e.target.closest && e.target.closest('.card');
    const colWrap = e.target.closest && e.target.closest('.col-card-wrap');

    let key = null;
    if (mEl) {
      const side = mEl.parentElement.id === 'myRow' ? 'me' : 'ai';
      const m = P(side).board.find(x => x.uid == mEl.dataset.uid);
      if (m) key = m.key;
    } else if (cEl && cEl.dataset.huid) {
      const c = P('me').hand.find(x => x.uid == cEl.dataset.huid);
      if (c) key = c.key;
    } else if (colWrap && colWrap.dataset.key) {
      key = colWrap.dataset.key;
    }

    if (key) {
      e.preventDefault();
      const pos = stagePos(e);
      showCardPreview(key, pos.x, pos.y);
      return;
    }
  }

  if (e.button !== 0 || !state.started || state.over || state.busy || state.turn !== 'me') return;

  const pos = stagePos(e);
  const cardEl = e.target.closest && e.target.closest('#myHand .card');
  const minionEl = e.target.closest && e.target.closest('#myRow .minion');
  const powerEl = e.target.closest && e.target.closest('#myPower');

  // A. 手牌拖拽/指向起手
  if (cardEl) {
    const c = P('me').hand.find(x => x.uid == cardEl.dataset.huid);
    if (!c || !canPlay(c)) {
      if (c) { sfx.error(); setHint('法力值不足或战场已满'); setTimeout(() => setHint(''), 1200); }
      return;
    }
    const d = CARDS[c.key];
    dragControl = {
      kind: 'handCard', c, d, cardEl,
      startX: pos.x, startY: pos.y,
      originLeft: parseFloat(cardEl.style.left),
      originTop: parseFloat(cardEl.style.top),
      originTransform: cardEl.dataset.base || cardEl.style.transform,
      dragging: false
    };
    e.preventDefault();
    return;
  }

  // B. 英雄技能拉线起手
  if (powerEl) {
    const p = P('me');
    if (p.powerUsed || p.mana < 2) { sfx.error(); return; }
    dragControl = {
      kind: 'power',
      startX: pos.x, startY: pos.y,
      dragging: true
    };
    showArrowFrom(powerEl);
    setHint('拖拽指向目标并松开以释放技能');
    e.preventDefault();
    return;
  }

  // C. 随从拉线攻击起手
  if (minionEl) {
    const m = P('me').board.find(x => x.uid == minionEl.dataset.uid);
    if (m && !m.sleep && m.attacksThisTurn < (m.windfury ? 2 : 1) && m.atk > 0 && !m.cantAttack) {
      dragControl = {
        kind: 'minionAtk', m,
        startX: pos.x, startY: pos.y,
        dragging: true
      };
      showArrowFrom(minionEl);
      setHint(m.windfury && m.attacksThisTurn === 1 ? '风怒：拖拽发起第二次攻击！' : '拖拽箭头指向敌人发起攻击');
      e.preventDefault();
      return;
    }
  }

  // C2. 英雄武器攻击拉线起手
  const myHeroEl = e.target.closest && e.target.closest('#myHero');
  if (myHeroEl) {
    const p = P('me');
    if (p.weapon && p.weapon.atk > 0 && p.weapon.durability > 0
      && (p.weaponAttacksThisTurn || 0) < (CARDS[p.weapon.key].windfury ? 2 : 1)) {
      dragControl = {
        kind: 'heroAtk',
        startX: pos.x, startY: pos.y,
        dragging: true
      };
      showArrowFrom(myHeroEl);
      setHint('拖拽箭头指向目标发起英雄攻击');
      e.preventDefault();
      return;
    }
  }
});

/* ================= 2. 拖拽过程：实时更新手牌位移与指向红线 ================= */
$('stage').addEventListener('pointermove', (e) => {
  if (!dragControl) return;
  const pos = stagePos(e);
  const dx = pos.x - dragControl.startX;
  const dy = pos.y - dragControl.startY;

  if (!dragControl.dragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
    dragControl.dragging = true;
    if (dragControl.kind === 'handCard') {
      clearSel();
      dragControl.cardEl.classList.add('dragging');
    }
  }

  if (!dragControl.dragging) return;

  // 视觉：拖拽轨迹粒子反馈（随机采样限制频率防性能问题）
  if (dragControl.kind === 'handCard' && Math.random() < 0.35) {
    const trail = document.createElement('div');
    trail.className = 'drag-spark';
    trail.style.left = pos.x + 'px'; trail.style.top = pos.y + 'px';
    fxAdd(trail);
    setTimeout(() => trail.remove(), 400);
  }

  // 手牌拖拽/指向渲染
  if (dragControl.kind === 'handCard') {
    const { d, cardEl } = dragControl;
    const isTargetedSpell = (d.type === 's' && d.target);
    const isTargetedWeapon = (d.type === 'w' && needTarget(d));
    const isTargetedMinion = (d.type === 'm' && needTarget(d));

    // 拖出战场区域 (Y < 680)
    if (pos.y < 680) {
      if (isTargetedSpell) {
        // 指向性法术：卡牌隐藏，直接从英雄身上拉出红色瞄准线！
        cardEl.style.display = 'none';
        arrowFrom = elCenter($('myHero'));
        $('arrowPath').style.display = 'block';
        setHint('拖拽箭头指向目标并松开以施放法术');
      } else if (isTargetedWeapon) {
        // 带战吼目标的武器：卡牌隐藏，从英雄身上拉出瞄准线
        cardEl.style.display = 'none';
        arrowFrom = elCenter($('myHero'));
        $('arrowPath').style.display = 'block';
        setHint('拖拽箭头指向战吼目标并松开以装备武器');
      } else if (isTargetedMinion && inMinionY(pos.y)) {
        // 带目标战吼随从：在召唤虚线处拉出红色瞄准线！
        cardEl.style.display = 'none';
        updateDragPreview(pos);
        const idx = insertIdxFromX(pos.x);
        const b = P('me').board;
        let spawnX = 800;
        if (b.length && idx < b.length) spawnX = elCenter(minionEl('me', b[idx].uid)).x - 60;
        else if (b.length) spawnX = elCenter(minionEl('me', b[b.length - 1].uid)).x + 60;

        arrowFrom = { x: spawnX, y: 500 };
        $('arrowPath').style.display = 'block';
        setHint('拖拽箭头指向战吼目标并松开');
      } else {
        // 普通随从 / AOE 法术：卡牌跟随鼠标
        cardEl.style.display = 'block';
        hideArrow();
        const tx = pos.x - dragControl.startX;
        const ty = pos.y - dragControl.startY;
        cardEl.style.transform = `translate(${tx}px, ${ty}px) scale(1.05)`;
        updateDragPreview(pos);
        setHint(d.type === 'm' ? '松开以召唤随从' : d.type === 'w' ? '松开以装备武器' : '松开以施放法术');
      }
    } else {
      // 拖回手牌区域：复原
      cardEl.style.display = 'block';
      hideArrow();
      hideDragPreview();
      const tx = pos.x - dragControl.startX;
      const ty = pos.y - dragControl.startY;
      cardEl.style.transform = `translate(${tx}px, ${ty}px) scale(1.05)`;
    }
  }

  // 红色弧形箭头贝塞尔曲线绘制
  if (arrowFrom) {
    const mx = (arrowFrom.x + pos.x) / 2, my = Math.min(arrowFrom.y, pos.y) - 70;
    $('arrowPath').setAttribute('d', `M ${arrowFrom.x} ${arrowFrom.y} Q ${mx} ${my} ${pos.x} ${pos.y}`);
  }
});

/* ================= 3. 松开鼠标：一气呵成触发打出/攻击 ================= */
$('stage').addEventListener('pointerup', async (e) => {
  hideCardPreview();
  if (!dragControl) return;

  const rawEl = document.elementFromPoint(e.clientX, e.clientY);
  const t = rawEl ? targetFromEl(rawEl) : null;
  const pos = stagePos(e);
  const dc = dragControl;
  dragControl = null;

  // 如果没有发生明显拖拽（纯单击操作），保留选中状态支持单击打牌
  if (!dc.dragging) {
    if (dc.kind === 'handCard') selectHandCard(dc.cardEl);
    if (dc.kind === 'power') {
      selected = { kind: 'power' };
      $('myPower').classList.add('selAtk');
      showArrowFrom($('myPower'));
      setHint('火焰冲击：点击目标以施放');
    }
    if (dc.kind === 'minionAtk') selectAttacker(dc.m);
    return;
  }

  // A2. 英雄武器攻击释放
  if (dc.kind === 'heroAtk') {
    hideArrow();
    if (t && validAttackTarget({ kind: 'hero' }, t)) {
      state.busy = true; clearSel();
      try { await doAttack('me', { kind: 'hero' }, t); }
      finally { state.busy = false; render(); }
    } else {
      if (t) sfx.error();
      clearSel();
    }
    return;
  }

  // A. 随从攻击释放
  if (dc.kind === 'minionAtk') {
    hideArrow();
    if (t && validAttackTarget(dc.m, t)) {
      state.busy = true; clearSel();
      try { await doAttack('me', { kind: 'minion', m: dc.m }, t); }
      finally { state.busy = false; render(); }
    } else {
      // 单击自己的随从（未拖拽到目标）视为取消，不播放错误音
      const isSelfClick = t && t.kind === 'minion' && t.side === 'me' && t.m.uid === dc.m.uid;
      if (t && !isSelfClick) sfx.error();
      clearSel();
    }
    return;
  }

  // B. 英雄技能释放
  if (dc.kind === 'power') {
    hideArrow();
    if (t) {
      state.busy = true; clearSel();
      try { await useHeroPower('me', t); }
      finally { state.busy = false; render(); }
    } else {
      clearSel();
    }
    return;
  }

  // C. 手牌拖拽/指向打出
  if (dc.kind === 'handCard') {
    dc.cardEl.style.display = 'block';
    hideArrow(); hideDragPreview();

    const d = dc.d, c = dc.c;

    if (d.type === 'w') {
      // 武器牌打出 (拖到战场区域)
      if (pos.y < 680) {
        if (needTarget(d)) {
          if (t && !(t.kind === 'minion' && t.m.stealth && t.side !== 'me')) {
            state.busy = true; clearSel();
            try { await playWeaponCard('me', c, t); }
            finally { state.busy = false; render(); }
            return;
          } else {
            sfx.error(); cancelHandCardDrag(dc); return;
          }
        } else {
          state.busy = true; clearSel();
          try { await playWeaponCard('me', c, null); }
          finally { state.busy = false; render(); }
          return;
        }
      }
      cancelHandCardDrag(dc);
      return;
    }

    if (d.type === 'm') {
      if (inMinionY(pos.y) || t) {
        const idx = insertIdxFromX(pos.x);
        if (needTarget(d)) {
          if (t && !(t.kind === 'minion' && t.m.stealth && t.side !== 'me')) {
            state.busy = true; clearSel();
            try { await playMinionCard('me', c, idx, t); }
            finally { state.busy = false; render(); }
            return;
          } else {
            sfx.error(); cancelHandCardDrag(dc); return;
          }
        } else {
          state.busy = true; clearSel();
          try { await playMinionCard('me', c, idx, null); }
          finally { state.busy = false; render(); }
          return;
        }
      }
      cancelHandCardDrag(dc);
      return;
    } else {
      // 法术打出
      if (d.target) {
        if (t && !(t.kind === 'minion' && t.m.stealth && t.side !== 'me')) {
          state.busy = true; clearSel();
          try { await castSpellCard('me', c, t); }
          finally { state.busy = false; render(); }
          return;
        }
        sfx.error(); cancelHandCardDrag(dc); return;
      } else {
        if (pos.y < 680) {
          state.busy = true; clearSel();
          try { await castSpellCard('me', c, null); }
          finally { state.busy = false; render(); }
          return;
        }
        cancelHandCardDrag(dc);
        return;
      }
    }
  }
});

function cancelHandCardDrag(dc) {
  const el = dc.cardEl;
  el.classList.remove('dragging');
  el.classList.add('drag-return');
  el.style.transformOrigin = '50% 100%';
  el.style.transform = dc.originTransform;
  el.style.zIndex = '';
  sfx.error();
  setTimeout(() => { el.classList.remove('drag-return'); el.style.transition = ''; }, 300);
  clearSel();
}

/* ================= 拖拽/目标辅助函数 ================= */
function updateDragPreview(pos) {
  const d = dragControl.d;
  const valid = inBoardY(pos.y) && (d.type !== 'm' || inMinionY(pos.y));
  $('board').classList.toggle('drag-valid', valid);
  if (valid && d.type === 'm') {
    const idx = insertIdxFromX(pos.x);
    const b = P('me').board;
    let mx;
    if (!b.length) mx = 800;
    else if (idx < b.length) {
      const el = minionEl('me', b[idx].uid);
      mx = el ? elCenter(el).x - 60 : 800;
    } else {
      const el = minionEl('me', b[b.length - 1].uid);
      mx = el ? elCenter(el).x + 60 : 800;
    }
    $('insertMarker').style.left = mx + 'px';
    $('insertMarker').style.display = 'block';
  } else $('insertMarker').style.display = 'none';
}

function hideDragPreview() {
  $('board').classList.remove('drag-valid');
  $('insertMarker').style.display = 'none';
}

function targetFromEl(el) {
  const mEl = el.closest && el.closest('.minion');
  if (mEl) {
    const side = mEl.parentElement.id === 'myRow' ? 'me' : 'ai';
    const m = P(side).board.find(x => x.uid == mEl.dataset.uid);
    if (m) return { kind: 'minion', side, m };
  }
  const hEl = el.closest && el.closest('.hero');
  if (hEl) return { kind: 'hero', side: hEl.id === 'myHero' ? 'me' : 'ai' };
  return null;
}

function enemyHasTaunt() { return P('ai').board.some(m => m.taunt && m.hp > 0 && !m.stealth); }

function validAttackTarget(attacker, t) {
  if (!t || t.side !== 'ai') return false;
  if (t.kind === 'minion' && t.m.stealth) return false;
  // 英雄武器攻击：不限制突袭等随从规则
  if (attacker.kind === 'hero') {
    if (enemyHasTaunt()) return t.kind === 'minion' && t.m.taunt;
    return true;
  }
  if (attacker.rush && attacker.sleep && t.kind === 'hero') return false;
  if (enemyHasTaunt()) return t.kind === 'minion' && t.m.taunt;
  return true;
}

function insertIdxFromX(x) {
  const b = P('me').board;
  for (let i = 0; i < b.length; i++) {
    const el = minionEl('me', b[i].uid);
    if (el && elCenter(el).x > x) return i;
  }
  return b.length;
}

function selectHandCard(cardEl) {
  const c = P('me').hand.find(x => x.uid == cardEl.dataset.huid);
  if (!c) return;
  if (!canPlay(c)) { sfx.error(); setHint('法力值不足或战场已满'); setTimeout(() => setHint(''), 1200); return; }
  selected = { kind: 'hand', c };
  const d = CARDS[c.key];
  if (d.type === 'w') {
    if (needTarget(d)) setHint('选择战吼目标，然后装备武器');
    else setHint(P('me').weapon ? '点击战场，替换当前武器' : '点击战场装备武器');
  } else if (d.type === 'm') {
    if (d.bc && d.bc.yoggSpells) setHint('点击战场召唤尤格-萨隆，随机施放5个法术！');
    else if (d.bc && d.bc.setHeroHp) setHint('选择一个英雄，将其生命值变为' + d.bc.setHeroHp + '点');
    else if (d.bc && d.bc.buffFriendly) setHint('选择一个友方随从，获得+1/+1');
    else if (d.bc && d.bc.heal) setHint('选择一个角色，恢复2点生命值');
    else if (d.bc && d.bc.silence) setHint('选择一个随从，沉默它');
    else if (d.bc && d.bc.dmg) setHint('选择一个目标，造成伤害');
    else setHint(needTarget(d) ? '点击目标使用战吼' : '点击战场召唤随从');
  } else if (d.target === 'any') setHint(d.heal ? '选择一个角色，恢复生命值' : '选择任意目标造成伤害');
  else if (d.target === 'minion') {
    if (d.transform) setHint('选择一个随从，将其变形为1/1绵羊');
    else if (d.mindControl) setHint('选择一个敌方随从，夺取控制权');
    else setHint('选择一个随从');
  }
  else setHint('点击战场施放');
  layoutHand();
  if (d.type === 's' && d.target) showArrowFrom($('myHero'));
  if (d.type === 'w' && needTarget(d)) showArrowFrom($('myHero'));
}

function selectAttacker(m) {
  selected = { kind: 'minion', m };
  const el = minionEl('me', m.uid);
  if (el) { el.classList.add('selAtk'); showArrowFrom(el); }
  const hint = m.windfury && m.attacksThisTurn === 1 ? '风怒：可再攻击一次！' :
    enemyHasTaunt() ? '选择攻击目标（有嘲讽随从阻挡！）' : '选择攻击目标';
  setHint(hint);
}

addEventListener('contextmenu', e => {
  e.preventDefault();
  if (dragControl) { dragControl = null; clearSel(); return; }
  if (selected) clearSel();
});

// 鼠标抬起或按下 Esc 时收起预览
addEventListener('pointerup', hideCardPreview);
addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if ($('quitModal') && $('quitModal').classList.contains('show')) {
      $('quitModal').classList.remove('show');
      return;
    }
    if (dragControl) { dragControl = null; clearSel(); return; }
    if (selected) clearSel();
  }
});


/* ============ 准备大厅逻辑 ============ */
function openMatchLobby() {
  const modal = $('matchLobbyModal');
  if (!modal) return;

  // 1. 渲染套牌列表
  const deckContainer = $('lobbyDeckList');
  deckContainer.innerHTML = '';

  let decks = [];
  try {
    const dd = JSON.parse(localStorage.getItem('hs_decks') || '{}');
    decks = dd.decks || [];
    if (!selectedLobbyDeckId) selectedLobbyDeckId = dd.activeDeckId || (decks[0] ? decks[0].id : null);
  } catch(e){}

  // 默认提供基础套牌选项
  const defaultOpt = document.createElement('div');
  defaultOpt.className = `lobby-deck-card ${!selectedLobbyDeckId || selectedLobbyDeckId === 'default' ? 'sel' : ''}`;
  defaultOpt.innerHTML = `<span>⭐ 预设基础套牌</span><span style="font-size:12px; color:#a08050;">30张</span>`;
  defaultOpt.onclick = () => {
    selectedLobbyDeckId = 'default';
    openMatchLobby();
  };
  deckContainer.appendChild(defaultOpt);

  // 注入最新主流卡组供直接对战测试
  const metaDeck = document.createElement('div');
  metaDeck.className = `lobby-deck-card ${selectedLobbyDeckId === 'meta_mage' ? 'sel' : ''}`;
  metaDeck.innerHTML = `<span>🔥 【主流天马】元素多系斩杀法</span><span style="font-size:12px; color:#ffd970;">30张 T1</span>`;
  metaDeck.onclick = () => {
    selectedLobbyDeckId = 'meta_mage';
    openMatchLobby();
  };
  deckContainer.appendChild(metaDeck);

  decks.forEach(dk => {
    const total = Object.values(dk.cards || {}).reduce((a, b) => a + b, 0);
    const item = document.createElement('div');
    item.className = `lobby-deck-card ${selectedLobbyDeckId === dk.id ? 'sel' : ''}`;
    item.innerHTML = `<span>📦 ${dk.name}</span><span style="font-size:12px; color:#a08050;">${total}/30张</span>`;
    item.onclick = () => {
      selectedLobbyDeckId = dk.id;
      openMatchLobby();
    };
    deckContainer.appendChild(item);
  });

  // 2. 渲染 Boss 列表
  const bossContainer = $('lobbyBossList');
  bossContainer.innerHTML = '';

  Object.keys(BOSSES).forEach(bKey => {
    const boss = BOSSES[bKey];
    const item = document.createElement('div');
    item.className = `boss-card ${selectedBossKey === bKey ? 'sel' : ''}`;
    item.innerHTML = `
      <div class="boss-avatar">${boss.art}</div>
      <div class="boss-name">${boss.name}</div>
      <div class="boss-desc">${boss.desc}</div>
    `;
    item.onclick = () => {
      selectedBossKey = bKey;
      openMatchLobby();
    };
    bossContainer.appendChild(item);
  });

  modal.style.display = 'flex';
}

function selectDifficulty(diff) {
  selectedDifficulty = diff;
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.classList.toggle('sel', btn.dataset.diff === diff);
  });
}

/* ================= 启动与恢复对局 ================= */
/* 支持接收竞技场 30 张卡组参数 */
async function startGame(resumeSaved, customDeckCards, isTest) {
  HistoryLog.clear(); // 清空上一局的出牌历史记录
  currentGameId++;
  const myGameId = currentGameId;

  if (resumeSaved) {
    try {
      const raw = localStorage.getItem(BATTLE_SAVE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        state.turn = saved.turn;
        state.num = saved.num;
        state.me = saved.me;
        state.ai = saved.ai;
        state.over = false; state.busy = false; state.started = true;
        render();
        if (state.turn === 'ai') await aiTurn();
        return;
      }
    } catch(e) { }
  }

  // 1. 读取套牌：优先使用传入的竞技场卡组，其次使用大厅选中的套牌
  let myDeckCards = customDeckCards || null;
  if (!myDeckCards && selectedLobbyDeckId && selectedLobbyDeckId !== 'default') {
    if (selectedLobbyDeckId === 'meta_mage') {
      myDeckCards = [
        'sif', 'mesadune', 'sleet_skater', 'sleet_skater', 'overflowing_lava', 'overflowing_lava',
        'synthesize', 'synthesize', 'reverberance', 'fireball', 'fireball', 'frostbolt', 'frostbolt',
        'arcane_intellect', 'babbling_book', 'babbling_book', 'pyroblast', 'ragnaros', 'yogg',
        'magma', 'ancient', 'sea_giant', 'croc', 'wolf', 'shieldman', 'voodoo_doctor', 'elven_archer',
        'loot_hoarder', 'ironfur_grizzly', 'senjin_shieldmasta'
      ];
    } else {
      try {
        const dd = JSON.parse(localStorage.getItem('hs_decks') || '{}');
        const dk = dd.decks && dd.decks.find(d => d.id === selectedLobbyDeckId);
        if (dk && dk.cards) {
          myDeckCards = Object.entries(dk.cards).flatMap(([k, v]) => Array(v).fill(k));
        }
      } catch(e){}
    }
  }

  // 2. 读取选中的 Boss 配置
  const bossConfig = BOSSES[selectedBossKey] || BOSSES.mage;
  const bossHp = bossConfig.hp[selectedDifficulty] || 30;

  // 3. 构建双方玩家对象
  state.me = newPlayer(myDeckCards);
  state.ai = newPlayer(bossConfig.deck);
  state.ai.hp = bossHp;

  // 设置 Boss 视觉与名称
  $('enemyHero').querySelector('.hName').textContent = '对手 · ' + bossConfig.name;
  $('enemyHero').querySelector('.hPortrait').textContent = bossConfig.art;

  // 更新敌方英雄技能图标
  const powerEmoji = { mage: '🔥', druid: '🐾', warlock: '💀', yogg_boss: '🌀' };
  $('enemyPower').innerHTML = '<div class="hpCost">2</div>' + (powerEmoji[selectedBossKey] || '🔥');

  // 难度加成：英雄/地狱难度 Boss 初始拥有额外水晶
  if (selectedDifficulty === 'heroic') state.ai.maxMana = 1;
  if (selectedDifficulty === 'nightmare') {
    state.ai.maxMana = 3;
    state.ai.mana = 3;
  }

  state.turn = 'me'; state.num = 0; state.over = false; state.busy = true; state.started = true;

  // 测试模式专项设置：100 法力水晶 + 打开测试控制台
  if (isTest) {
    state.me.maxMana = 100;
    state.me.mana = 100;
    if (typeof TestMode !== 'undefined') TestMode.show();
  } else {
    if (typeof TestMode !== 'undefined') TestMode.hide();
  }

  $('matchLobbyModal').style.display = 'none';
  render();
  await sleep(300);
  if (currentGameId !== myGameId) return;
  await drawCard('me', 3);
  await drawCard('ai', 4, true);
  if (currentGameId !== myGameId) return;
  render();
  await sleep(300);
  if (currentGameId !== myGameId) return;
  await startTurn('me');
}

$('introBtn').onclick = () => {
  ensureAudio();
  openMatchLobby();
};

// 绑定主菜单【开启沙盒测试模式】按钮
if ($('testModeBtn')) {
  $('testModeBtn').onclick = () => {
    ensureAudio();
    $('intro').style.display = 'none';
    startGame(false, null, true); // 传入 3 个参数：启动测试模式
  };
}

$('startMatchBtn').onclick = () => {
  $('intro').style.display = 'none';
  startGame(false);
};

if ($('closeLobbyBtn')) {
  $('closeLobbyBtn').onclick = () => $('matchLobbyModal').style.display = 'none';
}

$('resumeBtn').onclick = () => {
  ensureAudio();
  $('intro').style.display = 'none';
  startGame(true);
};

$('goBtn').onclick = () => {
  $('gameOver').style.display = 'none';
  backToMenu();
};

render0();
function render0() {
  $('myDeck').querySelector('.dkN').textContent = '30';
  $('enemyDeck').querySelector('.dkN').textContent = '30';
  updateIntroStats();
}

/* ================= 局域网双人对决驱动钩子 ================= */
function startMultiplayerGame(data) {
  currentGameId++;
  const myGameId = currentGameId;

  const myDeck = getSelectedLobbyDeck();
  const enemyDeck = data.opponentDeck;

  state.me = newPlayer(myDeck);
  state.ai = newPlayer(enemyDeck); // 在双人模式下，ai 代表局域网对手

  $('enemyHero').querySelector('.hName').textContent = '局域网对手';
  $('enemyHero').querySelector('.hPortrait').textContent = Network.role === 'p1' ? '🧙‍♀️' : '🧙‍♂️';

  state.isMultiplayer = true;
  state.turn = data.role === 'p1' ? 'me' : 'ai';
  state.num = 0; state.over = false; state.busy = false; state.started = true;

  render();
  showBanner(state.turn === 'me' ? '你 的 回 合' : '对手 的 回 合');
}

// 接收对手打出的随从/法术/武器
function handleRemotePlayCard(data) {
  const c = { uid: data.uid, key: data.key };
  const t = CARDS[data.key].type;
  if (t === 'm') {
    playMinionCard('ai', c, data.insertIdx, data.target);
  } else if (t === 'w') {
    playWeaponCard('ai', c, data.target);
  } else {
    castSpellCard('ai', c, data.target);
  }
}

// 接收对手发起的攻击
function handleRemoteAttack(data) {
  const attacker = P('ai').board.find(m => m.uid === data.attackerUid);
  if (attacker) {
    doAttack('ai', { kind: 'minion', m: attacker }, data.target);
  }
}

// 接收对手使用的英雄技能
function handleRemoteHeroPower(data) {
  useHeroPower('ai', data.target);
}

// 接收对手结束回合
function handleRemoteEndTurn() {
  startTurn('me');
}

/* 局域网大厅 UI 控制 */
window.openCreateRoomUI = function() {
  const ip = prompt('请输入你的局域网 IP（默认 127.0.0.1 本机测试）：', '127.0.0.1');
  if (ip) Network.createRoom(ip);
};

window.openJoinRoomUI = function() {
  $('netJoinForm').style.display = 'block';
  $('netWaitingBox').style.display = 'none';
};

window.submitJoinRoom = function() {
  const ip = $('netHostIPInput').value.trim();
  const code = $('netRoomCodeInput').value.trim();
  if (ip && code) {
    Network.joinRoom(ip, code);
  }
};

window.addEventListener('DOMContentLoaded', () => {
  if ($('netLobbyBtn')) {
    $('netLobbyBtn').onclick = () => {
      ensureAudio();
      $('networkModal').style.display = 'flex';
    };
  }
});

