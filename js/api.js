// ⚠️ 請務必換成您用「個人 @gmail.com 帳號」全新部署的 API 網址！
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxDB2GJZdwSccL5Fk1KGkObxEfdCIwj8QeQ7R0W7VfKvbsGVSEErxT7h3Q-4Y6hyHeC/exec";

async function callGAS(action, params = {}) {
  try {
    const response = await fetch(GAS_API_URL, {
      method: "POST",
      // 關鍵：絕不加入 Content-Type headers，讓瀏覽器以最基礎的 text/plain 送出，完美繞過 CORS 阻擋
      body: JSON.stringify({ action: action, ...params }),
      redirect: "follow" 
    });
    
    // 先以純文字解析回傳結果
    const textData = await response.text(); 
    
    try {
      // 嘗試轉為 JSON
      return JSON.parse(textData);
    } catch (e) {
      console.error("伺服器回傳了非預期的格式:", textData);
      
      // 💡 智慧診斷錯誤原因
      if (textData.includes("<!DOCTYPE html>")) {
        return { status: "error", message: "權限遭阻擋：請確認您使用的是「個人 Gmail 帳號」，並已將存取權限設為「所有人」。" };
      }
      if (textData.includes("✅")) {
        return { status: "error", message: "網址錯誤：瀏覽器抓到了舊的測試快取，請確認是否已填入最新 POST 部署的 API 網址。" };
      }
      return { status: "error", message: "資料解析失敗，請確認 Google Apps Script 執行狀態。" };
    }
  } catch (error) {
    console.error("API Error:", error);
    return { status: "error", message: "網路連線異常，或遭到醫院防火牆阻擋 (CORS)。" };
  }
}
