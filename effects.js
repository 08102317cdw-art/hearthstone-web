'use strict';
/* ================================================================
   炉石网页版 · 独立效果与事件系统 (effects.js)
   ================================================================ */

// 1. 游戏生命周期事件枚举
const GameEvents = {
  ON_PLAY: 'ON_PLAY',               // 打出/战吼/施法
  ON_DEATH: 'ON_DEATH',             // 亡语/死亡
  ON_TURN_START: 'ON_TURN_START',   // 回合开始时
  ON_TURN_END: 'ON_TURN_END',       // 回合结束时
  ON_ATTACK: 'ON_ATTACK',           // 发起攻击时
  ON_DAMAGE: 'ON_DAMAGE'            // 受到伤害时
};

const EffectSystem = {
  // 效果行动注册表
  actions: {},

  // 注册一个新的效果行动
  register(actionName, handler) {
    this.actions[actionName] = handler;
  },

  // 执行具体的单项效果
  async execute(actionName, context, config = {}) {
    const handler = this.actions[actionName];
    if (handler) {
      await handler(context, config);
    } else {
      console.warn(`[EffectSystem] 未知的 Action 效果处理器: ${actionName}`);
    }
  },

  // 广播触发特定生命周期事件 (如：回合结束时轮询全场随从)
  async dispatchEvent(event, context) {
    const { side } = context;
    if (!state.started || state.over) return;

    const board = P(side).board.slice();
    for (const m of board) {
      if (m.silenced) continue;
      const d = CARDS[m.key];
      if (!d) continue;

      // 1. 处理新的声明式 effects 数组配置
      if (d.effects && Array.isArray(d.effects)) {
        for (const eff of d.effects) {
          if (eff.trigger === event) {
            await this.execute(eff.action, { ...context, minion: m, card: d }, eff);
          }
        }
      }

      // 2. 兼容历史既有配置 (endTurnEffect / startTurnEffect)
      if (event === GameEvents.ON_TURN_END && d.endTurnEffect) {
        if (d.endTurnEffect.dmgRandom) {
          await this.execute('deal_damage_random', { side, minion: m }, { amount: d.endTurnEffect.dmgRandom });
        }
        if (d.endTurnEffect.reduceHandCost) {
          await this.execute('reduce_hand_cost', { side, minion: m }, { amount: d.endTurnEffect.reduceHandCost });
        }
      }

      if (event === GameEvents.ON_TURN_START && d.startTurnEffect) {
        if (d.startTurnEffect.destroyAllMinions) {
          await this.execute('destroy_all_minions', { side, minion: m }, {});
        }
      }
    }
  }
};

/* ================= 注册通用可复用效果 Action ================= */

// 1. 造成伤害 (指定/随机)
EffectSystem.register('deal_damage', async (ctx, cfg) => {
  if (ctx.target) {
    dealDamage(ctx.target, cfg.amount || 1);
  }
});

EffectSystem.register('deal_damage_random', async (ctx, cfg) => {
  const foe = other(ctx.side);
  const pool = P(foe).board.filter(x => x.hp > 0).map(x => ({ kind: 'minion', side: foe, m: x }));
  pool.push({ kind: 'hero', side: foe });

  if (pool.length) {
    const t = pool[randi(0, pool.length - 1)];
    const tel = t.kind === 'minion' ? minionEl(t.side, t.m.uid) : heroEl(t.side);
    if (tel) {
      // 实体火球弹道：从效果随从（如大螺丝）位置飞向随机目标，再爆炸
      const srcEl = minionEl(ctx.side, ctx.minion.uid);
      if (srcEl) {
        const src = elCenter(srcEl);
        const dst = elCenter(tel);
        await projectile({ x: src.x, y: src.y - 18 }, { x: dst.x, y: dst.y }, '', 360);
        await sleep(380);
      }
      boomAt(elCenter(tel).x, elCenter(tel).y);
    }
    sfx.boom();
    dealDamage(t, cfg.amount || 1);
    render();
  }
});

