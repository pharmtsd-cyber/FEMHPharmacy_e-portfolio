async function handleLogin(mode) {
  const empId = document.getElementById('login-empid').value.trim();
  if (!empId) return alert('請輸入員工編號');
  
  // 直接套用傳進來的 mode ('web' 或 'mobile')
  document.body.className = `layout-${mode}`;
  
  // 鎖定所有按鈕防呆
  const buttons = document.querySelectorAll('.login-card button');
  buttons.forEach(b => { b.disabled = true; b.style.opacity = '0.7'; });
  
  const res = await callGAS('userLogin', { empId: empId });
  
  // 解除鎖定
  buttons.forEach(b => { b.disabled = false; b.style.opacity = '1'; });

  if (res.status === 'success') {
    currentUser = res.user; globalUserList = res.userList; 
    document.getElementById('display-name').innerText = currentUser.name;
    document.getElementById('display-role').innerText = currentUser.specialRole || currentUser.role;
    
    document.getElementById('user-info-display').style.display = 'block'; 
    document.getElementById('hamburger-btn').style.display = 'block'; 
    
    backToDashboard(); 
  } else { 
    alert(res.message); 
  }
}

function logout() {
  // 🌟 1. 徹底清空所有全域變數與記憶體，防止不同身分互相干擾
  currentUser = null; currentRecordId = ""; currentSavedAnswers = {}; currentTemplateId = "";
  globalUserList = []; globalTasks = []; allTemplates = [];
  if (timerRaf['ass']) cancelAnimationFrame(timerRaf['ass']);
  timerStates = { ass: { isRunning: false, start: null, elapsed: 0 } };
  if (autoSaveInterval) clearInterval(autoSaveInterval);

  // 🌟 2. 還原登入畫面與側邊欄狀態
  document.getElementById('login-empid').value = ''; 
  document.getElementById('user-info-display').style.display = 'none';
  document.getElementById('hamburger-btn').style.display = 'none'; 
  document.getElementById('sidebar').classList.remove('open');
  document.body.classList.remove('sidebar-open');
  
  // 🌟 3. 強制洗白所有動態生成的畫面，避免看到前一個人的殘影
  document.getElementById('theme-buttons-container').innerHTML = '';
  document.getElementById('template-list-container').innerHTML = '';
  document.getElementById('todo-section').style.display = 'none';
  document.getElementById('todo-list-container').innerHTML = '';
  document.getElementById('questions-container').innerHTML = '';
  document.getElementById('analytics-charts-container').style.display = 'none';
  if (chartAcgmeInstance) chartAcgmeInstance.destroy();
  if (chartUnitInstance) chartUnitInstance.destroy();
  
  // 🌟 4. 切換回登入區塊
  switchView('view-login');
}
