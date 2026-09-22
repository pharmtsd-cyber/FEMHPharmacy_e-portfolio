async function backToDashboard(forceRefresh = false) {
  currentRecordId = ""; currentSavedAnswers = {}; currentTemplateId = "";
  currentAttemptCount = 0; currentTaskStatus = "";
  if(autoSaveInterval) clearInterval(autoSaveInterval);
  
  updateNavState('tab-dashboard');
  switchView('view-dashboard'); 
  
  if (!isDashboardLoaded || forceRefresh) {
    document.getElementById('theme-buttons-container').innerHTML = '<div style="padding: 30px; text-align: center; color:#666; grid-column: 1 / -1;">⏳ 與伺服器同步最新資料中 (約需 3~5 秒)...</div>';
    document.getElementById('template-list-container').innerHTML = '';
    document.getElementById('selected-theme-title').style.display = 'none';
    document.getElementById('todo-section').style.display = 'none';

    // 🌟 如果是重新整理，使用輕量 API (因為已登入)
    const res = await callGAS(forceRefresh && isDashboardLoaded ? 'getDashboardInit' : 'loginAndInit', { empId: currentUser.empId });
    
    if (res && res.status === 'success') {
      globalHistoryCounts = res.historyCounts || {}; 
      globalQuestions = res.allQuestions || []; 
      globalDopsQuestions = res.dopsCommonQs || []; // 存入快取
      globalTasks = res.tasks || [];
      allTemplates = res.templates || [];
      isDashboardLoaded = true;
    } else {
      document.getElementById('theme-buttons-container').innerHTML = '<p style="color:red;">載入失敗，請檢查網路連線後重新登入</p>';
      return;
    }
  }

  // 🌟 核心邏輯：判斷是否為學生 (包含學生、實習生)
  const isStudentUser = [currentUser.role, currentUser.specialRole].join(' ').includes('學生') || [currentUser.role, currentUser.specialRole].join(' ').includes('實習生');

  if (isStudentUser) {
    // 學生視角：隱藏發起問卷的區塊
    document.getElementById('theme-buttons-container').style.display = 'none';
    document.getElementById('template-list-container').style.display = 'none';
    document.getElementById('selected-theme-title').style.display = 'none';
    
    // 隱藏「學習護照項目」的標題 (透過前一個元素定位)
    const passportTitle = document.getElementById('theme-buttons-container').previousElementSibling;
    if (passportTitle && passportTitle.tagName === 'H2') passportTitle.style.display = 'none';
  } else {
    // 老師視角：顯示所有模板分類
    document.getElementById('theme-buttons-container').style.display = 'grid';
    const passportTitle = document.getElementById('theme-buttons-container').previousElementSibling;
    if (passportTitle && passportTitle.tagName === 'H2') passportTitle.style.display = 'block';

    const allowedThemes = new Set(allTemplates.map(t => t.theme));
    let themeHTML = '';
    if (allowedThemes.size === 0) themeHTML = '<p style="color:#e11d48; text-align:center; grid-column: 1 / -1;">目前系統尚無啟用的考核項目</p>';
    else allowedThemes.forEach(theme => themeHTML += `<div class="theme-card" onclick="filterTemplatesByTheme('${theme}')">${theme}</div>`);
    document.getElementById('theme-buttons-container').innerHTML = themeHTML;
  }

  // 雙方都會看到待辦與預約清單
  renderTodoList(globalTasks);
}

let currentAppointTemplate = ""; // 暫存正在預約的表單ID

// 1. 列表渲染 (加入「預約」與「填寫」雙按鈕)
function filterTemplatesByTheme(selectedTheme) {
  document.getElementById('selected-theme-title').innerText = `【${selectedTheme}】 包含以下項目：`; 
  document.getElementById('selected-theme-title').style.display = 'block';
  let listHTML = '';
  allTemplates.filter(t => t.theme === selectedTheme).forEach(t => {
    listHTML += `
      <div class="template-item">
        <div>
          <div class="template-title">${t.title}</div>
          <div class="template-desc">${t.description}</div>
        </div>
        <div class="action-group">
          <button class="btn-secondary" style="padding:8px 16px; font-size:14px;" onclick="openAppointmentModal('${t.templateId}', '${t.title}')">⏰ 預約</button>
          <button class="btn-primary" style="padding:8px 16px; font-size:14px;" onclick="openForm('${t.templateId}')">📝 填寫</button>
        </div>
      </div>`;
  });
  document.getElementById('template-list-container').innerHTML = listHTML;
}

