// --- js/analytics.js ---

async function openAnalytics() {
  if(autoSaveInterval) clearInterval(autoSaveInterval);
  updateNavState('tab-analytics');
  switchView('view-analytics');
  
  document.getElementById('analytics-charts-container').style.display = 'none';
  const msgBox = document.getElementById('analytics-empty-msg');
  msgBox.style.display = 'block';
  msgBox.innerText = "載入統計資料中...";
  
  // 呼叫 API 取得統計資料
  const res = await callGAS('getUserAnalytics', { empId: currentUser.empId });
  renderAnalytics(res);
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
