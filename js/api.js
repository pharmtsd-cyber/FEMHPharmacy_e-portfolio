// 將此 URL 替換為您 GAS 重新部署後的 Web App URL
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxDB2GJZdwSccL5Fk1KGkObxEfdCIwj8QeQ7R0W7VfKvbsGVSEErxT7h3Q-4Y6hyHeC/exec";

async function callGAS(action, params = {}) {
  try {
    const response = await fetch(GAS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // 避免 CORS
      body: JSON.stringify({ action: action, ...params })
    });
    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    return { status: "error", message: "網路連線異常，請檢查網路狀態" };
  }
}
