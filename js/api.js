const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxDB2GJZdwSccL5Fk1KGkObxEfdCIwj8QeQ7R0W7VfKvbsGVSEErxT7h3Q-4Y6hyHeC/exec";

async function callGAS(action, params = {}) {
  try {
    const response = await fetch(GAS_API_URL, {
      method: "POST",
      // ⚠️ 關鍵：完全不寫 headers 屬性，讓瀏覽器自動以最基礎的 text/plain 發送，完美繞過 CORS 預檢
      body: JSON.stringify({ action: action, ...params })
    });
    
    // GAS 會自動轉向，這裡直接解析最終的 JSON 回傳結果
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("API Error:", error);
    return { status: "error", message: "連線遭阻擋。請確認 GAS 部署權限為「所有人」，且未使用機構網域帳號。" };
  }
}
