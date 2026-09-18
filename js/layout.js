function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  // 只有網頁版才位移主容器
  if (document.body.classList.contains('layout-web')) {
    document.body.classList.toggle('sidebar-open');
  }
}

function switchView(viewId) {
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  
  // 切換畫面時自動關閉側邊欄 (手機體驗較佳)
  document.getElementById('sidebar').classList.remove('open');
  document.body.classList.remove('sidebar-open');
}

function updateNavState(activeTabId) {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  if (activeTabId) document.getElementById(activeTabId).classList.add('active');
}
