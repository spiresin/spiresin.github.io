/* 节气胶囊与季节配色：访客端按「今天」（北京时间）实时计算。
   背景：胶囊/季节 class 原为 Hugo 构建时生成，Cloudflare 只在新提交时重建，
   无人推代码就停在构建那天的节气（"一直不变"的根源）。
   本脚本在页面加载时用 static/jieqi.js 的节气表（2020-2035）重算并覆盖：
   - 胶囊文字：「🍂 霜降」/「❄️ 立冬 · 距小雪3天」（距下一节气 ≤3 天才带倒计时）
   - .home-info 的 season-* class（配色 + 飘落粒子都跟着换季）
   构建时的值保留为兜底：节气表未加载/日期超出范围时什么都不动。
   依赖加载顺序（extend_head.html，均为 defer）：jieqi.js → 本脚本 → season-fall.js */
(function () {
  'use strict';

  /* 节气 → [季节, emoji]；季节决定横幅配色与飘落粒子 */
  var SEASON_OF = {
    立春: ['spring', '🌱'], 雨水: ['spring', '🌱'], 惊蛰: ['spring', '🌱'],
    春分: ['spring', '🌱'], 清明: ['spring', '🌱'], 谷雨: ['spring', '🌱'],
    立夏: ['summer', '☀️'], 小满: ['summer', '☀️'], 芒种: ['summer', '☀️'],
    夏至: ['summer', '☀️'], 小暑: ['summer', '☀️'], 大暑: ['summer', '☀️'],
    立秋: ['autumn', '🍂'], 处暑: ['autumn', '🍂'], 白露: ['autumn', '🍂'],
    秋分: ['autumn', '🍂'], 寒露: ['autumn', '🍂'], 霜降: ['autumn', '🍂'],
    立冬: ['winter', '❄️'], 小雪: ['winter', '❄️'], 大雪: ['winter', '❄️'],
    冬至: ['winter', '❄️'], 小寒: ['winter', '❄️'], 大寒: ['winter', '❄️']
  };

  function calc(dateStr, table) {
    var dates = Object.keys(table).sort();
    var cur = null, next = null;
    for (var i = 0; i < dates.length; i++) {
      if (dates[i] <= dateStr) cur = dates[i];
      else { next = dates[i]; break; }
    }
    if (!cur) return null;
    var info = SEASON_OF[table[cur]];
    if (!info) return null;
    var days = 0;
    if (next) days = Math.round((new Date(next + 'T12:00:00Z') - new Date(dateStr + 'T12:00:00Z')) / 86400000);
    return {
      season: info[0],
      emoji: info[1],
      name: table[cur],
      next: next ? table[next] : '',
      days: days
    };
  }

  /* 北京时间（UTC+8）的今天，YYYY-MM-DD */
  function todayCn() {
    var d = new Date(Date.now() + (new Date().getTimezoneOffset() + 480) * 60000);
    return d.toISOString().slice(0, 10);
  }

  function apply(dateStr) {
    var table = window.DIARY_JIEQI;
    if (!table) return null;
    var r = calc(dateStr, table);
    if (!r) return r;
    var chip = document.getElementById('season-chip');
    var banner = document.querySelector('.home-info');
    if (chip) {
      var text = r.emoji + ' ' + r.name;
      if (r.next && r.days > 0 && r.days <= 3) text += ' · 距' + r.next + r.days + '天';
      chip.textContent = text;
    }
    if (banner) {
      banner.className = banner.className.replace(/season-\w+/, 'season-' + r.season);
    }
    return r;
  }

  /* 供测试/调试：传入 YYYY-MM-DD 试算 */
  window.SEASON_CHIP = { calc: calc, apply: apply };

  apply(todayCn());
})();
