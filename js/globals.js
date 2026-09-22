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
