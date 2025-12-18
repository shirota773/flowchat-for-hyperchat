# デバッグ手順

## 1. ブラウザのコンソールを確認

YouTubeライブ配信ページで F12 を押して開発者ツールを開き、以下を確認してください：

### 確認するログ
```javascript
// FlowChatのログ
[FlowChat] Initializing...
[FlowChat] Flow controller initialized
[FlowChat] HyperChat detected / not detected
[FlowChat] Connected to HyperChat / Starting fallback mode

// エラーがあれば赤字で表示されます
```

### 手動で状態を確認
```javascript
// FlowChatが読み込まれているか
window.flowChatController
window.flowChatConnector

// HyperChatが検出されたか
window.flowChatConnector?.isHyperChatEnabled

// 動画要素が見つかったか
window.flowChatController?.video
```

## 2. よくある問題

### 問題 1: 拡張機能が読み込まれない
- chrome://extensions/ で拡張機能が有効になっているか確認
- エラーが表示されていないか確認
- ページをリロード

### 問題 2: HyperChat接続エラー
原因: `chrome.runtime.connect()` は同じ拡張機能内でのみ使用可能

### 問題 3: コメントが表示されない
- 設定で「フロー表示を有効にする」がオンか確認
- コンソールでエラーを確認

## 3. 収集が必要な情報

以下の情報を教えてください：
1. コンソールに表示されているログ（特に [FlowChat] で始まるもの）
2. エラーメッセージ（赤字のもの）
3. HyperChatは有効になっていますか？
4. 通常のYouTubeチャット（HyperChatなし）でも試しましたか？
