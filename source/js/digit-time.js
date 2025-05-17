(function () {
  // 常量定义
  const DIGIT_WIDTH = 14; // 单个数字的像素块宽度
  const COLON_INDEX = 10; // 冒号在digit数组中的索引
  const COLOR_PALETTE = ['#3BE', '#09C', '#A6C', '#93C', '#9C0', '#690', '#FB3', '#F80', '#F44', '#C00'];
  const PHYSICS = {
    // 粒子物理参数
    GRAVITY: 0.5, // 重力加速度
    INITIAL_SPEED: -8, // 初始向上速度
  };

  // 点阵数字数据（0-9和冒号），每个数字用7个字节表示7行
  const digit = [
    [0x1c, 0x36, 0x63, 0x63, 0x63, 0x36, 0x1c], // 0
    [0x0c, 0x3c, 0x0c, 0x0c, 0x0c, 0x0c, 0x7f], // 1
    [0x3e, 0x63, 0x03, 0x0c, 0x30, 0x63, 0x7f], // 2
    [0x7f, 0x03, 0x06, 0x1c, 0x03, 0x63, 0x3e], // 3
    [0x06, 0x1e, 0x36, 0x66, 0x7f, 0x06, 0x0f], // 4
    [0x7f, 0x60, 0x7e, 0x03, 0x03, 0x63, 0x3e], // 5
    [0x1c, 0x30, 0x7e, 0x63, 0x63, 0x63, 0x3e], // 6
    [0x7f, 0x06, 0x0c, 0x0c, 0x18, 0x18, 0x18], // 7
    [0x3e, 0x63, 0x63, 0x3e, 0x63, 0x63, 0x3e], // 8
    [0x3e, 0x63, 0x63, 0x3f, 0x03, 0x06, 0x3c], // 9
    [0x00, 0x1c, 0x1c, 0x00, 0x1c, 0x1c, 0x00], // 冒号
  ];

  // Canvas初始化
  const canvas = document.getElementById('canvas-time');
  if (!canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const H = 80; // 画布固定高度
  const R = H / 20; // 圆点半径（4px）
  const step = R + 1; // 圆点间距（5px）

  // 计算尺寸相关常量
  const DIGIT_BLOCK_WIDTH = DIGIT_WIDTH * step; // 单个数字位宽度（60px）
  const TOTAL_DIGITS_WIDTH = 8 * DIGIT_BLOCK_WIDTH; // 总数字宽度（480px）

  // 设置画布高度（宽度通过CSS设置实现响应式）
  canvas.height = H;

  // 状态变量
  let data = []; // 当前显示的数字数组
  let balls = []; // 活动粒子数组
  const particlePool = []; // 粒子对象池（用于复用）
  const offCanvases = []; // 离屏Canvas缓存

  // 初始化离屏Canvas（每个数字位单独渲染）
  for (let i = 0; i < 8; i++) {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = DIGIT_BLOCK_WIDTH;
    offCanvas.height = H;
    const offCtx = offCanvas.getContext('2d');
    offCtx.fillStyle = COLOR_PALETTE[0];
    offCanvases.push({ canvas: offCanvas, ctx: offCtx });
  }

  let currentColor = COLOR_PALETTE[0]; // 当前颜色
  let lastColorChange = 0; // 上次颜色切换时间戳
  const COLOR_CHANGE_INTERVAL = 5000; // 颜色切换间隔（5秒）

  // 更新单个数字位的离屏Canvas
  function updateDigitCanvas(index, num, color) {
    const { ctx, canvas } = offCanvases[index];
    ctx.fillStyle = color;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    digit[num].forEach((bits, row) => {
      for (let col = 0; col < 7; col++) {
        if ((bits >> (6 - col)) & 1) {
          // 检查是否需要绘制圆点
          ctx.beginPath();
          ctx.arc(
            col * 2 * step + step, // x坐标（居中在数字位内）
            row * 2 * step + step, // y坐标（居中在数字位内）
            R,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
    });
  }

  // 更新所有数字位
  function updateAllDigits(newData, color) {
    newData.forEach((num, i) => {
      updateDigitCanvas(i, num, color);
    });
  }

  // 检测数字变化并生成粒子
  function detectChanges(newData, startX) {
    newData.forEach((val, i) => {
      if (val !== data[i]) {
        generateParticles(i, data[i], startX); // 传递居中偏移量
        updateDigitCanvas(i, val, currentColor);
      }
    });
    data = [...newData];
  }

  // 获取当前时间并格式化为数字数组
  function getTimeData() {
    const t = new Date().toTimeString().slice(0, 8); // "HH:MM:SS"
    return [
      t[0],
      t[1], // 小时
      COLON_INDEX, // 第一个冒号
      t[3],
      t[4], // 分钟
      COLON_INDEX, // 第二个冒号
      t[6],
      t[7], // 秒
    ].map((n) => (n === ':' ? COLON_INDEX : parseInt(n)));
  }

  // 生成粒子效果
  function generateParticles(pos, num, startX) {
    const xOffset = startX + pos * DIGIT_BLOCK_WIDTH; // 包含居中偏移
    digit[num].forEach((bits, row) => {
      for (let col = 0; col < 7; col++) {
        if ((bits >> (6 - col)) & 1) {
          // 遍历每个需要粒子的点
          const particle = particlePool.pop() || {};
          // 计算粒子初始位置（基于居中后的坐标）
          particle.x = xOffset + col * 2 * step + step;
          particle.y = row * 2 * step + step;
          particle.speedX = Math.random() * 4 - 2; // 随机水平速度
          particle.speedY = PHYSICS.INITIAL_SPEED * Math.random(); // 随机垂直速度
          particle.color = COLOR_PALETTE[(Math.random() * 10) | 0]; // 随机颜色
          balls.push(particle);
        }
      }
    });
  }

  // 更新粒子状态
  function updateBalls() {
    let i = balls.length;
    while (i--) {
      // 倒序遍历避免索引错位
      const ball = balls[i];
      ball.speedY += PHYSICS.GRAVITY; // 应用重力
      ball.y += ball.speedY;
      ball.x += ball.speedX;

      // 移出屏幕的粒子回收到对象池
      if (ball.x < -R || ball.x > canvas.width + R || ball.y > H + R) {
        particlePool.push(balls.splice(i, 1)[0]);
      }
    }
  }

  // 渲染画面
  function render(startX) {
    ctx.clearRect(0, 0, canvas.width, H);

    // 绘制所有预渲染的数字位（应用居中偏移）
    offCanvases.forEach((offCanvas, i) => {
      ctx.drawImage(offCanvas.canvas, startX + i * DIGIT_BLOCK_WIDTH, 0);
    });

    // 绘制所有活动粒子
    balls.forEach((ball) => {
      ctx.fillStyle = ball.color;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, R, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 初始化
  data = getTimeData();
  updateAllDigits(data, currentColor);

  // 动画循环
  function animate(timestamp) {
    // 计算居中偏移量（动态适应画布宽度变化）
    const startX = (canvas.width - TOTAL_DIGITS_WIDTH) / 2;

    // 颜色切换逻辑（每5秒更换）
    if (timestamp - lastColorChange > COLOR_CHANGE_INTERVAL) {
      const newColors = COLOR_PALETTE.filter((c) => c !== currentColor);
      currentColor = newColors[(Math.random() * newColors.length) | 0];
      updateAllDigits(data, currentColor);
      lastColorChange = timestamp;
    }

    // 更新时间数据
    const newData = getTimeData();
    detectChanges(newData, startX); // 传递当前居中偏移量
    updateBalls();
    render(startX); // 使用当前居中偏移量渲染

    requestAnimationFrame(animate);
  }

  // 首次渲染（确保初始位置正确）
  const initialStartX = (canvas.width - TOTAL_DIGITS_WIDTH) / 2;
  render(initialStartX);

  // 启动动画循环
  requestAnimationFrame(animate);
})();
