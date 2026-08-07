'use strict';
/* ================================================================
   炉石网页版 · 独立沙盒测试模式 (testMode.js)
   ================================================================ */

const TestMode = {
  active: false,

  // 1. 初始化左下角测试控制台 UI
  initUI() {
    if ($('testWidget')) return;

    const widget = document.createElement('div');
    widget.id = 'testWidget';
    widget.style.cssText = `
      position: absolute; left: 24px; bottom: 85px; z-index: 160;
      background: rgba(15, 8, 3, 0.92); border: 2.5px solid #d0a030;
      border-radius: 16px; padding: 12px; width: 280px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.85); display: none;
    `;

    widget.innerHTML = `
      <div style="color:#ffd970; font-size:14px; font-weight:bold; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
        <span>🧪 沙盒测试模式控制台</span>
        <button onclick="TestMode.toggleWidget()" style="background:none; border:none; color:#ff8060; cursor:pointer; font-weight:bold;">✕</button>
      </div>

      <div style="position:relative; margin-bottom:8px;">
        <input type="text" id="testCardInput" placeholder="输入卡牌名称搜索..."
          style="width:100%; padding:6px 10px; border-radius:8px; border:1px solid #6a4a20; background:#000; color:#ffe8b8; font-size:13px; outline:none;" />
        <div id="testCardResults" style="position:absolute; left:0; right:0; top:32px; max-height:180px; overflow-y:auto; background:#1c0f06; border:1px solid #d0a030; border-radius:8px; z-index:170; display:none;"></div>
      </div>

      <div style="display:flex; gap:6px;">
        <button class="col-btn-sm" onclick="TestMode.refillManaAndHp()" style="flex:1; font-size:11px; padding:4px 6px;">⚡ 100晶/满血</button>
        <button class="col-btn-sm" onclick="TestMode.clearBoard()" style="flex:1; font-size:11px; padding:4px 6px;">🧹 清空战场</button>
      </div>
    `;

    $('stage').appendChild(widget);

    // 绑定搜索框实时监听
    $('testCardInput').addEventListener('input', (e) => this.onSearch(e.target.value));
  },

  // 2. 显示测试控制台
  show() {
    this.initUI();
    $('testWidget').style.display = 'block';
    this.active = true;
  },

  // 3. 隐藏测试控制台
  hide() {
    if ($('testWidget')) $('testWidget').style.display = 'none';
    this.active = false;
  },

  toggleWidget() {
    const w = $('testWidget');
    if (w) w.style.display = w.style.display === 'none' ? 'block' : 'none';
  },

  // 4. 实时搜索卡牌
  onSearch(query) {
    const resultsBox = $('testCardResults');
    if (!query.trim()) {
      resultsBox.style.display = 'none';
      return;
    }

    const q = query.toLowerCase().trim();
    const matches = Object.keys(CARDS).filter(k => {
      const d = CARDS[k];
      return d.name.includes(q) || (d.text && d.text.includes(q)) || (d.race && d.race.includes(q));
    });

    resultsBox.innerHTML = '';
    if (matches.length === 0) {
      resultsBox.innerHTML = '<div style="color:#8a7a5a; padding:6px; font-size:12px; text-align:center;">未找到匹配卡牌</div>';
    } else {
      matches.slice(0, 8).forEach(key => {
        const d = CARDS[key];
        const item = document.createElement('div');
        item.style.cssText = 'padding:6px 10px; cursor:pointer; color:#ffe8b8; font-size:12px; border-bottom:1px solid #2d1808; display:flex; justify-content:space-between; align-items:center;';
        item.innerHTML = `<span>${d.art} ${d.name} (${d.cost}费)</span><span style="color:#2ecc40; font-size:11px;">+加入手牌</span>`;
        item.onclick = () => {
          this.giveCard(key);
          resultsBox.style.display = 'none';
          $('testCardInput').value = '';
        };
        item.onmouseenter = () => item.style.background = '#3a2210';
        item.onmouseleave = () => item.style.background = 'transparent';
        resultsBox.appendChild(item);
      });
    }
    resultsBox.style.display = 'block';
  },

  // 5. 强行将卡牌抽入玩家手牌
  giveCard(key) {
    if (!state.started || !P('me')) return;
    if (P('me').hand.length >= 10) {
      sfx.error();
      setHint('手牌已满(10张)，无法加入！');
      return;
    }
    P('me').hand.push({ uid: uid(), key });
    // 克苏恩体系组件：若克苏恩不在场上/手牌/牌库，自动放入牌库，便于查看 buff 反馈动画
    const cthunPartner = ['beckoner_of_evil', 'twilight_elder', 'crazed_worshipper', 'twin_emperor_veklor', 'klaxxi_amber_weaver', 'blade_of_cthun', 'doom_caller', 'eyestalk_watcher'];
    if (cthunPartner.includes(key)) {
      const p = P('me');
      const hasCthun = p.board.some(m => m.key === 'cthun') || p.hand.some(c => c.key === 'cthun') || p.deck.includes('cthun');
      if (!hasCthun) {
        // 插入牌库中间而非末尾：drawCard 用 pop() 从牌库末尾抽牌，避免克苏恩被立即抽走
        p.deck.splice(Math.floor(p.deck.length / 2), 0, 'cthun');
        setHint('克苏恩不在场上/手牌/牌库，已自动放入你的牌库，便于查看 buff 反馈动画');
        setTimeout(() => setHint(''), 2500);
      }
    }
    sfx.draw();
    render();
  },

  // 6. 恢复 100 水晶与满血
  refillManaAndHp() {
    if (!state.started || !P('me')) return;
    const p = P('me');
    p.maxMana = 100;
    p.mana = 100;
    p.hp = 30;
    p.powerUsed = false;
    sfx.heal();
    render();
  },

  // 7. 一键清空双方战场
  clearBoard() {
    if (!state.started) return;
    P('me').board = [];
    P('ai').board = [];
    sfx.boom();
    render();
  }
};
