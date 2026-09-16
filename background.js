const RULE_ID_BASE = 9000;
const PREVIEW_URL = chrome.runtime.getURL('preview.html');

function frameRuleId(tabId) {
  return RULE_ID_BASE + (tabId % 1000000);
}

async function addFrameRule(tabId) {
  const ruleId = frameRuleId(tabId);
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
          condition: {
            tabIds: [tabId],
            resourceTypes: ['sub_frame']
          }
        }
      ]
    });
  } catch (e) {
    console.warn('[Viewport Mount] 无法为预览标签页安装放行规则', e);
  }
}

chrome.tabs.onCreated.addListener((tab) => {
  const url = tab.pendingUrl || tab.url || '';
  if (url.startsWith(PREVIEW_URL) && tab.id != null) addFrameRule(tab.id);
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  try {
    const rules = await chrome.declarativeNetRequest.getSessionRules();
    const ids = rules
      .filter((rule) => Array.isArray(rule.condition.tabIds) && rule.condition.tabIds.includes(tabId))
      .map((rule) => rule.id);
    if (ids.length) await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: ids });
  } catch (e) {
    /* 忽略 */
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['vm.customs'], (data) => {
    if (!Array.isArray(data['vm.customs'])) chrome.storage.local.set({ 'vm.customs': [] });
  });
});
