async function openForm(templateId) {
  currentTemplateId = templateId; 
  if (!currentRecordId) currentSavedAnswers = {}; 
  
  // 重置計時器狀態
  for (let key in timerStates) { 
    if (timerRaf[key]) cancelAnimationFrame(timerRaf[key]); 
    timerStates[key] = { isRunning: false, start: null, elapsed: 0 }; 
  }
  if(autoSaveInterval) clearInterval(autoSaveInterval); canvases = {};

  const localKey = `draft_${currentUser.empId}_${templateId}`; 
  const localData = localStorage.getItem(localKey);
  if (localData && !currentRecordId) {
    if (confirm('💡 發現未存檔的本機暫存資料，請問是否恢復？')) {
      const parsed = JSON.parse(localData); 
      currentSavedAnswers = parsed.answers || {}; 
      if (parsed.timers) timerStates = parsed.timers;
    }
  }
  
  switchView('view-form'); 
  document.getElementById('form-title').innerText = "題目載入中..."; 
  document.getElementById('questions-container').innerHTML = '<div style="padding:30px; text-align:center; color:#666;">⏳ 題目生成中...</div>'; 
  
  const res = await callGAS('getTemplateData', { templateId, empId: currentUser.empId });
  if (res.status === 'error') { alert("❌ " + res.message); backToDashboard(); return; }
  renderForm(res);
}

