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
  currentUser = null; currentRecordId = ""; currentSavedAnswers = {}; currentTemplateId = "";
  document.getElementById('login-empid').value = ''; 
  document.getElementById('user-info-display').style.display = 'none';
  document.getElementById('hamburger-btn').style.display = 'none'; 
  document.getElementById('sidebar').classList.remove('open');
  document.body.classList.remove('sidebar-open');
  
  if(autoSaveInterval) clearInterval(autoSaveInterval); 
  switchView('view-login');
}
