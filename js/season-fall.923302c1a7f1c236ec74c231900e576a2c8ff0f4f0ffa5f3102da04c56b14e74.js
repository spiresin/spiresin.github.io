/* 横幅四季飘落动画：春飘花、夏掉西瓜、秋落叶、冬飘雪
   季节取自 .home-info 的 season-* class（home_info.html 构建时按节气生成）。
   密度刻意压低（7-14 个/横幅），prefers-reduced-motion 时整层隐藏。
   质感三件套：远中近景深（虚化/减速/减淡）、横向漂移+翻滚、冬雪闪烁。 */
(function () {
  'use strict';

  var CONF = {
    /* 重复的字符表示更高的出现权重 */
    spring: { chars: ['🌸', '🌸', '🌸', '💮', '🍀', '🍀'], n: 12 },
    summer: { chars: ['🍉', '🍉', '🍉', '🌞'], n: 10 },
    autumn: { chars: ['🍂', '🍂', '🍁', '🍁', '🍃'], n: 14 },
    /* 雪花用文字字形（不带 VS16），才能由 CSS 上成纯白 */
    winter: { chars: ['❄', '❄', '❅', '❆', '⛄'], n: 20 }
  };

  /* 个别大件元素单独给尺寸区间（雪人/太阳/西瓜），其余走季节默认值 */
  var BIG = {
    '⛄': [30, 42],
    '🌞': [24, 34],
    '🍉': [26, 38]
  };

  /* 大件只轻微翻滚，小件（叶/瓣/雪）才整圈转 */
  function spinFor(ch) {
    if (ch === '⛄' || ch === '🌞' || ch === '🍉') return (Math.random() * 50 - 25);
    return (240 + Math.random() * 480) * (Math.random() < 0.5 ? -1 : 1);
  }

  /* 为单个粒子掷一整套全新的下落参数（落点/时长/漂移/翻滚/尺寸/透明度/景深）。
     出生时调用一次；之后每次 animationiteration（一趟落完回到顶部的瞬间）再调用——
     事件恰在新一趟 0 进度处触发，此时改 left/duration 不会产生可见跳变，
     粒子等于「回到天上换个地方重新落」，从根上消灭 infinite 循环的固定轨迹。 */
  function randomizeDrop(drop, item, ch, season, bannerH) {
    /* 景深：far 30% / mid 45% / near 25% —— 远的小、淡、慢、虚化 */
    var roll = Math.random();
    var depth = roll < 0.3 ? 'far' : roll < 0.75 ? 'mid' : 'near';
    var scale = depth === 'far' ? 0.55 : depth === 'near' ? 1.2 : 1;
    var speed = depth === 'far' ? 1.55 : depth === 'near' ? 0.85 : 1;

    var dur = (9 + Math.random() * 9) * speed;   /* 下落一趟 9-18s 基准 */
    var range = BIG[ch] || (season === 'summer' ? [26, 38] : [18, 30]);
    var size = (range[0] + Math.random() * (range[1] - range[0])) * scale;

    /* 横向真随机落点：粒子/尺寸/位置完全独立；1% 边距防粒子半截悬在边缘 */
    var leftPct = 1 + Math.random() * 97;
    drop.style.left = leftPct.toFixed(2) + '%';
    drop.style.animationDuration = dur.toFixed(2) + 's';
    drop.style.filter = depth === 'far' ? 'blur(1.2px)' : 'none';
    /* 下落总程按横幅实际高度算：出生点 top:-48px，行程刚好穿出横幅底部约 30px */
    drop.style.setProperty('--fall', (bannerH + 76) + 'px');

    /* 一趟落完的横向漂移和翻滚角度；靠边的粒子漂移幅度收敛，避免飘出横幅被裁掉 */
    var edgePct = Math.min(leftPct, 100 - leftPct);
    var maxDrift = Math.min(80, edgePct * 8);
    drop.style.setProperty('--drift', (Math.random() * maxDrift * 2 - maxDrift).toFixed(0) + 'px');
    drop.style.setProperty('--spin', spinFor(ch).toFixed(0) + 'deg');

    item.style.fontSize = size.toFixed(1) + 'px';
    var op = 0.72 + Math.random() * 0.28;
    item.style.opacity = (op * (depth === 'far' ? 0.6 : 1)).toFixed(2);

    return dur;
  }

  function spawn(banner, season) {
    var conf = CONF[season];
    var layer = document.createElement('div');
    layer.className = 'season-fall';
    layer.setAttribute('aria-hidden', 'true');
    /* 手机窄屏减量，保持"适当"的密度 */
    var n = conf.n;
    if (window.innerWidth < 640) n = Math.max(4, Math.round(n * 0.6));
    for (var i = 0; i < n; i++) {
      (function () {
        var drop = document.createElement('span');
        drop.className = 'sf-drop';
        var item = document.createElement('span');
        item.className = 'sf-item';
        var ch = conf.chars[Math.floor(Math.random() * conf.chars.length)];
        item.textContent = ch;

        /* 白色柔光描边：暖红底上让红棕叶/粉瓣浮出来，同时保持柔和不刺眼 */
        item.style.textShadow = '0 0 6px rgba(255, 255, 255, 0.5)';
        /* 左右摇摆（sway）的周期与位置无关，出生随机一次即可 */
        item.style.animationDuration = (2.4 + Math.random() * 2.6).toFixed(2) + 's';
        item.style.animationDelay = (-Math.random() * 3).toFixed(2) + 's';

        /* 冬天的雪花（非雪人）上纯白 + 明暗呼吸 */
        if (season === 'winter' && ch !== '⛄') {
          item.style.color = '#ffffff';
          var tw = (2 + Math.random() * 2.4).toFixed(2);
          item.style.animation = 'sf-sway ' + item.style.animationDuration +
            ' ease-in-out ' + item.style.animationDelay + ' infinite, sf-twinkle ' +
            tw + 's ease-in-out ' + (-Math.random() * 2).toFixed(2) + 's infinite';
        }

        randomizeDrop(drop, item, ch, season, banner.offsetHeight);
        /* 开局负 delay 让粒子散布在横幅全程（只影响首轮相位） */
        drop.style.animationDelay =
          (-Math.random() * parseFloat(drop.style.animationDuration)).toFixed(2) + 's';

        /* 「一趟一停」驱动：下落动画只跑 1 趟（CSS iteration-count:1），
           animationend（粒子已落在横幅底部之外、全透明）时重掷全部参数再重新起跑。
           重掷发生在动画完全停止的边界，elapsed 归零，改 duration/left 都不会有
           可见跳变——之前用 animationiteration + 改 duration 的方案会让浏览器的
           累计时间对新时长取模，粒子瞬移到循环中段，表现为闪烁+乱跳 */
        function runDrop(first) {
          if (!first) randomizeDrop(drop, item, ch, season, banner.offsetHeight);
          drop.style.animationDelay = first ? drop.style.animationDelay : '0s';
          /* 短暂摘掉动画名再恢复：inline 的 duration/delay 等参数原样保留 */
          drop.style.animationName = 'none';
          void drop.offsetWidth;   /* 强制回流，确保「无动画」状态先落地 */
          drop.style.animationName = '';
        }
        drop.addEventListener('animationend', function (e) {
          if (e.target === drop && e.animationName === 'sf-fall') runDrop(false);
        });

        drop.appendChild(item);
        layer.appendChild(drop);
      })();
    }
    /* 每季一个底部氛围层：冬雪坡 / 春花雾 / 夏藤蔓 / 秋落叶堆 */
    /* 四季统一为底部柔雾，只换颜色：春粉 / 夏绿 / 秋金 / 冬白（雪坡） */
    var AMB = { winter: 'sf-ground', spring: 'sf-mist', summer: 'sf-grass', autumn: 'sf-goldmist' };
    if (AMB[season]) {
      var amb = document.createElement('div');
      amb.className = season === 'winter' ? 'sf-ground' : 'sf-amb ' + AMB[season];
      amb.setAttribute('aria-hidden', 'true');
      layer.insertBefore(amb, layer.firstChild);
    }
    banner.appendChild(layer);
  }

  function init() {
    var banner = document.querySelector('.home-info');
    if (!banner || banner.querySelector('.season-fall')) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var m = banner.className.match(/season-(spring|summer|autumn|winter)/);
    if (m) spawn(banner, m[1]);
  }

  /* 供调试/预览重刷 */
  window.SEASON_FALL = { init: init };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