function renderForm(response) {
  const data = response.data; 
  document.getElementById('form-title').innerText = data.title;
  const isEPA = data.title.toUpperCase().includes('EPA');
  const userRolesStr = [currentUser.role, currentUser.specialRole].filter(Boolean).join(' ');
  const isStudentUser = userRolesStr.includes('學生') || userRolesStr.includes('實習生');
  const needsAssLock = !isStudentUser && timerStates.ass.elapsed === 0 && !timerStates.ass.isRunning;

  const todayObj = new Date();
  const defaultTodayStr = new Date(todayObj.getTime() - todayObj.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const savedAssessmentDate = currentSavedAnswers['assessment_date'] || defaultTodayStr;

  let html = `<p style="color: #666; margin-bottom: 20px;">${data.description}</p><form id="dynamic-exam-form">`;
  html += `<div id="ass-lock-msg" class="question-block" style="background:#fff3cd; color:#856404; display:${needsAssLock ? 'block' : 'none'};">⚠️ 請先點選「▶ 評核開始」以解鎖表單</div>`;

  const disableBasicInfo = isStudentUser ? 'disabled="true"' : '';
  
  // 基礎資訊
  html += `
  <div style="display:flex; gap:15px; flex-wrap:wrap; margin-bottom: 20px;">
    <div class="question-block" style="flex:1; border-left: 5px solid var(--primary-color); padding: 15px; margin-bottom:0;">
      <h3 style="margin-top:0;">📅 評核日期</h3>
      <input type="date" name="assessment_date" value="${savedAssessmentDate}" required ${disableBasicInfo}>
    </div>
    <div class="question-block" style="flex:2; border-left: 5px solid var(--primary-color); padding: 15px; margin-bottom:0;">
      <h3 style="margin-top:0;">👤 受評學員</h3>
      <input type="text" name="native_student" id="native-student-input" list="native-student-list" value="${currentSavedAnswers['native_student'] || ''}" placeholder="請搜尋..." required ${disableBasicInfo} autocomplete="off">
      <datalist id="native-student-list">`;
  globalUserList.forEach(u => { html += `<option value="${u.empId} - ${u.name}"></option>`; });
  html += `</datalist></div></div>`;

  // 💡 移除了觀察時間，只留下評核時間
  html += `
  <div class="floating-timer-panel">
    <h3 style="margin-top:0; color: var(--secondary-color);">⏳ 計時控制</h3>
    <div class="timer-row" style="border-bottom:none; margin-bottom:0;">
      <button type="button" id="btn-ass" class="btn-secondary" onclick="toggleTimer('ass', '評核')" style="width:100%;">▶ 評核開始</button>
      <div style="display:flex; justify-content:space-between; margin-top:8px;"><span id="text-ass">未開始</span><a href="javascript:void(0)" onclick="resetTimer('ass')">重置</a></div>
      <input type="hidden" name="time_assessment" id="val_ass" value="${currentSavedAnswers['time_assessment'] || ''}">
    </div>
  </div>`;

  // 渲染題目
  data.questions.forEach(q => {
    if (q.targetRole && q.targetRole.includes('學生') && !isStudentUser) return; 
    if (q.type === 'heading') { html += `<h3>${q.question}</h3>`; return; }
    
    const isLocked = q.targetRole.includes('教師') && isStudentUser;
    const inputClass = isLocked ? '' : 'teacher-input';
    const disableInput = isLocked || (needsAssLock && !isLocked);
    const reqAttr = (q.required && !isLocked) ? 'required' : '';
    const disabledAttr = disableInput ? 'disabled="true"' : ''; 
    
    html += `<div class="question-block"><h4>${q.question}</h4>`;
    let savedVal = currentSavedAnswers[q.questionId] || "";

    if (q.type === 'select') {
      html += `<select name="${q.questionId}" class="${inputClass}" ${reqAttr} ${disabledAttr}><option value="">請選擇</option>`;
      q.options.forEach(opt => { html += `<option value="${opt}" ${savedVal === opt ? 'selected' : ''}>${opt}</option>`; });
      html += `</select>`;
    } else if (q.type === 'radio') {
      q.options.forEach(opt => { html += `<label><input type="radio" name="${q.questionId}" class="${inputClass}" value="${opt}" ${reqAttr} ${disabledAttr} ${savedVal === opt ? 'checked' : ''}> ${opt}</label>`; });
    } else if (q.type === 'text') {
      html += `<textarea name="${q.questionId}" class="${inputClass}" ${reqAttr} ${disabledAttr}>${savedVal}</textarea>`;
    }
    html += `</div>`;
  });

  // 簽名區塊
  html += `<div class="question-block"><h3>✍️ 簽名區塊</h3><div style="display:flex; gap:20px; flex-wrap:wrap;">`;
  if (isEPA && isStudentUser) {
    const tSigImg = currentSavedAnswers.teacherSignature || '';
    html += `<div><h4>老師簽名</h4><img src="${tSigImg}" style="max-width:260px; border:1px solid #ccc;"></div>`;
    html += `<div><h4>學生簽名</h4><canvas id="student-sig" class="sig-pad" width="260" height="150"></canvas></div>`;
  } else {
    html += `<div><h4>老師簽名</h4><canvas id="teacher-sig" class="sig-pad" width="260" height="150"></canvas></div>`;
    if(!isEPA) html += `<div><h4>學生簽名</h4><canvas id="student-sig" class="sig-pad" width="260" height="150"></canvas></div>`;
  }
  html += `</div></div>`;

  html += `<div style="display: flex; gap: 15px;">
            <button type="button" id="btn-draft" class="btn-secondary" style="flex:1;" onclick="submitExamHandler('draft')">暫存草稿</button>
            <button type="button" id="btn-submit" class="btn-primary" style="flex:2;" onclick="submitExamHandler('submit')">確認送出</button>
           </div></form>`;

  document.getElementById('questions-container').innerHTML = html;
  
  setTimeout(() => { setupCanvas('teacher-sig'); setupCanvas('student-sig'); }, 100);
  autoSaveInterval = setInterval(saveLocalDraft, 3000);
  
  // 只恢復 ass (評估)
  if(timerStates['ass'] && timerStates['ass'].elapsed > 0) updateTimerUI('ass'); 
}

function getStr(sec) { return `${Math.floor(sec / 60)}分${sec % 60}秒`; }

function toggleTimer(type, label) {
  if (!timerStates[type].isRunning) {
    timerStates[type].start = Date.now(); 
    timerStates[type].isRunning = true;
    document.getElementById(`btn-${type}`).innerText = `■ 停止${label}`;
    document.getElementById(`btn-${type}`).style.background = '#e11d48';
    document.getElementById(`btn-${type}`).style.color = 'white';
    
    if (type === 'ass') {
      document.querySelectorAll('.teacher-input').forEach(el => el.disabled = false);
      const msg = document.getElementById('ass-lock-msg'); if(msg) msg.style.display = 'none';
    }

    const updateTime = () => {
      if(!timerStates[type].isRunning) return;
      const ms = Date.now() - timerStates[type].start;
      const sec = timerStates[type].elapsed + Math.floor(ms / 1000);
      document.getElementById(`text-${type}`).innerText = `計時中... (${getStr(sec)})`;
      timerRaf[type] = requestAnimationFrame(updateTime);
    };
    updateTime();

  } else {
    timerStates[type].isRunning = false;
    cancelAnimationFrame(timerRaf[type]);
    const ms = Date.now() - timerStates[type].start;
    timerStates[type].elapsed += Math.floor(ms / 1000);
    updateTimerUI(type, label);
  }
}

function updateTimerUI(type, label = "") {
  const timeStr = getStr(timerStates[type].elapsed);
  const btn = document.getElementById(`btn-${type}`);
  if(btn) { 
    btn.innerText = `▶ 接續${label}`; 
    btn.style.background = ''; 
    btn.style.color = '';
  }
  document.getElementById(`text-${type}`).innerText = `已記錄: ${timeStr}`; 
  document.getElementById(`val_${type}`).value = timeStr; 
}

function resetTimer(type) {
  if(confirm('確定歸零？')) {
    timerStates[type] = { isRunning: false, start: null, elapsed: 0 };
    cancelAnimationFrame(timerRaf[type]);
    document.getElementById(`val_${type}`).value = "";
    document.getElementById(`text-${type}`).innerText = '未開始';
    const btn = document.getElementById(`btn-${type}`);
    if(btn) { btn.innerText = `▶ 開始`; btn.style.background = ''; btn.style.color = ''; }
  }
}

function setupCanvas(id) {
  const canvas = document.getElementById(id); if (!canvas || canvases[id]) return;
  const ctx = canvas.getContext('2d'); let isDrawing = false; canvases[id] = canvas;
  const getPos = (e) => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX||e.touches[0].clientX)-r.left, y: (e.clientY||e.touches[0].clientY)-r.top }; };
  const start = (e) => { isDrawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const draw = (e) => { if (!isDrawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const end = () => { isDrawing = false; ctx.closePath(); };
  canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', draw); canvas.addEventListener('mouseup', end);
  canvas.addEventListener('touchstart', (e)=>{ e.preventDefault(); start(e); }); canvas.addEventListener('touchmove', (e)=>{ e.preventDefault(); draw(e); }); canvas.addEventListener('touchend', end);
}
function isCanvasBlank(canvas) { if(!canvas) return true; const b = document.createElement('canvas'); b.width=canvas.width; b.height=canvas.height; return canvas.toDataURL() === b.toDataURL(); }

function saveLocalDraft() {
  const form = document.getElementById('dynamic-exam-form'); if(!form) return;
  const formData = new FormData(form); const answers = Object.fromEntries(formData);
  localStorage.setItem(`draft_${currentUser.empId}_${currentTemplateId}`, JSON.stringify({ answers, timers: timerStates }));
}

async function submitExamHandler(actionType) {
  const form = document.getElementById('dynamic-exam-form');
  
  if (timerStates['ass'] && timerStates['ass'].isRunning) toggleTimer('ass', '評核'); 

  if (actionType === 'submit' && !form.reportValidity()) return;
  
  if(autoSaveInterval) clearInterval(autoSaveInterval);
  
  const submitBtn = document.getElementById('btn-submit');
  const draftBtn = document.getElementById('btn-draft');
  const ogText = submitBtn.innerText;
  
  submitBtn.disabled = true;
  draftBtn.disabled = true;
  
  if(actionType === 'submit') submitBtn.innerText = "送出中...";
  else draftBtn.innerText = "暫存中...";

  const formData = new FormData(form);
  const answers = Object.fromEntries(formData);
  const studentRaw = document.getElementById('native-student-input').value;
  answers['native_student'] = studentRaw;

  const payload = {
    recordId: currentRecordId, userId: currentUser.empId, userName: currentUser.name, 
    studentId: studentRaw.split('-')[0].trim(), templateId: currentTemplateId, actionType, answers,
    teacherSignature: (canvases['teacher-sig'] && !isCanvasBlank(canvases['teacher-sig'])) ? canvases['teacher-sig'].toDataURL() : "",
    studentSignature: (canvases['student-sig'] && !isCanvasBlank(canvases['student-sig'])) ? canvases['student-sig'].toDataURL() : ""
  };

  const res = await callGAS('submitExam', { payload });
  if (res.status === 'success') {
    alert("🎉 " + res.message);
    localStorage.removeItem(`draft_${currentUser.empId}_${currentTemplateId}`);
    backToDashboard(); 
  } else {
    alert("錯誤：" + res.message);
    submitBtn.disabled = false;
    draftBtn.disabled = false;
    submitBtn.innerText = ogText;
    draftBtn.innerText = "暫存草稿";
  }
}
