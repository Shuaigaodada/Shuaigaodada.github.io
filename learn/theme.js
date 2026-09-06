(() => {
  const storageKey = 'gao-learn-appearance-v1';
  const palettes = {
    light: { background: '#f7f8fa', text: '#242a32', accent: '#426b91' },
    dark: { background: '#181c22', text: '#e1e5eb', accent: '#91b5d6' },
    eye: { background: '#e7eddf', text: '#2d392d', accent: '#4d7056' }
  };
  const hex = /^#[0-9a-f]{6}$/i;
  const luminance = (color) => color.slice(1).match(/../g).map((c) => parseInt(c, 16) / 255).map((n) => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
  const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
  const readable = (background) => contrast(background, '#ffffff') >= contrast(background, '#202020') ? '#ffffff' : '#202020';
  let state = { preset: 'light', colors: { ...palettes.light } };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && Object.hasOwn(palettes, saved.preset)) {
      state.preset = saved.preset;
      state.colors = { ...palettes[saved.preset] };
      for (const key of Object.keys(state.colors)) if (typeof saved.colors?.[key] === 'string' && hex.test(saved.colors[key])) state.colors[key] = saved.colors[key];
    }
  } catch { /* A blocked store or invalid value must not prevent reading. */ }

  function apply() {
    const adjusted = contrast(state.colors.background, state.colors.text) < 4.5;
    if (adjusted) state.colors.text = readable(state.colors.background);
    const root = document.documentElement;
    root.dataset.theme = state.preset;
    root.style.setProperty('--paper', state.colors.background);
    root.style.setProperty('--ink', state.colors.text);
    root.style.setProperty('--accent', state.colors.accent);
    root.style.setProperty('--accent-ink', readable(state.colors.accent));
    root.style.colorScheme = luminance(state.colors.background) < .18 ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', state.colors.background);
    document.dispatchEvent(new Event('learn-theme-change'));
    return adjusted;
  }
  apply();

  document.addEventListener('DOMContentLoaded', () => {
    const dialog = document.getElementById('settings-dialog');
    const status = document.getElementById('theme-status');
    const inputs = Object.fromEntries(Object.keys(state.colors).map((key) => [key, document.getElementById(`color-${key}`)]));
    function sync() {
      for (const [key, input] of Object.entries(inputs)) {
        input.value = state.colors[key];
        document.getElementById(`hex-${key}`).value = state.colors[key];
      }
      const custom = Object.keys(state.colors).some((key) => state.colors[key] !== palettes[state.preset][key]);
      document.getElementById('custom-indicator').hidden = !custom;
      dialog.querySelectorAll('[data-theme]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.theme === state.preset)));
    }
    function update() {
      const adjusted = apply();
      sync();
      status.textContent = adjusted ? '文字颜色已自动调整，以保证阅读对比度。' : '设置已保存。切换主题会恢复该主题的默认颜色。';
      try { localStorage.setItem(storageKey, JSON.stringify(state)); }
      catch { status.textContent = '设置已应用；当前浏览器无法保存，刷新后可能恢复默认。'; }
    }
    document.getElementById('open-settings').onclick = () => { sync(); dialog.showModal(); };
    dialog.addEventListener('click', (event) => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
    dialog.querySelectorAll('[data-theme]').forEach((button) => { button.onclick = () => { state = { preset: button.dataset.theme, colors: { ...palettes[button.dataset.theme] } }; update(); }; });
    for (const [key, input] of Object.entries(inputs)) input.addEventListener('input', () => { if (hex.test(input.value)) { state.colors[key] = input.value; update(); } });
    for (const key of Object.keys(inputs)) {
      const field = document.getElementById(`hex-${key}`);
      field.addEventListener('input', () => { if (hex.test(field.value)) { state.colors[key] = field.value.toLowerCase(); update(); } });
      field.addEventListener('change', () => { if (!hex.test(field.value)) { sync(); status.textContent = '请输入完整的十六进制颜色，例如 #426b91。'; } });
    }
    document.getElementById('reset-theme').onclick = () => { state.colors = { ...palettes[state.preset] }; update(); };
    sync();
  });
})();
