// 將此 URL 替換為您 GAS 部署後的 Web App URL
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxDB2GJZdwSccL5Fk1KGkObxEfdCIwj8QeQ7R0W7VfKvbsGVSEErxT7h3Q-4Y6hyHeC/exec";

function callGAS(action, params = {}) {
  return new Promise((resolve, reject) => {
    
    // 🚀 核心破解法：讀取資料改用 JSONP 穿透協定，100% 繞過 Google 的 404 與 CORS 阻擋
    if (action !== 'submitExam') {
      const callbackName = 'gas_cb_' + Math.round(100000 * Math.random());
      
      window[callbackName] = function(data) {
        delete window[callbackName];
        document.body.removeChild(script);
        resolve(data);
      };

      const url = new URL(GAS_API_URL);
      url.searchParams.append('action', action);
      url.searchParams.append('callback', callbackName);
      for (let key in params) { url.searchParams.append(key, params[key]); }

      const script = document.createElement('script');
      script.src = url.toString();
      script.onerror = () => {
         delete window[callbackName];
         reject(new Error('網路連線異常，請檢查 GAS 網址與權限'));
      };
      document.body.appendChild(script);
    } 
    // ✍️ 寫入資料 (含簽名圖片較大)，維持 POST 傳送
    else {
      fetch(GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: action, payload: params.payload })
      })
      .then(res => res.text())
      .then(text => {
        try { resolve(JSON.parse(text)); }
        catch(e) { reject(new Error("伺服器回傳格式異常")); }
      })
      .catch(reject);
    }
  });
}
