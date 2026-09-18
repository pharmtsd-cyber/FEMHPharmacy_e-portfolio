// ⚠️ 請填入您最新的 Apps Script 部署網址
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxDB2GJZdwSccL5Fk1KGkObxEfdCIwj8QeQ7R0W7VfKvbsGVSEErxT7h3Q-4Y6hyHeC/exec";

async function callGAS(action, params = {}) {
  try {
    // 🌟 將 action 與參數包裝成 GET 網址查詢字串
    const queryParams = new URLSearchParams({
      action: action,
      data: JSON.stringify(params)
    });

    const targetUrl = `${GAS_API_URL}?${queryParams.toString()}`;

    // 改用 GET 請求，絕不會觸發 CORS 預檢或 302 轉向阻擋
    const response = await fetch(targetUrl, {
      method: "GET",
      redirect: "follow"
    });
    
    const textData = await response.text(); 
    
    try {
      return JSON.parse(textData);
    } catch (e) {
      console.error("伺服器回傳了非預期的格式:", textData);
      return { status: "error", message: "資料解析失敗：伺服器未回傳 JSON 格式。" };
    }
  } catch (error) {
    console.error("API Error:", error);
    return { status: "error", message: "網路連線異常，或 API 呼叫失敗。" };
  }
}
