let timerRaf = {}; // 存放 requestAnimationFrame ID

function toggleTimer(type, label) {
  if (!timerStates[type].isRunning) {
    timerStates[type].start = Date.now();
    timerStates[type].isRunning = true;
    
    // UI 更新
    document.getElementById(`btn-${type}`).innerText = `■ 停止${label}計時`;
    
    // 精準計時器迴圈
    const updateTime = () => {
      if(!timerStates[type].isRunning) return;
      const elapsedMs = Date.now() - timerStates[type].start;
      const totalSeconds = timerStates[type].elapsed + Math.floor(elapsedMs / 1000);
      document.getElementById(`text-${type}`).innerText = `計時中... (${getStr(totalSeconds)})`;
      timerRaf[type] = requestAnimationFrame(updateTime);
    };
    updateTime();

  } else {
    timerStates[type].isRunning = false;
    cancelAnimationFrame(timerRaf[type]);
    const elapsedMs = Date.now() - timerStates[type].start;
    timerStates[type].elapsed += Math.floor(elapsedMs / 1000);
    updateTimerUI(type, label);
  }
}
