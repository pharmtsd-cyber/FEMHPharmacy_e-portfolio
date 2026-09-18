// ⚠️ 請填入您最新的 Apps Script 部署網址
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxDB2GJZdwSccL5Fk1KGkObxEfdCIwj8QeQ7R0W7VfKvbsGVSEErxT7h3Q-4Y6hyHeC/exec";

async function callGAS(action, params = {}) {
  try {
    const payload = {
      action: action,
      ...params
    };

    // 使用 text/plain 繞過 OPTIONS 預檢，搭配 redirect: follow 處理 302 轉向
    const response = await fetch(GAS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload),
      redirect: "follow"
    });
    
    if (!response.ok) {
      throw new Error(`網路回應不正常 (狀態碼: ${response.status})`);
    }

    const textData = await response.text(); 
    
    try {
      return JSON.parse(textData);
    } catch (e) {
      console.error("伺服器回傳了非預期的格式:", textData);
      if (textData.includes("<!DOCTYPE html>")) {
        return { status: "error", message: "權限遭阻擋：請確認 Apps Script 部署身分為「我」，且誰可以存取設為「所有人」。" };
      }
      return { status: "error", message: "資料解析失敗：伺服器未回傳合法的 JSON 格式。" };
    }
  } catch (error) {
    console.error("API Error:", error);
    return { status: "error", message: "網路連線異常，或遭到醫院防火牆與 CORS 阻擋。" };
  }
}
