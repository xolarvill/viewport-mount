/* 最近访问地址：popup 与预览页共用的 Chrome 风格历史下拉 */
(function () {
  const KEY = 'vm.history';
  const LIMIT = 30;
  const SHOW = 12;
  const SKIP = /^(about|data|blob|javascript):/i;

  async function list() {
    try {
      const data = await chrome.storage.local.get(KEY);
      const items = Array.isArray(data[KEY]) ? data[KEY] : [];
      return items.filter((item) => item && typeof item.url === 'string');
    } catch (e) {
      return [];
    }
  }

  async function save(items) {
    try {
      await chrome.storage.local.set({ [KEY]: items.slice(0, LIMIT) });
    } catch (e) {
      /* 忽略 */
    }
  }

  async function add(rawUrl) {
    const url = (rawUrl || '').trim();
    if (!url || SKIP.test(url)) return;
    const items = await list();
    if (items.length && items[0].url === url) return;
    await save([{ url, ts: Date.now() }].concat(items.filter((item) => item.url !== url)));
  }

  async function remove(url) {
    const items = await list();
    await save(items.filter((item) => item.url !== url));
  }

  async function clear() {
    try {
      await chrome.storage.local.remove(KEY);
    } catch (e) {
      /* 忽略 */
    }
  }

  function splitUrl(url) {
    try {
      const parsed = new URL(url);
      let host = parsed.host;
      if (!host) return { host: url, rest: '' };
      let rest = parsed.pathname === '/' ? '' : parsed.pathname;
      rest += parsed.search;
      return { host, rest };
    } catch (e) {
      return { host: url, rest: '' };
    }
  }

  function attach(input, options) {
    const panel = options && options.panel;
    if (!input || !panel) return;

    const head = document.createElement('div');
    head.className = 'hist-head';

    const label = document.createElement('span');
    label.textContent = '最近访问';

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'hist-clear';
    clearBtn.textContent = '清除全部';

    head.append(label, clearBtn);

    const listEl = document.createElement('div');
    listEl.className = 'hist-list';

    panel.append(head, listEl);
    panel.hidden = true;

    let items = [];
    let shown = [];
    let active = -1;

    function filter() {
      const query = input.value.trim().toLowerCase();
      const matched = query ? items.filter((item) => item.url.toLowerCase().includes(query)) : items;
      shown = matched.slice(0, SHOW);
    }

    function render() {
      listEl.textContent = '';
      clearBtn.hidden = items.length === 0;

      shown.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'hist-item' + (index === active ? ' active' : '');
        row.title = item.url;
        row.setAttribute('role', 'option');

        const icon = document.createElement('span');
        icon.className = 'hist-icon';

        const text = document.createElement('span');
        text.className = 'hist-text';
        const parts = splitUrl(item.url);
        const host = document.createElement('b');
        host.textContent = parts.host;
        text.appendChild(host);
        if (parts.rest) {
          const rest = document.createElement('span');
          rest.textContent = parts.rest;
          text.appendChild(rest);
        }

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'hist-del';
        del.title = '从历史记录中删除';
        del.textContent = '✕';
        del.addEventListener('click', async (event) => {
          event.stopPropagation();
          await remove(item.url);
          await load();
        });

        row.append(icon, text, del);
        row.addEventListener('click', () => choose(item.url));
        listEl.appendChild(row);
      });
    }

    function sync() {
      panel.hidden = !(document.activeElement === input && shown.length > 0);
    }

    async function load() {
      items = await list();
      filter();
      active = -1;
      render();
      sync();
    }

    function highlight() {
      const rows = listEl.children;
      for (let i = 0; i < rows.length; i += 1) {
        rows[i].classList.toggle('active', i === active);
      }
    }

    function choose(url) {
      input.value = url;
      panel.hidden = true;
      if (typeof options.onPick === 'function') options.onPick(url);
      else input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    input.addEventListener('click', () => {
      if (panel.hidden) load();
    });

    input.addEventListener('input', () => load());

    input.addEventListener('blur', () => {
      panel.hidden = true;
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (panel.hidden) {
          if (event.key === 'ArrowDown') load();
          return;
        }
        event.preventDefault();
        const count = shown.length;
        if (!count) return;
        active = event.key === 'ArrowDown'
          ? (active + 1) % count
          : (active <= 0 ? count - 1 : active - 1);
        highlight();
        return;
      }

      if (event.key === 'Enter') {
        if (panel.hidden || active < 0 || !shown[active]) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        choose(shown[active].url);
        return;
      }

      if (event.key === 'Escape' && !panel.hidden) {
        event.preventDefault();
        event.stopPropagation();
        panel.hidden = true;
      }
    });

    /* 单击建议时不抢焦点，避免 blur 先把面板收起 */
    panel.addEventListener('mousedown', (event) => event.preventDefault());

    clearBtn.addEventListener('click', async () => {
      await clear();
      await load();
      input.focus();
    });
  }

  window.VMHistory = { list, add, remove, clear, attach };
})();
