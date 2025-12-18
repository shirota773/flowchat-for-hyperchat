/**
 * HyperChatとの接続を管理するクラス
 *
 * HyperChatはwindowイベントでメッセージを配信するため、
 * chrome.runtime.connect()ではなく、windowイベントリスナーを使用します
 */
class HyperChatConnector {
  constructor(onMessageCallback) {
    this.onMessageCallback = onMessageCallback;
    this.isHyperChatEnabled = false;
    this.fallbackObserver = null;
    this.processedMessages = new WeakSet();
    this.messageEventBound = false;
  }

  /**
   * 接続を開始
   */
  async start() {
    console.log('[FlowChat] HyperChatConnector starting...');

    // HyperChatの存在を確認
    const hyperChatDetected = await this.detectHyperChat();

    if (hyperChatDetected) {
      console.log('[FlowChat] HyperChat detected, listening to window events');
      this.listenToHyperChatEvents();
    } else {
      console.log('[FlowChat] HyperChat not detected, using fallback mode');
      this.startFallbackMode();
    }

    // 定期的にHyperChatの状態を確認
    setInterval(() => this.checkHyperChatStatus(), 5000);
  }

  /**
   * HyperChatが有効かどうかを検出
   */
  async detectHyperChat() {
    // HyperChatのルート要素を探す（最も確実な方法）
    const hyperChatRoot = document.querySelector('.hyperchat-root');
    if (hyperChatRoot) {
      this.isHyperChatEnabled = true;
      return true;
    }

    // Svelteコンポーネントの存在を確認（バックアップ）
    const hyperchatComponent = document.querySelector('[class*="hyperchat"]');
    if (hyperchatComponent && window.location.href.includes('live_chat')) {
      this.isHyperChatEnabled = true;
      return true;
    }

    return false;
  }

  /**
   * HyperChatのwindowイベントをリッスン
   */
  listenToHyperChatEvents() {
    if (this.messageEventBound) {
      return; // 既にバインド済み
    }

    // HyperChatが発行するmessageReceiveイベントを監視
    window.addEventListener('messageReceive', (event) => {
      try {
        const data = event.detail;
        console.log('[FlowChat] Received messageReceive event from HyperChat');
        this.processHyperChatData(data);
      } catch (error) {
        console.error('[FlowChat] Error processing HyperChat event:', error);
      }
    });

    // messageSentイベントも監視（自分が送信したメッセージ）
    window.addEventListener('messageSent', (event) => {
      try {
        const data = event.detail;
        console.log('[FlowChat] Received messageSent event from HyperChat');
        this.processHyperChatData(data);
      } catch (error) {
        console.error('[FlowChat] Error processing HyperChat sent event:', error);
      }
    });

    this.messageEventBound = true;
    console.log('[FlowChat] Now listening to HyperChat window events');
  }

  /**
   * HyperChatのデータを処理
   */
  processHyperChatData(jsonData) {
    try {
      // JSONデータをパース
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

      console.log('[FlowChat] Processing HyperChat data:', data);

      // データ構造を解析してメッセージを抽出
      this.extractMessagesFromData(data);
    } catch (error) {
      console.error('[FlowChat] Error parsing HyperChat data:', error);
    }
  }

  /**
   * データからメッセージを抽出
   */
  extractMessagesFromData(data) {
    // YouTubeのAPIレスポンス形式を処理
    const continuation = data?.continuationContents?.liveChatContinuation;
    const renderer = data?.contents?.liveChatRenderer;

    const base = continuation || renderer;
    const actions = base?.actions;

    if (!actions || !Array.isArray(actions)) {
      return;
    }

    actions.forEach(action => {
      try {
        // 各種アクションタイプを処理
        if (action.addChatItemAction) {
          this.processAddChatItemAction(action.addChatItemAction);
        } else if (action.replayChatItemAction) {
          const replayActions = action.replayChatItemAction.actions;
          if (replayActions && Array.isArray(replayActions)) {
            replayActions.forEach(replayAction => {
              if (replayAction.addChatItemAction) {
                this.processAddChatItemAction(replayAction.addChatItemAction);
              }
            });
          }
        }
      } catch (error) {
        console.error('[FlowChat] Error processing action:', error, action);
      }
    });
  }

  /**
   * addChatItemActionを処理
   */
  processAddChatItemAction(action) {
    const item = action.item;
    if (!item) return;

    // 各種レンダラータイプに対応
    const renderer =
      item.liveChatTextMessageRenderer ||
      item.liveChatPaidMessageRenderer ||
      item.liveChatPaidStickerRenderer ||
      item.liveChatMembershipItemRenderer;

    if (!renderer) return;

    // メッセージデータを抽出
    const flowMessage = this.extractFlowMessage(renderer);
    if (flowMessage) {
      this.onMessageCallback(flowMessage);
    }
  }

  /**
   * フローメッセージに変換
   */
  extractFlowMessage(renderer) {
    try {
      // 作者情報
      const author = renderer.authorName?.simpleText || 'Unknown';
      const avatar = renderer.authorPhoto?.thumbnails?.[0]?.url || '';

      // メッセージテキスト
      let messageText = '';
      if (renderer.message?.runs) {
        messageText = renderer.message.runs.map(run => {
          if (run.text) return run.text;
          if (run.emoji) return run.emoji.emojiId || '';
          return '';
        }).join('');
      }

      // メッセージタイプを判定
      let type = 'text';
      let amount = null;
      let backgroundColor = null;

      if (renderer.purchaseAmountText) {
        // スーパーチャットまたはスーパーステッカー
        type = renderer.sticker ? 'supersticker' : 'superchat';
        amount = renderer.purchaseAmountText.simpleText;

        if (renderer.headerBackgroundColor) {
          backgroundColor = '#' + renderer.headerBackgroundColor.toString(16).padStart(6, '0');
        }
      } else if (renderer.headerPrimaryText) {
        type = 'membership';
      }

      const flowMessage = {
        id: renderer.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        author,
        message: messageText,
        avatar,
        amount,
        backgroundColor,
        timestamp: Date.now(),
        showtime: Date.now(),
      };

      console.log('[FlowChat] Extracted flow message:', flowMessage);
      return flowMessage;
    } catch (error) {
      console.error('[FlowChat] Error extracting flow message:', error);
      return null;
    }
  }