// 2. 恢复生命值
EffectSystem.register('heal', async (ctx, cfg) => {
  if (ctx.target) {
    healTarget(ctx.target, cfg.amount || 1);
  }
});

// 3. 抽牌
EffectSystem.register('draw_cards', async (ctx, cfg) => {
  await drawCard(ctx.side, cfg.count || 1);
});

// 4. 动态属性 Buff
EffectSystem.register('buff_stats', async (ctx, cfg) => {
  if (ctx.target && ctx.target.kind === 'minion') {
    ctx.target.m.atk += cfg.atk || 0;
    ctx.target.m.hp += cfg.hp || 0;
    ctx.target.m.maxHp += cfg.hp || 0;
    sfx.buff();
    const tEl = minionEl(ctx.target.side, ctx.target.m.uid);
    if (tEl) sparks(elCenter(tEl).x, elCenter(tEl).y, '#8aff8a', 14);
  }
});

// 5. 沉默随从
EffectSystem.register('silence', async (ctx, cfg) => {
  if (ctx.target && ctx.target.kind === 'minion') {
    silenceMinion(ctx.target.m);
    sfx.shieldPop();
    // 视觉：沉默灰光爆发（配合 .silenced 去色滤镜）
    const tEl = minionEl(ctx.target.side, ctx.target.m.uid);
    if (tEl) {
      const c = elCenter(tEl);
      sparks(c.x, c.y, '#888888', 12);
      sparks(c.x, c.y - 12, '#aaaaaa', 8);
    }
  }
});

// 6. 变形 (变羊术)
EffectSystem.register('transform', async (ctx, cfg) => {
  if (ctx.target && ctx.target.kind === 'minion') {
    const tm = ctx.target.m;
    tm.key = cfg.targetKey || 'sheep';
    const base = CARDS[tm.key];
    if (base) {
      tm.name = base.name; tm.art = base.art;
      tm.atk = base.atk; tm.hp = base.hp; tm.maxHp = base.hp;
      silenceMinion(tm);
      sfx.shieldPop();
    }
  }
});

// 7. 精神控制 (偷随从)
EffectSystem.register('mind_control', async (ctx, cfg) => {
  if (ctx.target && ctx.target.kind === 'minion') {
    const srcSide = ctx.target.side;
    const dstSide = other(srcSide);
    if (P(dstSide).board.length < 7) {
      const idx = P(srcSide).board.indexOf(ctx.target.m);
      if (idx >= 0) {
        const [stolen] = P(srcSide).board.splice(idx, 1);
        stolen.sleep = true;
        P(dstSide).board.push(stolen);
        sfx.power();
      }
    }
  }
});

// 8. 手牌减费 (索瑞森大帝)
EffectSystem.register('reduce_hand_cost', async (ctx, cfg) => {
  P(ctx.side).hand.forEach(c => {
    c.costMod = (c.costMod || 0) + (cfg.amount || 1);
  });
  sfx.buff();
  // 视觉：手牌区蓝色粒子（费用降低瞬间）
  if (ctx.side === 'me') sparks(790, 720, '#88ccff', 10);
});

// 9. 消灭全场随从 (末日预言者/扭曲虚空)
EffectSystem.register('destroy_all_minions', async (ctx, cfg) => {
  // 视觉：末日预言者中心凝聚虚空漩涡 → 全屏重震 → 全场崩解
  const dmEl = ctx.minion ? minionEl(ctx.side, ctx.minion.uid) : null;
  if (dmEl) {
    const dc = elCenter(dmEl);
    FX.vortex(dc.x, dc.y);
    await sleep(380);
    FX.shake('heavy');
    sfx.boom();
  } else {
    sfx.boom();
  }
  P('me').board.forEach(bm => bm.hp = 0);
  P('ai').board.forEach(bm => bm.hp = 0);
  await checkDeaths();
});
