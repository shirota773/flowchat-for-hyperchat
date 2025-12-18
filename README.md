# FlowChat for HyperChat

HyperChat互換のニコニコ風コメントフロー拡張機能です。YouTubeライブ配信のチャットを動画上に流して表示します。

## ✨ 特徴

- **HyperChat完全互換**: HyperChatと一緒に使用できます
- **ニコニコ風フロー**: コメントが動画上を右から左に流れます
- **高度なカスタマイズ**: フォントサイズ、速度、透明度、色など細かく調整可能
- **パフォーマンス最適化**: youtube-live-chat-flowの優れた実装を参考にした高速処理
- **スーパーチャット対応**: スーパーチャットを強調表示
- **自動フォールバック**: HyperChatが無効でも通常のYouTubeチャットで動作

## 🎯 背景

HyperChatはYouTubeのチャット機能を軽量化する素晴らしい拡張機能です。一方、youtube-live-chat-flowはチャットコメントを動画上に表示する素晴らしい拡張機能です。

しかし、この2つは互換性がありません。HyperChatを有効化すると、youtube-live-chat-flowが機能しなくなります。

**FlowChat for HyperChat** は、この問題を解決するために作成されました。

## 🔧 技術的な解決策

### なぜ互換性がないのか

- **HyperChat**: `#chat>#item-list` を独自のiframeで完全に置き換えます
- **youtube-live-chat-flow**: `#items.yt-live-chat-item-list-renderer` をMutationObserverで監視します

HyperChatが有効になると、youtube-live-chat-flowが監視する要素が存在しなくなるため、動作しません。

### FlowChatの解決策

1. **HyperChatのメッセージングシステムを利用**: `chrome.runtime.connect()` でHyperChatのメッセージポートに接続
2. **自動フォールバック**: HyperChatが無効の場合は、通常のYouTubeチャットDOMを監視
3. **最適化されたレンダリング**: youtube-live-chat-flowの優れたアルゴリズムを参考にした衝突回避システム

詳細は [ARCHITECTURE.md](ARCHITECTURE.md) を参照してください。

## 📦 インストール

### 開発者モードでインストール（現時点）

1. このリポジトリをクローンまたはダウンロード
2. Chromeで `chrome://extensions/` を開く
3. 右上の「デベロッパーモード」を有効にする
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. `flowchat-for-hyperchat` フォルダを選択

### Chrome Web Store（予定）

現在、Chrome Web Storeへの公開を準備中です。

## 🎨 使い方

1. YouTubeのライブ配信ページを開く
2. 拡張機能のアイコンをクリックして設定画面を開く
3. お好みの設定に調整して「保存」をクリック
4. ライブ配信を楽しむ！

## ⚙️ 設定項目

- **フロー表示の有効/無効**: オン/オフの切り替え
- **フォントサイズ**: 16px〜64px（デフォルト: 28px）
- **表示時間**: 3秒〜15秒（デフォルト: 5秒）
- **透明度**: 30%〜100%（デフォルト: 90%）
- **レーン数**: 6〜24（デフォルト: 12）
- **表示制限**: 0〜50メッセージ/秒（デフォルト: 10、0=無制限）
- **フォント色**: カラーピッカーで自由に選択
- **テキストに影をつける**: オン/オフ
- **作者名を表示**: オン/オフ
- **アバターを表示**: オン/オフ
- **スーパーチャットの拡大率**: 1.0x〜2.5x（デフォルト: 1.5x）

## 🤝 互換性

- **HyperChat**: ✅ 完全互換
- **通常のYouTubeチャット**: ✅ 自動フォールバック
- **LiveTL**: ✅ 問題なく動作（HyperChat経由）
- **YtcFilter**: ✅ 併用可能

## 🛠️ 開発

### 必要な環境

- Node.js（アイコン生成などのビルドツール用、オプション）
- Chrome/Edge/Brave などのChromiumベースのブラウザ

### プロジェクト構造

```
flowchat-for-hyperchat/
├── manifest.json                   # 拡張機能マニフェスト
├── content/
│   ├── hyperchat-connector.js      # HyperChat接続管理
│   ├── flow-controller.js          # フロー制御ロジック
│   ├── main.js                     # メインエントリーポイント
│   └── flow-chat.css               # スタイル
├── popup/
│   ├── popup.html                  # 設定UI
│   └── popup.js                    # 設定ロジック
├── background/
│   └── background.js               # バックグラウンドサービスワーカー
└── icons/
    └── icon.svg                    # アイコン
```

### デバッグ

拡張機能読み込み後、YouTubeライブ配信ページで:

1. F12で開発者ツールを開く
2. コンソールで `[FlowChat]` のログを確認
3. グローバル変数で動作確認:
   - `window.flowChatController` - フロー制御オブジェクト
   - `window.flowChatConnector` - HyperChat接続オブジェクト

## 📝 ライセンス

MIT License

## 🙏 謝辞

このプロジェクトは以下の素晴らしい拡張機能を参考にしています:

- [HyperChat](https://github.com/LiveTL/HyperChat) by LiveTL - 高速で軽量なYouTubeチャット
- [youtube-live-chat-flow](https://github.com/tsukumijima/youtube-live-chat-flow) by tsukumijima - ニコニコ風コメントフロー

両方のプロジェクトに感謝します！

## 🐛 バグ報告・機能要望

Issues セクションでお気軽に報告してください。

## 📮 コントリビューション

プルリクエストを歓迎します！
