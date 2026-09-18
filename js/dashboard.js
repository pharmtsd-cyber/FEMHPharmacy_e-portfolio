async function backToDashboard() {
  currentRecordId = ""; currentSavedAnswers = {}; currentTemplateId = "";
  if(autoSaveInterval) clearInterval(autoSaveInterval);
  
  updateNavState('tab-dashboard');
  switchView('view-dashboard'); 
  
  // 顯示載入動畫
  document.getElementById('theme-buttons-container').innerHTML = '<div style="padding: 30px; text-align: center; color:#666;">⏳ 載入模組與待辦事項中...</div>';
  document.getElementById('template-list-container').innerHTML = '';
  document.getElementById('selected-theme-title').style.display = 'none';
  document.getElementById('todo-section').style.display = 'none';

  // 💡 提速優化：同時發起兩個請求
  const [dashRes, tasksRes] = await Promise.all([
    callGAS('getDashboardData'),
    callGAS('getMyTasks', { empId: currentUser.empId })
  ]).catch(err => {
    alert("載入失敗，請檢查連線");
    return [null, null];
  });
  
  // 處理模組清單
  if (dashRes && dashRes.status === 'success') {
    const userRolesStr = [currentUser.role, currentUser.specialRole].filter(Boolean).join(' ');
    
    // 💡 修正權限判斷邏輯，解決空白問題
    const allowedTemplates = dashRes.templates.filter(t => {
      if (!t.allowedRoles || t.allowedRoles.trim() === "") return true;
      const allowedArr = t.allowedRoles.split(',').map(r => r.trim());
      return allowedArr.some(r => userRolesStr.includes(r));
    });
    
    allTemplates = allowedTemplates; 
    const allowedThemes = new Set(allowedTemplates.map(t => t.theme));
    
    let themeHTML = '';
    if (allowedThemes.size === 0) themeHTML = '<p style="color:#e11d48; text-align:center; grid-column: 1 / -1;">您目前沒有開放的考核項目</p>';
    else allowedThemes.forEach(theme => themeHTML += `<div class="theme-card" onclick="filterTemplatesByTheme('${theme}')">${theme}</div>`);
    document.getElementById('theme-buttons-container').innerHTML = themeHTML;
  } else {
    document.getElementById('theme-buttons-container').innerHTML = '<p style="color:red;">載入失敗，請重新整理</p>';
  }

  // 處理待辦事項
  if (tasksRes && tasksRes.status === 'success') {
    renderTodoList(tasksRes);
  }
}

function filterTemplatesByTheme(selectedTheme) {
  document.getElementById('selected-theme-title').innerText = `【${selectedTheme}】 包含以下項目：`; 
  document.getElementById('selected-theme-title').style.display = 'block';
  let listHTML = '';
  allTemplates.filter(t => t.theme === selectedTheme).forEach(t => {
    listHTML += `<div class="template-item" onclick="openForm('${t.templateId}')">
        <div><div class="template-title">${t.title}</div><div class="template-desc">${t.description}</div></div>
        <div style="color:#009688; font-weight:bold;">填寫 ➔</div></div>`;
  });
  document.getElementById('template-list-container').innerHTML = listHTML;
}

function renderTodoList(response) {
  globalTasks = response.data; 
  const container = document.getElementById('todo-list-container'); 
  const section = document.getElementById('todo-section');
  
  if (!globalTasks || globalTasks.length === 0) { section.style.display = 'none'; return; }
  
  let html = '';
  globalTasks.forEach((task, index) => {
    const templateInfo = allTemplates.find(t => t.templateId === task.templateId);
    const title = templateInfo ? templateInfo.title : "未知項目";
    const badgeClass = task.status === '老師暫存' ? 'status-draft' : 'status-pending';
    html += `<div class="template-item" style="border-left: 5px solid #e11d48;" onclick="resumeTaskByIndex(${index})">
        <div><div class="template-title">${title} <span class="status-badge ${badgeClass}">${task.status}</span></div>
        <div class="template-desc">第 ${task.attempt} 次評估 ｜ 最後更新：${task.time}</div></div>
        <div style="color:#e11d48; font-weight:bold;">繼續填寫 ➔</div></div>`;
  });
  container.innerHTML = html; section.style.display = 'block';
}

function resumeTaskByIndex(index) {
  const task = globalTasks[index]; if (!task) return;
  currentRecordId = task.recordId; 
  currentSavedAnswers = task.answers; 
  currentSavedAnswers.teacherSignature = task.teacherSignature;
  currentSavedAnswers.studentSignature = task.studentSignature;
  updateNavState(''); 
  openForm(task.templateId);             
}
