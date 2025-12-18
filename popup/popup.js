// 設定のデフォルト値
const defaultSettings = {
  enabled: true,
  fontSize: 28,
  displayTime: 5,
  opacity: 0.9,
  maxDisplays: 10,
  lines: 12,
  fontColor: '#FFFFFF',
  fontWeight: 'bold',
  fontShadow: true,
  showAuthor: false,
  showAvatar: true,
  superChatScale: 1.5,
  overflow: 'hidden',
};

// UI要素
const elements = {
  enabled: document.getElementById('enabled'),
  fontSize: document.getElementById('fontSize'),
  fontSizeValue: document.getElementById('fontSizeValue'),
  displayTime: document.getElementById('displayTime'),
  displayTimeValue: document.getElementById('displayTimeValue'),
  opacity: document.getElementById('opacity'),
  opacityValue: document.getElementById('opacityValue'),
  lines: document.getElementById('lines'),
  linesValue: document.getElementById('linesValue'),
  maxDisplays: document.getElementById('maxDisplays'),
  maxDisplaysValue: document.getElementById('maxDisplaysValue'),
  fontColor: document.getElementById('fontColor'),
  fontShadow: document.getElementById('fontShadow'),
  showAuthor: document.getElementById('showAuthor'),
  showAvatar: document.getElementById('showAvatar'),
  superChatScale: document.getElementById('superChatScale'),
  superChatScaleValue: document.getElementById('superChatScaleValue'),
  saveButton: document.getElementById('saveButton'),
  resetButton: document.getElementById('resetButton'),
  status: document.getElementById('status'),
};

// 設定を読み込む
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(['flowChatSettings']);
    const settings = result.flowChatSettings || defaultSettings;

    // UIに反映
    elements.enabled.checked = settings.enabled;
    elements.fontSize.value = settings.fontSize;
    elements.fontSizeValue.textContent = settings.fontSize;
    elements.displayTime.value = settings.displayTime;
    elements.displayTimeValue.textContent = settings.displayTime;
    elements.opacity.value = settings.opacity;
    elements.opacityValue.textContent = Math.round(settings.opacity * 100);
    elements.lines.value = settings.lines;
    elements.linesValue.textContent = settings.lines;
    elements.maxDisplays.value = settings.maxDisplays;
    elements.maxDisplaysValue.textContent = settings.maxDisplays === 0 ? '無制限' : settings.maxDisplays;
    elements.fontColor.value = settings.fontColor;
    elements.fontShadow.checked = settings.fontShadow;
    elements.showAuthor.checked = settings.showAuthor;
    elements.showAvatar.checked = settings.showAvatar;
    elements.superChatScale.value = settings.superChatScale;
    elements.superChatScaleValue.textContent = settings.superChatScale;
  } catch (error) {
    console.error('Failed to load settings:', error);
    showStatus('設定の読み込みに失敗しました', 'error');
  }
}

// 設定を保存
async function saveSettings() {
  const settings = {
    enabled: elements.enabled.checked,
    fontSize: parseFloat(elements.fontSize.value),
    displayTime: parseFloat(elements.displayTime.value),
    opacity: parseFloat(elements.opacity.value),
    maxDisplays: parseInt(elements.maxDisplays.value),
    lines: parseInt(elements.lines.value),
    fontColor: elements.fontColor.value,
    fontWeight: 'bold',
    fontShadow: elements.fontShadow.checked,
    showAuthor: elements.showAuthor.checked,
    showAvatar: elements.showAvatar.checked,
    superChatScale: parseFloat(elements.superChatScale.value),
    overflow: 'hidden',
  };

  try {
    await chrome.storage.sync.set({ flowChatSettings: settings });
    showStatus('設定を保存しました！', 'success');
  } catch (error) {
    console.error('Failed to save settings:', error);
    showStatus('設定の保存に失敗しました', 'error');
  }
}

// 設定をリセット
async function resetSettings() {
  if (confirm('設定をデフォルトに戻しますか？')) {
    try {
      await chrome.storage.sync.set({ flowChatSettings: defaultSettings });
      await loadSettings();
      showStatus('設定をリセットしました', 'info');
    } catch (error) {
      console.error('Failed to reset settings:', error);
      showStatus('設定のリセットに失敗しました', 'error');
    }
  }
}

// ステータスメッセージを表示
function showStatus(message, type = 'info') {
  elements.status.textContent = message;
  elements.status.className = `status ${type}`;
  setTimeout(() => {
    elements.status.className = 'status';
  }, 3000);
}

// スライダーの値変更を監視
elements.fontSize.addEventListener('input', (e) => {
  elements.fontSizeValue.textContent = e.target.value;
});

elements.displayTime.addEventListener('input', (e) => {
  elements.displayTimeValue.textContent = e.target.value;
});

elements.opacity.addEventListener('input', (e) => {
  elements.opacityValue.textContent = Math.round(e.target.value * 100);
});

elements.lines.addEventListener('input', (e) => {
  elements.linesValue.textContent = e.target.value;
});

elements.maxDisplays.addEventListener('input', (e) => {
  const value = parseInt(e.target.value);
  elements.maxDisplaysValue.textContent = value === 0 ? '無制限' : value;
});

elements.superChatScale.addEventListener('input', (e) => {
  elements.superChatScaleValue.textContent = e.target.value;
});

// ボタンのイベントリスナー
elements.saveButton.addEventListener('click', saveSettings);
elements.resetButton.addEventListener('click', resetSettings);

// 初期化
loadSettings();
