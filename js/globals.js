let currentUser = null; 
let allTemplates = []; 
let currentTemplateId = ""; 
let currentRecordId = ""; 
let currentSavedAnswers = {}; 
let globalUserList = []; 
let globalTasks = []; 
// 🌟 修正：徹底清理觀察時間，只留下評估時間 (ass)
let timerStates = { 
  ass: { isRunning: false, start: null, elapsed: 0 }
};
let timerRaf = {}; 
let autoSaveInterval = null; 
let canvases = {};
let chartAcgmeInstance = null;
let chartUnitInstance = null;