// 2. 待辦事項拆分 (未完成 vs 預約)
function renderTodoList(tasks) {
  globalTasks = tasks; 
  const todoContainer = document.getElementById('todo-list-container'); 
  const apptContainer = document.getElementById('appointment-list-container'); 
  
  let todoHtml = ''; let apptHtml = '';

  globalTasks.forEach((task, index) => {
    const templateInfo = allTemplates.find(t => t.templateId === task.templateId);
    const title = templateInfo ? templateInfo.title : "未知項目";
    
    // 預約項目
    if (task.status === '預約中') {
      apptHtml += `
        <div class="template-item" style="border-left: 5px solid #0284c7;" onclick="resumeTaskByIndex(${index})">
          <div>
            <div class="template-title">${title} <span class="status-badge status-appt">⏰ 預約排程</span></div>
            <div class="template-desc">預約時間：${task.time} <br>對象：${task.studentName || task.teacherId}</div>
          </div>
          <div style="color:#0284c7; font-weight:bold; width:100%; text-align:right;">進入表單 ➔</div>
        </div>`;
    } 
    // 待辦與暫存項目
    else if (task.status !== '已結案') {
      const badgeClass = task.status === '老師暫存' ? 'status-draft' : 'status-pending';
      todoHtml += `
        <div class="template-item" style="border-left: 5px solid #e11d48;" onclick="resumeTaskByIndex(${index})">
          <div>
            <div class="template-title">${title} <span class="status-badge ${badgeClass}">${task.status}</span></div>
            <div class="template-desc">第 ${task.attempt} 次評估 ｜ 最後更新：${task.time}</div>
          </div>
          <div style="color:#e11d48; font-weight:bold; width:100%; text-align:right;">繼續填寫 ➔</div>
        </div>`;
    }
  });

  todoContainer.innerHTML = todoHtml;
  document.getElementById('todo-section').style.display = todoHtml ? 'block' : 'none';
  
  apptContainer.innerHTML = apptHtml;
  document.getElementById('appointment-section').style.display = apptHtml ? 'block' : 'none';
}

// 3. 預約 Modal 邏輯
function openAppointmentModal(templateId, title) {
  currentAppointTemplate = templateId;
  document.getElementById('appoint-template-name').innerText = title;
  
  let listHtml = '';
  globalUserList.forEach(u => { listHtml += `<option value="${u.empId} - ${u.name}"></option>`; });
  document.getElementById('appoint-user-list').innerHTML = listHtml;
  
  document.getElementById('appoint-datetime').value = '';
  document.getElementById('appoint-target').value = '';
  document.getElementById('appointment-modal').style.display = 'flex';
}
function closeAppointmentModal() { document.getElementById('appointment-modal').style.display = 'none'; }

async function submitAppointment() {
  const dt = document.getElementById('appoint-datetime').value;
  const target = document.getElementById('appoint-target').value;
  if(!dt || !target) return alert('請完整填寫時間與對象！');
  
  // 借用 form 的送出邏輯，發送 actionType='appointment'
  const payload = {
    recordId: "", userId: currentUser.empId, userName: currentUser.name, 
    studentId: target.split('-')[0].trim(), templateId: currentAppointTemplate, 
    actionType: 'appointment', answers: { assessment_date: dt },
    teacherSignature: "", studentSignature: ""
  };

  const res = await callGAS('submitExam', { payload });
  if (res.status === 'success') {
    alert("✅ 預約已成功建立！");
    closeAppointmentModal();
    backToDashboard(true); // 強制刷新
  } else {
    alert("錯誤：" + res.message);
  }
}

// 4. 行事曆頁面邏輯
function openCalendar() {
  updateNavState('tab-calendar');
  switchView('view-calendar');
  
  let calHtml = '';
  // 將 globalTasks 依時間排序 (越新的在越上面)
  const sortedTasks = [...globalTasks].sort((a,b) => new Date(b.time) - new Date(a.time));
  
  sortedTasks.forEach((task, index) => {
    const templateInfo = allTemplates.find(t => t.templateId === task.templateId);
    const title = templateInfo ? templateInfo.title : "未知項目";
    
    let badgeClass = 'status-pending'; let icon = '📝';
    if(task.status === '預約中') { badgeClass = 'status-appt'; icon = '⏰'; }
    if(task.status === '已結案') { badgeClass = 'status-closed'; icon = '✅'; }

    calHtml += `
      <div class="template-item" style="border: 1px solid #e2e8f0; margin-bottom:10px;" onclick="resumeTaskByIndex(${index})">
        <div>
          <div class="template-title">${icon} ${title} <span class="status-badge ${badgeClass}">${task.status}</span></div>
          <div class="template-desc">${task.time} ｜ 對象：${task.studentName || task.teacherId}</div>
        </div>
        <div style="color:#64748b; font-size:14px; text-align:right;">檢視 ➔</div>
      </div>`;
  });
  
  document.getElementById('calendar-list-container').innerHTML = calHtml || '<p style="text-align:center; color:#94a3b8;">目前尚無任何紀錄或預約</p>';
}

function resumeTaskByIndex(index) {
  const task = globalTasks[index]; if (!task) return;
  currentRecordId = task.recordId; 
  currentAttemptCount = task.attempt || 0; 
  currentTaskStatus = task.status || ""; 
  currentSavedAnswers = task.answers; 
  currentSavedAnswers.teacherSignature = task.teacherSignature;
  currentSavedAnswers.studentSignature = task.studentSignature;
  updateNavState(''); 
  openForm(task.templateId);             
}
