/* 常用设备 / 断点预设，popup 与预览页共用 */
window.VM_PRESETS = [
  {
    id: 'phone',
    label: '手机',
    devices: [
      { id: 'iphone-se', name: 'iPhone SE', width: 375, height: 667, dpr: 2, mobile: true },
      { id: 'iphone-15', name: 'iPhone 15', width: 393, height: 852, dpr: 3, mobile: true },
      { id: 'iphone-15-pm', name: 'iPhone 15 Pro Max', width: 430, height: 932, dpr: 3, mobile: true },
      { id: 'pixel-8', name: 'Pixel 8', width: 412, height: 915, dpr: 2.6, mobile: true },
      { id: 'galaxy-s23', name: 'Galaxy S23', width: 360, height: 780, dpr: 3, mobile: true },
      { id: 'narrow-320', name: '极窄 320', width: 320, height: 568, dpr: 2, mobile: true }
    ]
  },
  {
    id: 'tablet',
    label: '平板',
    devices: [
      { id: 'ipad-mini', name: 'iPad mini', width: 768, height: 1024, dpr: 2, mobile: true },
      { id: 'ipad-air', name: 'iPad Air', width: 820, height: 1180, dpr: 2, mobile: true },
      { id: 'ipad-pro-11', name: 'iPad Pro 11', width: 834, height: 1194, dpr: 2, mobile: true },
      { id: 'ipad-pro-13', name: 'iPad Pro 13', width: 1024, height: 1366, dpr: 2, mobile: true },
      { id: 'surface-pro', name: 'Surface Pro', width: 912, height: 1368, dpr: 2, mobile: true }
    ]
  },
  {
    id: 'laptop',
    label: '笔记本',
    devices: [
      { id: 'mbp-13', name: 'MacBook Air 13', width: 1440, height: 900, dpr: 2, mobile: false },
      { id: 'mbp-14', name: 'MacBook Pro 14', width: 1512, height: 982, dpr: 2, mobile: false },
      { id: 'mbp-16', name: 'MacBook Pro 16', width: 1728, height: 1117, dpr: 2, mobile: false },
      { id: 'lap-1280', name: '笔记本 1280', width: 1280, height: 800, dpr: 1, mobile: false },
      { id: 'lap-1366', name: '笔记本 1366', width: 1366, height: 768, dpr: 1, mobile: false }
    ]
  },
  {
    id: 'desktop',
    label: '桌面',
    devices: [
      { id: 'fhd', name: 'FHD 1080p', width: 1920, height: 1080, dpr: 1, mobile: false },
      { id: 'qhd', name: 'QHD 2K', width: 2560, height: 1440, dpr: 1, mobile: false },
      { id: 'ultrawide', name: '带鱼屏 21:9', width: 3440, height: 1440, dpr: 1, mobile: false },
      { id: 'uhd', name: 'UHD 4K', width: 3840, height: 2160, dpr: 1, mobile: false }
    ]
  },
  {
    id: 'tailwind',
    label: 'Tailwind 断点',
    devices: [
      { id: 'tw-sm', name: 'sm 640', width: 640, height: 900, dpr: 1, mobile: false },
      { id: 'tw-md', name: 'md 768', width: 768, height: 900, dpr: 1, mobile: false },
      { id: 'tw-lg', name: 'lg 1024', width: 1024, height: 900, dpr: 1, mobile: false },
      { id: 'tw-xl', name: 'xl 1280', width: 1280, height: 900, dpr: 1, mobile: false },
      { id: 'tw-2xl', name: '2xl 1536', width: 1536, height: 960, dpr: 1, mobile: false }
    ]
  },
  {
    id: 'bootstrap',
    label: 'Bootstrap 断点',
    devices: [
      { id: 'bs-sm', name: 'sm 576', width: 576, height: 800, dpr: 1, mobile: false },
      { id: 'bs-md', name: 'md 768', width: 768, height: 800, dpr: 1, mobile: false },
      { id: 'bs-lg', name: 'lg 992', width: 992, height: 800, dpr: 1, mobile: false },
      { id: 'bs-xl', name: 'xl 1200', width: 1200, height: 800, dpr: 1, mobile: false },
      { id: 'bs-xxl', name: 'xxl 1400', width: 1400, height: 900, dpr: 1, mobile: false }
    ]
  }
];

window.VM_DEFAULT_IDS = ['iphone-15', 'ipad-air', 'tw-lg'];

window.VM_findDevice = function (id) {
  for (const group of window.VM_PRESETS) {
    const found = group.devices.find((d) => d.id === id);
    if (found) return found;
  }
  return null;
};
