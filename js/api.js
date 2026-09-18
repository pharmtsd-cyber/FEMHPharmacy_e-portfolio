// 將此 URL 替換為您 GAS 重新部署後的 Web App URL
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxDB2GJZdwSccL5Fk1KGkObxEfdCIwj8QeQ7R0W7VfKvbsGVSEErxT7h3Q-4Y6hyHeC/exec";

async function callGAS(action, params = {}) {
  try {
    const response = await fetch(GAS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, 
      body: JSON.stringify({ action: action, ...params })
    });
    
    // 💡 先拿純文字，避免直接 json() 因格式不對而導致系統崩潰(空白畫面)
    const textData = await response.text(); 
    try {
      return JSON.parse(textData);
    } catch (e) {
      console.error("伺服器回傳了非預期的格式:", textData);
      return { status: "error", message: "API 回傳格式錯誤，請檢查 GAS 部署權限是否設為『所有人』" };
    }
  } catch (error) {
    console.error("API Error:", error);
    return { status: "error", message: "網路連線異常，請檢查網路狀態" };
  }
}
