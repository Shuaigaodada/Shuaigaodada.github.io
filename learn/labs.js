// Illustrations use our own canvas shapes; no remote images or animation services.
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const readColors = () => {
  const style = document.documentElement.style;
  return { background: style.getPropertyValue('--paper') || '#f7f8fa', text: style.getPropertyValue('--ink') || '#242a32', accent: style.getPropertyValue('--accent') || '#426b91' };
};
let colors = readColors();
document.addEventListener('learn-theme-change', () => { colors = readColors(); });

export function scene(ctx, w, h, phase = 0.35) {
  ctx.save(); ctx.scale(w / 760, h / 440);
  ctx.fillStyle = '#e5ead9'; ctx.fillRect(0, 0, 760, 440);
  ctx.strokeStyle = '#cfd7bf'; ctx.lineWidth = 1;
  for (let x = 0; x < 760; x += 38) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 440); ctx.stroke(); }
  for (let y = 0; y < 440; y += 38) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(760, y); ctx.stroke(); }
  ctx.fillStyle = '#efcb79'; ctx.beginPath(); ctx.arc(578, 98, 41, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c6d1af'; ctx.beginPath(); ctx.moveTo(0, 285); ctx.lineTo(135, 115); ctx.lineTo(331, 310); ctx.lineTo(480, 155); ctx.lineTo(760, 350); ctx.lineTo(760, 440); ctx.lineTo(0, 440); ctx.fill();
  ctx.fillStyle = '#a9bd8e'; ctx.beginPath(); ctx.moveTo(0, 343); ctx.bezierCurveTo(205, 252, 290, 286, 440, 352); ctx.bezierCurveTo(540, 396, 641, 301, 760, 312); ctx.lineTo(760, 440); ctx.lineTo(0, 440); ctx.fill();
  ctx.strokeStyle = '#819966'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, 377); ctx.bezierCurveTo(210, 326, 400, 421, 760, 360); ctx.stroke();
  ctx.setLineDash([4, 7]); ctx.strokeStyle = '#859675'; ctx.beginPath(); ctx.ellipse(386, 241, 211, 97, -.14, Math.PI, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  const x = 151 + phase * 430, y = 262 - Math.sin(phase * Math.PI) * 120;
  ctx.fillStyle = '#7c91664d'; ctx.beginPath(); ctx.ellipse(x + 10, 347, 35, 7, 0, 0, Math.PI * 2); ctx.fill();
  const gradient = ctx.createRadialGradient(x - 17, y - 21, 3, x, y, 48); gradient.addColorStop(0, '#ffb088'); gradient.addColorStop(.5, '#ef7a4f'); gradient.addColorStop(1, '#c95331');
  ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(x, y, 44, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#75925d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(88, 398); ctx.bezierCurveTo(80, 366, 105, 339, 98, 315); ctx.stroke();
  ctx.fillStyle = '#789760'; [[87, 361, -.8], [104, 344, .6], [90, 328, -.6]].forEach(([px, py, r]) => { ctx.beginPath(); ctx.ellipse(px, py, 16, 7, r, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = '#657b52'; ctx.font = '12px monospace'; ctx.fillText('RGB SAMPLE', 540, 408);
  ctx.restore();
}

function animate(element, draw) {
  let id, last, elapsed = 0, paused = reducedMotion.matches, visible = true;
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
  observer.observe(element);
  function loop(time) {
    if (!paused && visible && !document.hidden) elapsed += last === undefined ? 0 : Math.min((time - last) / 1000, .1);
    last = time;
    if (visible && !document.hidden) draw(elapsed, paused);
    id = requestAnimationFrame(loop);
  }
  id = requestAnimationFrame(loop);
  return { get paused() { return paused; }, toggle() { paused = !paused; }, dispose() { cancelAnimationFrame(id); observer.disconnect(); } };
}

const shell = (title, content) => `<div class="lab-heading"><strong>${title}</strong><span>交互演示</span></div><div class="lab-body">${content}</div>`;

function frames(root) {
  root.innerHTML = shell('帧率与时间采样', '<canvas width="700" height="245" role="img" aria-label="两条运动轨道，上方按所选帧率更新，下方跟随浏览器刷新"></canvas><div class="lab-control"><label>帧率 <input type="range" min="2" max="60" value="12" step="1" aria-label="演示帧率"></label><output>12 fps</output><button type="button">暂停动画</button></div><p class="lab-note">两颗球速度相同，只改变每秒更新几次。低帧率会更跳跃，不会跑得更慢。演示受屏幕刷新率和浏览器性能限制。</p>');
  const canvas = root.querySelector('canvas'), ctx = canvas.getContext('2d'), input = root.querySelector('input'), output = root.querySelector('output'), button = root.querySelector('button');
  const animation = animate(canvas, (t) => {
    ctx.fillStyle = colors.background; ctx.fillRect(0, 0, 700, 245);
    const fps = Number(input.value);
    [Math.floor(t * fps) / fps, t].forEach((time, i) => {
      const y = 80 + i * 102;
      ctx.strokeStyle = colors.text; ctx.globalAlpha = .2; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(35, y); ctx.lineTo(665, y); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = colors.text; ctx.font = '13px sans-serif'; ctx.fillText(i === 0 ? `视频采样 · ${fps} fps` : '连续运动参考 · 随屏幕刷新', 28, y - 36);
      ctx.fillStyle = i === 0 ? colors.accent : colors.text; ctx.beginPath(); ctx.arc(350 + Math.sin(time * 2.2) * 280, y, 19, 0, Math.PI * 2); ctx.fill();
    });
  });
  input.oninput = () => { output.textContent = `${input.value} fps`; };
  const update = () => { button.textContent = animation.paused ? '播放动画' : '暂停动画'; };
  button.onclick = () => { animation.toggle(); update(); }; update();
  return () => animation.dispose();
}

function pixels(root) {
  root.innerHTML = shell('分辨率与 RGB 颜色', '<canvas class="pixel-canvas" width="48" height="28" role="img" aria-label="随分辨率改变清晰程度的山景"></canvas><div class="lab-control"><label>像素数量 <select aria-label="像素演示分辨率"><option value="12">12 × 7</option><option value="24">24 × 14</option><option value="48" selected>48 × 28</option><option value="96">96 × 56</option><option value="384">384 × 224</option></select></label><output>1,344 像素</output></div><p class="lab-note">显示面积不变，只改变记录的格子数量。格子越少，山和圆球越难辨认。这是缩小后放大的示意图，不是你屏幕的实际物理像素。</p><div class="lab-control"><label>红 R <input aria-label="红色分量" type="range" min="0" max="255" value="232"></label></div><div class="lab-control"><label>绿 G <input aria-label="绿色分量" type="range" min="0" max="255" value="94"></label></div><div class="lab-control"><label>蓝 B <input aria-label="蓝色分量" type="range" min="0" max="255" value="57"></label></div><div class="rgb-swatches" role="img" aria-label="红绿蓝相加后的颜色"><span></span><span></span><span></span> → <span></span><b></b></div>');
  const original = document.createElement('canvas'); original.width = 768; original.height = 448; scene(original.getContext('2d'), 768, 448);
  const canvas = root.querySelector('canvas'), select = root.querySelector('select');
  const draw = () => { canvas.width = Number(select.value); canvas.height = canvas.width * 7 / 12; canvas.getContext('2d').drawImage(original, 0, 0, canvas.width, canvas.height); root.querySelector('output').textContent = `${(canvas.width * canvas.height).toLocaleString()} 像素`; };
  select.onchange = draw; draw();
  const rgb = () => { const values = [...root.querySelectorAll('input')].map((input) => Number(input.value)); const swatches = root.querySelectorAll('.rgb-swatches span'); values.forEach((value, i) => { swatches[i].style.background = `rgb(${values.map((_, j) => i === j ? value : 0).join(',')})`; }); swatches[3].style.background = `rgb(${values.join(',')})`; root.querySelector('.rgb-swatches b').textContent = values.join(', '); };
  root.querySelectorAll('input').forEach((input) => { input.oninput = rgb; }); rgb();
}

function compression(root) {
  root.innerHTML = shell('量化层级与色带', '<canvas width="700" height="235" role="img" aria-label="左边原始渐变，右边为减少颜色层级后的对比"></canvas><div class="lab-control"><label>每通道层级 <input type="range" min="2" max="64" value="8" aria-label="颜色量化层级"></label><output>8 级</output></div><p class="lab-note">左边是连续感较强的渐变，右边把颜色四舍五入到少数几个档位。减少层级后可以观察到色带。这只演示“量化会丢失细节”，不模拟 H.264 的真实算法，也不代表压缩后文件大小。</p>');
  const canvas = root.querySelector('canvas'), ctx = canvas.getContext('2d'), input = root.querySelector('input');
  const draw = () => { const levels = Number(input.value); ctx.fillStyle = colors.background; ctx.fillRect(0, 0, 700, 235); ctx.font = '13px sans-serif'; ctx.fillStyle = colors.text; ctx.fillText('原始渐变', 20, 25); ctx.fillText(`量化后 · 每通道 ${levels} 级`, 370, 25);
    for (let x = 0; x < 310; x++) { const values = [238, 92 + x / 310 * 133, 58 + x / 310 * 133]; ctx.fillStyle = `rgb(${values.join(',')})`; ctx.fillRect(20 + x, 43, 1, 165); const rounded = values.map((v) => Math.round(v / 255 * (levels - 1)) / (levels - 1) * 255); ctx.fillStyle = `rgb(${rounded.join(',')})`; ctx.fillRect(370 + x, 43, 1, 165); }
    root.querySelector('output').textContent = `${levels} 级`;
  }; input.oninput = draw; draw();
  document.addEventListener('learn-theme-change', draw);
  return () => document.removeEventListener('learn-theme-change', draw);
}

function gop(root) {
  root.innerHTML = shell('I、P、B 帧的参考关系', '<div class="frame-buttons"><button type="button" data-frame="I">I<small>第 1 帧</small></button><button type="button" data-frame="B1">B<small>第 2 帧</small></button><button type="button" data-frame="B2">B<small>第 3 帧</small></button><button type="button" data-frame="P">P<small>第 4 帧</small></button></div><div class="frame-explanation" role="status"></div><div class="gop-order">播放顺序：I → B → B → P<br>本例解码：I → P → B → B</div><p class="lab-note">这是一个固定的小例子：两张 B 帧都参考 I 和 P。实际参考关系、帧间隔与编码器有关；P 不一定只参考上一帧，B 也不一定总是双向参考。</p>');
  const descriptions = { I: '<b>I 帧：不依赖其他帧解码。</b><br>这帧不依赖其他帧解码。它仍然经过图像压缩，“独立”不等于“原图无损”。', P: '<b>P 帧：本例参考已经解码的 I 帧。</b><br>通过运动预测和误差修正描述当前画面。先解出它，才能给中间的 B 帧作参考。', B1: '<b>第 2 帧：参考前后的 I 帧和 P 帧。</b><br>前后参考画面已经解码，可以用它们预测当前画面。仍需保存预测信息及残差，不是播放器的运动插帧。', B2: '<b>第 3 帧：同样参考 I 和 P。</b><br>它在播放时更靠近 P 帧，但并不是把两个画面简单平均。实际编码器会按图像区域选择预测方式。' };
  root.querySelectorAll('button').forEach((button) => { button.onclick = () => { root.querySelectorAll('button').forEach((b) => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); }); root.querySelector('.frame-explanation').innerHTML = descriptions[button.dataset.frame]; }; }); root.querySelector('button').click();
}

function bitrate(root) {
  root.innerHTML = shell('视频数据量估算', '<div class="lab-grid"><label>分辨率<select aria-label="估算分辨率"><option value="921600">1280 × 720</option><option value="2073600" selected>1920 × 1080</option><option value="8294400">3840 × 2160</option></select></label><label>帧率<select aria-label="估算帧率"><option value="24">24 fps</option><option value="30" selected>30 fps</option><option value="60">60 fps</option></select></label></div><div class="lab-control"><label>视频码率 <input type="range" min="1" max="40" value="8" aria-label="视频码率 Mbps"></label><output class="bitrate-value">8 Mbps</output></div><div class="lab-control"><label>时长 <input type="range" min="1" max="60" value="1" aria-label="视频时长 分钟"></label><output class="duration-value">1 分钟</output></div><div class="calc-result"><div><small>未压缩 RGB · 8 bit / 通道</small><strong class="raw-size"></strong></div><div><small>按平均视频码率估算</small><strong class="encoded-size"></strong></div></div><p class="lab-note">GB / MB 使用十进制；不含音频与封装开销。未压缩按每像素 3 字节计算，常见 YUV 数据量不同。固定码率和时长时，改分辨率不会改变右边的估算体积，但会改变画质压力。</p>');
  const selects = root.querySelectorAll('select'), inputs = root.querySelectorAll('input');
  const draw = () => { const pixels = Number(selects[0].value), fps = Number(selects[1].value), rate = clamp(Number(inputs[0].value), 1, 40), seconds = clamp(Number(inputs[1].value), 1, 60) * 60; root.querySelector('.raw-size').textContent = `${(pixels * 3 * fps * seconds / 1e9).toFixed(2)} GB`; const mb = rate * seconds / 8; root.querySelector('.encoded-size').textContent = mb >= 1000 ? `${(mb / 1000).toFixed(2)} GB` : `${mb.toFixed(0)} MB`; root.querySelector('.bitrate-value').textContent = `${rate} Mbps`; root.querySelector('.duration-value').textContent = `${seconds / 60} 分钟`; };
  [...selects, ...inputs].forEach((input) => input.addEventListener('input', draw)); draw();
}

const decisions = {
  'photo-1': ['放大低分辨率截图后，怎样判断是否恢复了真实细节？', ['看输出像素是否变多', '与可靠的高质量来源逐处对照', '看文件体积是否变大'], 1, '放大算法会生成更多输出像素，但新纹理可能只是估算。只有与可靠来源对照，才能判断细节是否真实存在。'],
  'photo-2': ['3000 × 2000 像素的图片只修改 PPI 且不重新采样，什么会改变？', ['文件中的像素数量', '像素与打印尺寸的对应关系', '镜头记录的细节'], 1, '不重新采样时像素数量保持不变，PPI 主要改变这些像素映射到多大物理尺寸。'],
  'photo-3': ['失真的 JPEG 转存为 PNG，能够得到什么？', ['恢复压缩前原图', '保留当前结果，避免这次再做 JPEG 压缩', '自动获得 RAW 数据'], 1, 'PNG 可以无损保存当前输入像素，但不能反推此前有损压缩已经舍弃的信息。'],
  'photo-4': ['同一张图在两个软件中颜色不同，第一步更适合检查什么？', ['永久修改原图', '配置文件与两边的色彩管理路径', '继续提高饱和度'], 1, '先确认数值是否被一致解释。直接修改原图可能只是在补偿某一个错误显示路径。'],
  'camera-1': ['要保持曝光接近并减少运动模糊。快门从 1/50 s 改为 1/100 s 后，可怎样补偿？', ['把 f/4 开到约 f/2.8', '把 f/4 收到 f/5.6', '降低一档 ISO'], 0, '快门缩短一档会减少约一半曝光量；光圈从 f/4 开到 f/2.8 约补回一档，但景深也会变浅。'],
  'camera-2': ['固定机位和焦距，只把照片在后期裁小，会改变什么？', ['拍摄时的透视', '保留的取景范围与可用像素', '镜头实际焦距'], 1, '裁切舍弃外围并减少可用像素，不会重建另一个机位的透视，也不会改变镜头焦距。'],
  'camera-3': ['人物在三脚架画面中仍有方向性拖影，首先应检查什么？', ['主体运动与曝光时间', '文件名', '屏幕刷新率'], 0, '三脚架能减少相机运动，但不能冻结主体。运动速度与曝光时间共同决定主体拖影。'],
  'camera-4': ['固定光照的视频中，人物说话时颜色缓慢漂移，更可能从哪里处理？', ['提高码率', '固定并校准白平衡', '增加关键帧'], 1, '颜色随画面内容变化通常与自动白平衡有关。码率和关键帧不决定拍摄白平衡。'],
  'video-1': ['30 fps 素材导出为 60 fps 后，最准确的描述是什么？', ['一定得到 60 个真实动作状态', '有 60 个显示位置，新增位置可能是重复或估算', '播放速度必然加倍'], 1, '提高导出帧率不能保证补回采集阶段没有记录的状态，结果取决于时间插值方式。'],
  'video-2': ['开头音画同步，十分钟后逐渐偏离，哪类检查更合理？', ['把整条音轨平移一次', '检查采样时钟、帧率解释和时间戳', '提高分辨率'], 1, '持续漂移与固定偏移不同。一次整体平移不能消除随时间累积的差异。'],
  'video-3': ['固定平均码率与时长，只把 1080p 改为 4K，文件体积估算怎样变化？', ['近似不变，但单像素预算更紧', '必然四倍', '必然减半'], 0, '体积主要由平均码率乘时长决定。分辨率增加会提高压缩压力，却不改写已固定的数据预算。'],
  'compression-1': ['关键帧间隔设为 2 秒，表示什么？', ['每两秒只显示一帧', '约每两秒安排一次便于解码进入的位置', '每秒最多两个 B 帧'], 1, '关键帧间隔描述解码结构，不是帧率。两秒内仍可包含几十或上百个显示帧。'],
  'compression-2': ['把 MKV 重新封装成 MP4 且不重新编码，画面通常会怎样？', ['再次有损压缩', '媒体数据主要保持不变，容器组织改变', '自动提高分辨率'], 1, '重新封装改变容器组织，通常直接复制媒体流；重新编码才会再次生成压缩画面。'],
  'obs-1': ['游戏流畅，但 OBS 显示渲染延迟，首先应检查什么？', ['GPU 合成余量与场景复杂度', '音频采样率', '文件扩展名'], 0, 'OBS 合成场景需要 GPU 资源。音频或文件名无法直接解决合成阶段来不及的问题。'],
  'obs-2': ['播放器只播放多音轨录制中的一轨，能断定其他声音没有录到吗？', ['能', '不能，应在支持多轨的软件中检查', '提高码率后才能判断'], 1, '许多播放器默认只选一条音轨。是否录入需要查看文件中的全部轨道。'],
  'obs-3': ['静止画面清楚，快速转动时出现块状和涂抹，优先比较什么？', ['复杂场景下的编码预算与丢帧统计', '主题颜色', '录制文件名'], 0, '快速复杂运动更难压缩，应检查同一片段的编码条件和性能。'],
  'post-1': ['启用代理剪辑后，最终导出前最需要确认什么？', ['代理是否更鲜艳', '原素材在线且导出使用预期媒体', '代理文件名更短'], 1, '代理用于减轻编辑负担。交付前应确认原素材在线，并清楚导出选择了哪类媒体。'],
  'post-2': ['素材已完成输入色彩转换，又重复套用同一技术 LUT，可能怎样？', ['更准确还原光线', '过度对比或饱和异常', '自动变成 RAW'], 1, '同一输入转换执行两次会改变预期映射。应先确认转换位于输入、监看还是输出环节。'],
  'post-3': ['导出文件存在且体积正常，足以证明交付完成吗？', ['足够', '不够，还要检查范围、字幕、音轨和实际播放', '只需改扩展名'], 1, '文件大小不能证明内容与轨道正确，最终文件必须按交付场景实际播放。']
};

function decision(root, id) {
  const setting = decisions[id];
  if (!setting) { root.textContent = '互动内容暂不可用。'; return; }
  const [question, options, answer, explanation] = setting;
  root.innerHTML = shell('情境判断', `<fieldset class="decision"><legend>${question}</legend>${options.map((option, i) => `<button type="button" data-choice="${i}" aria-pressed="false">${option}</button>`).join('')}<p class="decision-result" role="status">选择一项，查看判断依据。</p></fieldset>`);
  const result = root.querySelector('.decision-result');
  root.querySelectorAll('button').forEach((button) => { button.onclick = () => {
    const selected = Number(button.dataset.choice);
    root.querySelectorAll('button').forEach((item) => { item.classList.toggle('active', item === button); item.classList.toggle('correct', Number(item.dataset.choice) === answer); item.setAttribute('aria-pressed', String(item === button)); });
    result.innerHTML = `<strong>${selected === answer ? '判断成立' : '需要修正'}</strong>${explanation}`;
  }; });
}

export function mountLabs(container) {
  const dispose = [];
  container.querySelectorAll('[data-demo]').forEach((root) => { const [type, id] = root.dataset.demo.split(':'); const cleanup = type === 'decision' ? decision(root, id) : ({ frames, pixels, compression, gop, bitrate })[type]?.(root); if (cleanup) dispose.push(cleanup); });
  return () => dispose.forEach((cleanup) => cleanup());
}
