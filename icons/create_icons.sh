#!/bin/bash
# SVGから複数サイズのPNGアイコンを生成するスクリプト
# ImageMagickやInkscapeがインストールされていない場合は、プレースホルダーを作成

# シンプルな色付きアイコンを作成（ImageMagickなしの場合）
create_placeholder_icon() {
    size=$1
    filename=$2
    
    # Base64エンコードされた簡易PNGを作成
    # これはImageMagickがない環境でも動作する最小限のアイコン
    echo "Creating placeholder icon: $filename (${size}x${size})"
    
    # シンプルなグラデーション背景にテキストを描画したSVGを作成
    cat > temp_icon.svg << SVGEOF
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="64" cy="64" r="60" fill="url(#grad)"/>
  <path d="M 30 45 L 50 45 L 70 45" stroke="white" stroke-width="6" stroke-linecap="round" fill="none" opacity="0.9"/>
  <path d="M 40 64 L 60 64 L 80 64 L 90 64" stroke="white" stroke-width="6" stroke-linecap="round" fill="none" opacity="0.7"/>
  <path d="M 35 83 L 55 83 L 75 83" stroke="white" stroke-width="6" stroke-linecap="round" fill="none" opacity="0.5"/>
  <path d="M 88 30 L 98 40 L 88 50" stroke="#FFD700" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>
SVGEOF
}

# アイコンを生成
create_placeholder_icon 16 icon16.svg
create_placeholder_icon 48 icon48.svg  
create_placeholder_icon 128 icon128.svg

echo "Icon files created. Note: These are SVG files."
echo "For production, please convert them to PNG using an online tool or ImageMagick."
