let currentAnalyticsData = null; 

async function openAnalytics() {
  if(autoSaveInterval) clearInterval(autoSaveInterval);
  updateNavState('tab-analytics');
  switchView('view-analytics');
  
  document.getElementById('analytics-charts-container').style.display = 'none';
  const msgBox = document.getElementById('analytics-empty-msg');
  msgBox.style.display = 'block';
  msgBox.innerText = "載入雙向統計資料中...";
  
  const res = await callGAS('getUserAnalytics', { empId: currentUser.empId });
  if (res.status !== 'success') { msgBox.innerText = "載入失敗：" + res.message; return; }
  
  currentAnalyticsData = res.data; 
  
  // 預設先顯示學生的成績 (若無學生資料則顯示老師的)
  const role = [currentUser.role, currentUser.specialRole].join(' ').includes('學生') ? 'student' : 'teacher';
  switchAnalyticsRole(role);
}

function switchAnalyticsRole(role) {
  if (!currentAnalyticsData) return;
  
  // 切換按鈕外觀
  document.getElementById('btn-ana-student').className = (role === 'student') ? 'btn-primary' : 'btn-secondary';
  document.getElementById('btn-ana-teacher').className = (role === 'teacher') ? 'btn-primary' : 'btn-secondary';
  
  const dataToRender = currentAnalyticsData[role];
  const msgBox = document.getElementById('analytics-empty-msg');
  const chartContainer = document.getElementById('analytics-charts-container');
  
  const acgmeKeys = Object.keys(dataToRender.acgme);
  const unitKeys = Object.keys(dataToRender.unit);
  
  if (acgmeKeys.length === 0 && unitKeys.length === 0) {
    msgBox.style.display = 'block';
    chartContainer.style.display = 'none';
    msgBox.innerText = `目前尚無您的【${role==='student'?'受評':'教學'}】結案紀錄，無法產生雷達圖。`; 
    return;
  }
  
  msgBox.style.display = 'none';
  chartContainer.style.display = 'flex';

  const chartOptions = { responsive: true, scales: { r: { min: 0, max: 100, ticks: { stepSize: 20 } } } };
  const color = role === 'student' ? '0,90,140' : '234,88,12'; // 老師圖表改為橘色系

  if (chartAcgmeInstance) chartAcgmeInstance.destroy(); 
  chartAcgmeInstance = new Chart(document.getElementById('chart-acgme').getContext('2d'), {
    type: 'radar',
    data: {
      labels: acgmeKeys.length > 0 ? acgmeKeys : ['暫無資料'],
      datasets: [{ label: `${role==='student'?'受評能力':'教學能力'} (%)`, data: acgmeKeys.map(k => dataToRender.acgme[k]), backgroundColor: `rgba(${color},0.2)`, borderColor: `rgba(${color},1)`, borderWidth: 2, fill: true }]
    }, options: chartOptions
  });

  if (chartUnitInstance) chartUnitInstance.destroy();
  chartUnitInstance = new Chart(document.getElementById('chart-unit').getContext('2d'), {
    type: 'radar',
    data: {
      labels: unitKeys.length > 0 ? unitKeys : ['暫無資料'],
      datasets: [{ label: `${role==='student'?'單位專屬':'單位教學'} (%)`, data: unitKeys.map(k => dataToRender.unit[k]), backgroundColor: `rgba(0,150,136,0.2)`, borderColor: `rgba(0,150,136,1)`, borderWidth: 2, fill: true }]
    }, options: chartOptions
  });
}

function renderAnalytics(response) {
  const msgBox = document.getElementById('analytics-empty-msg');
  const chartContainer = document.getElementById('analytics-charts-container');
  
  if (response.status !== 'success') {
    msgBox.innerText = "載入失敗：" + response.message; return;
  }
  
  const data = response.data;
  const acgmeKeys = Object.keys(data.acgme);
  const unitKeys = Object.keys(data.unit);
  
  if (acgmeKeys.length === 0 && unitKeys.length === 0) {
    msgBox.innerText = "目前尚無已結案的評核紀錄，無法產生雷達圖。"; return;
  }
  
  msgBox.style.display = 'none';
  chartContainer.style.display = 'flex';

  const chartOptions = { responsive: true, scales: { r: { min: 0, max: 100, ticks: { stepSize: 20 } } } };

  // 1. 繪製 ACGME 雷達圖
  if (chartAcgmeInstance) chartAcgmeInstance.destroy(); 
  chartAcgmeInstance = new Chart(document.getElementById('chart-acgme').getContext('2d'), {
    type: 'radar',
    data: {
      labels: acgmeKeys.length > 0 ? acgmeKeys : ['暫無資料'],
      datasets: [{ label: '達成率 (%)', data: acgmeKeys.map(k => data.acgme[k]), backgroundColor: 'rgba(0,90,140,0.2)', borderColor: 'rgba(0,90,140,1)', borderWidth: 2, fill: true }]
    }, options: chartOptions
  });

  // 2. 繪製 單位能力 雷達圖
  if (chartUnitInstance) chartUnitInstance.destroy();
  chartUnitInstance = new Chart(document.getElementById('chart-unit').getContext('2d'), {
    type: 'radar',
    data: {
      labels: unitKeys.length > 0 ? unitKeys : ['暫無資料'],
      datasets: [{ label: '達成率 (%)', data: unitKeys.map(k => data.unit[k]), backgroundColor: 'rgba(0,150,136,0.2)', borderColor: 'rgba(0,150,136,1)', borderWidth: 2, fill: true }]
    }, options: chartOptions
  });
}
