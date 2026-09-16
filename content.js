/* 由预览页按需注入到各个 iframe，用于同步滚动 */
(() => {
  if (window.__vmScrollBridge) return;
  if (window.top === window) return;
  window.__vmScrollBridge = true;

  const CH = 'viewport-mount';
  let suppress = 0;
  let scheduled = false;

  function maxScroll() {
    const doc = document.scrollingElement || document.documentElement;
    if (!doc) return 0;
    return Math.max(0, doc.scrollHeight - window.innerHeight);
  }

  window.addEventListener(
    'scroll',
    () => {
      if (suppress > 0 || scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        const max = maxScroll();
        if (!max) return;
        window.parent.postMessage(
          { ch: CH, type: 'scroll', ratio: Math.min(1, Math.max(0, window.scrollY / max)) },
          '*'
        );
      });
    },
    { passive: true }
  );

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return;
    const data = event.data;
    if (!data || data.ch !== CH || data.type !== 'scroll') return;
    const max = maxScroll();
    suppress++;
    window.scrollTo(0, data.ratio * max);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        suppress--;
      });
    });
  });
})();
