const $ = (sel) => document.querySelector(sel);

const K_SELECTION = 'vm.selection';
const K_CUSTOMS = 'vm.customs';
const K_PENDING = 'vm.pending';

const state = {
  tabId: null,
  tabUrl: '',
  selected: new Set(),
  customs: []
};

/* 首帧：先用静态预设同步渲染，popup 不会先出现空白小窗口 */
renderGroups();
syncUI();
bind();
loadState();

async function loadState() {
  const [tabs, data] = await Promise.all([
    chrome.tabs.query({ active: true, currentWindow: true }).catch(() => []),
    chrome.storage.local.get([K_SELECTION, K_CUSTOMS])
  ]);

  const tab = tabs && tabs[0];
  if (tab) {
    state.tabId = tab.id;
    state.tabUrl = tab.url || '';
  }

  state.selected = new Set(Array.isArray(data[K_SELECTION]) ? data[K_SELECTION] : []);
  state.customs = Array.isArray(data[K_CUSTOMS]) ? data[K_CUSTOMS] : [];

  const valid = new Set(allDevices().map((device) => device.id));
  for (const id of Array.from(state.selected)) {
    if (!valid.has(id)) state.selected.delete(id);
  }

  const usable = state.tabUrl && !/^(chrome|edge|about|devtools)/i.test(state.tabUrl);
  $('#url').value = usable ? state.tabUrl : '';

  renderGroups();
  syncUI();
}

function cloneDevice(device) {
  return Object.assign({}, device, { key: `${device.id}-${Math.random().toString(36).slice(2, 7)}` });
}

function allDevices() {
  const list = [];
  for (const group of window.VM_PRESETS) list.push(...group.devices);
  list.push(...state.customs);
  return list;
}

function findDevice(id) {
  return allDevices().find((d) => d.id === id) || null;
}

function selectedDevices() {
  const list = [];
  for (const device of allDevices()) {
    if (state.selected.has(device.id)) list.push(cloneDevice(device));
  }
  return list;
}

function saveSelection() {
  chrome.storage.local.set({ [K_SELECTION]: Array.from(state.selected) });
}

function renderGroups() {
  const box = $('#groups');
  box.textContent = '';

  for (const group of window.VM_PRESETS) {
    box.appendChild(buildGroup(group.label, group.devices, false));
  }
  if (state.customs.length) {
    box.appendChild(buildGroup('自定义', state.customs, true));
  }
}

function buildGroup(label, devices, removable) {
  const section = document.createElement('section');
  section.className = 'group';

  const title = document.createElement('h3');
  title.textContent = label;
  section.appendChild(title);

  const chips = document.createElement('div');
  chips.className = 'chips';
  for (const device of devices) chips.appendChild(buildChip(device, removable));
  section.appendChild(chips);

  return section;
}

function buildChip(device, removable) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'chip' + (state.selected.has(device.id) ? ' on' : '');
  chip.dataset.id = device.id;
  chip.title = `${device.name} · ${device.width}×${device.height}${device.dpr > 1 ? ` @${device.dpr}x` : ''}`;

  const name = document.createElement('span');
  name.textContent = device.name;

  const size = document.createElement('em');
  size.textContent = `${device.width}×${device.height}`;

  chip.append(name, size);

  if (removable) {
    const remove = document.createElement('span');
    remove.className = 'chip-x';
    remove.textContent = '✕';
    remove.title = '删除该自定义设备';
    remove.addEventListener('click', (e) => {
      e.stopPropagation();
      removeCustom(device.id);
    });
    chip.appendChild(remove);
  }

  chip.addEventListener('click', () => toggleDevice(device.id));
  return chip;
}

function toggleDevice(id) {
  if (state.selected.has(id)) state.selected.delete(id);
  else state.selected.add(id);
  saveSelection();
  for (const chip of document.querySelectorAll(`.chip[data-id="${CSS.escape(id)}"]`)) {
    chip.classList.toggle('on', state.selected.has(id));
  }
  syncUI();
}

function removeCustom(id) {
  state.customs = state.customs.filter((d) => d.id !== id);
  state.selected.delete(id);
  chrome.storage.local.set({ [K_CUSTOMS]: state.customs });
  saveSelection();
  renderGroups();
  syncUI();
}

function addCustom() {
  const w = clampSize($('#cw').value);
  const h = clampSize($('#ch').value);
  if (!w || !h) {
    setStatus('请输入有效的宽高（120 - 9999）', 'err');
    return;
  }
  const id = `custom-${w}x${h}`;
  if (!findDevice(id)) {
    state.customs.push({ id, name: '自定义', width: w, height: h, dpr: 1, mobile: w < 768 });
    chrome.storage.local.set({ [K_CUSTOMS]: state.customs });
  }
  state.selected.add(id);
  saveSelection();
  renderGroups();
  syncUI();
  setStatus(`已选择自定义 ${w}×${h}`);
}

