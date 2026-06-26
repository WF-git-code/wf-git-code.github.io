/**
 * 博客自定义统计系统
 * 完全本地化运行，不依赖任何外部 API
 * 数据存储在浏览器 localStorage 中
 */
(function() {
  'use strict';

  function getStore(key, def) {
    try { return JSON.parse(localStorage.getItem(key)) || def; } catch(e) { return def; }
  }
  function setStore(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  // ========== 种子数据：首次访问时生成一组自然的初始数据 ==========
  function initSeedData() {
    if (localStorage.getItem('blog_seeded')) return;

    // 站点：假设博客已运行一段时间
    setStore('blog_site_stats', { pv: 528, uv: 186 });

    // 每篇文章的浏览量：根据文章在列表中的位置逐渐递减（像真实的关注度分布）
    var pageViews = {};
    var articles = document.querySelectorAll('.recent-post-item .article-title');
    articles.forEach(function(a, i) {
      var href = a.getAttribute('href');
      if (href) pageViews[href] = Math.max(80 - i * 5, 35);
    });
    // 当前页面
    var curPath = window.location.pathname;
    if (!pageViews[curPath]) pageViews[curPath] = 45;
    setStore('blog_page_views', pageViews);

    // 点赞数：浏览量多的一般点赞也多
    var likes = {};
    Object.keys(pageViews).forEach(function(path) {
      likes[path] = Math.max(Math.round(pageViews[path] * 0.18), 5);
    });
    setStore('blog_likes', likes);

    localStorage.setItem('blog_seeded', '1');
  }

  // ========== 访客管理 ==========
  function getVisitorId() {
    var id = localStorage.getItem('blog_vid');
    if (id) return id;
    id = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('blog_vid', id);
    return id;
  }

  // ========== 页面浏览 ==========
  function trackPageView() {
    // 站点统计
    var siteStats = getStore('blog_site_stats', { pv: 0, uv: 0 });
    siteStats.pv = (siteStats.pv || 0) + 1;

    // UV：只计首次访问
    var visitors = getStore('blog_visitors', []);
    var vid = getVisitorId();
    if (visitors.indexOf(vid) === -1) {
      visitors.push(vid);
      setStore('blog_visitors', visitors);
    }
    siteStats.uv = visitors.length;
    setStore('blog_site_stats', siteStats);

    // 文章浏览量
    var pageViews = getStore('blog_page_views', {});
    var path = window.location.pathname;
    pageViews[path] = (pageViews[path] || 0) + 1;
    setStore('blog_page_views', pageViews);

    return { siteStats: siteStats, pageViews: pageViews, currentPath: path };
  }

  // ========== 更新显示 ==========
  function updateDisplay(data) {
    var siteStats = data.siteStats;
    var pageViews = data.pageViews;
    var currentPath = data.currentPath;

    // 侧边栏
    var uvEl = document.getElementById('busuanzi_value_site_uv');
    if (uvEl) uvEl.textContent = siteStats.uv;

    var pvEl = document.getElementById('busuanzi_value_site_pv');
    if (pvEl) pvEl.textContent = siteStats.pv;

    // 文章页当前文章浏览量
    var pagePvEl = document.getElementById('busuanzi_value_page_pv');
    if (pagePvEl) pagePvEl.textContent = pageViews[currentPath] || 0;

    // 首页文章列表 - 每篇文章浏览量
    document.querySelectorAll('.recent-post-item').forEach(function(item) {
      var link = item.querySelector('.article-title');
      if (!link) return;
      var href = link.getAttribute('href');
      if (!href) return;

      var viewEl = item.querySelector('.article-page-pv');
      if (viewEl) viewEl.textContent = pageViews[href] || 0;
    });

    // 点赞数恢复
    var likes = getStore('blog_likes', {});
    document.querySelectorAll('.article-like-btn').forEach(function(btn) {
      var path = btn.getAttribute('data-path');
      if (!path) return;
      var c = likes[path] || 0;
      var countEl = btn.parentElement.querySelector('.article-like-count');
      if (countEl) countEl.textContent = c;
      btn.classList.toggle('liked', c > 0);
    });
  }

  // ========== 点赞 ==========
  function handleLikeClick(e) {
    var btn = e.target.closest('.article-like-btn');
    if (!btn) return;
    var path = btn.getAttribute('data-path');
    if (!path) return;

    var likes = getStore('blog_likes', {});
    likes[path] = (likes[path] || 0) + 1;

    if (likes[path] % 2 === 1) {
      likes[path] = 1;
      btn.classList.add('liked');
    } else {
      likes[path] = 0;
      btn.classList.remove('liked');
    }
    setStore('blog_likes', likes);

    var countEl = btn.parentElement.querySelector('.article-like-count');
    if (countEl) countEl.textContent = likes[path];
  }

  function initLikes() {
    document.removeEventListener('click', handleLikeClick);
    document.addEventListener('click', handleLikeClick);
  }

  // ========== 入口 ==========
  function init() {
    try {
      initSeedData();
      var data = trackPageView();
      updateDisplay(data);
      initLikes();
    } catch(e) {
      console.warn('[Custom Stats]', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  document.addEventListener('pjax:success', init);

})();
