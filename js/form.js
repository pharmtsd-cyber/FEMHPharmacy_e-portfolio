// ==========================================
// 全域變數供摘要功能讀取
// ==========================================
window.currentQuestionsData = [];

// ==========================================
// 1. 表單初始化與載入
// ==========================================
async function openForm(templateId) {
  currentTemplateId = templateId;
  window.currentQuestionsData = [];
  
  if (!currentRecordId) {
    currentSavedAnswers = {};
    currentAttemptCount = 0;
  }

  if (timerRaf['ass']) cancelAnimationFrame(timerRaf['ass']);
  if (timerRaf['fb']) cancelAnimationFrame(timerRaf['fb']);
  timerStates['ass'] = { isRunning: false, start: null, elapsed: 0 };
  timerStates['fb'] = { isRunning: false, start: null, elapsed: 0 };

  if (autoSaveInterval) clearInterval(autoSaveInterval);
  canvases = {};

  const localKey = `draft_${currentUser.empId}_${templateId}`;
  const localData = localStorage.getItem(localKey);
  if (localData && !currentRecordId) {
    if (confirm('💡 發現未存檔的本機暫存資料，請問是否恢復？')) {
      const parsed = JSON.parse(localData);
      currentSavedAnswers = parsed.answers || {};
      if (parsed.timers && parsed.timers.ass) timerStates.ass = parsed.timers.ass;
      if (parsed.timers && parsed.timers.fb) timerStates.fb = parsed.timers.fb;
    }
  }

  switchView('view-form');
  document.getElementById('view-form').innerHTML = `
    <button onclick="backToDashboard()" class="btn-secondary" style="margin-bottom: 20px; display: inline-block; padding: 8px 16px; width: auto;">← 返回主題列表</button>
    <h2 id="form-title" style="margin-top:0;">題目載入中...</h2>
    <div id="questions-container">
      <div style="padding:30px; text-align:center; color:#666;">⏳ 題目生成中...</div>
    </div>
  `;

  const res = await callGAS('getTemplateData', { templateId, empId: currentUser.empId });
  if (res.status === 'error') { 
    alert("❌ " + res.message); 
    backToDashboard(); 
    return; 
  }
  
  renderForm(res);
}

