(function () {
  const DIGIT_WIDTH = 14;
  const COLON_INDEX = 10;
  const COLOR_PALETTE = ['#3BE', '#09C', '#A6C', '#93C', '#9C0', '#690', '#FB3', '#F80', '#F44', '#C00'];
  const PHYSICS = {
    GRAVITY: 0.5,
    INITIAL_SPEED: -8,
  };

  const digit = [
    [0x1c, 0x36, 0x63, 0x63, 0x63, 0x36, 0x1c],
    [0x0c, 0x3c, 0x0c, 0x0c, 0x0c, 0x0c, 0x7f],
    [0x3e, 0x63, 0x03, 0x0c, 0x30, 0x63, 0x7f],
    [0x7f, 0x03, 0x06, 0x1c, 0x03, 0x63, 0x3e],
    [0x06, 0x1e, 0x36, 0x66, 0x7f, 0x06, 0x0f],
    [0x7f, 0x60, 0x7e, 0x03, 0x03, 0x63, 0x3e],
    [0x1c, 0x30, 0x7e, 0x63, 0x63, 0x63, 0x3e],
    [0x7f, 0x06, 0x0c, 0x0c, 0x18, 0x18, 0x18],
    [0x3e, 0x63, 0x63, 0x3e, 0x63, 0x63, 0x3e],
    [0x3e, 0x63, 0x63, 0x3f, 0x03, 0x06, 0x3c],
    [0x00, 0x1c, 0x1c, 0x00, 0x1c, 0x1c, 0x00],
  ];

  const canvas = document.getElementById('canvas-time');
  if (!canvas.getContext) return;

  const ctx = canvas.getContext('2d');
  const H = 100;
  const R = H / 20 - 1; // 4
  const step = R + 1; // 5
  const W = 8 * DIGIT_WIDTH * step; // 560
  canvas.height = H;
  canvas.width = W;

  let data = [];
  let balls = [];
  const particlePool = [];
  const offCanvases = [];

  // 初始化离屏Canvas
  for (let i = 0; i < 8; i++) {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = DIGIT_WIDTH * step;
    offCanvas.height = H;
    const offCtx = offCanvas.getContext('2d');
    offCtx.fillStyle = COLOR_PALETTE[0];
    offCanvases.push({ canvas: offCanvas, ctx: offCtx });
  }

  let currentColor = COLOR_PALETTE[0];
  let lastColorChange = 0;
  const COLOR_CHANGE_INTERVAL = 5000;

  function updateDigitCanvas(index, num, color) {
    const { ctx, canvas } = offCanvases[index];
    ctx.fillStyle = color;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    digit[num].forEach((bits, row) => {
      for (let col = 0; col < 7; col++) {
        if ((bits >> (6 - col)) & 1) {
          ctx.beginPath();
          ctx.arc(col * 2 * step + step, row * 2 * step + step, R, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
  }

  function updateAllDigits(newData, color) {
    newData.forEach((num, i) => {
      updateDigitCanvas(i, num, color);
    });
  }

  function detectChanges(newData) {
    newData.forEach((val, i) => {
      if (val !== data[i]) {
        generateParticles(i, data[i]);
        updateDigitCanvas(i, val, currentColor);
      }
    });
    data = [...newData];
  }

  function getTimeData() {
    const t = new Date().toTimeString().slice(0, 8);
    return [t[0], t[1], COLON_INDEX, t[3], t[4], COLON_INDEX, t[6], t[7]];
  }

  function generateParticles(pos, num) {
    const xOffset = DIGIT_WIDTH * step * pos;
    digit[num].forEach((bits, row) => {
      for (let col = 0; col < 7; col++) {
        if ((bits >> (6 - col)) & 1) {
          const particle = particlePool.pop() || {};
          particle.x = xOffset + col * 2 * step + step;
          particle.y = row * 2 * step + step;
          particle.speedX = Math.random() * 4 - 2;
          particle.speedY = PHYSICS.INITIAL_SPEED * Math.random();
          particle.color = COLOR_PALETTE[(Math.random() * 10) | 0];
          balls.push(particle);
        }
      }
    });
  }

  function updateBalls() {
    let i = balls.length;
    while (i--) {
      const ball = balls[i];
      ball.speedY += PHYSICS.GRAVITY;
      ball.y += ball.speedY;
      ball.x += ball.speedX;

      if (ball.x < -R || ball.x > W + R || ball.y > H + R) {
        particlePool.push(balls.splice(i, 1)[0]);
      }
    }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    offCanvases.forEach((offCanvas, i) => {
      ctx.drawImage(offCanvas.canvas, i * DIGIT_WIDTH * step, 0);
    });

    balls.forEach((ball) => {
      ctx.fillStyle = ball.color;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, R, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  data = getTimeData();
  updateAllDigits(data, currentColor);

  function animate(timestamp) {
    if (timestamp - lastColorChange > COLOR_CHANGE_INTERVAL) {
      const newColors = COLOR_PALETTE.filter((c) => c !== currentColor);
      currentColor = newColors[(Math.random() * newColors.length) | 0];
      updateAllDigits(data, currentColor);
      lastColorChange = timestamp;
    }

    const newData = getTimeData();
    detectChanges(newData);
    updateBalls();
    render();
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
})();
