const $ = (sel) => document.querySelector(sel);

const CH = 'viewport-mount';
const RULE_ID_BASE = 9000;
const K_SESSION = 'vm.session';
const K_PENDING = 'vm.pending';

const SANDBOX = [
  'allow-scripts',
  'allow-same-origin',
  'allow-forms',
  'allow-popups',
  'allow-modals',
  'allow-downloads',
  'allow-pointer-lock',
  'allow-presentation'
].join(' ');

const HEAD_SPACE = 40;
const STAGE_PADDING = 48;

const stage = $('#stage');
const parts = new WeakMap();

const state = {
  tabId: null,
  url: '',
  devices: [],
  scale: 'fit-h',
  sync: false,
  frames: new Set()
};

let keySeq = 0;
let saveTimer = null;
let injectTimer = null;
let toastTimer = null;

init();

async function init() {
  try {
    const tab = await chrome.tabs.getCurrent();
    if (tab) state.tabId = tab.id;
  } catch (e) {
    /* 忽略 */
  }

  await cleanupStaleRules();
  await installFrameRule();

  const data = await chrome.storage.local.get([K_PENDING, K_SESSION]);
  const pending = data[K_PENDING];
  const session = data[K_SESSION];

  if (pending && Date.now() - (pending.ts || 0) < 120000) {
    state.url = pending.url || '';
    state.devices = (pending.devices || []).map(ensureKey);
    chrome.storage.local.remove(K_PENDING);
  } else if (session) {
    state.url = session.url || '';
    state.devices = (session.devices || []).map(ensureKey);
    state.scale = session.scale || 'fit-h';
    state.sync = Boolean(session.sync);
  }

  if (!state.devices.length) state.devices = defaultDevices();

  $('#url').value = state.url;
  $('#scale').value = state.scale;
  $('#sync').checked = state.sync;

  bind();
  render();

  new ResizeObserver(() => applyScale()).observe(stage);
}

function ensureKey(device) {
  if (device.key) return device;
  keySeq += 1;
  return Object.assign({}, device, { key: `k${Date.now().toString(36)}-${keySeq}` });
}

function defaultDevices() {
  return window.VM_DEFAULT_IDS.map((id) => window.VM_findDevice(id))
    .filter(Boolean)
    .map(ensureKey);
}

/* 允许把目标页面放进 iframe：仅对当前预览标签页生效 */
function frameRuleId() {
  return RULE_ID_BASE + (state.tabId % 1000000);
}

async function installFrameRule() {
  if (state.tabId == null) return;
  const ruleId = frameRuleId();
  try {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [ruleId],
      addRules: [
        {
          id: ruleId,
          priority: 2,
          action: {
            type: 'modifyHeaders',
            responseHeaders: [
              { header: 'x-frame-options', operation: 'remove' },
              { header: 'frame-options', operation: 'remove' },
              { header: 'content-security-policy', operation: 'remove' },
              { header: 'content-security-policy-report-only', operation: 'remove' }
            ]
          },
          condition: { tabIds: [state.tabId], resourceTypes: ['sub_frame'] }
        }
      ]
    });
  } catch (e) {
    toast(`放行规则安装失败：${e.message || e}`);
  }
}

/* 没有 background worker，顺手清掉已关闭标签页遗留的放行规则 */
async function cleanupStaleRules() {
  try {
    const [rules, tabs] = await Promise.all([
      chrome.declarativeNetRequest.getSessionRules(),
      chrome.tabs.query({})
    ]);
    const alive = new Set((tabs || []).map((tab) => tab.id));
    const stale = rules
      .filter((rule) => rule.id >= RULE_ID_BASE && rule.id < RULE_ID_BASE + 1000000)
      .filter((rule) => !(rule.condition.tabIds || []).some((id) => alive.has(id)))
      .map((rule) => rule.id);
    if (stale.length) await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: stale });
  } catch (e) {
    /* 忽略 */
  }
}

function render() {
  state.frames.clear();
  stage.textContent = '';
  for (const device of state.devices) stage.appendChild(buildDevice(device));
  applyScale();
  save();
  if (state.sync) ensureInjected();
}

