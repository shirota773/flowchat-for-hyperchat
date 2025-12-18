/**
 * FlowChat for HyperChat - メインエントリーポイント
 */

(async function() {
  'use strict';

  console.log('[FlowChat] Initializing...');

  // コンテキストを判定：live_chat iframe か main page か
  const isLiveChatFrame = window.location.href.includes('live_chat');
  const isMainPage = !isLiveChatFrame && (
    window.location.href.includes('/watch') ||
    window.location.href.includes('/live/')
  );

  if (isLiveChatFrame) {
    console.log('[FlowChat] Running in live_chat iframe');
    await initLiveChatFrame();
  } else if (isMainPage) {
    console.log('[FlowChat] Running in main page');
    await initMainPage();
  } else {
    console.log('[FlowChat] Skipping initialization (not watch page or live_chat)');
    return;
  }

  console.log('[FlowChat] Initialization complete!');
})();

/**
 * live_chat iframe での初期化
 * HyperChatのメッセージを親ウィンドウに転送
 */
async function initLiveChatFrame() {
  // HyperChatConnectorを初期化
  const connector = new HyperChatConnector((messageData) => {
    // 親ウィンドウにメッセージを送信
    window.parent.postMessage({
      type: 'FLOWCHAT_MESSAGE',
      data: messageData
    }, '*');
  });

  // 接続を開始
  await connector.start();

  // グローバルに公開（デバッグ用）
  window.flowChatConnector = connector;
}

/**
 * メインページでの初期化
 * video overlayを作成してiframeからのメッセージを受信
 */
async function initMainPage() {
  // FlowControllerを初期化
  const flowController = new FlowController();
  const initialized = await flowController.init();

  if (!initialized) {
    console.error('[FlowChat] Failed to initialize flow controller');
    return;
  }

  // live_chat iframeからのメッセージを監視
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'FLOWCHAT_MESSAGE') {
      console.log('[FlowChat] Received message from iframe:', event.data.data);
      flowController.addMessage(event.data.data);
    }
  });

  // フォールバック：通常のYouTubeチャットも監視（HyperChatが無効の場合）
  const connector = new HyperChatConnector((messageData) => {
    flowController.addMessage(messageData);
  });
  await connector.start();

  // タイムラインクリーンアップ（メモリリーク防止）
  setInterval(() => {
    if (flowController.timelines) {
      flowController.timelines = flowController.timelines.map((timelines) => {
        if (!timelines) return [];
        return timelines.filter((timeline) => {
          return timeline.didDisappear > Date.now();
        });
      });
    }
  }, 5000);

  // URLが変わったときの処理（YouTubeのSPA遷移に対応）
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log('[FlowChat] URL changed, reloading page...');
      // SPAナビゲーションの場合は単純にリロード
      location.reload();
    }
  }).observe(document, { subtree: true, childList: true });

  // クリーンアップ
  window.addEventListener('beforeunload', () => {
    flowController.destroy();
    connector.destroy();
  });

  // デバッグ用にグローバルに公開
  window.flowChatController = flowController;
  window.flowChatConnector = connector;
}
