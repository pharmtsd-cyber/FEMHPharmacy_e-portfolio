async function backToDashboard(forceRefresh = false) {
  currentRecordId = ""; currentSavedAnswers = {}; currentTemplateId = "";
  currentAttemptCount = 0; currentTaskStatus = "";
  if(autoSaveInterval) clearInterval(autoSaveInterval);
  
  updateNavState('tab-dashboard');
  switchView('view-dashboard'); 
  
  if (!isDashboardLoaded || forceRefresh) {
    document.getElementById('theme-buttons-container').innerHTML = '<div style="padding: 30px; text-align: center; color:#666;">⏳ 載入模組與待辦事項中...</div>';
    document.getElementById('template-list-container').innerHTML = '';
    document.getElementById('selected-theme-title').style.display = 'none';
    document.getElementById('todo-section').style.display = 'none';

    const res = await callGAS('getDashboardInit', { empId: currentUser.empId });
    
    if (res && res.status === 'success') {
      globalHistoryCounts = res.historyCounts || {}; 
      globalQuestions = res.allQuestions || []; // 🌟 一次性載入所有題目
      globalTasks = res.tasks || [];
      
      const userRolesStr = [currentUser.role, currentUser.specialRole].filter(Boolean).join(' ');
      allTemplates = res.templates.filter(t => {
        if (!t.allowedRoles || t.allowedRoles.trim() === "") return true;
        const allowedArr = t.allowedRoles.split(',').map(r => r.trim());
        return allowedArr.some(r => userRolesStr.includes(r));
      });
      isDashboardLoaded = true; // 🌟 標記快取完成
    } else {
      document.getElementById('theme-buttons-container').innerHTML = '<p style="color:red;">載入失敗，請檢查權限後重新整理</p>';
      return;
    }
  }

  // 從快取中渲染畫面，速度極快
  const allowedThemes = new Set(allTemplates.map(t => t.theme));
  let themeHTML = '';
  if (allowedThemes.size === 0) themeHTML = '<p style="color:#e11d48; text-align:center; grid-column: 1 / -1;">您目前沒有開放的考核項目</p>';
  else allowedThemes.forEach(theme => themeHTML += `<div class="theme-card" onclick="filterTemplatesByTheme('${theme}')">${theme}</div>`);
  document.getElementById('theme-buttons-container').innerHTML = themeHTML;

  renderTodoList(globalTasks);
}
