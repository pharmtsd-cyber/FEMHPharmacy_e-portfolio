// 將此 URL 替換為您 GAS 重新部署後的 Web App URL
const GAS_API_URL = "https://script.google.com/macros/s/AKfycb.../exec";

async function callGAS(action, params = {}) {
  try {
    const response = await fetch(GAS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8", // 使用 text/plain 避免 CORS 阻擋
      },
      body: JSON.stringify({ action: action, ...params })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("API Error:", error);
    return { status: "error", message: "網路連線異常，請檢查網路狀態" };
  }
}