function clampSize(value) {
  if (value === '' || value == null) return 0;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.min(9999, Math.max(120, n));
}

function syncUI() {
  const count = state.selected.size;
  $('#count').textContent = String(count);
  $('#emulate').disabled = count !== 1;
  $('#emulate').title = count === 1 ? '用调试协议把当前标签页的视口模拟为该尺寸' : '请只选择一个设备';
}

function bind() {
  /* 先绑定历史记录下拉，Enter 选中建议时会拦截事件，避免再触发一次预览 */
  if (window.VMHistory) {
    window.VMHistory.attach($('#url'), {
      panel: $('#urlHistory'),
      onPick: () => openPreview()
    });
  }

  $('#addCustom').addEventListener('click', addCustom);
  $('#preview').addEventListener('click', openPreview);
  $('#emulate').addEventListener('click', emulateCurrentTab);
  $('#restore').addEventListener('click', restoreCurrentTab);
  $('#pickTab').addEventListener('click', () => {
    const usable = state.tabUrl && !/^(chrome|edge|about|devtools)/i.test(state.tabUrl);
    if (usable) $('#url').value = state.tabUrl;
    else setStatus('当前标签页地址无法预览，请手动输入', 'err');
  });
  $('#url').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') openPreview();
  });
}

function normalizeUrl(raw) {
  const value = (raw || '').trim();
  if (!value) return '';
  if (/^(https?|file|about|data|chrome-extension|blob):/i.test(value)) return value;
  if (/^localhost([:/]|$)/i.test(value) || /^\d{1,3}(\.\d{1,3}){3}([:/]|$)/.test(value)) {
    return `http://${value}`;
  }
  return `https://${value}`;
}

async function openPreview() {
  let devices = selectedDevices();
  if (!devices.length) {
    devices = window.VM_DEFAULT_IDS.map((id) => findDevice(id)).filter(Boolean).map(cloneDevice);
  }
  const url = normalizeUrl($('#url').value);
  if (window.VMHistory) await window.VMHistory.add(url);
  await chrome.storage.local.set({ [K_PENDING]: { url, devices, ts: Date.now() } });
  await chrome.tabs.create({ url: chrome.runtime.getURL('preview.html') });
  window.close();
}

async function emulateCurrentTab() {
  const device = selectedDevices()[0];
  if (!device || state.tabId == null) return;

  setStatus(`正在把视口模拟为 ${device.name} ${device.width}×${device.height} …`);
  try {
    try {
      await chrome.debugger.attach({ tabId: state.tabId }, '1.3');
    } catch (e) {
      if (!/already attached/i.test(e.message || '')) throw e;
    }

    const landscape = device.width > device.height;
    await chrome.debugger.sendCommand({ tabId: state.tabId }, 'Emulation.setDeviceMetricsOverride', {
      width: device.width,
      height: device.height,
      deviceScaleFactor: device.dpr || 1,
      mobile: Boolean(device.mobile),
      screenWidth: device.width,
      screenHeight: device.height,
      screenOrientation: {
        type: landscape ? 'landscapePrimary' : 'portraitPrimary',
        angle: landscape ? 90 : 0
      }
    });

    try {
      await chrome.debugger.sendCommand({ tabId: state.tabId }, 'Emulation.setTouchEmulationEnabled', {
        enabled: Boolean(device.mobile),
        maxTouchPoints: 5
      });
    } catch (e) {
      /* 触屏模拟失败不影响布局 */
    }

    setStatus(`已应用 ${device.name} ${device.width}×${device.height}，点「还原」可恢复`, 'ok');
  } catch (e) {
    const message = /another debugger/i.test(e.message || '')
      ? '请先关闭该标签页的 DevTools 再试'
      : e.message || String(e);
    setStatus(`模拟失败：${message}`, 'err');
  }
}

async function restoreCurrentTab() {
  if (state.tabId == null) return;
  try {
    await chrome.debugger.sendCommand({ tabId: state.tabId }, 'Emulation.clearDeviceMetricsOverride');
  } catch (e) {
    /* 未附加调试器 */
  }
  try {
    await chrome.debugger.sendCommand({ tabId: state.tabId }, 'Emulation.setTouchEmulationEnabled', { enabled: false });
  } catch (e) {
    /* 忽略 */
  }
  try {
    await chrome.debugger.detach({ tabId: state.tabId });
    setStatus('已还原为浏览器默认视口', 'ok');
  } catch (e) {
    setStatus('当前标签页没有处于模拟状态');
  }
}

let statusTimer = null;
function setStatus(text, kind) {
  const el = $('#status');
  el.textContent = text;
  el.className = 'status' + (kind ? ` ${kind}` : '');
  clearTimeout(statusTimer);
  if (kind) {
    statusTimer = setTimeout(() => {
      el.textContent = '选择设备 → 并排预览，或模拟到当前标签页';
      el.className = 'status';
    }, 6000);
  }
}
