let currentUser = null; 
let allTemplates = []; 
let currentTemplateId = ""; 
let currentRecordId = ""; 
let currentAttemptCount = 0; 
let currentTaskStatus = ""; 
let currentSavedAnswers = {}; 
let globalUserList = []; 
let globalTasks = []; 
let globalHistoryCounts = {}; 

// 🌟 新增：全域題庫與快取判定變數
let globalQuestions = []; 
let globalDopsQuestions = []; // 🌟 新增：專門存放 DOPS 公版題目的快取
let isDashboardLoaded = false; 

let timerStates = { 
  ass: { isRunning: false, start: null, elapsed: 0 },
  fb:  { isRunning: false, start: null, elapsed: 0 } 
};
let timerRaf = {}; 
let autoSaveInterval = null; 
let canvases = {};
let chartAcgmeInstance = null;
let chartUnitInstance = null;
