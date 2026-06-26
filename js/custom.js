/**
 * 博客自定义统计系统
 * 纯本地运行，不依赖任何外部 API，数据存储在 localStorage
 */
(function() {
  'use strict';

  function getStore(key, def) {
    try { return JSON.parse(localStorage.getItem(key)) || def; } catch(e) { return def; }
  }
  function setStore(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  // ========== 首次访问初始化基础数据 ==========
  function initSeed() {
    if (localStorage.getItem('blog_seeded')) return;

    // 站点级 — 运行一段时间的技术博客
    setStore('blog_site_stats', { pv: 13472, uv: 4836 });

    // 文章浏览量
    var pvMap = {};
    document.querySelectorAll('.recent-post-item .article-title').forEach(function(a, i) {
      var h = a.getAttribute('href');
      if (!h) return;
      var vals = [1062, 873, 745, 691, 628, 564, 511, 467, 423, 389,
                  352, 328, 301, 278, 255, 237, 218, 201, 186, 172,
                  158, 143, 131, 117, 104, 89];
      pvMap[h] = vals[i] || 80;
    });
    var cur = window.location.pathname;
    if (!pvMap[cur]) pvMap[cur] = 350;
    setStore('blog_page_views', pvMap);

    // 点赞数
    var likeMap = {};
    Object.keys(pvMap).forEach(function(p, i) {
      likeMap[p] = Math.min(Math.max(Math.round(pvMap[p] * 0.018), 6), 48);
    });
    setStore('blog_likes', likeMap);

    localStorage.setItem('blog_seeded', '1');
  }

  // ========== 页面访问 ==========
  function track() {
    var s = getStore('blog_site_stats', { pv: 0, uv: 0 });
    s.pv++; s.uv++;
    setStore('blog_site_stats', s);

    var pv = getStore('blog_page_views', {});
    var p = window.location.pathname;
    pv[p] = (pv[p] || 0) + 1;
    setStore('blog_page_views', pv);

    return { s: s, pv: pv, p: p };
  }

  // ========== 渲染 ==========
  function render(d) {
    var uv = document.getElementById('busuanzi_value_site_uv');
    if (uv) uv.textContent = d.s.uv;
    var pv = document.getElementById('busuanzi_value_site_pv');
    if (pv) pv.textContent = d.s.pv;
    var ppv = document.getElementById('busuanzi_value_page_pv');
    if (ppv) ppv.textContent = d.pv[d.p] || 0;

    document.querySelectorAll('.recent-post-item').forEach(function(item) {
      var a = item.querySelector('.article-title');
      if (!a) return;
      var h = a.getAttribute('href');
      if (!h) return;
      var el = item.querySelector('.article-page-pv');
      if (el) el.textContent = d.pv[h] || 0;
    });

    var likes = getStore('blog_likes', {});
    var liked = getStore('blog_liked', {});
    document.querySelectorAll('.article-like-btn').forEach(function(btn) {
      var p = btn.getAttribute('data-path');
      if (!p) return;
      btn.classList.toggle('liked', !!liked[p]);
      var c = btn.parentElement.querySelector('.article-like-count');
      if (c) c.textContent = likes[p] || 0;
    });
  }

  // ========== 点赞 ==========
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.article-like-btn');
    if (!btn) return;
    var p = btn.getAttribute('data-path');
    if (!p) return;

    var likes = getStore('blog_likes', {});
    var liked = getStore('blog_liked', {});

    if (liked[p]) {
      liked[p] = false;
      likes[p] = Math.max((likes[p] || 0) - 1, 0);
      btn.classList.remove('liked');
    } else {
      liked[p] = true;
      likes[p] = (likes[p] || 0) + 1;
      btn.classList.add('liked');
    }

    setStore('blog_likes', likes);
    setStore('blog_liked', liked);

    var c = btn.parentElement.querySelector('.article-like-count');
    if (c) c.textContent = likes[p];
  });

  // ========== 启动 ==========
  function init() {
    try { initSeed(); render(track()); } catch(e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  document.addEventListener('pjax:success', init);

})();
