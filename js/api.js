const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxDB2GJZdwSccL5Fk1KGkObxEfdCIwj8QeQ7R0W7VfKvbsGVSEErxT7h3Q-4Y6hyHeC/exec";

async function callGAS(action, params = {}) {
  try {
    const response = await fetch(GAS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, 
      body: JSON.stringify({ action: action, ...params }),
      redirect: "follow" // 允許跟隨 302 轉向
    });
    
    const textData = await response.text(); 
    try {
      return JSON.parse(textData);
    } catch (e) {
      console.error("伺服器回傳了非預期的格式:", textData);
      return { status: "error", message: "資料解析失敗，請確認網路環境是否封鎖了 Google API" };
    }
  } catch (error) {
    console.error("API Error:", error);
    return { status: "error", message: "網路連線異常，或被醫院防火牆攔截" };
  }
}
