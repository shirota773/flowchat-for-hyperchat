console.log('[FlowChat] ✅ main.js loaded at', new Date().toISOString());
console.log('[FlowChat] URL:', window.location.href);

/**
 * FlowChat for HyperChat - メインエントリーポイント
 */

(async function() {
  'use strict';

  try {
    console.log('[FlowChat] Initializing...');
    console.log('[FlowChat] Current URL:', window.location.href);
    console.log('[FlowChat] Window context:', window === window.top ? 'TOP WINDOW' : 'IFRAME');

    // コンテキストを判定：hyperchat_embed iframe / live_chat iframe / main page
    const isHyperChatEmbed = window.location.href.includes('/embed/hyperchat_embed');
    const isLiveChatFrame = !isHyperChatEmbed && window.location.href.includes('live_chat');
    const isMainPage = !isHyperChatEmbed && !isLiveChatFrame && (
      window.location.href.includes('/watch') ||
      window.location.href.includes('/live/')
    );

    console.log('[FlowChat] Context detection:', {
      isHyperChatEmbed,
      isLiveChatFrame,
      isMainPage,
      url: window.location.href
    });

    if (isHyperChatEmbed) {
      console.log('[FlowChat] ✅ Running in hyperchat_embed iframe (HyperChatのメイン描画領域)');
      await initHyperChatEmbed();
    } else if (isLiveChatFrame) {
      console.log('[FlowChat] ✅ Running in live_chat iframe');
      await initLiveChatFrame();
    } else if (isMainPage) {
      console.log('[FlowChat] ✅ Running in main page');
      await initMainPage();
    } else {
      console.log('[FlowChat] ⏭️  Skipping initialization (not watch page or live_chat)');
      return;
    }

    console.log('[FlowChat] ✅ Initialization complete!');
  } catch (error) {
    console.error('[FlowChat] ❌ Fatal error during initialization:', error);
    console.error('[FlowChat] Error stack:', error.stack);
  }
})().catch(error => {
  console.error('[FlowChat] ❌ Unhandled promise rejection:', error);
});

/**
 * hyperchat_embed iframe での初期化
 * HyperChatが実際に描画される場所でメッセージをキャプチャ
 */
async function initHyperChatEmbed() {
  console.log('[FlowChat] 🟣 initHyperChatEmbed() called');

  // HyperChatのルート要素が描画されるのを待つ
  let attempts = 0;
  const maxAttempts = 50;

  const waitForHyperChat = async () => {
    while (attempts < maxAttempts) {
      const hyperChatRoot = document.querySelector('.hyperchat-root');
      if (hyperChatRoot) {
        console.log('[FlowChat] ✅ .hyperchat-root found!');
        return true;
      }
      attempts++;
      console.log(`[FlowChat] Waiting for .hyperchat-root... (${attempts}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
  };

  const found = await waitForHyperChat();
  if (!found) {
    console.error('[FlowChat] ❌ .hyperchat-root not found after waiting');
    return;
  }

  // HyperChatConnectorを初期化
  const connector = new HyperChatConnector((messageData) => {
    console.log('[FlowChat] 📤 Sending message from hyperchat_embed to main page:', messageData);

    // 2階層上（live_chat iframe → main page）にメッセージを送信
    // window.parent = live_chat iframe
    // window.parent.parent = main page
    if (window.parent && window.parent.parent) {
      window.parent.parent.postMessage({
        type: 'FLOWCHAT_MESSAGE',
        data: messageData
      }, '*');
    }
  });

  // 接続を開始
  console.log('[FlowChat] Starting HyperChatConnector in hyperchat_embed...');
  await connector.start();
  console.log('[FlowChat] HyperChatConnector started in hyperchat_embed');

  // グローバルに公開（デバッグ用）
  window.flowChatConnector = connector;
  console.log('[FlowChat] window.flowChatConnector is now available in hyperchat_embed');
}

/**
 * live_chat iframe での初期化
 * HyperChatのメッセージを親ウィンドウに転送
 */
async function initLiveChatFrame() {
  console.log('[FlowChat] 🔵 initLiveChatFrame() called');

  // HyperChatConnectorを初期化
  const connector = new HyperChatConnector((messageData) => {
    console.log('[FlowChat] 📤 Sending message to parent window:', messageData);
    // 親ウィンドウにメッセージを送信
    window.parent.postMessage({
      type: 'FLOWCHAT_MESSAGE',
      data: messageData
    }, '*');
  });

  // 接続を開始
  console.log('[FlowChat] Starting HyperChatConnector...');
  await connector.start();
  console.log('[FlowChat] HyperChatConnector started');

  // グローバルに公開（デバッグ用）
  window.flowChatConnector = connector;
  console.log('[FlowChat] window.flowChatConnector is now available');
}

/**
 * メインページでの初期化
 * video overlayを作成してiframeからのメッセージを受信
 */
async function initMainPage() {
  console.log('[FlowChat] 🟢 initMainPage() called');

  // FlowControllerを初期化
  console.log('[FlowChat] Creating FlowController...');
  const flowController = new FlowController();

  console.log('[FlowChat] Initializing FlowController...');
  const initialized = await flowController.init();

  if (!initialized) {
    console.error('[FlowChat] ❌ Failed to initialize flow controller');
    return;
  }
  console.log('[FlowChat] ✅ FlowController initialized successfully');

  // live_chat iframeからのメッセージを監視
  console.log('[FlowChat] 👂 Setting up message listener for iframe messages...');
  window.addEventListener('message', (event) => {
    // すべてのメッセージをログ（デバッグ用）
    if (event.data && event.data.type === 'FLOWCHAT_MESSAGE') {
      console.log('[FlowChat] 📨 Received message from iframe:', event.data.data);
      flowController.addMessage(event.data.data);
    }
  });
  console.log('[FlowChat] ✅ Message listener registered');

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
