# FlowChat for HyperChat - アーキテクチャドキュメント

## 互換性問題の原因

### HyperChatの動作
1. **DOM構造の完全な置き換え**: HyperChatは `#chat>#item-list` を独自のiframeで完全に置き換えます
2. **メッセージインターセプト**: YouTubeのAPIリクエストをインターセプトしてメッセージを取得
3. **カスタムレンダリング**: Svelteベースの独自UIでチャットを表示

### youtube-live-chat-flowの動作
1. **DOM監視**: `#items.yt-live-chat-item-list-renderer` をMutationObserverで監視
2. **要素追加の検出**: 新しいチャットメッセージ要素が追加されたときに検出
3. **動画オーバーレイ**: `.html5-video-container` にメッセージ要素を追加

### なぜ互換性がないか
HyperChatが有効になると:
- 通常のYouTubeチャットDOM (`#items.yt-live-chat-item-list-renderer`) が存在しなくなる
- youtube-live-chat-flowが監視する要素が見つからない
- メッセージが取得できず、フロー機能が動作しない

## 解決策

### アプローチ1: HyperChatのメッセージングシステムを利用 ✅ (採用)

HyperChatは `chrome.runtime.onConnect` を使用してメッセージを配信します:

```typescript
// HyperChat側 (messaging.ts:314-316)
ytcInterceptor.queueUnsub = queue.latestAction.subscribe((latestAction) => {
  if (!latestAction) return;
  interceptor.clients.forEach((port) => port.postMessage(latestAction));
});
```

**実装方法**:
1. コンテンツスクリプトで `chrome.runtime.connect()` を使ってHyperChatに接続
2. ポート経由でメッセージを受信
3. パースされたメッセージを動画上に流す

**メリット**:
- HyperChatの最適化されたメッセージパーサーを利用できる
- HyperChatと完全に互換性がある
- パフォーマンスが良い

### アプローチ2: HyperChatのiframe内部を監視

HyperChatが作成するiframe (`https://www.youtube.com/embed/hyperchat_embed`) 内部を監視。

**課題**:
- iframe内部へのアクセスが制限される可能性がある
- HyperChatのDOM構造に依存する

## 実装設計

### ファイル構成

```
flowchat-for-hyperchat/
├── manifest.json              # 拡張機能マニフェスト
├── content/
│   ├── hyperchat-connector.js # HyperChatとの接続を管理
│   ├── flow-renderer.js       # コメントフロー表示
│   ├── flow-controller.js     # フロー制御ロジック
│   ├── message-parser.js      # HyperChatメッセージのパース
│   ├── main.js                # メインエントリーポイント
│   └── flow-chat.css          # スタイル
├── popup/
│   ├── popup.html             # 設定ポップアップUI
│   └── popup.js               # 設定ロジック
└── background/
    └── background.js          # バックグラウンドサービスワーカー
```

### メッセージフロー

```
YouTube Live
    ↓
HyperChat (メッセージインターセプト)
    ↓
chrome.runtime.Port (メッセージ配信)
    ↓
FlowChat Connector (接続 & 受信)
    ↓
Message Parser (HyperChatメッセージをパース)
    ↓
Flow Controller (フロー制御)
    ↓
Flow Renderer (動画上に表示)
    ↓
.html5-video-container
```

### データ型

```typescript
// HyperChatから受信するメッセージ
interface HyperChatMessage {
  type: 'action';
  actions?: ParsedAction[];
  // ... その他のフィールド
}

interface ParsedMessage {
  author: {
    name: string;
    id: string;
    types: string[];
    profileIcon: { src: string; alt: string };
  };
  message: ParsedRun[];
  timestamp: string;
  showtime: number;
  messageId: string;
  superChat?: SuperChatInfo;
  // ...
}
```

### 設定項目

```javascript
{
  enabled: true,              // フロー機能の有効/無効
  fontSize: 24,               // フォントサイズ (px)
  speed: 5,                   // 流れる速度 (秒)
  opacity: 0.8,               // 透明度 (0-1)
  maxMessages: 50,            // 同時表示最大数
  laneCount: 12,              // レーン数
  showAvatar: true,           // アバター表示
  showAuthor: false,          // 作者名表示
  fontColor: '#FFFFFF',       // フォント色
  fontShadow: true,           // 影の表示
  superChatScale: 1.5,        // スーパーチャットのサイズ倍率
}
```

## 技術的な考慮事項

### HyperChat検出
1. HyperChatのDOM要素の存在を確認
2. HyperChatのiframe (`#hyperchat`) の存在を確認
3. chrome.runtime.connect が成功するかテスト

### フォールバック
HyperChatが無効の場合:
- 通常のYouTubeチャットDOMを監視
- youtube-live-chat-flowと同様の動作

### パフォーマンス最適化
- メッセージキューで処理を制御
- 同時表示数の制限
- アニメーション完了後の要素削除
- タイムライン管理で衝突回避
