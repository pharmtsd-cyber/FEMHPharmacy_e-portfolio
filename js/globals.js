let currentUser = null; 
let allTemplates = []; 
let currentTemplateId = ""; 
let currentRecordId = ""; 
let currentSavedAnswers = {}; 
let globalUserList = []; 
let globalTasks = []; 
let timerStates = { 
  obs: { isRunning: false, start: null, elapsed: 0 }, 
  ass: { isRunning: false, start: null, elapsed: 0 }, 
  fb:  { isRunning: false, start: null, elapsed: 0 } 
};
let timerRaf = {}; // 用於優化計時器的 requestAnimationFrame
let autoSaveInterval = null; 
let canvases = {};
let chartAcgmeInstance = null;
let chartUnitInstance = null;