  /**
   * フォールバックモード: 通常のYouTubeチャットDOMを監視
   */
  startFallbackMode() {
    if (this.fallbackObserver) {
      return; // すでに開始済み
    }

    console.log('[FlowChat] Starting fallback mode (watching standard YouTube chat DOM)');

    // 定期的にチャットコンテナを探す
    const findAndObserve = () => {
      const selectors = [
        '#items.yt-live-chat-item-list-renderer',
        'yt-live-chat-item-list-renderer #items',
      ];

      for (const selector of selectors) {
        const container = document.querySelector(selector);
        if (container && !this.processedMessages.has(container)) {
          this.observeStandardChat(container);
          return true;
        }
      }
      return false;
    };

    // 初回実行
    if (!findAndObserve()) {
      // 見つからない場合は定期的に再試行
      const interval = setInterval(() => {
        if (findAndObserve()) {
          clearInterval(interval);
        }
      }, 1000);

      // 30秒でタイムアウト
      setTimeout(() => clearInterval(interval), 30000);
    }
  }

  /**
   * 通常のYouTubeチャットを監視
   */
  observeStandardChat(container) {
    console.log('[FlowChat] Observing standard YouTube chat container');

    // 既存のメッセージを処理
    this.processExistingMessages(container);

    // MutationObserverで新しいメッセージを監視
    this.fallbackObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.processStandardMessage(node);
            }
          });
        }
      });
    });

    this.fallbackObserver.observe(container, {
      childList: true,
      subtree: false, // 直接の子要素のみ監視
    });

    console.log('[FlowChat] Standard YouTube chat observer started');
  }

  /**
   * 既存のメッセージを処理
   */
  processExistingMessages(container) {
    const messageElements = container.querySelectorAll(
      'yt-live-chat-text-message-renderer, ' +
      'yt-live-chat-paid-message-renderer, ' +
      'yt-live-chat-paid-sticker-renderer, ' +
      'yt-live-chat-membership-item-renderer'
    );

    console.log(`[FlowChat] Found ${messageElements.length} existing messages`);

    messageElements.forEach((element) => {
      if (!this.processedMessages.has(element)) {
        this.processStandardMessage(element);
      }
    });
  }

  /**
   * 通常のYouTubeチャットメッセージを処理
   */
  processStandardMessage(element) {
    if (this.processedMessages.has(element)) {
      return;
    }

    try {
      // メッセージタイプを判定
      const tagName = element.tagName.toLowerCase();
      let type = 'text';
      if (tagName.includes('paid-message')) type = 'superchat';
      else if (tagName.includes('paid-sticker')) type = 'supersticker';
      else if (tagName.includes('membership')) type = 'membership';

      // データを抽出
      const authorElement = element.querySelector('#author-name');
      const author = authorElement?.textContent?.trim() || 'Unknown';

      const messageElement = element.querySelector('#message');
      const message = messageElement?.textContent?.trim() || '';

      if (!message) {
        // メッセージが空の場合はスキップ
        this.processedMessages.add(element);
        return;
      }

      const avatarElement = element.querySelector('#author-photo img');
      const avatar = avatarElement?.src || '';

      let amount = null;
      let backgroundColor = null;

      if (type === 'superchat') {
        const amountElement = element.querySelector('#purchase-amount');
        amount = amountElement?.textContent?.trim() || null;

        // 背景色を取得
        const headerElement = element.querySelector('#header');
        if (headerElement) {
          backgroundColor = window.getComputedStyle(headerElement).backgroundColor;
        }
      }

      const flowMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        author,
        message,
        avatar,
        amount,
        backgroundColor,
        timestamp: Date.now(),
        showtime: Date.now(),
      };

      this.processedMessages.add(element);
      console.log('[FlowChat] Processed standard message:', flowMessage);
      this.onMessageCallback(flowMessage);
    } catch (error) {
      console.error('[FlowChat] Error processing standard message:', error);
    }
  }

  /**
   * HyperChatの状態を定期的に確認
   */
  async checkHyperChatStatus() {
    const hyperChatEnabled = await this.detectHyperChat();

    // 状態が変わった場合
    if (hyperChatEnabled && !this.isHyperChatEnabled) {
      console.log('[FlowChat] HyperChat became available, switching from fallback mode');
      if (this.fallbackObserver) {
        this.fallbackObserver.disconnect();
        this.fallbackObserver = null;
      }
      this.listenToHyperChatEvents();
    } else if (!hyperChatEnabled && this.isHyperChatEnabled && !this.fallbackObserver) {
      console.log('[FlowChat] HyperChat became unavailable, switching to fallback mode');
      this.messageEventBound = false;
      this.startFallbackMode();
    }

    this.isHyperChatEnabled = hyperChatEnabled;
  }

  /**
   * クリーンアップ
   */
  destroy() {
    if (this.fallbackObserver) {
      this.fallbackObserver.disconnect();
      this.fallbackObserver = null;
    }
    this.messageEventBound = false;
  }
}

// グローバルに公開
window.HyperChatConnector = HyperChatConnector;
