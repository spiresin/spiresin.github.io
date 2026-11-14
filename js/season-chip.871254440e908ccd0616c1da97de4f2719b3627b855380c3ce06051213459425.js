/* 节气胶囊与季节配色：访客端按「今天」（北京时间）实时计算。
   背景：胶囊/季节 class 原为 Hugo 构建时生成，Cloudflare 只在新提交时重建，
   无人推代码就停在构建那天的节气（"一直不变"的根源）。
   本脚本在页面加载时用 static/jieqi.js 的节气表（2020-2035）重算并覆盖：
   - 胶囊文字：节气当天「❄️ 立冬」；其余日子只显示倒计时「❄️ 距小雪13天」。
     两者循环：到下一个节气当天又变回「❄️ 小雪」。
   - .home-info 的 season-* class（配色 + 飘落粒子都跟着换季）
   构建时的值保留为兜底：节气表未加载/日期超出范围时什么都不动。

   为什么还挂一堆事件（不是加载时算一次就完）：
   手机浏览器（尤其 iOS Safari / 微信）会把页面留在后台好几天，回来时走
   bfcache 直接还原、脚本不重新执行，胶囊就永远停在「第一次打开那天」的节气。
   所以除了首屏计算，还在「从后台切回可见 / bfcache 还原 / 窗口重新获得焦点 /
   定时器」时重算，并专门排一个北京时间零点后的刷新——跨日必换。

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

  var CN_OFFSET = 8 * 60 * 60 * 1000;   /* 北京时间固定 UTC+8，不随访客所在时区变 */

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
      date: cur,                       /* 当前节气开始的那天，用来判断"今天是不是节气当天" */
      next: next ? table[next] : '',
      days: days
    };
  }

  /* 北京时间（UTC+8）的今天，YYYY-MM-DD。
     注意：只对时间戳做 +8h 位移，不要再掺 getTimezoneOffset()——
     那样在 UTC+8 的机器上位移为 0，toISOString() 给出的仍是 UTC 日期，
     每天 00:00-08:00 之间会退回前一天（节气当天凌晨就还显示上一个节气）。 */
  function todayCn() {
    return new Date(Date.now() + CN_OFFSET).toISOString().slice(0, 10);
  }

  /* 距下一个北京时间零点还有多少毫秒（+5s 缓冲，避开边界抖动） */
  function msToCnMidnight() {
    var shifted = Date.now() + CN_OFFSET;
    var dayStart = Math.floor(shifted / 86400000) * 86400000;   /* 位移时钟的 UTC 零点 = 北京零点 */
    return dayStart + 86400000 - shifted + 5000;
  }

  var curSeason = '';

  function apply(dateStr) {
    var table = window.DIARY_JIEQI;
    if (!table) return null;
    var r = calc(dateStr, table);
    if (!r) return null;

    var chip = document.getElementById('season-chip');
    if (chip) {
      /* 节气当天：只显示节气名（今天就是它）；
         其余日子：只显示距下一个节气的倒计时。如此循环。 */
      var text;
      if (r.date === dateStr || !r.next || r.days <= 0) {
        text = r.emoji + ' ' + r.name;
      } else {
        text = r.emoji + ' 距' + r.next + r.days + '天';
      }
      if (chip.textContent !== text) chip.textContent = text;
    }

    var banner = document.querySelector('.home-info');
    if (banner) {
      var cls = banner.className
        .replace(/(^|\s)season-(?:spring|summer|autumn|winter)(?=\s|$)/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^\s+|\s+$/g, '');
      banner.className = (cls ? cls + ' ' : '') + 'season-' + r.season;
      /* 换季了：飘落粒子是按旧季节生成的，清掉重铺 */
      if (curSeason && curSeason !== r.season && window.SEASON_FALL) {
        var old = banner.querySelector('.season-fall');
        if (old) old.remove();
        try { window.SEASON_FALL.init(); } catch (e) {}
      }
      curSeason = r.season;
    }
    return r;
  }

  var retry = 0;
  var nightTimer = 0;

  function scheduleNight() {
    clearTimeout(nightTimer);
    nightTimer = setTimeout(function () {
      apply(todayCn());
      scheduleNight();
    }, msToCnMidnight());
  }

  function refresh() {
    if (!window.DIARY_JIEQI) {
      /* 节气表偶尔还没就绪（网络慢/脚本顺序被打乱）：退避重试，别一次失败就放弃 */
      if (retry++ < 24) setTimeout(refresh, 250);
      return;
    }
    retry = 0;
    apply(todayCn());
    scheduleNight();
  }

  /* 回到前台 / bfcache 还原 / 重新聚焦：都重算一次。
     手机常把页面挂在后台好几天，不重算就会一直显示几天前的节气。 */
  function refreshNow() {
    if (document.visibilityState === 'hidden') return;
    apply(todayCn());
  }

  document.addEventListener('visibilitychange', refreshNow);
  window.addEventListener('pageshow', function (e) { if (e.persisted) refreshNow(); });
  window.addEventListener('focus', refreshNow);
  /* 兜底：系统休眠时 setTimeout 会被压后，半小时一次的轻量重算保证跨日不滞后 */
  setInterval(refreshNow, 30 * 60 * 1000);

  /* 供测试/调试：传入 YYYY-MM-DD 试算 */
  window.SEASON_CHIP = { calc: calc, apply: apply, today: todayCn, refresh: refresh };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh);
  else refresh();
})();
