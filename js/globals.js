let currentUser = null; 
let allTemplates = []; 
let currentTemplateId = ""; 
let currentRecordId = ""; 
let currentSavedAnswers = {}; 
let globalUserList = []; 
let globalTasks = []; 
// 💡 已將 obs 移除，只保留評核(ass)與雙向回饋(fb)
let timerStates = { 
  ass: { isRunning: false, start: null, elapsed: 0 }, 
  fb:  { isRunning: false, start: null, elapsed: 0 } 
};
let timerRaf = {}; 
let autoSaveInterval = null; 
let canvases = {};
let chartAcgmeInstance = null;
let chartUnitInstance = null;
