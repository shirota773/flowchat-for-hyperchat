# インストール方法

## 開発者モードでインストール（現時点）

Chrome/Edge/Braveなどのブラウザで以下の手順を実行してください：

### 1. リポジトリを取得

```bash
git clone https://github.com/shirota773/flowchat-for-hyperchat.git
cd flowchat-for-hyperchat
```

### 2. ブラウザの拡張機能ページを開く

- **Chrome**: `chrome://extensions/` にアクセス
- **Edge**: `edge://extensions/` にアクセス
- **Brave**: `brave://extensions/` にアクセス

### 3. デベロッパーモードを有効にする

右上の「デベロッパーモード」トグルをオンにします。

### 4. 拡張機能を読み込む

「パッケージ化されていない拡張機能を読み込む」ボタンをクリックし、
`flowchat-for-hyperchat` フォルダを選択します。

### 5. HyperChatをインストール（推奨）

より快適に使用するために、[HyperChat](https://chromewebstore.google.com/detail/hyperchat-improved-youtub/naipgebhooiiccifflecbffmnjbabdbh) のインストールをお勧めします。

HyperChatがなくても動作しますが、HyperChatと組み合わせることで最高のパフォーマンスを発揮します。

## 使い方

1. YouTubeのライブ配信ページを開く
2. 拡張機能のアイコンをクリックして設定を開く
3. お好みの設定に調整
4. 「保存」をクリック
5. ライブ配信を楽しむ！

## トラブルシューティング

### コメントが表示されない場合

1. F12で開発者ツールを開く
2. コンソールで `[FlowChat]` のログを確認
3. HyperChatが有効かどうか確認:
   ```javascript
   window.flowChatConnector.isHyperChatEnabled
   ```
4. 設定で「フロー表示を有効にする」がオンになっているか確認

### HyperChatとの接続に失敗する場合

- ページを再読み込み
- HyperChatが最新バージョンか確認
- 両方の拡張機能を無効にして、再度有効にする

### パフォーマンスが悪い場合

設定で以下を調整:
- 「表示制限」を上げる（例: 20メッセージ/秒）
- 「レーン数」を減らす（例: 8）
- 「透明度」を下げる（例: 70%）