// ==========================================
// 2. 表單渲染核心邏輯
// ==========================================
function renderForm(response) {
  const data = response.data;
  document.getElementById('form-title').innerText = data.title;

  const isEPA = data.title.toUpperCase().includes('EPA');
  const isDOPS = data.title.toUpperCase().includes('DOPS');
  const userRolesStr = [currentUser.role, currentUser.specialRole].filter(Boolean).join(' ');
  const isStudentUser = userRolesStr.includes('學生') || userRolesStr.includes('實習生');
  
  const isReceiver = (currentTaskStatus === '待學生回填' || currentTaskStatus === '待老師回填');
  const isStudentReturned = (!isStudentUser && currentTaskStatus === '老師暫存' && currentSavedAnswers['is_returned'] === 'true');
  
  if (!timerStates['ass'].elapsed && currentSavedAnswers['time_assessment']) {
    timerStates['ass'].elapsed = parseTimeToSeconds(currentSavedAnswers['time_assessment']);
  }
  if (!timerStates['fb'].elapsed && currentSavedAnswers['time_feedback']) {
    timerStates['fb'].elapsed = parseTimeToSeconds(currentSavedAnswers['time_feedback']);
  }

  const needsAssLock = !isReceiver && !isStudentReturned && timerStates.ass.elapsed === 0 && !timerStates.ass.isRunning;

  const todayObj = new Date();
  const defaultTodayStr = new Date(todayObj.getTime() - todayObj.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const savedAssessmentDate = currentSavedAnswers['assessment_date'] || defaultTodayStr;

  let html = `<p style="color: #666; margin-bottom: 20px;">${data.description}</p><form id="dynamic-exam-form">`;

  if (isReceiver) {
    html += `
      <div style="background:#e0f2fe; border-left:5px solid #0284c7; padding:15px; margin-bottom:20px; border-radius:4px;">
        <h3 style="margin:0 0 10px 0; color:#0369a1;">📄 評核紀錄檢視</h3>
        <p style="margin:0; font-size:14px; color:#0c4a6e;">此為對方填寫完畢之紀錄，請檢視內容並完成您專屬的欄位與簽名。</p>
      </div>`;
  } else if (isStudentReturned) {
    html += `
      <div style="background:#fff3cd; border-left:5px solid #f59e0b; padding:15px; margin-bottom:20px; border-radius:4px;">
        <h3 style="margin:0 0 5px 0; color:#b45309;">🔄 學生已將表單退回修改</h3>
        <p style="margin:0; font-size:14px; color:#92400e;">先前計時與評估內容已保留，您可以直接進行修改並重新送出。</p>
      </div>`;
  } else {
    html += `<div id="ass-lock-msg" class="question-block" style="background:#fff3cd; color:#856404; display:${needsAssLock ? 'block' : 'none'};">⚠️ 請先填寫「受評學員」與「身分」後，點選「▶ 評核開始」解鎖表單</div>`;
  }

  const disableBasicInfo = (isReceiver || isStudentReturned) ? 'disabled="true"' : '';

  html += `
  <div style="display:flex; gap:15px; flex-wrap:wrap; margin-bottom: 20px;">
    <div class="question-block" style="flex:1; border-left: 5px solid var(--primary-color); padding: 15px; margin-bottom:0;">
      <h3 style="margin-top:0;">📅 評核日期</h3>
      <input type="date" name="assessment_date" value="${savedAssessmentDate}" required ${disableBasicInfo}>
    </div>
    <div class="question-block" style="flex:2; border-left: 5px solid var(--primary-color); padding: 15px; margin-bottom:0;">
      <h3 style="margin-top:0;">👤 受評學員</h3>
      <input type="text" name="native_student" id="native-student-input" list="native-student-list" value="${currentSavedAnswers['native_student'] || ''}" placeholder="請搜尋..." required ${disableBasicInfo} autocomplete="off" onchange="updateAttemptCount()">
      <datalist id="native-student-list">`;
  globalUserList.forEach(u => { html += `<option value="${u.empId} - ${u.name}"></option>`; });
  html += `</datalist>
      <div id="attempt-count-display" style="margin-top:10px; font-size:14px; color:#e11d48; font-weight:bold;"></div>
    </div>
    <div class="question-block" style="flex:1.5; border-left: 5px solid var(--primary-color); padding: 15px; margin-bottom:0;">
      <h3 style="margin-top:0;">🎓 學員身分</h3>
      <select name="native_student_role" id="native-student-role" required ${disableBasicInfo}>
        <option value="">請選擇...</option>
        <option value="兩年期PGY" ${currentSavedAnswers['native_student_role'] === '兩年期PGY' ? 'selected' : ''}>兩年期PGY</option>
        <option value="一年期PGY" ${currentSavedAnswers['native_student_role'] === '一年期PGY' ? 'selected' : ''}>一年期PGY</option>
        <option value="新進藥師" ${currentSavedAnswers['native_student_role'] === '新進藥師' ? 'selected' : ''}>新進藥師</option>
      </select>
    </div>
  </div>`;

  html += `<div class="floating-timer-panel"><h3 style="margin-top:0; color: var(--primary-color);">⏳ 第一階段：評核計時</h3>`;
  if (isReceiver || isStudentReturned) {
    html += `<div style="margin-bottom:0; font-size:15px; color:#444;"><strong>評核花費時間：</strong> ${currentSavedAnswers['time_assessment'] || '無紀錄'}</div>`;
  } else {
    const assTimeStr = currentSavedAnswers['time_assessment'] || '';
    const assBtnText = assTimeStr ? '▶ 接續評核' : '▶ 評核開始';
    const assStatusText = assTimeStr ? `已記錄: ${assTimeStr}` : '未開始';
    html += `
    <div class="timer-row" style="border-bottom:none; margin-bottom:0; padding-bottom:0;">
      <button type="button" id="btn-ass" class="btn-secondary" onclick="toggleTimer('ass', '評核')" style="width:100%;">${assBtnText}</button>
      <div style="display:flex; justify-content:space-between; margin-top:8px;">
        <span id="text-ass" style="color:${assTimeStr ? '#0284c7' : '#666'}; font-weight:${assTimeStr ? 'bold' : 'normal'};">${assStatusText}</span>
        <a href="javascript:void(0)" onclick="resetTimer('ass')">重置</a>
      </div>
      <input type="hidden" name="time_assessment" id="val_ass" value="${assTimeStr}">
    </div>`;
  }
  html += `</div>`;

  let splitIndex = data.questions.findIndex(q => 
    q.question.includes('整體評價') || 
    q.question.includes('滿意度') || 
    q.question.includes('心得')
  );
  if (splitIndex === -1) splitIndex = data.questions.length; 

  const part1Questions = data.questions.slice(0, splitIndex).map(q => ({...q, isPart1: true}));
  const part2Questions = data.questions.slice(splitIndex).map(q => ({...q, isPart1: false}));
  window.currentQuestionsData = [...part1Questions, ...part2Questions];

  const generateQuestionHtml = (q) => {
    if (q.type === 'heading') return `<h3>${q.question}</h3>`;
    let canEdit = true;
    if (q.targetRole) {
      if (isStudentUser && !q.targetRole.includes('學生')) canEdit = false;
      if (!isStudentUser && !q.targetRole.includes('教師')) canEdit = false;
    }
    const inputClass = canEdit ? 'teacher-input' : '';
    const disableInput = !canEdit || (needsAssLock && canEdit);
    const reqAttr = (q.required && canEdit && !disableInput) ? 'required' : '';
    const disabledAttr = disableInput ? 'disabled="true"' : ''; 
    const bgStyle = !canEdit ? 'background-color: #f8fafc; border-left: 4px solid #94a3b8;' : '';
    const badgeHtml = !canEdit ? '<span class="status-badge status-pending" style="margin-left:8px;">唯讀</span>' : '';
    
    let qHtml = `<div class="question-block" style="${bgStyle}"><h4>${q.question} ${badgeHtml}</h4>`;
    let savedVal = currentSavedAnswers[q.questionId] || "";

    if (q.type === 'select') {
      qHtml += `<select name="${q.questionId}" class="${inputClass}" ${reqAttr} ${disabledAttr}><option value="">請選擇</option>`;
      q.options.forEach(opt => { qHtml += `<option value="${opt}" ${savedVal === opt ? 'selected' : ''}>${opt}</option>`; });
      qHtml += `</select>`;
    } else if (q.type === 'radio') {
      q.options.forEach(opt => { qHtml += `<label><input type="radio" name="${q.questionId}" class="${inputClass}" value="${opt}" ${reqAttr} ${disabledAttr} ${savedVal === opt ? 'checked' : ''}> ${opt}</label>`; });
    } else if (q.type === 'checkbox') {
      const savedArr = savedVal ? savedVal.toString().split(',') : [];
      q.options.forEach(opt => { 
        const isChecked = savedArr.includes(opt) ? 'checked' : '';
        qHtml += `<label><input type="checkbox" name="${q.questionId}" class="${inputClass}" value="${opt}" ${disabledAttr} ${isChecked}> ${opt}</label>`; 
      });
    } else if (q.type === 'text') {
      // 🌟 若為摘要題，自動分割出「唯讀 AI 摘要」與「老師手動輸入」兩區塊
      if (['COM_DOPS_03', 'COM_DOPS_04', 'COM_DOPS_05'].includes(q.questionId) && canEdit) {
        let aiSavedVal = currentSavedAnswers[`${q.questionId}_ai`] || "";
        qHtml += `
          <div style="margin-bottom: 15px;">
            <div style="font-size: 13px; color: #0284c7; margin-bottom: 4px; font-weight: bold;">🤖 系統整理摘要 (唯讀)：</div>
            <textarea name="${q.questionId}_ai" class="${inputClass}" readonly style="background-color: #f1f5f9; border: 1px dashed #cbd5e1; color: #475569; min-height: 80px;" ${disabledAttr}>${aiSavedVal}</textarea>
          </div>
          <div style="font-size: 13px; color: #16a34a; margin-bottom: 4px; font-weight: bold;">✏️ 您的補充評語 (可手動修改儲存)：</div>
        `;
      }
      qHtml += `<textarea name="${q.questionId}" class="${inputClass}" ${reqAttr} ${disabledAttr}>${savedVal}</textarea>`;
    }

    if (isDOPS && q.isPart1 && canEdit && q.type !== 'text') {
      const noteVal = currentSavedAnswers[`${q.questionId}_note`] || "";
      qHtml += `<input type="text" name="${q.questionId}_note" class="${inputClass}" placeholder="✏️ 教師快速備註 (如：哪裡做得好、哪裡做錯)..." value="${noteVal}" style="margin-top:15px; border: 1px dashed #94a3b8; background: #fff;" ${disabledAttr}>`;
    }

    qHtml += `</div>`;
    return qHtml;
  };

  part1Questions.forEach(q => { html += generateQuestionHtml(q); });

  if (!isEPA && part2Questions.length > 0 && !isReceiver && !isStudentReturned) {
    const assTimeStr = currentSavedAnswers['time_assessment'] || '';
    const assMidBtnText = assTimeStr ? '▶ 接續評核計時' : '⏸️ 暫停評核計時';
    html += `
    <div style="text-align:center; margin: 30px 0; border-top: 2px dashed #cbd5e1; padding-top: 25px; display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
        <button type="button" id="btn-ass-mid" class="btn-secondary" style="background:#f1f5f9; border-color:#94a3b8; color:#475569;" onclick="toggleTimer('ass', '評核')">
          ${assMidBtnText}
        </button>
        <button type="button" class="btn-secondary" style="background:#fff7ed; border-color:#fdba74; color:#c2410c;" onclick="generateAndDraft()">
          💾 暫存並產生智慧摘要
        </button>
    </div>`;
  }

  if (!isEPA && part2Questions.length > 0) {
    html += `<div class="floating-timer-panel" style="margin-top: 40px; border: 2px solid var(--secondary-color);"><h3 style="margin-top:0; color: var(--secondary-color);">💬 第二階段：雙向回饋計時</h3>`;
    if (isReceiver || isStudentReturned) {
      html += `<div style="margin-bottom:0; font-size:15px; color:#444;"><strong>雙向回饋時間：</strong> ${currentSavedAnswers['time_feedback'] || '無紀錄'}</div>`;
    } else {
      const fbTimeStr = currentSavedAnswers['time_feedback'] || '';
      const fbBtnText = fbTimeStr ? '▶ 接續雙向回饋' : '▶ 雙向回饋開始';
      const fbStatusText = fbTimeStr ? `已記錄: ${fbTimeStr}` : '未開始';
      html += `
      <div class="timer-row" style="border-bottom:none; margin-bottom:0; padding-bottom:0;">
        <button type="button" id="btn-fb" class="btn-secondary" onclick="toggleTimer('fb', '雙向回饋')" style="width:100%; border-color: var(--secondary-color); color: var(--secondary-color);">${fbBtnText}</button>
        <div style="display:flex; justify-content:space-between; margin-top:8px;">
          <span id="text-fb" style="color:${fbTimeStr ? '#0284c7' : '#666'}; font-weight:${fbTimeStr ? 'bold' : 'normal'};">${fbStatusText}</span>
          <a href="javascript:void(0)" onclick="resetTimer('fb')">重置</a>
        </div>
        <input type="hidden" name="time_feedback" id="val_fb" value="${fbTimeStr}">
      </div>`;
    }
    html += `</div>`;

    if (isDOPS && !isStudentUser) {
      html += `
      <div class="question-block" style="background: #f8fafc; border: 1px solid #e2e8f0; margin-top: 20px; padding: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 style="margin:0; color:#334155;">🤖 智慧摘要小幫手</h3>
            <p style="font-size: 14px; color: #64748b; margin: 5px 0 0 0;">點擊按鈕，系統將自動彙整您的評分與筆記，寫入下方的「唯讀摘要」區塊中供您參考補充。</p>
          </div>
          <button type="button" class="btn-secondary" style="padding: 8px 16px; background-color: #fff; border-color: #0284c7; color: #0284c7;" onclick="generateAISummary()">產生 / 更新 智慧摘要</button>
        </div>
      </div>`;
    }
  }

  part2Questions.forEach(q => { html += generateQuestionHtml(q); });

  html += `<div class="question-block" style="margin-top: 30px;"><h3>✍️ 簽名區塊</h3><div style="display:flex; gap:20px; flex-wrap:wrap;">`;
  if (isEPA) {
    if (isStudentUser) {
      const tSigImg = currentSavedAnswers.teacherSignature || '';
      html += `<div><h4>老師簽名</h4><img src="${tSigImg}" style="max-width:260px; border:1px solid #ccc; background:#f8fafc;"></div>`;
      html += `<div><h4>學生簽名</h4><canvas id="student-sig" class="sig-pad" width="260" height="150"></canvas><br><button type="button" class="btn-secondary" style="padding:4px 10px; margin-top:5px;" onclick="clearCanvas('student-sig')">清除重簽</button></div>`;
    } else {
      html += `<div><h4>老師簽名</h4><canvas id="teacher-sig" class="sig-pad" width="260" height="150"></canvas><br><button type="button" class="btn-secondary" style="padding:4px 10px; margin-top:5px;" onclick="clearCanvas('teacher-sig')">清除重簽</button></div>`;
    }
  } else {
    html += `<div><h4>老師簽名</h4><canvas id="teacher-sig" class="sig-pad" width="260" height="150"></canvas><br><button type="button" class="btn-secondary" style="padding:4px 10px; margin-top:5px;" onclick="clearCanvas('teacher-sig')">清除重簽</button></div>`;
    html += `<div><h4>學生簽名</h4><canvas id="student-sig" class="sig-pad" width="260" height="150"></canvas><br><button type="button" class="btn-secondary" style="padding:4px 10px; margin-top:5px;" onclick="clearCanvas('student-sig')">清除重簽</button></div>`;
  }
  html += `</div></div>`;

  if (isEPA && isStudentUser) {
    html += `
      <div style="display: flex; gap: 15px;">
        <button type="button" id="btn-return" class="btn-secondary" style="flex:1; background-color:#ff9800; color:white; border:none;" onclick="submitExamHandler('return')">退回修改 (解鎖)</button>
        <button type="button" id="btn-submit" class="btn-primary" style="flex:2;" onclick="submitExamHandler('submit')">確認簽名送出</button>
      </div></form>`;
  } else {
    const draftBtnText = isStudentUser ? "學生存檔(暫存)" : "教師存檔(暫存)";
    const submitBtnText = isStudentUser ? "通知教師完成(完稿)" : "送出給學生確認";
    const draftBtnHtml = isReceiver ? '' : `<button type="button" id="btn-draft" class="btn-secondary" style="flex:1;" onclick="submitExamHandler('draft')">${draftBtnText}</button>`;
    html += `
      <div style="display: flex; gap: 15px;">
        ${draftBtnHtml}
        <button type="button" id="btn-submit" class="btn-primary" style="flex:2;" onclick="submitExamHandler('submit')">${submitBtnText}</button>
      </div></form>`;
  }

  document.getElementById('questions-container').innerHTML = html;
  
  setTimeout(() => { 
    setupCanvas('teacher-sig'); 
    setupCanvas('student-sig'); 
    updateAttemptCount(); 
  }, 100);
  
  autoSaveInterval = setInterval(saveLocalDraft, 3000);
}

// ==========================================
// 3. 表單提交邏輯
// ==========================================
async function submitExamHandler(actionType) {
  const form = document.getElementById('dynamic-exam-form');
  const userRolesStr = [currentUser.role, currentUser.specialRole].filter(Boolean).join(' ');
  const isStudentUser = userRolesStr.includes('學生') || userRolesStr.includes('實習生');
  const isEPA = document.getElementById('form-title').innerText.toUpperCase().includes('EPA');

  if (timerStates['ass'] && timerStates['ass'].isRunning) toggleTimer('ass', '評核'); 
  if (timerStates['fb'] && timerStates['fb'].isRunning) toggleTimer('fb', '雙向回饋'); 

  if (actionType === 'submit') {
    if (!form.reportValidity()) return;
    if (isEPA) {
      if (!isStudentUser && isCanvasBlank(canvases['teacher-sig'])) return alert("⚠️ 老師須完成簽名才能送出。");
      if (isStudentUser && isCanvasBlank(canvases['student-sig'])) return alert("⚠️ 學生須完成簽名才能送出結案。");
    } else {
      if (isCanvasBlank(canvases['teacher-sig']) || isCanvasBlank(canvases['student-sig'])) return alert("⚠️ 老師與學生雙方皆須完成簽名才能送出。");
    }
  }
  
  if (autoSaveInterval) clearInterval(autoSaveInterval);
  
  const submitBtn = document.getElementById('btn-submit');
  const draftBtn = document.getElementById('btn-draft');
  const returnBtn = document.getElementById('btn-return');
  
  const ogText = submitBtn.innerText;
  submitBtn.disabled = true;
  if (draftBtn) draftBtn.disabled = true;
  if (returnBtn) returnBtn.disabled = true;
  
  if (actionType === 'submit') submitBtn.innerText = "送出中...";
  else if (actionType === 'return') returnBtn.innerText = "退回中...";
  else draftBtn.innerText = "暫存中...";

  const formData = new FormData(form);
  const answers = {};
  for (let [key, value] of formData.entries()) {
    if (answers[key]) answers[key] += ',' + value;
    else answers[key] = value;
  }
  const studentRaw = document.getElementById('native-student-input').value;
  answers['native_student'] = studentRaw;

  if (actionType === 'return') {
    answers['is_returned'] = 'true';
  } else if (actionType === 'draft' && currentSavedAnswers['is_returned'] === 'true') {
    answers['is_returned'] = 'true';
  }

  const payload = {
    recordId: currentRecordId, 
    userId: currentUser.empId, 
    userName: currentUser.name, 
    studentId: studentRaw.split('-')[0].trim(), 
    templateId: currentTemplateId, 
    actionType, 
    answers,
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
    submitBtn.innerText = ogText;
    if(draftBtn) { draftBtn.disabled = false; draftBtn.innerText = isStudentUser ? "學生存檔(暫存)" : "教師存檔(暫存)"; }
    if(returnBtn) { returnBtn.disabled = false; returnBtn.innerText = "退回修改 (解鎖)"; }
  }
}

// ==========================================
// 4. 工具函式與計時器、畫布、摘要功能
// ==========================================
function updateAttemptCount() {
  const studentRaw = document.getElementById('native-student-input').value;
  const display = document.getElementById('attempt-count-display');
  if (!studentRaw || !currentTemplateId) { display.innerText = ""; return; }
  const studentId = studentRaw.split('-')[0].trim().toUpperCase();
  
  if (currentRecordId && currentAttemptCount > 0) {
    display.innerText = `📊 本次為第 ${currentAttemptCount} 次評估紀錄`;
  } else {
    const historyCount = globalHistoryCounts[`${studentId}_${currentTemplateId}`] || 0;
    display.innerText = `📊 系統試算：本次為第 ${historyCount + 1} 次評估`;
  }
}

function getStr(sec) { return `${Math.floor(sec / 60)}分${sec % 60}秒`; }

function parseTimeToSeconds(timeStr) {
  if (!timeStr) return 0;
  let m = 0, s = 0;
  const mMatch = timeStr.match(/(\d+)分/);
  const sMatch = timeStr.match(/(\d+)秒/);
  if (mMatch) m = parseInt(mMatch[1], 10);
  if (sMatch) s = parseInt(sMatch[1], 10);
  return (m * 60) + s;
}

function toggleTimer(type, label) {
  if (type === 'ass' && !timerStates[type].isRunning) {
    const studentInput = document.getElementById('native-student-input');
    const roleInput = document.getElementById('native-student-role');
    if (studentInput && !studentInput.value.trim()) return alert("⚠️ 請先選擇「受評學員」才能解鎖並開始評核！"); 
    if (roleInput && !roleInput.value.trim()) return alert("⚠️ 請先選擇「學員身分」才能解鎖並開始評核！"); 
  }

  if (!timerStates[type].isRunning) {
    timerStates[type].start = Date.now(); 
    timerStates[type].isRunning = true;
    
    document.getElementById(`btn-${type}`).innerText = `■ 停止${label}`;
    document.getElementById(`btn-${type}`).style.background = '#e11d48';
    document.getElementById(`btn-${type}`).style.color = 'white';
    
    const midBtn = document.getElementById(`btn-${type}-mid`);
    if (midBtn) {
      midBtn.innerText = `■ 停止${label}`;
      midBtn.style.background = '#e11d48';
      midBtn.style.color = 'white';
    }
    
    if (type === 'ass') {
      document.querySelectorAll('.teacher-input').forEach(el => el.disabled = false);
      const msg = document.getElementById('ass-lock-msg'); 
      if (msg) msg.style.display = 'none';
    }

    const updateTime = () => {
      if (!timerStates[type].isRunning) return;
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
  if (btn) { btn.innerText = `▶ 接續${label}`; btn.style.background = ''; btn.style.color = (type==='fb' ? 'var(--secondary-color)' : ''); }
  
  const midBtn = document.getElementById(`btn-${type}-mid`);
  if (midBtn) { 
    midBtn.innerText = `▶ 接續${label}`; 
    midBtn.style.background = '#f1f5f9'; 
    midBtn.style.color = '#475569'; 
  }
  
  document.getElementById(`text-${type}`).innerText = `已記錄: ${timeStr}`; 
  document.getElementById(`val_${type}`).value = timeStr; 
}

function resetTimer(type) {
  const label = type === 'ass' ? '評核計時' : '雙向回饋計時';
  if (confirm(`⚠️ 確定要將【${label}】歸零重設嗎？這將會清除目前已記錄的時間。`)) {
    timerStates[type] = { isRunning: false, start: null, elapsed: 0 };
    if (timerRaf[type]) cancelAnimationFrame(timerRaf[type]);
    document.getElementById(`val_${type}`).value = "";
    document.getElementById(`text-${type}`).innerText = '未開始';
    
    const btn = document.getElementById(`btn-${type}`);
    if(btn) { btn.innerText = `▶ 開始`; btn.style.background = ''; btn.style.color = (type==='fb' ? 'var(--secondary-color)' : ''); }
    
    const midBtn = document.getElementById(`btn-${type}-mid`);
    if(midBtn) { midBtn.innerText = `▶ 開始`; midBtn.style.background = '#f1f5f9'; midBtn.style.color = '#475569'; }
  }
}

window.generateAndDraft = async function() {
  generateAISummary(false); 
  await submitExamHandler('draft'); 
};

// 🌟 智慧摘要 (寫入隱藏的 _ai 唯讀框)
window.generateAISummary = function(showAlert = true) {
  const form = document.getElementById('dynamic-exam-form');
  const formData = new FormData(form);
  let goodText = "";
  let badText = "";
  let notAssessedText = "";

  window.currentQuestionsData.forEach(q => {
    if (q.isPart1 && q.type !== 'heading') {
      const note = formData.get(`${q.questionId}_note`) || "";
      let cleanQuestion = q.question.replace(/^\d+\./, '').trim(); 
      
      // 🌟 針對 Checkbox 的特殊分流
      if (q.type === 'checkbox') {
        const checkedArr = formData.getAll(q.questionId);
        const allOptions = q.options || [];
        const uncheckedArr = allOptions.filter(o => !checkedArr.includes(o));

        if (checkedArr.length === 0 && !note.trim()) {
           // 完全沒勾選且沒備註 -> 未評核
           notAssessedText += `• ${cleanQuestion}\n`;
        } else {
           if (checkedArr.length > 0) {
             let line = `• ${cleanQuestion}\n  ✅ 已做到：${checkedArr.join(', ')}`;
             if (note.trim()) line += `\n  📝 備註：${note.trim()}`;
             goodText += line + "\n\n";
           }
           if (uncheckedArr.length > 0) {
             let line = `• ${cleanQuestion}\n  ❌ 未做到 (建議加強)：${uncheckedArr.join(', ')}`;
             if (note.trim() && checkedArr.length === 0) line += `\n  📝 備註：${note.trim()}`;
             badText += line + "\n\n";
           }
        }
      } 
      // 🌟 一般題型 (單選/下拉)
      else {
        const ans = formData.getAll(q.questionId).join(', ').trim();
        if (!ans && !note.trim()) {
          notAssessedText += `• ${cleanQuestion}\n`;
        } else {
          let line = `• ${cleanQuestion}`;
          if (ans) line += `\n  👉 評比：${ans}`;
          if (note.trim()) line += `\n  📝 備註：${note.trim()}`;
          
          const isBad = /未符合|不|待|未完成/.test(ans) || ['1','2','3','4'].includes(ans); 
          if (isBad) badText += line + "\n\n";
          else goodText += line + "\n\n";
        }
      }
    }
  });

  // 寫入到帶有 _ai 的唯讀框
  const qGoodAI = document.querySelector('[name="COM_DOPS_03_ai"]');
  const qBadAI = document.querySelector('[name="COM_DOPS_04_ai"]');
  const qNoneAI = document.querySelector('[name="COM_DOPS_05_ai"]');
  
  if(qGoodAI) qGoodAI.value = goodText.trim();
  if(qBadAI) qBadAI.value = badText.trim();
  if(qNoneAI) qNoneAI.value = notAssessedText.trim();

  if(showAlert) alert("✅ 智慧摘要已成功更新！請查看下方題目的系統摘要，並可於底部補充您的評語。");
};

function setupCanvas(id) {
  const canvas = document.getElementById(id); 
  if (!canvas || canvases[id]) return;
  const ctx = canvas.getContext('2d'); 
  let isDrawing = false; 
  canvases[id] = canvas;
  
  const getPos = (e) => { 
    const r = canvas.getBoundingClientRect(); 
    return { x: (e.clientX || e.touches[0].clientX) - r.left, y: (e.clientY || e.touches[0].clientY) - r.top }; 
  };
  const start = (e) => { isDrawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const draw = (e) => { if (!isDrawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const end = () => { isDrawing = false; ctx.closePath(); };
  
  canvas.addEventListener('mousedown', start); 
  canvas.addEventListener('mousemove', draw); 
  canvas.addEventListener('mouseup', end);
  canvas.addEventListener('touchstart', (e)=>{ e.preventDefault(); start(e); }); 
  canvas.addEventListener('touchmove', (e)=>{ e.preventDefault(); draw(e); }); 
  canvas.addEventListener('touchend', end);
}
function clearCanvas(id) { const c = document.getElementById(id); if(c) c.getContext('2d').clearRect(0, 0, c.width, c.height); }
function isCanvasBlank(canvas) { if(!canvas) return true; const b = document.createElement('canvas'); b.width = canvas.width; b.height = canvas.height; return canvas.toDataURL() === b.toDataURL(); }

function saveLocalDraft() {
  const form = document.getElementById('dynamic-exam-form'); if(!form) return;
  const formData = new FormData(form); 
  const answers = {};
  for (let [key, value] of formData.entries()) {
    if (answers[key]) answers[key] += ',' + value;
    else answers[key] = value;
  }
  localStorage.setItem(`draft_${currentUser.empId}_${currentTemplateId}`, JSON.stringify({ answers, timers: timerStates }));
}
function safeSetInnerText(elementId, text) { const el = document.getElementById(elementId); if (el) { el.innerText = text; } }
