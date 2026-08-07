'use strict';
/* ================================================================
   炉石网页版 · 出牌历史记录模块 (history.js)
   ================================================================ */
const HistoryLog = {
  maxItems: 7,

  // 增加一条历史纪录（icon 可选：自定义图标，用于敌方奥秘等需隐藏牌面的条目）
  add(side, key, desc, icon) {
    const bar = document.getElementById('historyBar');
    if (!bar) return;

    const item = document.createElement('div');
    item.className = `history-item side-${side}`;

    const cardData = (typeof CARDS !== 'undefined' && key) ? CARDS[key] : null;
    item.textContent = icon || (cardData ? cardData.art : (side === 'me' ? '🧙‍♂️' : '🧙‍♀️'));

    item.onmouseenter = (e) => {
      if (key && typeof showCardPreview === 'function') {
        showCardPreview(key, 110, e.clientY);
      }
    };
    item.onmouseleave = () => {
      if (typeof hideCardPreview === 'function') hideCardPreview();
    };

    bar.insertBefore(item, bar.firstChild);

    // 超过数量限制，删除最早的记录
    if (bar.children.length > this.maxItems) {
      bar.removeChild(bar.lastChild);
    }
  },

  // 清空历史记录 (开新局/返回主菜单时调用)
  clear() {
    const bar = document.getElementById('historyBar');
    if (bar) bar.innerHTML = '';
  }
};
