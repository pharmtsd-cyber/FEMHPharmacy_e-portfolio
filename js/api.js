// ⚠️ 請填入您最新的 Apps Script 部署網址
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxDB2GJZdwSccL5Fk1KGkObxEfdCIwj8QeQ7R0W7VfKvbsGVSEErxT7h3Q-4Y6hyHeC/exec";

function callGAS(action, params = {}) {
  return new Promise((resolve) => {
    // 建立獨一無二的callback函數名稱
    const callbackName = 'gas_callback_' + Math.round(100000 * Math.random());
    
    // 在全域環境接聽 Google 回傳的資料
    window[callbackName] = function(response) {
      delete window[callbackName];
      if (scriptNode && scriptNode.parentNode) {
        scriptNode.parentNode.removeChild(scriptNode);
      }
      resolve(response);
    };

    // 將參數透過網址傳遞給 GAS
    const queryParams = new URLSearchParams({
      action: action,
      callback: callbackName, // 告訴 GAS 用這個名稱包覆回傳資料
      data: JSON.stringify(params)
    });

    const targetUrl = `${GAS_API_URL}?${queryParams.toString()}`;

    // 動態建立 script 標籤 (JSONP 核心)
    const scriptNode = document.createElement('script');
    scriptNode.src = targetUrl;
    
    scriptNode.onerror = function() {
      delete window[callbackName];
      if (scriptNode.parentNode) scriptNode.parentNode.removeChild(scriptNode);
      resolve({ status: "error", message: "網路連線異常，或遭到 Google 阻擋。" });
    };

    // 塞入網頁中觸發請求
    document.body.appendChild(scriptNode);
  });
}
