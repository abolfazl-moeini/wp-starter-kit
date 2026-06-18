/* ==========================================================================
   WPDev Framework Documentation Site — app.js
   Theme toggle, sidebar nav, search, module filter, copy buttons,
   scroll-spy, to-top button, lightweight PHP syntax highlighting.
   ========================================================================== */

(function () {
  'use strict';

  /* ----- Theme persistence ----- */
  const THEME_KEY = 'wpdev-docs-theme';
  const root = document.documentElement;
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);

  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem(THEME_KEY, next);
    });
  }

  /* ----- Sidebar toggle (mobile) ----- */
  const navToggle = document.getElementById('nav-toggle');
  const sidebar = document.getElementById('sidebar');
  if (navToggle && sidebar) {
    navToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (window.innerWidth > 880) return;
      if (!sidebar.classList.contains('open')) return;
      if (sidebar.contains(e.target) || navToggle.contains(e.target)) return;
      sidebar.classList.remove('open');
    });
  }

  /* ----- Scroll-spy nav highlighting ----- */
  const navLinks = Array.from(document.querySelectorAll('.nav-link'));
  const linkMap = new Map();
  navLinks.forEach((l) => {
    const href = l.getAttribute('href') || '';
    if (href.startsWith('#')) linkMap.set(href.slice(1), l);
  });

  const sections = Array.from(document.querySelectorAll('main section[id]'));
  let lastActive = null;

  const setActive = (id) => {
    if (lastActive === id) return;
    navLinks.forEach((l) => l.classList.remove('active'));
    const link = linkMap.get(id);
    if (link) link.classList.add('active');
    lastActive = id;
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.1, 0.4, 0.8] }
    );
    sections.forEach((s) => io.observe(s));
  }

  /* ----- To-top button ----- */
  const toTop = document.getElementById('to-top');
  if (toTop) {
    toTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    const onScroll = () => {
      if (window.scrollY > 600) toTop.classList.add('show');
      else toTop.classList.remove('show');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ----- Module filter (chips + search) ----- */
  const moduleFilter = document.getElementById('module-filter');
  const moduleGrid = document.getElementById('module-grid');
  const chips = document.querySelectorAll('.filter-chips .chip');
  let activeCat = 'all';
  let activeQuery = '';

  const applyFilter = () => {
    if (!moduleGrid) return;
    const q = activeQuery.toLowerCase();
    moduleGrid.querySelectorAll('.module-card').forEach((card) => {
      const cat = card.getAttribute('data-cat') || '';
      const kw = card.getAttribute('data-keywords') || '';
      const title = card.querySelector('h3')?.textContent || '';
      const matchCat = activeCat === 'all' || cat === activeCat;
      const matchQ = !q || title.toLowerCase().includes(q) || kw.toLowerCase().includes(q);
      card.style.display = matchCat && matchQ ? '' : 'none';
    });
  };

  chips.forEach((c) =>
    c.addEventListener('click', () => {
      chips.forEach((x) => x.classList.remove('active'));
      c.classList.add('active');
      activeCat = c.getAttribute('data-filter') || 'all';
      applyFilter();
    })
  );
  if (moduleFilter) {
    moduleFilter.addEventListener('input', (e) => {
      activeQuery = e.target.value || '';
      applyFilter();
    });
  }

  /* ----- Top-bar search ----- */
  const search = document.getElementById('search');
  const searchResults = document.getElementById('search-results');
  const searchIndex = [];

  // Build a search index from the page
  const buildIndex = () => {
    searchIndex.length = 0;

    // Modules
    document.querySelectorAll('.module-card').forEach((c) => {
      const title = c.querySelector('h3')?.textContent.trim() || '';
      const desc = c.querySelector('p')?.textContent.trim() || '';
      const apis = Array.from(c.querySelectorAll('.mc-apis code')).map((x) => x.textContent.trim());
      const target = c.getAttribute('href') || '';
      searchIndex.push({ title, desc: apis.join(' · '), cat: 'Module', target });
    });

    // Section headings
    document.querySelectorAll('main section[id] .section-head h2').forEach((h) => {
      const sec = h.closest('section');
      const target = '#' + (sec ? sec.id : '');
      searchIndex.push({ title: h.textContent.trim(), desc: '', cat: 'Section', target });
    });

    // API patterns
    document.querySelectorAll('.pattern-card').forEach((p) => {
      const title = p.querySelector('h3')?.textContent.trim() || '';
      const desc = p.querySelector('p')?.textContent.trim() || '';
      const target = '#api-patterns';
      searchIndex.push({ title, desc, cat: 'API pattern', target });
    });

    // Hooks & families
    document.querySelectorAll('.hook-row code').forEach((c) => {
      const row = c.closest('.hook-row');
      const text = row ? row.textContent.trim() : c.textContent.trim();
      if (text.length < 200) {
        const target = row && row.closest('section') ? '#' + row.closest('section').id : '#';
        searchIndex.push({ title: c.textContent.trim(), desc: text.replace(c.textContent, '').trim(), cat: 'API', target });
      }
    });
  };
  buildIndex();

  let searchFocusIndex = -1;
  let currentResults = [];

  const renderResults = (q) => {
    if (!searchResults) return;
    const query = q.toLowerCase().trim();
    if (!query) {
      searchResults.hidden = true;
      searchResults.innerHTML = '';
      currentResults = [];
      return;
    }
    const matches = searchIndex
      .map((item) => {
        const hay = (item.title + ' ' + item.desc).toLowerCase();
        const idx = hay.indexOf(query);
        let score = idx === -1 ? 0 : 100 - idx;
        if (item.title.toLowerCase().startsWith(query)) score += 50;
        return { item, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    currentResults = matches.map((m) => m.item);
    searchFocusIndex = -1;

    if (!currentResults.length) {
      searchResults.innerHTML = '<div class="sr-empty">No matches for &ldquo;' + escapeHtml(query) + '&rdquo;</div>';
      searchResults.hidden = false;
      return;
    }

    searchResults.innerHTML = currentResults
      .map(
        (it, i) => `
        <div class="sr-item" data-i="${i}" data-target="${it.target}">
          <div class="sr-cat">${escapeHtml(it.cat)}</div>
          <div class="sr-title">${highlight(it.title, query)}</div>
          ${it.desc ? `<div class="sr-desc" style="font-size:12px;color:var(--text-mute);">${highlight(truncate(it.desc, 100), query)}</div>` : ''}
        </div>`
      )
      .join('');
    searchResults.hidden = false;

    searchResults.querySelectorAll('.sr-item').forEach((el) => {
      el.addEventListener('click', () => {
        const t = el.getAttribute('data-target');
        if (t && t.startsWith('#')) {
          window.location.hash = t;
          searchResults.hidden = true;
          if (search) search.value = '';
        }
      });
    });
  };

  if (search) {
    search.addEventListener('input', (e) => renderResults(e.target.value));
    search.addEventListener('focus', (e) => {
      if (e.target.value) renderResults(e.target.value);
    });
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchResults.hidden = true;
        search.blur();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveFocus(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveFocus(-1);
      } else if (e.key === 'Enter') {
        if (searchFocusIndex >= 0 && currentResults[searchFocusIndex]) {
          e.preventDefault();
          const t = currentResults[searchFocusIndex].target;
          if (t && t.startsWith('#')) {
            window.location.hash = t;
            searchResults.hidden = true;
            search.value = '';
          }
        }
      }
    });
    document.addEventListener('click', (e) => {
      if (!searchResults.contains(e.target) && e.target !== search) {
        searchResults.hidden = true;
      }
    });
  }

  function moveFocus(delta) {
    if (!currentResults.length) return;
    const items = searchResults.querySelectorAll('.sr-item');
    searchFocusIndex = (searchFocusIndex + delta + items.length) % items.length;
    items.forEach((it, i) => it.classList.toggle('focused', i === searchFocusIndex));
    items[searchFocusIndex]?.scrollIntoView({ block: 'nearest' });
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function highlight(text, q) {
    if (!q) return escapeHtml(text);
    const i = text.toLowerCase().indexOf(q);
    if (i < 0) return escapeHtml(text);
    return escapeHtml(text.slice(0, i)) + '<mark style="background:color-mix(in srgb, var(--accent) 30%, transparent);color:inherit;padding:0 2px;border-radius:3px;">' + escapeHtml(text.slice(i, i + q.length)) + '</mark>' + escapeHtml(text.slice(i + q.length));
  }
  function truncate(s, n) {
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  /* ----- Copy buttons ----- */
  document.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-copy-target');
      const pre = id ? document.getElementById(id) : btn.parentElement.querySelector('pre');
      if (!pre) return;
      const text = pre.textContent || '';
      try {
        await navigator.clipboard.writeText(text);
      } catch (_) {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
      }
      const original = btn.textContent;
      btn.textContent = 'Copied';
      btn.classList.add('copied');
      showToast('Copied to clipboard');
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('copied');
      }, 1400);
    });
  });

  /* ----- Toast helper ----- */
  const toast = document.getElementById('toast');
  let toastTimer = null;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1500);
  }

  /* ----- Lightweight PHP syntax highlighting ----- */
  const PHP_KEYWORDS = new Set([
    'abstract','and','array','as','break','callable','case','catch','class','clone','const','continue','declare',
    'default','die','do','echo','else','elseif','empty','endfor','endforeach','endif','endswitch','endwhile','eval',
    'exit','extends','final','finally','fn','for','foreach','function','global','goto','if','implements','include',
    'include_once','instanceof','insteadof','interface','isset','list','match','namespace','new','or','parent','print',
    'private','protected','public','readonly','require','require_once','return','static','switch','throw','trait','try',
    'unset','use','var','while','xor','yield','true','false','null','self','static'
  ]);
  const PHP_TYPES = new Set([
    'int','float','string','bool','array','object','void','mixed','never','true','false','null'
  ]);

  function highlightPHP(code) {
    // Tokenize using a single regex with named groups
    const pattern = /(\/\/.*$)|(\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_][a-zA-Z0-9_]*\b)|([\\][a-zA-Z_\\][a-zA-Z0-9_\\]*)/gm;
    let out = '';
    let lastIndex = 0;
    let m;
    while ((m = pattern.exec(code)) !== null) {
      // Append raw text between matches
      out += escapeHtml(code.slice(lastIndex, m.index));
      lastIndex = m.index + m[0].length;
      if (m[1] !== undefined) {
        out += '<span class="t-cmt">' + escapeHtml(m[1]) + '</span>';
      } else if (m[2] !== undefined) {
        out += '<span class="t-cmt">' + escapeHtml(m[2]) + '</span>';
      } else if (m[3] !== undefined) {
        out += '<span class="t-str">' + escapeHtml(m[3]) + '</span>';
      } else if (m[4] !== undefined) {
        out += '<span class="t-num">' + escapeHtml(m[4]) + '</span>';
      } else if (m[5] !== undefined) {
        const word = m[5];
        // Check if it's a function call: word immediately followed by '('
        const next = code.charAt(pattern.lastIndex);
        if (PHP_KEYWORDS.has(word)) {
          if (word === 'true' || word === 'false' || word === 'null') {
            out += '<span class="t-num">' + escapeHtml(word) + '</span>';
          } else {
            out += '<span class="t-key">' + escapeHtml(word) + '</span>';
          }
        } else if (PHP_TYPES.has(word)) {
          out += '<span class="t-key">' + escapeHtml(word) + '</span>';
        } else if (/^[A-Z]/.test(word)) {
          out += '<span class="t-cls">' + escapeHtml(word) + '</span>';
        } else if (next === '(') {
          out += '<span class="t-fn">' + escapeHtml(word) + '</span>';
        } else {
          out += escapeHtml(word);
        }
      } else if (m[6] !== undefined) {
        // Namespaced FQCN
        out += '<span class="t-cls">' + escapeHtml(m[6]) + '</span>';
      }
    }
    out += escapeHtml(code.slice(lastIndex));
    return out;
  }

  document.querySelectorAll('pre.code[data-lang="php"]').forEach((pre) => {
    const codeEl = pre.querySelector('code');
    const src = codeEl ? codeEl.textContent : pre.textContent;
    const out = highlightPHP(src);
    if (codeEl) {
      codeEl.innerHTML = out;
    } else {
      pre.innerHTML = '<code>' + out + '</code>';
    }
  });

  /* ----- Keyboard shortcut: "/" focuses search ----- */
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== search && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      if (search) search.focus();
    }
  });

  /* ----- Click on module cards respects current state ----- */
  // (anchor links are handled by browser; nothing extra needed)

})();
