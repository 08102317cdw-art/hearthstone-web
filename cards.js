'use strict';
/* ================================================================
   炉石网页版 · 全局卡牌数据库与扩展包定义 (cards.js)
   ================================================================ */

/* 扩展包分类定义 */
const EXPANSIONS = {
  classic: { id: 'classic', name: '经典卡包', art: '📦', cost: 100, desc: '包含基础与经典攻防随从及标准法术。' },
  ancient: { id: 'ancient', name: '远古巨兽卡包', art: '🐉', cost: 120, desc: '包含庞大的远古巨龙、巨人与元素领主。' },
  shadow:  { id: 'shadow',  name: '暗影与混沌卡包', art: '🐙', cost: 150, desc: '包含扭曲虚空、尤格-萨隆与狂暴魔法。' }
};

/* 全局卡牌 JSON 数据库 */
const CARDS = {
  // ===== 经典卡包 =====
  imp:        { set: 'classic', name: '火焰小鬼', cost: 1, type: 'm', atk: 2, hp: 1, art: '👺', text: '', race: 'demon', rarity: 'common' },
  shieldman:  { set: 'classic', name: '盾卫学徒', cost: 1, type: 'm', atk: 1, hp: 2, taunt: 1, art: '🛡️', text: '嘲讽', rarity: 'common' },
  wolf:       { set: 'classic', name: '突袭狼崽', cost: 1, type: 'm', atk: 1, hp: 1, rush: 1, art: '🐺', text: '突袭', race: 'beast', rarity: 'common' },
  missiles:   { set: 'classic', name: '秘法飞弹', cost: 1, type: 's', art: '✨', text: '造成3次1点伤害，随机分配给敌方角色', missiles: 3, spellSchool: 'arcane', rarity: 'common' },
  firedart:   { set: 'classic', name: '火焰之矢', cost: 1, type: 's', art: '🔥', text: '造成2点伤害', dmg: 2, target: 'any', spellSchool: 'fire', rarity: 'common' },
  croc:               { set: 'classic', name: '河湾猎鳄', cost: 2, type: 'm', atk: 2, hp: 3, bc: { discoverType: 'minion' }, art: '🐊', text: '战吼：发现一张随从牌。', race: 'beast', rarity: 'free' },
  ironguard:  { set: 'classic', name: '铁壁卫士', cost: 2, type: 'm', atk: 2, hp: 2, taunt: 1, art: '⚔️', text: '嘲讽', rarity: 'common' },
  bugler:     { set: 'classic', name: '新兵号手', cost: 2, type: 'm', atk: 1, hp: 1, bc: { draw: 1 }, art: '🎺', text: '战吼：抽一张牌', rarity: 'common' },
  rogue:      { set: 'classic', name: '双持刺客', cost: 2, type: 'm', atk: 2, hp: 1, charge: 1, art: '🗡️', text: '冲锋', rarity: 'common' },
  pump:       { set: 'classic', name: '强身术', cost: 2, type: 's', art: '💪', text: '使一个随从获得 +2/+2', buff: [2, 2], target: 'minion', spellSchool: 'nature', rarity: 'common' },
  frostbolt:  { set: 'classic', name: '寒冰之箭', cost: 2, type: 's', art: '❄️', text: '造成3点伤害并冻结', dmg: 3, target: 'any', fxc: 'frost', freeze: 1, spellSchool: 'frost', rarity: 'common' },
  panther:            { set: 'classic', name: '丛林伏击者', cost: 3, type: 'm', atk: 4, hp: 2, stealth: 1, bc: { dmg: 2, target: 'any' }, art: '🐆', text: '潜行。战吼：造成2点伤害。', race: 'beast', rarity: 'common' },
  stonehide:  { set: 'classic', name: '石皮护卫', cost: 3, type: 'm', atk: 3, hp: 4, taunt: 1, art: '🗿', text: '嘲讽', rarity: 'common' },
  sage:       { set: 'classic', name: '智慧长者', cost: 3, type: 'm', atk: 2, hp: 3, bc: { draw: 1 }, art: '📖', text: '战吼：抽一张牌', rarity: 'common' },
  storm:      { set: 'classic', name: '雷暴术', cost: 3, type: 's', art: '⚡', text: '对所有敌方随从造成2点伤害', dmgAll: 2, spellSchool: 'nature', rarity: 'common' },
  holylight:  { set: 'classic', name: '圣光术', cost: 3, type: 's', art: '✚', text: '恢复6点生命值', heal: 6, target: 'any', fxc: 'holy', spellSchool: 'holy', rarity: 'common' },
  ogre:               { set: 'classic', name: '重装食人魔', cost: 4, type: 'm', atk: 4, hp: 5, bc: { gainArmor: 4 }, art: '👹', text: '战吼：为你的英雄获得4点护甲。', rarity: 'common' },
  knight:     { set: 'classic', name: '白银骑士', cost: 4, type: 'm', atk: 3, hp: 4, shield: 1, art: '🐴', text: '圣盾', rarity: 'common' },
  crag:       { set: 'classic', name: '峭壁石怪', cost: 4, type: 'm', atk: 2, hp: 7, taunt: 1, art: '⛰️', text: '嘲讽', rarity: 'common' },
  pyro:       { set: 'classic', name: '烈焰术士', cost: 4, type: 'm', atk: 3, hp: 3, bc: { dmg: 2, target: 'any' }, art: '🧨', text: '战吼：造成2点伤害', rarity: 'common' },
  fireball:   { set: 'classic', name: '火球术', cost: 4, type: 's', art: '☄️', text: '造成6点伤害', dmg: 6, target: 'any', spellSchool: 'fire', rarity: 'common' },
  wanderer:           { set: 'classic', name: '荒野守卫者', cost: 5, type: 'm', atk: 5, hp: 6, taunt: 1, bc: { discoverType: 'dragon' }, art: '🦬', text: '嘲讽。战吼：发现一张龙牌。', rarity: 'common' },
  gatekeeper: { set: 'classic', name: '堡垒门卫', cost: 5, type: 'm', atk: 3, hp: 8, taunt: 1, art: '🏰', text: '嘲讽', rarity: 'common' },
  medic:      { set: 'classic', name: '战地医师', cost: 5, type: 'm', atk: 4, hp: 4, bc: { healHero: 4 }, art: '⚕️', text: '战吼：为你的英雄恢复4点生命值', rarity: 'common' },
  hawk:       { set: 'classic', name: '疾风鹰身人', cost: 5, type: 'm', atk: 4, hp: 4, charge: 1, art: '🦅', text: '冲锋', rarity: 'common' },
  golem:      { set: 'classic', name: '石拳巨人', cost: 6, type: 'm', atk: 6, hp: 7, art: '🪨', text: '', rarity: 'common' },
  boomer:     { set: 'classic', name: '爆炸傀儡', cost: 6, type: 'm', atk: 5, hp: 4, dr: { dmgRandom: 3 }, art: '💣', text: '亡语：对随机敌方角色造成3点伤害', rarity: 'common' },
  flamestorm: { set: 'classic', name: '烈焰风暴', cost: 7, type: 's', art: '🌋', text: '对所有敌方随从造成4点伤害', dmgAll: 4, spellSchool: 'fire', rarity: 'common' },

  argent_squire:   { set: 'classic', name: '银色侍从', cost: 1, type: 'm', atk: 1, hp: 1, shield: 1, art: '🛡️', text: '圣盾', rarity: 'common' },
  voodoo_doctor:   { set: 'classic', name: '巫毒巫医', cost: 1, type: 'm', atk: 2, hp: 1, bc: { heal: 2, target: 'any' }, art: '🎭', text: '战吼：恢复2点生命值', rarity: 'common' },
  elven_archer:    { set: 'classic', name: '精灵射手', cost: 1, type: 'm', atk: 1, hp: 1, bc: { dmg: 1, target: 'any' }, art: '🎯', text: '战吼：造成1点伤害', rarity: 'common' },
  worgen_infiltrator: { set: 'classic', name: '狼人渗透者', cost: 1, type: 'm', atk: 2, hp: 1, stealth: 1, art: '🐺', text: '潜行', rarity: 'common' },
  young_dragonhawk: { set: 'classic', name: '幼龙鹰', cost: 1, type: 'm', atk: 1, hp: 1, windfury: 1, art: '🦅', text: '风怒', race: 'beast', rarity: 'common' },
  murloc_raider:      { set: 'classic', name: '鱼人招募官', cost: 1, type: 'm', atk: 2, hp: 1, dr: { draw: 1 }, art: '🐟', text: '亡语：抽一张牌。', race: 'murloc', rarity: 'free' },
  bloodfen_raptor:    { set: 'classic', name: '血沼猎手', cost: 2, type: 'm', atk: 3, hp: 2, rush: 1, art: '🦕', text: '突袭。', race: 'beast', rarity: 'free' },
  kobold_geomancer:{ set: 'classic', name: '狗头人地卜师', cost: 2, type: 'm', atk: 2, hp: 2, spellDamage: 1, art: '🔮', text: '法术伤害+1', rarity: 'common' },
  bluegill_warrior:{ set: 'classic', name: '蓝鳃战士', cost: 2, type: 'm', atk: 2, hp: 1, charge: 1, art: '🐠', text: '冲锋', race: 'murloc', rarity: 'common' },
  loot_hoarder:    { set: 'classic', name: '战利品贮藏者', cost: 2, type: 'm', atk: 2, hp: 1, dr: { draw: 1 }, art: '📦', text: '亡语：抽一张牌', rarity: 'common' },
  river_crocolisk:    { set: 'classic', name: '淡水巨鳄', cost: 2, type: 'm', atk: 2, hp: 3, bc: { buffSelf: [1, 1] }, art: '🐊', text: '战吼：获得 +1/+1。', race: 'beast', rarity: 'free' },
  stubborn_snail:  { set: 'classic', name: '倔强的蜗牛', cost: 2, type: 'm', atk: 1, hp: 2, poisonous: 1, taunt: 1, art: '🐌', text: '嘲讽，剧毒', race: 'beast', rarity: 'common' },
  ironfur_grizzly: { set: 'classic', name: '铁鬃灰熊', cost: 3, type: 'm', atk: 3, hp: 3, taunt: 1, art: '🐻', text: '嘲讽', race: 'beast', rarity: 'common' },
  scarlet_crusader:{ set: 'classic', name: '血色十字军', cost: 3, type: 'm', atk: 3, hp: 1, shield: 1, art: '⚔️', text: '圣盾', rarity: 'common' },
  razorfen_hunter: { set: 'classic', name: '剃刀猎手', cost: 3, type: 'm', atk: 2, hp: 3, bc: { summon: 'boar' }, art: '🐗', text: '战吼：召唤一个1/1的野猪', rarity: 'common' },
  shattered_sun:   { set: 'classic', name: '破碎残阳祭司', cost: 3, type: 'm', atk: 3, hp: 2, bc: { buffFriendly: [1,1], target: 'minion' }, art: '☀️', text: '战吼：使一个友方随从获得+1/+1', rarity: 'common' },
  harvest_golem:   { set: 'classic', name: '麦田傀儡', cost: 3, type: 'm', atk: 2, hp: 3, dr: { summon: 'damaged_golem' }, art: '🤖', text: '亡语：召唤一个2/1的损坏的傀儡', race: 'mech', rarity: 'common' },
  dalaran_mage:    { set: 'classic', name: '达拉然法师', cost: 3, type: 'm', atk: 1, hp: 4, spellDamage: 1, art: '🧙', text: '法术伤害+1', rarity: 'common' },
  emperor_cobra:   { set: 'classic', name: '帝王眼镜蛇', cost: 3, type: 'm', atk: 2, hp: 3, poisonous: 1, art: '🐍', text: '剧毒', race: 'beast', rarity: 'common' },
  dalaran_crusader:{ set: 'classic', name: '翡翠风鹰', cost: 4, type: 'm', atk: 3, hp: 5, windfury: 1, art: '🦅', text: '风怒', rarity: 'common' },
  chillwind_yeti:     { set: 'classic', name: '冰风巨魔', cost: 4, type: 'm', atk: 4, hp: 5, bc: { freezeTarget: 1, target: 'minion' }, art: '❄️', text: '战吼：冻结一个敌方随从。', rarity: 'common' },
  senjin_shieldmasta: { set: 'classic', name: '森金持盾卫士', cost: 4, type: 'm', atk: 3, hp: 5, taunt: 1, art: '🛡️', text: '嘲讽', rarity: 'common' },
  spellbreaker:    { set: 'classic', name: '破法者', cost: 4, type: 'm', atk: 4, hp: 3, bc: { silence: 1, target: 'minion' }, art: '🔯', text: '战吼：沉默一个随从', rarity: 'common' },
  stormwind_knight:{ set: 'classic', name: '暴风城骑士', cost: 4, type: 'm', atk: 2, hp: 5, charge: 1, art: '🐎', text: '冲锋', rarity: 'common' },
  ogre_magi:       { set: 'classic', name: '食人魔法师', cost: 4, type: 'm', atk: 4, hp: 4, spellDamage: 1, art: '👹', text: '法术伤害+1', rarity: 'common' },
  vampiric_seductress:{ set: 'classic', name: '吸血魅魔', cost: 4, type: 'm', atk: 3, hp: 4, lifesteal: 1, art: '💘', text: '吸血', race: 'demon', rarity: 'common' },
  azure_drake:     { set: 'classic', name: '碧蓝幼龙', cost: 5, type: 'm', atk: 4, hp: 4, spellDamage: 1, bc: { draw: 1 }, art: '🐉', text: '法术伤害+1，战吼：抽一张牌', race: 'dragon', rarity: 'rare' },
  stranglethorn_tiger: { set: 'classic', name: '荆棘谷猛虎', cost: 5, type: 'm', atk: 5, hp: 5, stealth: 1, art: '🐅', text: '潜行', race: 'beast', rarity: 'common' },
  darkscale_healer:{ set: 'classic', name: '暗鳞治愈者', cost: 5, type: 'm', atk: 4, hp: 5, bc: { healAll: 2 }, art: '🐉', text: '战吼：为所有友方角色恢复2点生命值', race: 'dragon', rarity: 'common' },
  reckless_rocketeer: { set: 'classic', name: '鲁莽火箭兵', cost: 6, type: 'm', atk: 5, hp: 2, charge: 1, art: '🚀', text: '冲锋', rarity: 'common' },
  argent_commander:{ set: 'classic', name: '银色指挥官', cost: 6, type: 'm', atk: 4, hp: 2, charge: 1, shield: 1, art: '🏰', text: '冲锋，圣盾', rarity: 'rare' },
  sunwalker:       { set: 'classic', name: '烈日行者', cost: 6, type: 'm', atk: 4, hp: 5, taunt: 1, shield: 1, art: '☀️', text: '嘲讽，圣盾', rarity: 'rare' },
  cairne_bloodhoof:{ set: 'classic', name: '凯恩·血蹄', cost: 6, type: 'm', atk: 4, hp: 5, dr: { summon: 'baine_bloodhoof' }, art: '🐄', text: '亡语：召唤一个4/5的贝恩·血蹄', rarity: 'legendary' },
  war_golem:          { set: 'classic', name: '精金巨人', cost: 7, type: 'm', atk: 7, hp: 7, shield: 1, bc: { discoverType: 'spell' }, art: '🤖', text: '圣盾。战吼：发现一张法术牌。', race: 'mech', rarity: 'common' },
  stormwind_champion: { set: 'classic', name: '暴风城勇士', cost: 7, type: 'm', atk: 6, hp: 6, bc: { buffBoard: [1,1] }, art: '🏰', text: '战吼：使你的所有随从获得+1/+1', rarity: 'common' },
  windfury_harpy:  { set: 'classic', name: '风怒鹰身人', cost: 6, type: 'm', atk: 4, hp: 5, windfury: 1, art: '🦅', text: '风怒', rarity: 'common' },

  frost_shock:     { set: 'classic', name: '冰霜震击', cost: 1, type: 's', art: '❄️', text: '造成1点伤害并冻结', dmg: 1, target: 'any', freeze: 1, spellSchool: 'frost', rarity: 'common' },
  arcane_intellect:{ set: 'classic', name: '奥术智慧', cost: 3, type: 's', art: '📜', text: '抽2张牌', draw: 2, spellSchool: 'arcane', rarity: 'common' },
  frost_nova:      { set: 'classic', name: '冰霜新星', cost: 3, type: 's', art: '❄️', text: '冻结所有敌方随从', freezeAll: 1, spellSchool: 'frost', rarity: 'common' },
  blizzard:        { set: 'classic', name: '暴风雪', cost: 6, type: 's', art: '🌨️', text: '对所有敌方随从造成2点伤害并冻结', dmgAll: 2, freezeAll: 1, spellSchool: 'frost', rarity: 'rare' },

  faceless_manipulator:{ set: 'classic', name: '无面操纵者', cost: 5, type: 'm', atk: 5, hp: 5, art: '👤', text: '战吼：获得+1/+1', bc: { buffFriendly: [1, 1] }, rarity: 'epic' },
  polymorhp:       { set: 'classic', name: '变形术', cost: 4, type: 's', art: '🐑', text: '将一个随从变形为1/1的绵羊', transform: 'sheep', target: 'minion', spellSchool: 'arcane', rarity: 'common' },
  wild_growth:     { set: 'classic', name: '野性成长', cost: 2, type: 's', art: '🌱', text: '获得一个额外的法力水晶', gainMana: 1, spellSchool: 'nature', rarity: 'common' },
  babbling_book:   { set: 'classic', name: '唠叨的魔典', cost: 1, type: 'm', atk: 1, hp: 1, bc: { addRandomSpell: 1 }, art: '📖', text: '战吼：随机将一张法术牌加入你的手牌', rarity: 'common' },
  thaurissan:      { set: 'classic', name: '索瑞森大帝', cost: 6, type: 'm', atk: 5, hp: 5, endTurnEffect: { reduceHandCost: 1 }, art: '👑', text: '在你的回合结束时，使你的所有手牌法力值消耗减少(1)点。', rarity: 'legendary' },
  doomsayer:       { set: 'classic', name: '末日预言者', cost: 2, type: 'm', atk: 0, hp: 7, startTurnEffect: { destroyAllMinions: 1 }, art: '⏳', text: '在你的回合开始时，消灭所有随从。', rarity: 'epic' },
  brann_rivendare: { set: 'classic', name: '探险领主 · 铜须瑞文', cost: 7, type: 'm', atk: 5, hp: 7, doubleBoth: 1, art: '🧔‍💀', text: '你的战吼和亡语都会触发两次。', rarity: 'legendary' },

  // ===== 远古巨兽卡包 =====
  ragnaros:        { set: 'ancient', name: '炎魔之王拉格纳罗斯', cost: 8, type: 'm', atk: 8, hp: 8, cantAttack: 1, endTurnEffect: { dmgRandom: 8 }, art: '🔥', text: '无法攻击。在你的回合结束时，对随机敌方角色造成8点伤害。', rarity: 'legendary' },
  alexstrasza:     { set: 'ancient', name: '阿莱克丝塔萨', cost: 9, type: 'm', atk: 8, hp: 8, bc: { setHeroHp: 15, target: 'hero' }, art: '🐉', text: '战吼：将一个英雄的剩余生命值变为15点。', rarity: 'legendary' },
  sea_giant:       { set: 'ancient', name: '海巨人', cost: 10, type: 'm', atk: 8, hp: 8, art: '🌊', text: '强大的海巨人', race: 'elemental', rarity: 'epic' },
  magma:              { set: 'ancient', name: '熔岩愤怒者', cost: 7, type: 'm', atk: 8, hp: 8, bc: { dmgAll: 1 }, art: '🐉', text: '战吼：对所有敌方随从造成1点伤害。', race: 'elemental', rarity: 'common' },
  ancient:         { set: 'ancient', name: '远古战树', cost: 8, type: 'm', atk: 8, hp: 8, taunt: 1, art: '🌳', text: '嘲讽', rarity: 'common' },

  // ===== 暗影与混沌卡包 =====
  yogg:            { set: 'shadow', name: '导演 · 尤格-萨隆', cost: 10, type: 'm', atk: 7, hp: 5, bc: { yoggSpells: 5 }, art: '🐙', text: '战吼：随机施放5个法术（目标随机）。', rarity: 'legendary' },
  sylvanas:        { set: 'shadow', name: '希尔瓦娜斯·风行者', cost: 6, type: 'm', atk: 5, hp: 5, dr: { mindControl: 1 }, art: '🏹', text: '亡语：随机获得一个敌方随从的控制权。', rarity: 'legendary' },
  brawl:           { set: 'shadow', name: '绝命乱斗', cost: 5, type: 's', art: '⚔️', text: '随机选择一个随从存活，消灭其他所有随从', brawl: 1, spellSchool: 'shadow', rarity: 'epic' },
  twisting_nether: { set: 'shadow', name: '扭曲虚空', cost: 8, type: 's', art: '🌌', text: '消灭所有随从', dmgAll: 99, spellSchool: 'shadow', rarity: 'epic' },
  pyroblast:       { set: 'shadow', name: '炎爆术', cost: 10, type: 's', art: '☄️', text: '造成10点伤害', dmg: 10, target: 'any', spellSchool: 'fire', rarity: 'epic' },
  mind_control:    { set: 'shadow', name: '精神控制', cost: 10, type: 's', art: '🧠', text: '获得一个敌方随从的控制权', mindControl: 1, target: 'minion', spellSchool: 'shadow', rarity: 'epic' },

  // ===== 衍生卡 (不可收藏) =====
  boar:            { name: '野猪', cost: 1, type: 'm', atk: 1, hp: 1, art: '🐗', text: '', race: 'beast', rarity: 'free', _helper: true },
  damaged_golem:   { name: '损坏的傀儡', cost: 2, type: 'm', atk: 2, hp: 1, art: '🤖', text: '', race: 'mech', rarity: 'free', _helper: true },
  baine_bloodhoof: { name: '贝恩·血蹄', cost: 6, type: 'm', atk: 4, hp: 5, art: '🐄', text: '', rarity: 'legendary', _helper: true },
  sheep:           { name: '绵羊', cost: 1, type: 'm', atk: 1, hp: 1, art: '🐑', text: '咩~', _helper: true },

  // ===== 天马年 · 元素多系斩杀法 =====
  sif:                  { set: 'pegasus', name: '西芙', cost: 6, type: 'm', atk: 4, hp: 6, spellDamage: 1, spellSchoolSynergy: 1, art: '🔮', text: '法术伤害+1。本局中你每施放过一个不同派系的法术，此效果+1。', rarity: 'legendary' },
  mesadune:             { set: 'pegasus', name: '梅尔萨杜恩', cost: 6, type: 'm', atk: 5, hp: 5, bc: { splitElemental: 1 }, art: '🌋', text: '战吼：抽一张元素牌，并将其切分为两张消耗为(1)的卡牌。', race: 'elemental', rarity: 'legendary' },
  sleet_skater:         { set: 'pegasus', name: '滑冰元素', cost: 5, type: 'm', atk: 3, hp: 4, rush: 1, freeze: 1, bc: { gainArmorFromTargetAtk: 1, target: 'minion' }, art: '⛸️', text: '突袭，冻结。战吼：获得等同于目标随从攻击力的护甲值。', race: 'elemental', rarity: 'rare' },
  overflowing_lava:     { set: 'pegasus', name: '涌动熔岩', cost: 3, type: 'm', atk: 3, hp: 4, bc: { elementChainDmg: 4, target: 'any' }, art: '🔥', text: '战吼：如果你在上个回合打出过元素牌，造成4点伤害。', race: 'elemental', rarity: 'epic' },
  synthesize:           { set: 'pegasus', name: '元素凝聚', cost: 2, type: 's', art: '✨', text: '随机将3张元素牌加入你的手牌', addElementals: 3, spellSchool: 'arcane', rarity: 'common' },
  reverberance:         { set: 'pegasus', name: '回响回音', cost: 3, type: 's', art: '🪞', text: '选择一个随从，召唤一个生命值为1的复制', copyMinion1Hp: 1, target: 'minion', spellSchool: 'arcane', rarity: 'epic' },
  /* ===== 2024/2025 最新天马年跨职业主流新卡 ===== */
  kiljaeden:        { set: 'pegasus', name: '基尔加丹', cost: 7, type: 'm', atk: 7, hp: 7, bc: { addRandomSpell: 2 }, art: '🔥', text: '战吼：将两张随机法术牌加入你的手牌。', rarity: 'legendary' },
  zilliax:          { set: 'pegasus', name: '奇利亚斯', cost: 5, type: 'm', atk: 3, hp: 2, shield: 1, rush: 1, lifesteal: 1, taunt: 1, art: '🤖', text: '圣盾，突袭，吸血，嘲讽。', race: 'mech', rarity: 'legendary' },
  astalor:          { set: 'pegasus', name: '阿斯塔洛·血誓', cost: 2, type: 'm', atk: 2, hp: 2, spellDamage: 1, bc: { addRandomSpell: 1 }, art: '🗡️', text: '法术伤害+1。战吼：随机将一张法术加入手牌。', rarity: 'legendary' },
  primordial_drake: { set: 'pegasus', name: '始祖幼龙', cost: 8, type: 'm', atk: 4, hp: 8, taunt: 1, bc: { dmgAll: 2 }, art: '🐉', text: '嘲讽。战吼：对所有敌方随从造成2点伤害。', race: 'dragon', rarity: 'epic' },
  blizzard_orb:     { set: 'pegasus', name: '暴风雪宝珠', cost: 4, type: 's', art: '🔮', text: '冻结所有敌方随从，并造成2点伤害', freezeAll: 1, dmgAll: 2, spellSchool: 'frost', rarity: 'epic' },

  /* ===== 经典包追加 ===== */
  deathwing:        { set: 'classic', name: '灭世者死亡之翼', cost: 10, type: 'm', atk: 12, hp: 12, bc: { destroyAllOtherMinions: 1, discardHand: 1 }, art: '🐲', text: '战吼：消灭所有其他随从，并丢弃你的所有手牌。', race: 'dragon', rarity: 'legendary' },
  tirion:           { set: 'classic', name: '提里奥·弗丁', cost: 8, type: 'm', atk: 6, hp: 6, shield: 1, taunt: 1, dr: { healHero: 8, gainArmor: 5 }, art: '🛡️', text: '圣盾，嘲讽。亡语：恢复8点生命值并获得5点护甲。', rarity: 'legendary' },
  leeroy:           { set: 'classic', name: '火车王里诺艾', cost: 5, type: 'm', atk: 6, hp: 2, charge: 1, bc: { summonEnemyBoars: 2 }, art: '🍗', text: '冲锋。战吼：为你的对手召唤两个1/1的野猪。', rarity: 'legendary' },

  /* ===== 经典古神克苏恩 (C'Thun) 体系卡牌 ===== */
  cthun:                  { set: 'ancient', name: '克苏恩', cost: 10, type: 'm', atk: 6, hp: 6, bc: { cthunDynamicMissiles: 1 }, art: '👁️', text: '战吼：造成等同于本随从攻击力的伤害，随机分配给所有敌方角色。', rarity: 'legendary' },
  beckoner_of_evil:       { set: 'ancient', name: '克苏恩的招募官', cost: 2, type: 'm', atk: 2, hp: 3, bc: { buffCthun: [2, 2] }, art: '🧙‍♂️', text: '战吼：使你的克苏恩获得+2/+2（不论它在何处）。', rarity: 'common' },
  twilight_elder:         { set: 'ancient', name: '暮光尊者', cost: 3, type: 'm', atk: 3, hp: 4, endTurnEffect: { buffCthun: [1, 1] }, art: '📜', text: '在你的回合结束时，使你的克苏恩获得+1/+1（不论它在何处）。', rarity: 'rare' },
  crazed_worshipper:      { set: 'ancient', name: '狂热的狂信徒', cost: 5, type: 'm', atk: 3, hp: 6, taunt: 1, onDamageCthunBuff: [1, 1], art: '🛐', text: '嘲讽。每当此随从受到伤害，使你的克苏恩获得+1/+1（不论它在何处）。', rarity: 'epic' },
  twin_emperor_veklor:    { set: 'ancient', name: '双子皇帝 · 维克洛尔', cost: 7, type: 'm', atk: 4, hp: 6, taunt: 1, bc: { cthunCheckReq: 10, summonTwin: 1 }, art: '👑', text: '嘲讽。战吼：如果你的克苏恩攻击力至少有10点，召唤另一个双子皇帝。', rarity: 'legendary' },
  klaxxi_amber_weaver:    { set: 'ancient', name: '克拉克西琥珀织者', cost: 4, type: 'm', atk: 4, hp: 5, bc: { cthunCheckReq: 10, selfBuffHpTaunt: 5 }, art: '🪲', text: '战吼：如果你的克苏恩攻击力至少有10点，获得+5生命值和嘲讽。', rarity: 'rare' },
  blade_of_cthun:         { set: 'ancient', name: '克苏恩之刃', cost: 6, type: 'm', atk: 4, hp: 4, bc: { destroyAndAbsorbToCthun: 1, target: 'minion' }, art: '🗡️', text: '战吼：消灭一个敌方随从，并将其攻击力和生命值加给你的克苏恩。', rarity: 'epic' },
  doom_caller:            { set: 'ancient', name: '厄运召唤者', cost: 8, type: 'm', atk: 6, hp: 6, bc: { resurrectCthun: 1 }, art: '💀', text: '战吼：如果你的克苏恩已经死亡，将其复活洗入你的牌库，且使其获得+3/+3。', rarity: 'epic' },
  eyestalk_watcher:       { set: 'ancient', name: '古神眼魔', cost: 4, type: 'm', atk: 3, hp: 3, bc: { discoverCthunCultist: 1, buffCthun: [2, 2] }, art: '👁️', text: '战吼：发现一张克苏恩组件牌，并使你的克苏恩获得+2/+2。', rarity: 'epic' },

  /* 衍生卡：双子皇帝兄弟 */
  twin_emperor_veklor_sub:{ name: '双子皇帝 · 维克尼拉斯', cost: 7, type: 'm', atk: 4, hp: 6, taunt: 1, art: '👑', text: '嘲讽', rarity: 'legendary', _helper: true },
  yshaarj:          { set: 'ancient', name: '亚煞极', cost: 10, type: 'm', atk: 10, hp: 10, endTurnEffect: { pullMinionFromDeck: 1 }, art: '🐙', text: '在你的回合结束时，将你牌库中的一个随从招募到战场上。', rarity: 'legendary' },
  nefarian:         { set: 'ancient', name: '奈法利安', cost: 9, type: 'm', atk: 8, hp: 8, bc: { addRandomSpell: 2 }, art: '🐉', text: '战吼：随机将两张法术牌加入你的手牌。', race: 'dragon', rarity: 'legendary' },

  /* ===== 暗影与混沌包追加 ===== */
  kazakus:          { set: 'shadow', name: '卡扎库斯', cost: 4, type: 'm', atk: 3, hp: 3, bc: { kazakusPotion: 1 }, art: '🧪', text: '战吼：施放暴风雪，并为你恢复8点生命值。', rarity: 'legendary' },
  shadow_reaper:    { set: 'shadow', name: '暗影收割者', cost: 7, type: 'm', atk: 5, hp: 5, bc: { destroyBigMinions: 6 }, art: '☠️', text: '战吼：消灭生命值大于等于6的所有随从。', rarity: 'epic' },
  curse_of_agony:   { set: 'shadow', name: '痛苦诅咒', cost: 2, type: 's', art: '🔮', text: '对敌方英雄造成4点伤害，并抽一张牌', dmg: 4, target: 'hero', draw: 1, spellSchool: 'shadow', rarity: 'common' },

  /* ===== 天马年最新包追加 ===== */
  marutra:          { set: 'pegasus', name: '马鲁特拉', cost: 8, type: 'm', atk: 7, hp: 7, bc: { freezeAllDmg: 4 }, art: '❄️', text: '战吼：冻结所有敌方随从，并对其造成4点伤害。', rarity: 'legendary' },
  astral_communion: { set: 'pegasus', name: '星界沟通', cost: 4, type: 's', art: '🌟', text: '获得10个法力水晶，丢弃你的所有手牌', gainMaxMana: 10, discardHand: 1, spellSchool: 'arcane', rarity: 'epic' },

  /* ===== 专属【发现 (Discover)】机制新卡 ===== */
  primordial_glyph:   { set: 'pegasus', name: '太古符文', cost: 2, type: 's', art: '📜', text: '发现一张法术牌', discoverType: 'spell', spellSchool: 'arcane', rarity: 'rare' },
  stonehill_defender: { set: 'pegasus', name: '石丘防御者', cost: 3, type: 'm', atk: 1, hp: 4, taunt: 1, bc: { discoverType: 'taunt' }, art: '🛡️', text: '嘲讽。战吼：发现一张具有嘲讽的随从牌。', rarity: 'rare' },
  jeweled_scarab:     { set: 'pegasus', name: '宝石甲虫', cost: 2, type: 'm', atk: 1, hp: 1, bc: { discoverType: 'cost3' }, art: '🪲', text: '战吼：发现一张消耗为(3)的卡牌。', race: 'beast', rarity: 'common' },
  drarian_discoverer: { set: 'pegasus', name: '探险家 · 探秘者', cost: 4, type: 'm', atk: 3, hp: 5, bc: { discoverType: 'legendary' }, art: '🔍', text: '战吼：发现一张传说卡牌。', rarity: 'legendary' },

  /* ===== 武器牌 (type: 'w') ===== */
  /* 武器机制：打出后装备给英雄，英雄获得攻击力；每次攻击消耗1点耐久，耐久归零武器损坏(触发亡语) */
  /* ===== 经典卡包武器 ===== */
  light_justice:    { set: 'classic', name: '圣光的正义', cost: 1, type: 'w', atk: 1, durability: 4, art: '🕯️', text: '', rarity: 'common' },
  fiery_war_axe:    { set: 'classic', name: '炽炎战斧', cost: 2, type: 'w', atk: 3, durability: 2, art: '🪓', text: '', rarity: 'common' },
  eaglehorn_bow:    { set: 'classic', name: '鹰角弓', cost: 3, type: 'w', atk: 3, durability: 2, art: '🏹', text: '', rarity: 'rare' },
  truesilver:       { set: 'classic', name: '真银圣剑', cost: 4, type: 'w', atk: 4, durability: 2, art: '⚔️', text: '每次攻击时，为你的英雄恢复2点生命值。', onHeroAttack: { heal: 2 }, rarity: 'rare' },
  arcanite_reaper:  { set: 'classic', name: '奥金斧', cost: 5, type: 'w', atk: 5, durability: 2, art: '🗡️', text: '', rarity: 'common' },
  doomhammer:       { set: 'classic', name: '毁灭之锤', cost: 5, type: 'w', atk: 5, durability: 4, windfury: 1, art: '🔨', text: '风怒', rarity: 'epic' },

  /* ===== 远古巨兽卡包武器 ===== */
  gorehowl:         { set: 'ancient', name: '血吼', cost: 7, type: 'w', atk: 7, durability: 3, art: '🪓', text: '', rarity: 'epic' },
  sulfuras:         { set: 'ancient', name: '萨弗拉斯·炎魔之手', cost: 8, type: 'w', atk: 8, durability: 8, bc: { dmg: 8, target: 'any' }, art: '🔨', text: '战吼：造成8点伤害。', rarity: 'legendary' },

  /* ===== 暗影与混沌卡包武器 ===== */
  death_bite:       { set: 'shadow', name: '死亡之咬', cost: 4, type: 'w', atk: 4, durability: 2, dr: { dmgAll: 1 }, art: '💀', text: '亡语：对所有随从造成1点伤害。', rarity: 'epic' },
  assassin_blade:   { set: 'shadow', name: '刺客之刃', cost: 5, type: 'w', atk: 3, durability: 4, art: '🗡️', text: '', rarity: 'common' },
  gladiator_bow:    { set: 'shadow', name: '角斗士长弓', cost: 7, type: 'w', atk: 5, durability: 2, onHeroAttack: { immune: 1 }, art: '🏹', text: '你的英雄在攻击时获得免疫。', rarity: 'epic' },

  /* ===== 天马年卡包武器 ===== */
  runesword:        { set: 'pegasus', name: '雷铸之刃', cost: 3, type: 'w', atk: 3, durability: 2, art: '🔮', text: '', rarity: 'rare' },
  soulbound_hammer: { set: 'pegasus', name: '缚灵之锤', cost: 3, type: 'w', atk: 3, durability: 2, dr: { summon: 'damaged_golem' }, art: '💎', text: '亡语：召唤一个2/1的损坏的傀儡。', rarity: 'rare' },

  /* ===== 奥秘卡 (type: 's' + secret: true) ===== */
  /* 奥秘机制：打出后以"?"形态挂载在英雄旁，满足触发条件时自动揭示并结算，通常不占战场格 */
  counterspell:     { set: 'pegasus', name: '法术反制', cost: 3, type: 's', art: '🌀', secret: true, secretKind: 'counterspell', text: '奥秘：当你的对手施放一个法术时，反制它。', spellSchool: 'arcane', rarity: 'rare' },
  netherwind_portal:{ set: 'pegasus', name: '虚灵传送门', cost: 3, type: 's', art: '🕳️', secret: true, secretKind: 'netherwind_portal', text: '奥秘：当你的对手施放一个法术时，召唤一个与该法术消耗相同的随机随从。', spellSchool: 'arcane', rarity: 'rare' },
  spellbender:      { set: 'pegasus', name: '咒术师', cost: 3, type: 's', art: '🎭', secret: true, secretKind: 'spellbender', text: '奥秘：当你的对手对随从施放法术时，召唤一个1/3的咒术师并使其成为该法术的新目标。', spellSchool: 'arcane', rarity: 'epic' },
  duplicate:        { set: 'pegasus', name: '镜像复制', cost: 3, type: 's', art: '🪞', secret: true, secretKind: 'duplicate', text: '奥秘：当你的一个随从死亡时，将它的两张复制加入你的手牌。', spellSchool: 'arcane', rarity: 'common' },
  splitting_image:  { set: 'pegasus', name: '分裂映像', cost: 3, type: 's', art: '👥', secret: true, secretKind: 'splitting_image', text: '奥秘：当你的一个随从受到攻击时，召唤一个它的复制。', spellSchool: 'arcane', rarity: 'epic' },
  ice_barrier:      { set: 'pegasus', name: '冰霜护盾', cost: 3, type: 's', art: '🧊', secret: true, secretKind: 'ice_barrier', text: '奥秘：当你的英雄受到攻击时，获得8点护甲。', spellSchool: 'frost', rarity: 'common' },
  snipe:            { set: 'pegasus', name: '狙击', cost: 2, type: 's', art: '🎯', secret: true, secretKind: 'snipe', text: '奥秘：当你的对手打出一个随从时，对该随从造成4点伤害。', spellSchool: 'fire', rarity: 'common' },
  rat_trap:         { set: 'pegasus', name: '巨鼠陷阱', cost: 2, type: 's', art: '🐀', secret: true, secretKind: 'rat_trap', text: '奥秘：当你的对手在一回合内打出3张牌时，召唤一只6/6的巨鼠。', spellSchool: 'nature', rarity: 'rare' },
  pressure_plate:   { set: 'pegasus', name: '压板陷阱', cost: 2, type: 's', art: '🪤', secret: true, secretKind: 'pressure_plate', text: '奥秘：当你的对手打出一个随从时，随机消灭一个攻击力小于等于3的随从。', spellSchool: 'fire', rarity: 'rare' },
  sudden_betrayal:  { set: 'pegasus', name: '背叛突袭', cost: 2, type: 's', art: '🕷️', secret: true, secretKind: 'sudden_betrayal', text: '奥秘：当一个敌方随从攻击时，召唤一个2/1的蛛魔，使其攻击该随从。', spellSchool: 'shadow', rarity: 'epic' },
  plagiarize:       { set: 'pegasus', name: '洗劫', cost: 3, type: 's', art: '🪪', secret: true, secretKind: 'plagiarize', text: '奥秘：在你的回合开始时，若你的对手在上回合抽了2张或更多牌，将你的牌库顶牌的两张复制加入你的手牌。', spellSchool: 'shadow', rarity: 'epic' },

  /* ===== 奥秘衍生随从 ===== */
  spellbender_minion: { name: '咒术师', cost: 3, type: 'm', atk: 1, hp: 3, art: '🎭', text: '咒术师奥秘的召唤物', rarity: 'free', _helper: true },
  rat_6_6:            { name: '巨型老鼠', cost: 4, type: 'm', atk: 6, hp: 6, art: '🐀', text: '巨鼠陷阱的奖励！', race: 'beast', rarity: 'free', _helper: true },
  nerubian_2_1:       { name: '蛛魔伏兵', cost: 3, type: 'm', atk: 2, hp: 1, art: '🕷️', text: '背叛突袭的召唤物', rarity: 'free', _helper: true },

};

const DECK_LIST = Object.keys(CARDS).filter(k => !CARDS[k]._helper);
