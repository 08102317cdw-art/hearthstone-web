'use strict';
/* ================================================================
   炉石网页版 · 视觉与特效引擎模块 (fx.js)
   ================================================================ */

const FX = {
  // 1. 屏幕震动 (轻度 light / 剧烈 heavy)
  shake(type = 'light') {
    const stage = document.getElementById('stage');
    if (!stage) return;
    const cls = type === 'heavy' ? 'shake-heavy' : 'shake-light';
    stage.classList.add(cls);
    setTimeout(() => stage.classList.remove(cls), 500);
  },

  // 2. 传说随从金色登场爆裂
  legendaryBurst(x, y) {
    const el = document.createElement('div');
    el.className = 'legendary-entry-burst';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    this.add(el);
    this.sparks(x, y, '#ffd970', 25);
    setTimeout(() => el.remove(), 600);
  },

  // 3. 冰霜全屏闪屏
  iceFlash() {
    const el = document.createElement('div');
    el.className = 'ice-flash-overlay';
    this.add(el);
    setTimeout(() => el.remove(), 700);
  },

  // 4. 虚空旋涡黑洞
  vortex(x, y) {
    const el = document.createElement('div');
    el.className = 'vortex-hole';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    this.add(el);
    setTimeout(() => el.remove(), 800);
  },

  // 5. 爆炸/火光
  boom(x, y, small) {
    const el = document.createElement('div');
    el.className = 'boom';
    el.style.left = x + 'px'; el.style.top = y + 'px';
    if (small) el.style.width = el.style.height = '70px';
    this.add(el);
    setTimeout(() => el.remove(), 480);
  },

  // 6. 彩色粒子火花
  sparks(x, y, color, n) {
    for (let i = 0; i < (n || 10); i++) {
      const el = document.createElement('div');
      el.className = 'spark';
      el.style.left = x + 'px'; el.style.top = y + 'px';
      el.style.background = color;
      el.style.boxShadow = `0 0 8px ${color}`;
      this.add(el);
      const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 130;
      el.animate([
        { transform: 'translate(-50%,-50%)', opacity: 1 },
        { transform: `translate(${Math.cos(a) * sp - 50}%,${Math.sin(a) * sp - 50}%) translate(${Math.cos(a) * sp}px,${Math.sin(a) * sp + 40}px)`, opacity: 0 }
      ], { duration: 350 + Math.random() * 300, easing: 'ease-out' });
      setTimeout(() => el.remove(), 660);
    }
  },

  // 7. 飘字数字 (伤害/治疗)
  dmgNum(x, y, n, heal) {
    const el = document.createElement('div');
    el.className = 'dmgNum' + (heal ? ' heal' : '');
    el.textContent = (heal ? '+' : '-') + n;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    this.add(el);
    setTimeout(() => el.remove(), 950);
  },

  add(el) {
    const layer = document.getElementById('fxLayer');
    if (layer) layer.appendChild(el);
  }
};
