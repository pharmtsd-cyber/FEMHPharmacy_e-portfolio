async function handleLogin() {
  const empId = document.getElementById('login-empid').value.trim();
  if (!empId) return alert('請輸入員工編號');
  
  // 處理渲染模式切換
  const deviceMode = document.querySelector('input[name="device-mode"]:checked').value;
  document.body.className = `layout-${deviceMode}`; // 切換 CSS

  const btn = document.getElementById('btn-login'); 
  btn.innerText = "登入中..."; btn.disabled = true;

  // 改用 callGAS 呼叫
  const res = await callGAS('userLogin', { empId: empId });
  
  if (res.status === 'success') {
    currentUser = res.user; 
    globalUserList = res.userList;
    document.getElementById('display-name').innerText = currentUser.name;
    document.getElementById('user-info-display').style.display = 'block';
    document.getElementById('hamburger-btn').style.display = 'block'; // 顯示漢堡選單
    
    backToDashboard(); 
  } else {
    alert(res.message);
    btn.innerText = "登入系統"; btn.disabled = false;
  }
}