function buildDevice(device) {
  const el = document.createElement('section');
  el.className = 'device';
  el.dataset.key = device.key;

  const head = document.createElement('div');
  head.className = 'device-head';

  const name = document.createElement('span');
  name.className = 'device-name';
  name.textContent = device.name;

  const widthInput = sizeInput(device.width);
  const heightInput = sizeInput(device.height);

  const size = document.createElement('span');
  size.className = 'device-size';
  size.append(widthInput, document.createTextNode('×'), heightInput);

  const scaleTag = document.createElement('span');
  scaleTag.className = 'device-scale';

  const actions = document.createElement('span');
  actions.className = 'device-actions';
  actions.append(
    iconButton('rotate', '旋转 90°', '⟳'),
    iconButton('reload', '刷新', '↻'),
    iconButton('popup', '在真实窗口中打开', '⧉'),
    iconButton('remove', '移除', '✕')
  );

  head.append(name, size, scaleTag, actions);

  const body = document.createElement('div');
  body.className = 'device-body';

  const scaler = document.createElement('div');
  scaler.className = 'scaler';

  const iframe = document.createElement('iframe');
  iframe.className = 'frame';
  iframe.setAttribute('sandbox', SANDBOX);
  iframe.setAttribute('referrerpolicy', 'no-referrer');
  iframe.setAttribute('allow', 'clipboard-read; clipboard-write; fullscreen');
  iframe.style.width = `${device.width}px`;
  iframe.style.height = `${device.height}px`;
  iframe.src = state.url || 'about:blank';

  scaler.style.width = `${device.width}px`;
  scaler.style.height = `${device.height}px`;
  scaler.appendChild(iframe);
  body.appendChild(scaler);
  el.append(head, body);

  parts.set(el, { iframe, scaler, body, scaleTag });

  const syncLabel = () => {
    name.title = `${device.name} · ${device.width}×${device.height} · DPR ${device.dpr || 1}`;
  };
  syncLabel();

  const resize = () => {
    iframe.style.width = `${device.width}px`;
    iframe.style.height = `${device.height}px`;
    scaler.style.width = `${device.width}px`;
    scaler.style.height = `${device.height}px`;
    syncLabel();
    applyScale();
    save();
  };

  widthInput.addEventListener('change', () => {
    device.width = clampSize(widthInput.value, device.width);
    widthInput.value = device.width;
    resize();
  });
  heightInput.addEventListener('change', () => {
    device.height = clampSize(heightInput.value, device.height);
    heightInput.value = device.height;
    resize();
  });

  actions.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const action = button.dataset.act;
    if (action === 'rotate') {
      const temp = device.width;
      device.width = device.height;
      device.height = temp;
      widthInput.value = device.width;
      heightInput.value = device.height;
      resize();
    } else if (action === 'reload') {
      reloadFrame(iframe);
    } else if (action === 'popup') {
      openWindow(device);
    } else if (action === 'remove') {
      state.devices = state.devices.filter((item) => item !== device);
      render();
    }
  });

  iframe.addEventListener('load', () => {
    if (iframe.contentWindow) state.frames.add(iframe.contentWindow);
    if (state.sync) ensureInjected();
  });

  return el;
}

function sizeInput(value) {
  const input = document.createElement('input');
  input.type = 'number';
  input.min = '120';
  input.max = '9999';
  input.value = value;
  return input;
}

function iconButton(act, title, glyph) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.act = act;
  button.title = title;
  button.textContent = glyph;
  return button;
}

function clampSize(value, fallback) {
  if (value === '' || value == null) return fallback;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(9999, Math.max(120, n));
}

function applyScale() {
  const availH = Math.max(160, stage.clientHeight - HEAD_SPACE - STAGE_PADDING - 8);
  const availW = Math.max(200, stage.clientWidth - STAGE_PADDING);

  for (const el of stage.querySelectorAll('.device')) {
    const device = state.devices.find((item) => item.key === el.dataset.key);
    const part = parts.get(el);
    if (!device || !part) continue;

    let scale;
    if (state.scale === 'fit-h') scale = Math.min(1, availH / device.height);
    else if (state.scale === 'fit-w') scale = Math.min(1, availW / device.width);
    else scale = Number(state.scale) || 1;
    scale = Math.max(0.05, scale);

    part.scaler.style.transform = `scale(${scale})`;
    part.body.style.width = `${Math.round(device.width * scale)}px`;
    part.body.style.height = `${Math.round(device.height * scale)}px`;
    part.scaleTag.textContent = `${Math.round(scale * 100)}%`;
  }
}

function reloadFrame(iframe) {
  iframe.src = state.url || iframe.src;
}

function openWindow(device) {
  const url = state.url || normalizeUrl($('#url').value);
  if (!url) {
    toast('请先输入网址');
    return;
  }
  chrome.windows.create({
    url,
    type: 'popup',
    width: device.width + 16,
    height: device.height + 48
  });
}

