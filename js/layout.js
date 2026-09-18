function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  // 只有網頁版才位移主容器
  if (document.body.classList.contains('layout-web')) {
    document.body.classList.toggle('sidebar-open');
  }
}

function switchView(viewId) {
  // 1. 移除所有的 active class 並強制隱藏 (覆蓋行內樣式)
  document.querySelectorAll('.view-section').forEach(el => {
    el.classList.remove('active');
    el.style.display = 'none'; 
  });
  
  // 2. 顯示目標區塊 (強制顯示)
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.add('active');
    target.style.display = 'block'; 
  }
  
  // 3. 切換畫面時自動關閉側邊欄 (手機體驗較佳)
  document.getElementById('sidebar').classList.remove('open');
  document.body.classList.remove('sidebar-open');
}

function updateNavState(activeTabId) {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  if (activeTabId) {
    const btn = document.getElementById(activeTabId);
    if(btn) btn.classList.add('active');
  }
}
