/**
 * 博客自定义统计系统
 * 完全本地化运行，不依赖任何外部 API
 * 数据存储在浏览器 localStorage 中
 */
(function() {
  'use strict';

  // ========== 工具函数 ==========
  function getStore(key, def) {
    try { return JSON.parse(localStorage.getItem(key)) || def; } catch(e) { return def; }
  }
  function setStore(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  // ========== 访客管理 (UV) ==========
  function getVisitorId() {
    let id = localStorage.getItem('blog_vid');
    if (id) return id;
    id = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('blog_vid', id);
    return id;
  }

  function trackVisitor() {
    var visitors = getStore('blog_visitors', []);
    var vid = getVisitorId();
    if (visitors.indexOf(vid) === -1) {
      visitors.push(vid);
      setStore('blog_visitors', visitors);
    }
    return visitors.length;
  }

  // ========== 页面浏览量 (PV) ==========
  function trackPageView() {
    // 站点总 PV
    var siteStats = getStore('blog_site_stats', { pv: 0, uv: 0 });
    siteStats.pv = (siteStats.pv || 0) + 1;
    siteStats.uv = trackVisitor();
    setStore('blog_site_stats', siteStats);

    // 文章 PV（按路径）
    var pageViews = getStore('blog_page_views', {});
    var path = window.location.pathname;
    pageViews[path] = (pageViews[path] || 0) + 1;
    // 保留最近100条记录
    var keys = Object.keys(pageViews);
    if (keys.length > 100) {
      delete pageViews[keys[0]];
    }
    setStore('blog_page_views', pageViews);

    return { siteStats: siteStats, pageViews: pageViews, currentPath: path };
  }

  // ========== 更新显示 ==========
  function updateDisplay(data) {
    var siteStats = data.siteStats;
    var pageViews = data.pageViews;
    var currentPath = data.currentPath;

    // 1. 侧边栏 - 访客数
    var uvEl = document.getElementById('busuanzi_value_site_uv');
    if (uvEl) {
      uvEl.innerHTML = formatNumber(siteStats.uv);
      uvEl.title = '累计独立访客数';
    }

    // 2. 侧边栏 - 总浏览量
    var pvEl = document.getElementById('busuanzi_value_site_pv');
    if (pvEl) {
      pvEl.innerHTML = formatNumber(siteStats.pv);
      pvEl.title = '累计页面浏览量';
    }

    // 3. 文章页面 - 当前文章浏览量
    var pagePvEl = document.getElementById('busuanzi_value_page_pv');
    if (pagePvEl) {
      pagePvEl.innerHTML = formatNumber(pageViews[currentPath] || 0);
    }

    // 4. 首页文章列表 - 每篇文章浏览量
    document.querySelectorAll('.recent-post-item').forEach(function(item) {
      var link = item.querySelector('.article-title');
      if (!link) return;
      var href = link.getAttribute('href');
      if (!href) return;
      var count = pageViews[href] || 0;

      var viewEl = item.querySelector('.article-page-pv');
      if (viewEl) {
        viewEl.textContent = count;
      } else {
        // 如果没有浏览量元素，创建一个
        var metaWrap = item.querySelector('.article-meta-wrap');
        if (metaWrap && !item.querySelector('.article-meta-pv')) {
          var likeBtn = metaWrap.querySelector('.fa-thumbs-up');
          var refNode = likeBtn ? likeBtn.closest('.article-meta') : null;
          var pvSpan = document.createElement('span');
          pvSpan.className = 'article-meta article-meta-pv';
          pvSpan.innerHTML = '<span class="article-meta-separator">|</span>' +
            '<i class="fas fa-eye"></i>' +
            '<span class="article-meta-label"> 浏览量: </span>' +
            '<span class="article-page-pv">' + count + '</span>';
          if (refNode && refNode.nextSibling) {
            metaWrap.insertBefore(pvSpan, refNode.nextSibling);
          } else if (refNode) {
            metaWrap.insertBefore(pvSpan, refNode.nextSibling);
          } else {
            metaWrap.appendChild(pvSpan);
          }
        }
      }
    });

    // 5. 点赞状态恢复
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

  // ========== 数字格式化 ==========
  function formatNumber(num) {
    if (num >= 100000) return (num / 10000).toFixed(1) + 'w';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num;
  }

  // ========== 点赞功能（事件委托，Pjax 安全） ==========
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

  // ========== 主初始化 ==========
  function init() {
    try {
      var data = trackPageView();
      updateDisplay(data);
      initLikes();
    } catch(e) {
      console.warn('[Custom Stats]', e);
    }
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Pjax 支持
  document.addEventListener('pjax:success', init);

})();
