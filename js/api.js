const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxDB2GJZdwSccL5Fk1KGkObxEfdCIwj8QeQ7R0W7VfKvbsGVSEErxT7h3Q-4Y6hyHeC/exec";

async function callGAS(action, params = {}) {
  try {
    const response = await fetch(GAS_API_URL, {
      method: "POST",
      // ⚠️ 關鍵：完全不要帶入 headers！這樣能避免瀏覽器發出 OPTIONS 預檢請求，直接繞過 CORS 阻擋
      body: JSON.stringify({ action: action, ...params }),
      redirect: "follow" // 允許跟隨 302 轉向
    });
    
    const textData = await response.text(); 
    try {
      return JSON.parse(textData);
    } catch (e) {
      console.error("伺服器回傳了非預期的格式:", textData);
      return { status: "error", message: "資料解析失敗，請確認 GAS 網頁應用程式是否設定為「所有人」皆可存取。" };
    }
  } catch (error) {
    console.error("API Error:", error);
    return { status: "error", message: "網路連線異常，或遭到跨網域 (CORS) 阻擋" };
  }
}
