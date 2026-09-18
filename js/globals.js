let currentUser = null; 
let allTemplates = []; 
let currentTemplateId = ""; 
let currentRecordId = ""; 
let currentAttemptCount = 0; 
let currentTaskStatus = ""; // 🌟 新增：記錄目前的任務狀態(待回填/草稿)
let currentSavedAnswers = {}; 
let globalUserList = []; 
let globalTasks = []; 
let globalHistoryCounts = {}; 

let timerStates = { 
  ass: { isRunning: false, start: null, elapsed: 0 },
  fb:  { isRunning: false, start: null, elapsed: 0 } // 🌟 補回 DOPS 雙向回饋計時器
};
let timerRaf = {}; 
let autoSaveInterval = null; 
let canvases = {};
let chartAcgmeInstance = null;
let chartUnitInstance = null;