function bind() {
  $('#load').addEventListener('click', loadUrl);
  $('#url').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') loadUrl();
  });

  $('#scale').addEventListener('change', () => {
    state.scale = $('#scale').value;
    applyScale();
    save();
  });

  $('#sync').addEventListener('change', () => {
    state.sync = $('#sync').checked;
    if (state.sync) {
      ensureInjected();
      toast('同步滚动已开启');
    }
    save();
  });

  $('#refreshAll').addEventListener('click', () => {
    for (const el of stage.querySelectorAll('.device')) {
      const part = parts.get(el);
      if (part) reloadFrame(part.iframe);
    }
  });

  $('#openAll').addEventListener('click', () => {
    for (const device of state.devices) openWindow(device);
  });

  $('#add').addEventListener('click', () => togglePicker());
  $('#pickerClose').addEventListener('click', () => togglePicker(false));
  $('#padd').addEventListener('click', addCustomFromPicker);

  document.addEventListener('click', (event) => {
    if ($('#picker').hidden) return;
    if (event.target.closest('#picker') || event.target.closest('#add')) return;
    togglePicker(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') togglePicker(false);
  });

  window.addEventListener('message', onFrameMessage);

  window.addEventListener('pagehide', () => {
    if (state.tabId == null) return;
    chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [frameRuleId()] }).catch(() => {});
  });
}

function loadUrl() {
  const url = normalizeUrl($('#url').value);
  if (!url) {
    toast('请输入要预览的网址');
    return;
  }
  state.url = url;
  $('#url').value = url;
  for (const el of stage.querySelectorAll('.device')) {
    const part = parts.get(el);
    if (part) part.iframe.src = url;
  }
  save();
  toast('已加载到全部视口');
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

function onFrameMessage(event) {
  const data = event.data;
  if (!data || data.ch !== CH || data.type !== 'scroll') return;
  if (!state.sync) return;
  if (!state.frames.has(event.source)) return;
  for (const win of state.frames) {
    if (win === event.source) continue;
    try {
      win.postMessage(data, '*');
    } catch (e) {
      /* 忽略 */
    }
  }
}

/* 按需把同步滚动脚本注入到各 iframe（避免全局注入内容脚本） */
function ensureInjected() {
  if (state.tabId == null) return;
  clearTimeout(injectTimer);
  injectTimer = setTimeout(async () => {
    try {
      const frames = await chrome.webNavigation.getAllFrames({ tabId: state.tabId });
      const frameIds = (frames || [])
        .filter((frame) => frame.parentFrameId === 0)
        .filter((frame) => frame.url && frame.url !== 'about:blank')
        .map((frame) => frame.frameId);
      if (!frameIds.length) return;
      await chrome.scripting.executeScript({
        target: { tabId: state.tabId, frameIds },
        files: ['content.js']
      });
    } catch (e) {
      /* 某些页面不允许注入，忽略 */
    }
  }, 250);
}

function togglePicker(show) {
  const picker = $('#picker');
  const next = typeof show === 'boolean' ? show : picker.hidden;
  if (next) renderPicker();
  picker.hidden = !next;
}

function renderPicker() {
  const box = $('#pickerGroups');
  box.textContent = '';
  const present = new Set(state.devices.map((device) => device.id));

  for (const group of window.VM_PRESETS) {
    const section = document.createElement('section');
    section.className = 'pgroup';

    const title = document.createElement('h4');
    title.textContent = group.label;
    section.appendChild(title);

    const chips = document.createElement('div');
    chips.className = 'pchips';
    for (const device of group.devices) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip' + (present.has(device.id) ? ' on' : '');

      const name = document.createElement('span');
      name.textContent = device.name;
      const size = document.createElement('em');
      size.textContent = `${device.width}×${device.height}`;

      chip.append(name, size);
      chip.addEventListener('click', () => togglePreset(device));
      chips.appendChild(chip);
    }

    section.appendChild(chips);
    box.appendChild(section);
  }
}

function togglePreset(device) {
  const exists = state.devices.some((item) => item.id === device.id);
  if (exists) {
    state.devices = state.devices.filter((item) => item.id !== device.id);
  } else {
    state.devices.push(ensureKey(device));
  }
  render();
  renderPicker();
}

function addCustomFromPicker() {
  const width = clampSize($('#pw').value, 0);
  const height = clampSize($('#ph').value, 0);
  if (!width || !height) {
    toast('请输入有效的宽高（120 - 9999）');
    return;
  }
  state.devices.push(
    ensureKey({ id: `custom-${width}x${height}-${Date.now().toString(36)}`, name: '自定义', width, height, dpr: 1, mobile: width < 768 })
  );
  render();
  renderPicker();
}

function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    chrome.storage.local.set({
      [K_SESSION]: {
        url: state.url,
        devices: state.devices,
        scale: state.scale,
        sync: state.sync
      }
    });
  }, 300);
}

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.hidden = true;
  }, 2400);
}
