/**
 * チャットメッセージのフロー表示を制御するクラス
 * youtube-live-chat-flowのFlowControllerを参考にした実装
 */
class FlowController {
  constructor() {
    this._enabled = false;
    this.settings = {
      enabled: true,
      fontSize: 28,
      displayTime: 5, // 秒
      opacity: 0.9,
      maxDisplays: 10, // 1秒あたりの最大表示数（0=無制限）
      lines: 12,
      fontColor: '#FFFFFF',
      fontWeight: 'bold',
      fontShadow: true,
      showAuthor: false,
      showAvatar: true,
      superChatScale: 1.5,
      overflow: 'hidden', // or 'overlap'
    };

    this.timelines = [];
    this.container = null;
    this.video = null;
    this.messageQueue = [];
    this.limiter = null;
    this.queueProcessor = null;

    this.loadSettings();
  }

  /**
   * 設定を読み込む
   */
  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['flowChatSettings']);
      if (result.flowChatSettings) {
        this.settings = { ...this.settings, ...result.flowChatSettings };
      }
      this.limiter = new MessageLimiter(this.settings.maxDisplays);
    } catch (error) {
      console.error('[FlowChat] Failed to load settings:', error);
    }

    // 設定変更を監視
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.flowChatSettings) {
        this.settings = { ...this.settings, ...changes.flowChatSettings.newValue };
        this.limiter = new MessageLimiter(this.settings.maxDisplays);
      }
    });
  }

  /**
   * 初期化
   */
  async init() {
    // 動画要素を見つける
    await this.findVideo();

    if (!this.video) {
      console.warn('[FlowChat] Video element not found');
      return false;
    }

    // コンテナを作成
    this.createContainer();

    // 動画イベントリスナー
    this.video.addEventListener('play', () => this.onVideoPlay());
    this.video.addEventListener('pause', () => this.onVideoPause());

    // キュー処理を開始
    this.startQueueProcessor();

    this._enabled = this.settings.enabled;

    console.log('[FlowChat] Flow controller initialized');
    return true;
  }

  /**
   * 動画要素を見つける
   */
  async findVideo() {
    const selectors = [
      'video.html5-main-video',
      'ytd-watch-flexy video',
      '.html5-video-player video',
    ];

    for (const selector of selectors) {
      this.video = document.querySelector(selector);
      if (this.video) {
        console.log('[FlowChat] Video element found');
        return;
      }
    }

    // 見つからない場合は待機
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        for (const selector of selectors) {
          this.video = document.querySelector(selector);
          if (this.video) {
            clearInterval(interval);
            console.log('[FlowChat] Video element found (delayed)');
            resolve();
            return;
          }
        }
      }, 500);

      // 10秒でタイムアウト
      setTimeout(() => {
        clearInterval(interval);
        resolve();
      }, 10000);
    });
  }

  /**
   * コンテナを作成
   */
  createContainer() {
    // 既存のコンテナがあれば削除
    const existing = document.getElementById('flowchat-overlay');
    if (existing) {
      existing.remove();
    }

    this.container = document.createElement('div');
    this.container.id = 'flowchat-overlay';
    this.container.className = 'flowchat-overlay';

    // 動画コンテナを見つける
    const videoContainer = document.querySelector('.html5-video-container') ||
                          document.querySelector('.html5-video-player') ||
                          this.video?.parentElement;

    if (videoContainer) {
      videoContainer.appendChild(this.container);
      console.log('[FlowChat] Overlay container created');
    } else {
      console.error('[FlowChat] Video container not found');
    }
  }

  /**
   * メッセージをキューに追加
   */
  addMessage(messageData) {
    if (!this._enabled || !this.container) return;

    this.messageQueue.push(messageData);

    // キューの長さを制限
    if (this.messageQueue.length > 200) {
      this.messageQueue.shift();
    }
  }

  /**
   * キュー処理を開始
   */
  startQueueProcessor() {
    this.queueProcessor = setInterval(() => {
      this.processQueue();
    }, 100);
  }

  /**
   * キューからメッセージを処理
   */
  async processQueue() {
    if (!this._enabled || !this.video || this.video.paused) {
      return;
    }

    while (this.messageQueue.length > 0) {
      const messageData = this.messageQueue.shift();
      await this.displayMessage(messageData);

      // 少し待機
      await this.sleep(50);
    }
  }

  /**
   * メッセージを表示
   */
  async displayMessage(messageData) {
    if (!this._enabled || !this.container || !this.video) return;

    // リミッターチェック
    if (this.settings.maxDisplays > 0 && this.limiter && this.limiter.isOver()) {
      return;
    }

    // メッセージ要素を作成
    const messageElement = this.createMessageElement(messageData);
    if (!messageElement) return;

    // 一時的に非表示で追加（サイズ計算のため）
    messageElement.style.display = 'none';
    this.container.appendChild(messageElement);

    // 画像の読み込みを待つ
    await this.waitForImages(messageElement);

    // 表示位置を計算
    messageElement.style.display = 'flex';
    const placement = this.calculatePlacement(messageElement);

    if (!placement && this.settings.overflow === 'hidden') {
      messageElement.remove();
      return;
    }

    if (placement) {
      messageElement.style.top = `${placement.top}px`;
      messageElement.style.opacity = String(placement.opacity);
      messageElement.style.zIndex = String(placement.zIndex);
    }

    // アニメーションを開始
    this.startAnimation(messageElement);
  }

  /**
   * メッセージ要素を作成
   */
  createMessageElement(messageData) {
    const element = document.createElement('div');
    element.className = 'flowchat-message';
    element.dataset.type = messageData.type;

    // スケールを適用
    const scale = messageData.type === 'superchat' ? this.settings.superChatScale : 1;
    const fontSize = this.settings.fontSize * scale;

    // スタイル
    let styleCSS = `
      font-size: ${fontSize}px;
      color: ${this.settings.fontColor};
      font-weight: ${this.settings.fontWeight};
      opacity: ${this.settings.opacity};
    `;

    if (this.settings.fontShadow) {
      styleCSS += `
        text-shadow:
          -2px -2px 3px #000, 2px -2px 3px #000,
          -2px 2px 3px #000, 2px 2px 3px #000,
          0 0 5px rgba(0,0,0,0.8);
      `;
    }

    // スーパーチャットの背景色
    if (messageData.type === 'superchat' && messageData.backgroundColor) {
      const bgColor = messageData.backgroundColor.startsWith('#')
        ? messageData.backgroundColor
        : `#${messageData.backgroundColor}`;
      styleCSS += `
        background-color: ${bgColor};
        padding: 6px 12px;
        border-radius: 4px;
      `;
    }

    element.style.cssText = styleCSS;

    // 内容を構築
    let content = '';

    // アバター
    if (this.settings.showAvatar && messageData.avatar) {
      content += `
        <img
          src="${this.escapeHtml(messageData.avatar)}"
          class="flowchat-avatar"
          alt="avatar"
          onerror="this.style.display='none'"
        >
      `;
    }

    // 作者名
    if (this.settings.showAuthor) {
      content += `<span class="flowchat-author">${this.escapeHtml(messageData.author)}:</span> `;
    }

    // メッセージ本文
    content += `<span class="flowchat-text">${this.escapeHtml(messageData.message)}</span>`;

    // スーパーチャット金額
    if (messageData.type === 'superchat' && messageData.amount) {
      content += ` <span class="flowchat-amount">${this.escapeHtml(messageData.amount)}</span>`;
    }

    element.innerHTML = content;

    return element;
  }

  /**
   * 配置位置を計算
   */
  calculatePlacement(messageElement) {
    if (!this.video) return null;

    const videoHeight = this.video.offsetHeight;
    const containerWidth = this.container.offsetWidth;

    const lineHeight = videoHeight / (this.settings.lines + 0.2);
    const messageHeight = messageElement.offsetHeight;
    const messageRows = Math.ceil(messageHeight / lineHeight);

    // タイムラインを作成
    const timeline = this.createTimeline(messageElement, containerWidth);

    // 配置可能なインデックスを見つける
    const index = this.findAvailableIndex(messageRows, timeline);

    if (index === -1) {
      return null; // 配置できない
    }

    // タイムラインに追加
    this.pushTimeline(timeline, index, messageRows);

    // 位置を計算
    const z = Math.floor(index / this.settings.lines);
    const y = (index % this.settings.lines) + (z % 2 > 0 ? 0.5 : 0);
    const opacity = Math.pow(this.settings.opacity, z + 1);
    const top = lineHeight * (y + 0.1);

    return {
      top,
      opacity,
      zIndex: z + 12, // 11 はwebglのz-index
    };
  }

  /**
   * タイムラインを作成
   */
  createTimeline(element, containerWidth) {
    const displayMillis = this.settings.displayTime * 1000;
    const w = element.offsetWidth;
    const v = (containerWidth + w) / displayMillis;
    const t = w / v;
    const n = Date.now();

    return {
      willAppear: n,
      didAppear: n + t,
      willDisappear: n + displayMillis - t,
      didDisappear: n + displayMillis,
    };
  }

  /**
   * 配置可能なインデックスを見つける
   */
  findAvailableIndex(messageRows, timeline) {
    const lines = this.settings.lines;

    let index = this.timelines.findIndex((_, i) => {
      const mod = (i + messageRows) % lines;
      if (mod > 0 && mod < messageRows) {
        return false;
      }

      return Array(messageRows).fill(1).every((_, j) => {
        const ts = this.timelines[i + j];
        if (!ts || ts.length === 0) {
          return true;
        }

        const t = ts[ts.length - 1];
        return (
          t.didDisappear < timeline.willDisappear &&
          t.didAppear < timeline.willAppear
        );
      });
    });

    if (index === -1) {
      index = this.timelines.length;
      const mod = (index + messageRows) % lines;
      if (mod > 0 && mod < messageRows) {
        index += messageRows - mod;
      }
    }

    return index;
  }

  /**
   * タイムラインに追加
   */
  pushTimeline(timeline, index, messageRows) {
    Array(messageRows).fill(1).forEach((_, j) => {
      const i = index + j;
      if (!this.timelines[i]) {
        this.timelines[i] = [];
      }
      this.timelines[i].push(timeline);
    });
  }

  /**
   * アニメーションを開始
   */
  startAnimation(element) {
    const containerWidth = this.container.offsetWidth;
    const elementWidth = element.offsetWidth;
    const duration = this.settings.displayTime * 1000;

    // 初期位置（右端の外）
    element.style.transform = `translateX(${containerWidth}px)`;

    // キーフレーム
    const keyframes = [
      { transform: `translateX(${containerWidth}px)` },
      { transform: `translateX(-${elementWidth}px)` },
    ];

    const animation = element.animate(keyframes, {
      duration,
      easing: 'linear',
      fill: 'forwards',
    });

    // アニメーション完了後に削除
    animation.onfinish = () => {
      element.remove();
    };

    // 動画が一時停止されたらアニメーションも停止
    if (this.video.paused) {
      animation.pause();
    }
  }

  /**
   * 画像の読み込みを待つ
   */
  waitForImages(element) {
    const images = element.querySelectorAll('img');
    if (images.length === 0) {
      return Promise.resolve();
    }

    const promises = Array.from(images).map((img) => {
      if (img.complete) {
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve; // エラーでも続行
        setTimeout(resolve, 1000); // タイムアウト
      });
    });

    return Promise.all(promises);
  }

  /**
   * 動画再生時
   */
  onVideoPlay() {
    const messages = this.container?.querySelectorAll('.flowchat-message');
    messages?.forEach((element) => {
      element.getAnimations().forEach((animation) => animation.play());
    });
  }

  /**
   * 動画一時停止時
   */
  onVideoPause() {
    const messages = this.container?.querySelectorAll('.flowchat-message');
    messages?.forEach((element) => {
      element.getAnimations().forEach((animation) => animation.pause());
    });
  }

  /**
   * すべてのメッセージをクリア
   */
  clear() {
    const messages = this.container?.querySelectorAll('.flowchat-message');
    messages?.forEach((element) => element.remove());
    this.timelines = [];
  }

  /**
   * HTMLをエスケープ
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * スリープ
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 有効/無効を切り替え
   */
  set enabled(value) {
    this._enabled = value;
    if (!value) {
      this.clear();
    }
  }

  get enabled() {
    return this._enabled;
  }

  /**
   * クリーンアップ
   */
  destroy() {
    this.clear();
    if (this.queueProcessor) {
      clearInterval(this.queueProcessor);
    }
    if (this.container) {
      this.container.remove();
    }
  }
}

/**
 * メッセージ表示数を制限するクラス
 */
class MessageLimiter {
  constructor(limit) {
    this.limit = limit;
    this.count = 0;
    this.expireTime = Date.now();
  }

  isOver() {
    if (this.limit === 0) return false;

    const now = Date.now();
    if (now > this.expireTime) {
      this.count = 0;
      this.expireTime = now + 1000;
    }

    return ++this.count > this.limit;
  }
}

// グローバルに公開
window.FlowController = FlowController;
