async function handleLogin(mode) {
  const empId = document.getElementById('login-empid').value.trim();
  if (!empId) return alert('請輸入員工編號');
  
  document.body.className = `layout-${mode}`;
  
  // 🌟 鎖定按鈕並顯示載入中，避免使用者以為當機重複點擊
  const buttons = document.querySelectorAll('.login-card button');
  const originalTexts = [];
  buttons.forEach((b, i) => { 
    originalTexts.push(b.innerText);
    b.disabled = true; 
    b.style.opacity = '0.7'; 
    b.innerText = '⏳ 登入並載入題庫中...';
  });
  
  // 🌟 改呼叫合併的 API，大幅減少等待時間
  const res = await callGAS('loginAndInit', { empId: empId });
  
  // 恢復按鈕狀態
  buttons.forEach((b, i) => { 
    b.disabled = false; 
    b.style.opacity = '1'; 
    b.innerText = originalTexts[i]; 
  });

  if (res.status === 'success') {
    currentUser = res.user; globalUserList = res.userList; 
    document.getElementById('display-name').innerText = currentUser.name;
    document.getElementById('display-role').innerText = currentUser.specialRole || currentUser.role;
    
    document.getElementById('user-info-display').style.display = 'block'; 
    document.getElementById('hamburger-btn').style.display = 'block'; 
    
    // 🌟 登入時直接把全域變數塞滿，後續跳轉就不會再發送任何 API
    globalHistoryCounts = res.historyCounts || {}; 
    globalQuestions = res.allQuestions || []; 
    globalTasks = res.tasks || [];
    globalDopsQuestions = res.dopsCommonQs || [];
    
    const userRolesStr = [currentUser.role, currentUser.specialRole].filter(Boolean).join(' ');
    allTemplates = res.templates.filter(t => {
      if (!t.allowedRoles || t.allowedRoles.trim() === "") return true;
      const allowedArr = t.allowedRoles.split(',').map(r => r.trim());
      return allowedArr.some(r => userRolesStr.includes(r));
    });
    
    isDashboardLoaded = true; // 標記為已快取
    backToDashboard(false);   // 傳入 false 代表不要重新發送請求
  } else { 
    alert(res.message); 
  }
}

function logout() {
  currentUser = null; currentRecordId = ""; currentSavedAnswers = {}; currentTemplateId = "";
  globalUserList = []; globalTasks = []; allTemplates = [];
  if (timerRaf['ass']) cancelAnimationFrame(timerRaf['ass']);
  timerStates = { ass: { isRunning: false, start: null, elapsed: 0 } };
  isDashboardLoaded = false; globalQuestions = []; globalDopsQuestions = [];
  if (autoSaveInterval) clearInterval(autoSaveInterval);

  document.getElementById('login-empid').value = ''; 
  document.getElementById('user-info-display').style.display = 'none';
  document.getElementById('hamburger-btn').style.display = 'none'; 
  document.getElementById('sidebar').classList.remove('open');
  document.body.classList.remove('sidebar-open');
  
  document.getElementById('theme-buttons-container').innerHTML = '';
  document.getElementById('template-list-container').innerHTML = '';
  document.getElementById('todo-section').style.display = 'none';
  document.getElementById('todo-list-container').innerHTML = '';
  document.getElementById('questions-container').innerHTML = '';
  document.getElementById('analytics-charts-container').style.display = 'none';
  if (chartAcgmeInstance) chartAcgmeInstance.destroy();
  if (chartUnitInstance) chartUnitInstance.destroy();
  
  switchView('view-login');
}
