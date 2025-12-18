/**
 * HyperChatとの接続を管理するクラス
 * HyperChatが有効な場合はポート経由でメッセージを受信し、
 * 無効な場合は通常のYouTubeチャットDOMを監視する
 */
class HyperChatConnector {
  constructor(onMessageCallback) {
    this.onMessageCallback = onMessageCallback;
    this.port = null;
    this.isHyperChatEnabled = false;
    this.fallbackObserver = null;
    this.processedMessages = new WeakSet();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * 接続を開始
   */
  async start() {
    // HyperChatの存在を確認
    const hyperChatDetected = await this.detectHyperChat();

    if (hyperChatDetected) {
      console.log('[FlowChat] HyperChat detected, connecting via port');
      this.connectToHyperChat();
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
    // Method 1: HyperChat iframe の確認
    const hyperChatIframe = document.querySelector('iframe#hyperchat');
    if (hyperChatIframe) {
      this.isHyperChatEnabled = true;
      return true;
    }

    // Method 2: チャットフレーム内で確認（iframeコンテキストの場合）
    if (window.location.href.includes('live_chat')) {
      // HyperChatのカスタム要素を探す
      const hyperChatElements = document.querySelectorAll('[class*="hyperchat"], [id*="hyperchat"]');
      if (hyperChatElements.length > 0) {
        this.isHyperChatEnabled = true;
        return true;
      }
    }

    // Method 3: 親ウィンドウでHyperChat iframeを確認
    try {
      if (window.parent !== window) {
        const parentHyperChat = window.parent.document.querySelector('iframe#hyperchat');
        if (parentHyperChat) {
          this.isHyperChatEnabled = true;
          return true;
        }
      }
    } catch (e) {
      // クロスオリジンの場合はアクセスできない
    }

    return false;
  }

  /**
   * HyperChatにポート経由で接続
   */
  connectToHyperChat() {
    try {
      // ポートに接続
      this.port = chrome.runtime.connect({ name: 'flowchat-hyperchat-bridge' });

      // メッセージリスナーを設定
      this.port.onMessage.addListener((message) => {
        this.handleHyperChatMessage(message);
      });

      // 切断リスナー
      this.port.onDisconnect.addListener(() => {
        console.warn('[FlowChat] Port disconnected from HyperChat');
        this.port = null;

        // 再接続を試みる
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => {
            console.log(`[FlowChat] Reconnecting (attempt ${this.reconnectAttempts})...`);
            this.connectToHyperChat();
          }, 1000 * this.reconnectAttempts);
        } else {
          console.error('[FlowChat] Max reconnection attempts reached, switching to fallback mode');
          this.startFallbackMode();
        }
      });

      // クライアント登録を要求
      this.port.postMessage({
        type: 'registerClient',
        getInitialData: true
      });

      console.log('[FlowChat] Connected to HyperChat via port');
      this.reconnectAttempts = 0; // 成功したらリセット
    } catch (error) {
      console.error('[FlowChat] Failed to connect to HyperChat:', error);
      this.startFallbackMode();
    }
  }

  /**
   * HyperChatからのメッセージを処理
   */
  handleHyperChatMessage(message) {
    if (!message) return;

    // メッセージタイプに応じて処理
    switch (message.type) {
      case 'registerClientResponse':
        if (message.success) {
          console.log('[FlowChat] Successfully registered with HyperChat');
        } else {
          console.warn('[FlowChat] Failed to register with HyperChat:', message.failReason);
          this.startFallbackMode();
        }
        break;

      case 'initialData':
        console.log('[FlowChat] Received initial data from HyperChat');
        // 初期データの処理（必要に応じて）
        break;

      case 'action':
        // メッセージアクションを処理
        this.processHyperChatAction(message);
        break;

      case 'themeUpdate':
        // テーマ更新（必要に応じて）
        console.log('[FlowChat] Theme updated:', message.dark);
        break;

      default:
        console.debug('[FlowChat] Unknown message type:', message.type);
    }
  }

  /**
   * HyperChatのアクションを処理
   */
  processHyperChatAction(action) {
    if (!action.messages || !Array.isArray(action.messages)) {
      return;
    }

    // 各メッセージを処理
    action.messages.forEach((parsedMessage) => {
      if (!parsedMessage) return;

      // FlowChat用のメッセージデータに変換
      const flowMessage = this.convertHyperChatMessage(parsedMessage);
      if (flowMessage) {
        this.onMessageCallback(flowMessage);
      }
    });
  }

  /**
   * HyperChatのメッセージをFlowChat形式に変換
   */
  convertHyperChatMessage(parsedMessage) {
    try {
      // メッセージテキストを抽出
      let messageText = '';
      if (parsedMessage.message && Array.isArray(parsedMessage.message)) {
        messageText = parsedMessage.message
          .map(run => {
            if (run.type === 'text') return run.text;
            if (run.type === 'emoji') return run.alt || '';
            if (run.type === 'link') return run.text;
            return '';
          })
          .join('');
      }

      const flowMessage = {
        id: parsedMessage.messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: parsedMessage.superChat ? 'superchat' :
              parsedMessage.superSticker ? 'supersticker' :
              parsedMessage.membership ? 'membership' : 'text',
        author: parsedMessage.author?.name || 'Unknown',
        message: messageText,
        avatar: parsedMessage.author?.profileIcon?.src || '',
        amount: parsedMessage.superChat?.amount || parsedMessage.superSticker?.amount || null,
        backgroundColor: parsedMessage.superChat?.headerBackgroundColor ||
                         parsedMessage.superSticker?.bodyBackgroundColor || null,
        timestamp: Date.now(),
        showtime: parsedMessage.showtime || Date.now(),
      };

      return flowMessage;
    } catch (error) {
      console.error('[FlowChat] Error converting HyperChat message:', error);
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
    }
  }

  /**
   * 通常のYouTubeチャットを監視
   */
  observeStandardChat(container) {
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
      subtree: true,
    });

    console.log('[FlowChat] Observing standard YouTube chat');
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

      const avatarElement = element.querySelector('#author-photo img');
      const avatar = avatarElement?.src || '';

      let amount = null;
      if (type === 'superchat') {
        const amountElement = element.querySelector('#purchase-amount');
        amount = amountElement?.textContent?.trim() || null;
      }

      const backgroundColor = window.getComputedStyle(element).backgroundColor;

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
    if (hyperChatEnabled && !this.isHyperChatEnabled && !this.port) {
      console.log('[FlowChat] HyperChat became available, switching from fallback mode');
      if (this.fallbackObserver) {
        this.fallbackObserver.disconnect();
        this.fallbackObserver = null;
      }
      this.connectToHyperChat();
    } else if (!hyperChatEnabled && this.isHyperChatEnabled && this.port) {
      console.log('[FlowChat] HyperChat became unavailable, switching to fallback mode');
      this.port.disconnect();
      this.port = null;
      this.startFallbackMode();
    }

    this.isHyperChatEnabled = hyperChatEnabled;
  }

  /**
   * クリーンアップ
   */
  destroy() {
    if (this.port) {
      this.port.disconnect();
      this.port = null;
    }
    if (this.fallbackObserver) {
      this.fallbackObserver.disconnect();
      this.fallbackObserver = null;
    }
  }
}

// グローバルに公開
window.HyperChatConnector = HyperChatConnector;
