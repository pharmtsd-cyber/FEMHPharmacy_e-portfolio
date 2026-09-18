async function backToDashboard() {
  currentRecordId = ""; currentSavedAnswers = {}; currentTemplateId = "";
  if(autoSaveInterval) clearInterval(autoSaveInterval);
  
  updateNavState('tab-dashboard');
  switchView('view-dashboard'); 
  
  document.getElementById('theme-buttons-container').innerHTML = '載入模組中...';
  
  const res = await callGAS('getDashboardData');
  if(res.status === 'success') {
    const userRolesStr = [currentUser.role, currentUser.specialRole].filter(Boolean).join(' ');
    const allowedTemplates = res.templates.filter(t => {
      if (!t.allowedRoles || t.allowedRoles.trim() === "") return true;
      return userRolesStr.includes(currentUser.role) || userRolesStr.includes(currentUser.specialRole);
    });
    allTemplates = allowedTemplates; 
    const allowedThemes = new Set(allowedTemplates.map(t => t.theme));
    
    let themeHTML = '';
    if (allowedThemes.size === 0) themeHTML = '<p style="color:red; text-align:center;">目前沒有需要填寫的項目</p>';
    else allowedThemes.forEach(theme => themeHTML += `<div class="theme-card" onclick="filterTemplatesByTheme('${theme}')">${theme}</div>`);
    document.getElementById('theme-buttons-container').innerHTML = themeHTML;
    
    const tasksRes = await callGAS('getMyTasks', { empId: currentUser.empId });
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
  if (response.status !== 'success') return;
  globalTasks = response.data; 
  const container = document.getElementById('todo-list-container'); 
  const section = document.getElementById('todo-section');
  
  if (globalTasks.length === 0) { section.style.display = 'none'; return; }
  
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
