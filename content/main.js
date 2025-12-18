/**
 * FlowChat for HyperChat - メインエントリーポイント
 */

(async function() {
  'use strict';

  console.log('[FlowChat] Initializing...');

  // FlowControllerを初期化
  const flowController = new FlowController();
  const initialized = await flowController.init();

  if (!initialized) {
    console.error('[FlowChat] Failed to initialize flow controller');
    return;
  }

  // HyperChatConnectorを初期化
  const connector = new HyperChatConnector((messageData) => {
    // メッセージを受信したらFlowControllerに追加
    flowController.addMessage(messageData);
  });

  // 接続を開始
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

  // URLが変わったときの処理
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log('[FlowChat] URL changed, reinitializing...');

      // 再初期化
      setTimeout(async () => {
        flowController.destroy();
        connector.destroy();

        const newFlowController = new FlowController();
        await newFlowController.init();

        const newConnector = new HyperChatConnector((messageData) => {
          newFlowController.addMessage(messageData);
        });
        await newConnector.start();

        // グローバル参照を更新
        window.flowChatController = newFlowController;
        window.flowChatConnector = newConnector;
      }, 1000);
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

  console.log('[FlowChat] Initialization complete!');
})();
