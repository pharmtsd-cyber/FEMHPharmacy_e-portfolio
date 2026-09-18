async function handleLogin() {
  const empId = document.getElementById('login-empid').value.trim();
  if (!empId) return alert('請輸入員工編號');
  
  // 套用裝置模式 (RWD 或 手機)
  const deviceMode = document.querySelector('input[name="device-mode"]:checked').value;
  document.body.className = `layout-${deviceMode}`;
  
  const btn = document.getElementById('btn-login'); 
  btn.innerText = "登入中..."; btn.disabled = true;

  const res = await callGAS('userLogin', { empId: empId });
  
  if (res.status === 'success') {
    currentUser = res.user; globalUserList = res.userList; 
    document.getElementById('display-name').innerText = currentUser.name;
    document.getElementById('display-role').innerText = currentUser.specialRole || currentUser.role;
    
    document.getElementById('user-info-display').style.display = 'block'; 
    document.getElementById('hamburger-btn').style.display = 'block'; 
    
    backToDashboard(); 
  } else { 
    alert(res.message); 
    btn.innerText = "登入系統"; btn.disabled = false; 
  }
}

function logout() {
  currentUser = null; currentRecordId = ""; currentSavedAnswers = {}; currentTemplateId = "";
  document.getElementById('login-empid').value = ''; 
  document.getElementById('user-info-display').style.display = 'none';
  document.getElementById('hamburger-btn').style.display = 'none'; 
  document.getElementById('sidebar').classList.remove('open');
  document.body.classList.remove('sidebar-open');
  
  const loginBtn = document.getElementById('btn-login'); 
  loginBtn.innerText = "登入系統"; loginBtn.disabled = false;
  
  if(autoSaveInterval) clearInterval(autoSaveInterval); 
  switchView('view-login');
}
