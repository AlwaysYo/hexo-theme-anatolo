// 获取显示运行时间的元素
const runtimeSpan = document.getElementById('runtime');

function calculateRuntime() {
  // 使用UTC时间以避免时区问题（2023年7月16日23:13:10 UTC）
  const startDate = new Date(Date.UTC(2023, 6, 16, 23, 13, 10));
  const now = new Date();
  const diffTime = now - startDate;

  // 处理时间差为负数的情况（如本地时间未到达UTC时间）
  if (diffTime < 0) {
    runtimeSpan.textContent = '本站即将上线！';
    return;
  }

  // 分解时间差到各个单位
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffTime % (1000 * 60)) / 1000);

  // 更新显示内容
  runtimeSpan.textContent = `本站已稳定运行: ${days} 天 ${hours} 小时 ${minutes} 分 ${seconds} 秒`;
}

// 立即执行一次并设置定时器
calculateRuntime();
setInterval(calculateRuntime, 1000);
