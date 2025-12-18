// FlowChat for HyperChat - Background Service Worker

console.log('[FlowChat] Background service worker loaded');

// インストール時
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[FlowChat] Extension installed');
    // デフォルト設定を保存
    chrome.storage.sync.set({
      flowChatSettings: {
        enabled: true,
        fontSize: 28,
        displayTime: 5,
        opacity: 0.9,
        maxDisplays: 10,
        lines: 12,
        fontColor: '#FFFFFF',
        fontWeight: 'bold',
        fontShadow: true,
        showAuthor: false,
        showAvatar: true,
        superChatScale: 1.5,
        overflow: 'hidden',
      }
    });
  } else if (details.reason === 'update') {
    console.log('[FlowChat] Extension updated');
  }
});

// メッセージハンドラ
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[FlowChat] Message received:', message);

  switch (message.type) {
    case 'getSettings':
      chrome.storage.sync.get(['flowChatSettings'], (result) => {
        sendResponse(result.flowChatSettings);
      });
      return true; // 非同期レスポンス

    default:
      console.warn('[FlowChat] Unknown message type:', message.type);
  }
});

// HyperChatからの接続をリレー（必要に応じて）
chrome.runtime.onConnect.addListener((port) => {
  console.log('[FlowChat] Port connected:', port.name);

  port.onMessage.addListener((message) => {
    console.log('[FlowChat] Port message:', message);
    // 必要に応じてメッセージを処理
  });

  port.onDisconnect.addListener(() => {
    console.log('[FlowChat] Port disconnected:', port.name);
  });
});
