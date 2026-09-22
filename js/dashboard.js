async function loadDataIfNeeded(forceRefresh = false) {
  if (!isDashboardLoaded || forceRefresh) {
    const res = await callGAS(forceRefresh && isDashboardLoaded ? 'getDashboardInit' : 'loginAndInit', { empId: currentUser.empId });
    if (res && res.status === 'success') {
      globalHistoryCounts = res.historyCounts || {}; 
      globalTasks = res.tasks || [];
      if(!isDashboardLoaded) allTemplates = res.templates || [];
      isDashboardLoaded = true;
      return true;
    } else {
      alert('載入失敗，請檢查網路連線後重新登入');
      return false;
    }
  }
  return true;
}

function createListHTML(tasksArr) {
  let html = '';
  tasksArr.forEach(task => {
    const origIndex = globalTasks.indexOf(task);
    const templateInfo = allTemplates.find(t => t.templateId === task.templateId);
    const title = templateInfo ? templateInfo.title : "未知項目";
    
    let badgeClass = 'status-pending'; let icon = '📝'; let actionText = '繼續填寫 ➔'; let color = '#e11d48';
    if(task.status === '預約中') { badgeClass = 'status-appt'; icon = '⏰'; actionText = '進入表單 ➔'; color = '#0284c7'; }
    if(task.status === '已結案') { badgeClass = 'status-closed'; icon = '✅'; actionText = '檢視內容 ➔'; color = '#166534'; }
    if(task.status === '老師暫存') { badgeClass = 'status-draft'; }

    html += `
      <div class="template-item" style="border-left: 5px solid ${color}; margin-bottom:10px;" onclick="resumeTaskByIndex(${origIndex})">
        <div>
          <div class="template-title">${icon} ${title} <span class="status-badge ${badgeClass}">${task.status}</span></div>
          <div class="template-desc">${task.time} ｜ 對象：${task.studentName || task.teacherId}</div>
        </div>
        <div style="color:${color}; font-weight:bold; white-space:nowrap; text-align:right;">${actionText}</div>
      </div>`;
  });
  return html || '<p style="text-align:center; color:#94a3b8; padding: 20px 0;">尚無紀錄</p>';
}

async function openPassport(forceRefresh = false) {
  if(autoSaveInterval) clearInterval(autoSaveInterval);
  updateNavState('tab-passport');
  switchView('view-passport'); 
  
  if (!isDashboardLoaded || forceRefresh) {
    document.getElementById('passport-recent-list').innerHTML = '<div style="padding: 30px; text-align: center; color:#666;">⏳ 與伺服器同步資料中...</div>';
  }

  const success = await loadDataIfNeeded(forceRefresh);
  if (!success) return;

  const isStudentUser = [currentUser.role, currentUser.specialRole].join(' ').includes('學生') || [currentUser.role, currentUser.specialRole].join(' ').includes('實習生');
  document.getElementById('tab-forms').style.display = isStudentUser ? 'none' : 'block';

  const completedCount = globalTasks.filter(t => t.status === '已結案').length;
  const apptCount = globalTasks.filter(t => t.status === '預約中').length;
  const pendingCount = globalTasks.filter(t => t.status !== '已結案' && t.status !== '預約中').length;

  document.getElementById('metric-completed').innerText = completedCount;
  document.getElementById('metric-appt').innerText = apptCount;
  document.getElementById('metric-pending').innerText = pendingCount;

  const sortedTasks = [...globalTasks].sort((a,b) => new Date(b.time) - new Date(a.time)).slice(0, 5);
  document.getElementById('passport-recent-list').innerHTML = createListHTML(sortedTasks);
}

async function openForms() {
  if(autoSaveInterval) clearInterval(autoSaveInterval);
  updateNavState('tab-forms');
  switchView('view-forms'); 

  const success = await loadDataIfNeeded();
  if (!success) return;

  const allowedThemes = new Set(allTemplates.map(t => t.theme));
  let themeHTML = '';
  if (allowedThemes.size === 0) themeHTML = '<p style="color:#e11d48; text-align:center; grid-column: 1 / -1;">目前系統尚無啟用的考核項目</p>';
  else allowedThemes.forEach(theme => themeHTML += `<div class="theme-card" onclick="filterTemplatesByTheme('${theme}')">${theme}</div>`);
  
  document.getElementById('theme-buttons-container').innerHTML = themeHTML;
  document.getElementById('template-list-container').innerHTML = '';
  document.getElementById('selected-theme-title').style.display = 'none';
}

async function openCalendar() {
  if(autoSaveInterval) clearInterval(autoSaveInterval);
  updateNavState('tab-calendar');
  switchView('view-calendar');
  
  const success = await loadDataIfNeeded();
  if (!success) return;

  const sortedTasks = [...globalTasks].sort((a,b) => new Date(b.time) - new Date(a.time));
  const pending = sortedTasks.filter(t => t.status !== '已結案' && t.status !== '預約中');
  const appts = sortedTasks.filter(t => t.status === '預約中');
  const completed = sortedTasks.filter(t => t.status === '已結案');

  document.getElementById('cal-pending-list').innerHTML = createListHTML(pending);
  document.getElementById('cal-appt-list').innerHTML = createListHTML(appts);
  document.getElementById('cal-completed-list').innerHTML = createListHTML(completed);
}

let currentAppointTemplate = "";

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
  
  const payload = {
    recordId: "", userId: currentUser.empId, userName: currentUser.name, 
    studentId: target.split('-')[0].trim(), templateId: currentAppointTemplate, 
    actionType: 'appointment', answers: { assessment_date: dt },
    teacherSignature: "", studentSignature: ""
  };

  const originalText = event.target.innerText;
  event.target.innerText = '處理中...';
  event.target.disabled = true;

  const res = await callGAS('submitExam', { payload });
  if (res.status === 'success') {
    alert("✅ 預約已成功建立！");
    closeAppointmentModal();
    openCalendar(); 
  } else {
    alert("錯誤：" + res.message);
    event.target.innerText = originalText;
    event.target.disabled = false;
  }
}
