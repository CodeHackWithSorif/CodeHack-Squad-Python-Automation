// ============================================================
// CODEHACK SQUAD
// PYTHON DAILY CHALLENGE AUTOMATION SYSTEM
// ============================================================

const SYSTEM = {
  NAME: "Code Hack With Sorif",
  PROJECT: "CodeHack Squad | Python Daily Challenge",
  SPREADSHEET_NAME: "CodeHack Squad — Python Challenge System",
  FORM_TITLE: "CodeHack Squad — Python Daily Challenge",
  SQUAD_LOGO_FOLDER_ID: "[YOUR_SQUAD_LOGO_FOLDER_ID]",
  SHEETS: {
    CONFIG: "CONFIG",
    CHALLENGES: "CHALLENGES",
    STUDENTS: "STUDENTS",
    SUBMISSIONS: "SUBMISSIONS",
    CERTIFICATES: "CERTIFICATES",
  },
};

// ============================================================
// ON OPEN MENU
// ============================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("CodeHack Squad")
    .addItem("Setup / Repair System", "setupSystem")
    .addItem("Repair Submission Trigger", "repairSubmissionTrigger")
    .addItem("Show Permanent Form URL", "showFormUrl")
    .addSeparator()
    .addItem("Test Judge0 Connection", "testJudge0Connection")
    .addItem("Test Hidden Judge", "testHiddenJudge")
    .addItem("Test Full Certificate Pipeline", "testFullCertificatePipeline")
    .addToUi();
}

// ============================================================
// MAIN SYSTEM SETUP
// ============================================================
function setupSystem() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error(
      "Please run this script from the CodeHack Squad spreadsheet.",
    );
  }

  createMasterSheets_(ss);
  updateConfigValue_("SPREADSHEET_ID", ss.getId());

  setDefaultConfig_("JUDGE0_URL", "https://ce.judge0.com");
  setDefaultConfig_("PYTHON_LANGUAGE_ID", "71");
  setDefaultConfig_("JUDGE0_ENABLED", "YES");
  setDefaultConfig_("JUDGE0_API_KEY", "");
  setDefaultConfig_("VERIFICATION_URL", "[YOUR_WEB_APP_URL_HERE]");
  setDefaultConfig_("ADMIN_EMAIL", "");

  createPermanentForm_(ss);
  repairSubmissionTrigger();
  getCertificateArchiveFolder_();

  Logger.log("=================================");
  Logger.log("CODEHACK SQUAD SYSTEM SETUP COMPLETE");
  Logger.log("=================================");
}

function setupAutomatedSystem() {
  setupSystem();
}

// ============================================================
// CONFIGURATION HELPERS
// ============================================================
function createMasterSheets_(ss) {
  ensureSheet_(ss, SYSTEM.SHEETS.CONFIG, ["Key", "Value"]);
  ensureSheet_(ss, SYSTEM.SHEETS.CHALLENGES, [
    "Day",
    "Title",
    "Question",
    "Difficulty",
    "Test Cases",
    "Status",
  ]);
  ensureSheet_(ss, SYSTEM.SHEETS.STUDENTS, [
    "Student ID",
    "Full Name",
    "Email",
    "First Submission",
    "Last Submission",
    "Total Attempts",
    "Total Passes",
    "Total Fails",
    "Certificates Issued",
    "Last Active Day",
    "Updated At",
  ]);
  ensureSheet_(ss, SYSTEM.SHEETS.SUBMISSIONS, [
    "Timestamp",
    "Attempt ID",
    "Student Name",
    "Email",
    "Day",
    "Attempt Number",
    "Tests Passed",
    "Total Tests",
    "Result",
    "Certificate Status",
    "Submitted Code",
  ]);
  ensureSheet_(ss, SYSTEM.SHEETS.CERTIFICATES, [
    "Issue Date",
    "Certificate ID",
    "Student Name",
    "Email",
    "Day",
    "Challenge",
    "Attempt ID",
    "Status",
    "Verification URL",
    "PDF File ID",
    "PDF File URL",
    "Email Status",
  ]);
}

function ensureSheet_(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  return sheet;
}

function setDefaultConfig_(key, value) {
  const current = getConfigValue_(key);
  if (current === "" || current === null || current === undefined) {
    updateConfigValue_(key, value);
  }
}

function updateConfigValue_(key, value) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SYSTEM.SHEETS.CONFIG);
  if (!sheet) throw new Error("CONFIG sheet not found.");

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(key).trim()) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function getConfigValue_(key) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SYSTEM.SHEETS.CONFIG);
  if (!sheet) return "";

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(key).trim()) {
      return data[i][1];
    }
  }
  return "";
}

// ============================================================
// PERMANENT GOOGLE FORM
// ============================================================
function createPermanentForm_(ss) {
  let formId = getConfigValue_("FORM_ID");
  let form = null;

  if (formId) {
    try {
      form = FormApp.openById(String(formId));
    } catch (error) {
      form = null;
    }
  }
  if (!form) {
    const files = DriveApp.getFilesByName(SYSTEM.FORM_TITLE);
    if (files.hasNext()) {
      form = FormApp.openById(files.next().getId());
    }
  }
  if (!form) {
    form = FormApp.create(SYSTEM.FORM_TITLE);
    form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
    form.addTextItem().setTitle("Full Name").setRequired(true);
    form.addTextItem().setTitle("Email Address").setRequired(true);
    form.addParagraphTextItem().setTitle("Python Code").setRequired(true);
  }

  updateConfigValue_("FORM_ID", form.getId());
  updateConfigValue_("FORM_URL", form.getPublishedUrl());
  ensurePermanentFormItems_(form);

  const activeDay = getConfigValue_("ACTIVE_DAY");
  if (activeDay) {
    const challenge = getChallengeByDay_(activeDay);
    if (challenge) updatePermanentForm_(activeDay);
  }
  return form;
}

function ensurePermanentFormItems_(form) {
  const items = form.getItems();
  let hasName = false,
    hasEmail = false,
    hasCode = false;

  for (let i = 0; i < items.length; i++) {
    const title = String(items[i].getTitle() || "").trim();
    if (title === "Full Name") hasName = true;
    if (title === "Email Address") hasEmail = true;
    if (title === "Python Code") hasCode = true;
  }

  if (!hasName) form.addTextItem().setTitle("Full Name").setRequired(true);
  if (!hasEmail) form.addTextItem().setTitle("Email Address").setRequired(true);
  if (!hasCode)
    form.addParagraphTextItem().setTitle("Python Code").setRequired(true);
}

function repairFormConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const files = DriveApp.getFilesByName(SYSTEM.FORM_TITLE);
  if (!files.hasNext())
    throw new Error("Permanent Google Form not found: " + SYSTEM.FORM_TITLE);

  const file = files.next();
  const formId = file.getId();
  const form = FormApp.openById(formId);

  updateConfigValue_("FORM_ID", formId);
  updateConfigValue_("FORM_URL", form.getPublishedUrl());

  Logger.log("FORM_ID saved successfully. FORM_URL: " + form.getPublishedUrl());
  return "Form configuration repaired successfully.";
}

function showFormUrl() {
  const url = getConfigValue_("FORM_URL");
  if (!url) throw new Error("FORM_URL not found. Run setupSystem().");
  Logger.log("Permanent Google Form URL: \n" + url);
  return url;
}

function updatePermanentForm_(day) {
  const formId = getConfigValue_("FORM_ID");
  if (!formId) throw new Error("FORM_ID not found in CONFIG.");

  const form = FormApp.openById(formId);
  const challenge = getChallengeByDay_(day);
  if (!challenge) throw new Error("Challenge not found: " + day);

  form.setTitle("CodeHack Squad — Python Daily Challenge");
  const number = challenge.day.replace("DAY_", "");

  const description =
    "DAY " +
    number +
    "  |  " +
    String(challenge.difficulty).toUpperCase() +
    "\n\n" +
    challenge.title +
    "\n\n" +
    challenge.question +
    "\n\nSUBMISSION\n• Submit your own Python solution.\n• Your code will be automatically evaluated.\n• Failed attempts do not receive a certificate.\n• You may fix your code and submit again.\n\nPowered by Code Hack With Sorif";

  form.setDescription(description);
  form.setConfirmationMessage(
    "Your Python solution has been submitted for automatic evaluation. Check your email for the result.",
  );
  return "Professional form updated for " + day;
}

// ============================================================
// SUBMISSION TRIGGER
// ============================================================
function repairSubmissionTrigger() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const triggers = ScriptApp.getProjectTriggers();

  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "handleSubmission") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger("handleSubmission")
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();
  updateConfigValue_("SUBMISSION_TRIGGER_STATUS", "INSTALLED");

  Logger.log("=================================");
  Logger.log("SUBMISSION TRIGGER INSTALLED (handleSubmission)");
  Logger.log("=================================");
  return "Submission trigger installed successfully.";
}

// ============================================================
// CHALLENGE MANAGER
// ============================================================
function normalizeDayName_(day) {
  const value = String(day || "")
    .trim()
    .toUpperCase();
  const match = value.match(/(?:DAY[_ -]?)?(\d+)/);
  if (!match) return value;
  return "DAY_" + String(Number(match[1])).padStart(2, "0");
}

function createChallenge(day, title, question, difficulty, testCasesJson) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SYSTEM.SHEETS.CHALLENGES);
  if (!sheet) throw new Error("CHALLENGES sheet not found.");

  const normalizedDay = normalizeDayName_(day);
  let testCases = Array.isArray(testCasesJson)
    ? JSON.stringify(testCasesJson)
    : String(testCasesJson || "").trim();

  try {
    const parsed = JSON.parse(testCases);
    if (!Array.isArray(parsed) || parsed.length === 0)
      throw new Error("Test case list is empty.");
    for (let i = 0; i < parsed.length; i++) {
      if (!parsed[i].hasOwnProperty("input"))
        throw new Error("Test case " + (i + 1) + " missing 'input'.");
      if (!parsed[i].hasOwnProperty("expected_output"))
        throw new Error("Test case " + (i + 1) + " missing 'expected_output'.");
    }
  } catch (error) {
    throw new Error("Invalid test case JSON: " + error.message);
  }

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (normalizeDayName_(data[i][0]) === normalizedDay) {
      throw new Error("This DAY already exists: " + normalizedDay);
    }
  }

  sheet.appendRow([
    normalizedDay,
    title,
    question,
    difficulty,
    testCases,
    "DRAFT",
  ]);
  createDaySheet_(normalizedDay);
  Logger.log("Challenge created: " + normalizedDay);
  return normalizedDay;
}

function publishChallenge(day, title, question, difficulty, testCasesJson) {
  const normalizedDay = normalizeDayName_(day);
  const existing = getChallengeByDay_(normalizedDay);

  if (!existing) {
    createChallenge(normalizedDay, title, question, difficulty, testCasesJson);
  } else {
    updateChallenge_(normalizedDay, title, question, difficulty, testCasesJson);
  }
  activateChallenge(normalizedDay);
  return "Published and activated: " + normalizedDay;
}

function updateChallenge_(day, title, question, difficulty, testCasesJson) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SYSTEM.SHEETS.CHALLENGES);
  const normalizedDay = normalizeDayName_(day);
  let testCases = Array.isArray(testCasesJson)
    ? JSON.stringify(testCasesJson)
    : String(testCasesJson || "");

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (normalizeDayName_(data[i][0]) === normalizedDay) {
      sheet
        .getRange(i + 1, 2, 1, 4)
        .setValues([[title, question, difficulty, testCases]]);
      return true;
    }
  }
  throw new Error("Challenge not found: " + normalizedDay);
}

function activateChallenge(day) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SYSTEM.SHEETS.CHALLENGES);
  const normalizedDay = normalizeDayName_(day);
  const data = sheet.getDataRange().getValues();
  let found = false;

  for (let i = 1; i < data.length; i++) {
    if (normalizeDayName_(data[i][0]) === normalizedDay) {
      sheet.getRange(i + 1, 6).setValue("ACTIVE");
      found = true;
    } else {
      sheet.getRange(i + 1, 6).setValue("INACTIVE");
    }
  }

  if (!found) throw new Error("Challenge not found: " + normalizedDay);
  updateConfigValue_("ACTIVE_DAY", normalizedDay);
  updatePermanentForm_(normalizedDay);

  Logger.log("ACTIVE DAY: " + normalizedDay);
  return "Activated: " + normalizedDay;
}

function createDaySheet_(day) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedDay = normalizeDayName_(day);
  let sheet = ss.getSheetByName(normalizedDay);

  if (!sheet) {
    sheet = ss.insertSheet(normalizedDay);
  }

  const headers = [
    "Timestamp",
    "Attempt ID",
    "Student Name",
    "Email",
    "Day",
    "Challenge",
    "Submitted Code",
    "Result",
    "Tests Passed",
    "Total Tests",
    "Certificate ID",
    "Certificate Status",
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  return sheet;
}

function getChallengeByDay_(day) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SYSTEM.SHEETS.CHALLENGES);
  if (!sheet) throw new Error("CHALLENGES sheet not found.");

  const data = sheet.getDataRange().getValues();
  const normalizedDay = normalizeDayName_(day);

  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    if (normalizeDayName_(data[i][0]) === normalizedDay) {
      return {
        day: normalizedDay,
        title: data[i][1],
        question: data[i][2],
        difficulty: data[i][3],
        testCases: data[i][4],
        status: data[i][5],
      };
    }
  }
  return null;
}

function getChallengeTitle_(day) {
  const challenge = getChallengeByDay_(day);
  return challenge ? challenge.title : "Unknown Challenge";
}

// ============================================================
// JUDGE0
// ============================================================
function getJudge0Headers_() {
  const headers = {};
  const apiKey = getConfigValue_("JUDGE0_API_KEY");
  if (apiKey && String(apiKey).trim() !== "") {
    headers["X-Auth-Token"] = String(apiKey).trim();
  }
  return headers;
}

function testJudge0Connection() {
  const judgeUrl = String(
    getConfigValue_("JUDGE0_URL") || "https://ce.judge0.com",
  ).replace(/\/+$/, "");
  const response = UrlFetchApp.fetch(judgeUrl + "/languages/", {
    method: "get",
    muteHttpExceptions: true,
    headers: getJudge0Headers_(),
  });
  const code = response.getResponseCode();
  const body = response.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error(
      "Judge0 connection failed. HTTP " + code + "\n" + body.substring(0, 1000),
    );
  }

  let languages;
  try {
    languages = JSON.parse(body);
  } catch (e) {
    throw new Error("Judge0 /languages/ returned invalid JSON.");
  }
  if (!Array.isArray(languages) || languages.length === 0)
    throw new Error("Judge0 returned no language definitions.");

  const configuredId = Number(getConfigValue_("PYTHON_LANGUAGE_ID") || 71);
  if (!Number.isFinite(configuredId) || configuredId <= 0)
    throw new Error("PYTHON_LANGUAGE_ID must be valid numeric.");

  const python = languages.find((lang) => Number(lang.id) === configuredId);
  if (!python)
    throw new Error("Python language ID " + configuredId + " not found.");
  if (
    !String(python.name || "")
      .toLowerCase()
      .includes("python")
  )
    throw new Error("Language ID " + configuredId + " is not Python.");

  updateConfigValue_("PYTHON_LANGUAGE_ID", python.id);
  updateConfigValue_("JUDGE0_STATUS", "CONNECTED");

  Logger.log(
    "=================================\nJUDGE0 CONNECTED\nPython: " +
      python.name +
      "\nLanguage ID: " +
      python.id +
      "\n=================================",
  );
  return { status: "CONNECTED", python: python.name, languageId: python.id };
}

function runJudge0Case_(sourceCode, input, expectedOutput) {
  const enabled = String(getConfigValue_("JUDGE0_ENABLED") || "YES")
    .trim()
    .toUpperCase();
  if (enabled !== "YES") throw new Error("JUDGE0_ENABLED is not YES.");

  const judgeUrl = String(
    getConfigValue_("JUDGE0_URL") || "https://ce.judge0.com",
  ).replace(/\/+$/, "");
  const languageId = Number(getConfigValue_("PYTHON_LANGUAGE_ID"));
  if (!languageId) throw new Error("PYTHON_LANGUAGE_ID is missing.");

  const url = judgeUrl + "/submissions?base64_encoded=false&wait=true";
  const payload = {
    language_id: languageId,
    source_code: String(sourceCode),
    stdin: input == null ? "" : String(input),
    cpu_time_limit: 10,
    wall_time_limit: 15,
    memory_limit: 128000,
  };

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    headers: getJudge0Headers_(),
  });
  const httpCode = response.getResponseCode();
  const responseText = response.getContentText();

  if (httpCode < 200 || httpCode >= 300) {
    throw new Error(
      "Judge0 API error. HTTP " +
        httpCode +
        "\n" +
        responseText.substring(0, 1500),
    );
  }

  let result;
  try {
    result = JSON.parse(responseText);
  } catch (e) {
    throw new Error("Invalid JSON returned by Judge0.");
  }

  const initialStatusId = Number(result.status_id || 0);
  if (initialStatusId === 1 || initialStatusId === 2) {
    if (result.token) result = pollJudge0Submission_(judgeUrl, result.token);
  }

  const statusId = Number(result.status_id || 0);
  const status =
    result.status && result.status.description
      ? String(result.status.description)
      : "Unknown";
  const actualOutput =
    result.stdout == null ? "" : String(result.stdout).trim();
  const expected = expectedOutput == null ? "" : String(expectedOutput).trim();

  const isAccepted = status.toLowerCase() === "accepted" || statusId === 3;
  const passed = isAccepted && outputsMatch_(actualOutput, expected);

  return {
    statusId: statusId,
    status: status,
    passed: passed,
    stdout: actualOutput,
    stderr: result.stderr || "",
    compileOutput: result.compile_output || "",
    message: result.message || "",
  };
}

// ============================================================
// FLEXIBLE OUTPUT MATCHER
// ============================================================
function outputsMatch_(actualOutput, expectedOutput) {
  const actual = String(actualOutput || "")
    .replace(/\r\n/g, "\n")
    .trim();
  const expected = String(expectedOutput || "")
    .replace(/\r\n/g, "\n")
    .trim();

  if (actual === expected) return true;

  const numberPattern = /[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?/g;
  const expectedNumbers = expected.match(numberPattern) || [];
  const expectedWithoutNumbers = expected
    .replace(numberPattern, "")
    .replace(/[\s,;|]+/g, "")
    .trim();

  if (expectedNumbers.length > 0 && expectedWithoutNumbers === "") {
    const actualNumbers = actual.match(numberPattern) || [];
    if (actualNumbers.length < expectedNumbers.length) return false;
    const lastNumbers = actualNumbers.slice(
      actualNumbers.length - expectedNumbers.length,
    );

    for (let i = 0; i < expectedNumbers.length; i++) {
      if (Number(lastNumbers[i]) !== Number(expectedNumbers[i])) return false;
    }
    return true;
  }

  const normalizeText = (val) =>
    String(val || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  const normalizedActual = normalizeText(actual);
  const normalizedExpected = normalizeText(expected);

  if (!normalizedExpected) return normalizedActual === "";
  if (normalizedActual === normalizedExpected) return true;

  const actualLines = String(actual || "")
    .split("\n")
    .map(normalizeText)
    .filter((l) => l !== "");
  if (actualLines.length === 0) return false;

  const lastLine = actualLines[actualLines.length - 1];
  const escapedExpected = normalizedExpected.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );

  if (
    !new RegExp(escapedExpected + "(?=\\s*[.,:;!?]*\\s*$)", "i").test(lastLine)
  )
    return false;
  if (
    new RegExp(
      "\\b(?:not|never|without)\\b\\s+(?:a\\s+|an\\s+)?" +
        escapedExpected +
        "\\b",
      "i",
    ).test(lastLine)
  )
    return false;

  return true;
}

function pollJudge0Submission_(judgeUrl, token) {
  for (let i = 0; i < 20; i++) {
    Utilities.sleep(1000);
    const response = UrlFetchApp.fetch(
      judgeUrl +
        "/submissions/" +
        encodeURIComponent(token) +
        "?base64_encoded=false",
      { method: "get", muteHttpExceptions: true, headers: getJudge0Headers_() },
    );
    const code = response.getResponseCode();
    if (code < 200 || code >= 300)
      throw new Error("Judge0 polling failed. HTTP " + code);

    const result = JSON.parse(response.getContentText());
    if (result.status_id !== 1 && result.status_id !== 2) return result;
  }
  throw new Error("Judge0 evaluation timed out while waiting for a result.");
}

function judgePythonChallenge_(sourceCode, day) {
  if (!sourceCode || String(sourceCode).trim() === "")
    throw new Error("Submitted Python code is empty.");

  const challenge = getChallengeByDay_(day);
  if (!challenge) throw new Error("Challenge not found: " + day);

  let testCases;
  try {
    testCases = JSON.parse(challenge.testCases);
  } catch (e) {
    throw new Error("Invalid test case JSON for " + day);
  }
  if (!Array.isArray(testCases) || testCases.length === 0)
    throw new Error("No test cases found for " + day);

  const results = [];
  let passed = 0;

  for (let i = 0; i < testCases.length; i++) {
    const result = runJudge0Case_(
      sourceCode,
      testCases[i].input,
      testCases[i].expected_output,
    );
    results.push({
      testNumber: i + 1,
      statusId: result.statusId,
      status: result.status,
      passed: result.passed,
    });
    if (result.passed) passed++;
  }

  return {
    passed: passed === testCases.length,
    passedCount: passed,
    totalCount: testCases.length,
    results: results,
  };
}

function getJudgeFailureReason_(judgeResult) {
  const reasons = [];
  for (let i = 0; i < judgeResult.results.length; i++) {
    const result = judgeResult.results[i];
    if (
      !result.passed &&
      result.status &&
      reasons.indexOf(result.status) === -1
    ) {
      reasons.push(result.status);
    }
  }
  return reasons.length === 0 ? "Wrong Answer" : reasons.join(", ");
}

// ============================================================
// SUBMISSION DATABASE
// ============================================================
function getFormValue_(namedValues, fieldName) {
  if (!namedValues || !namedValues[fieldName]) return "";
  const value = namedValues[fieldName];
  return Array.isArray(value)
    ? String(value[0] || "").trim()
    : String(value || "").trim();
}

function getNextAttemptNumber_(email, day) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SYSTEM.SHEETS.SUBMISSIONS);
  const data = sheet.getDataRange().getValues();
  let count = 0;

  for (let i = 1; i < data.length; i++) {
    if (
      String(data[i][3] || "")
        .trim()
        .toLowerCase() === String(email).trim().toLowerCase() &&
      normalizeDayName_(data[i][4]) === normalizeDayName_(day)
    ) {
      count++;
    }
  }
  return count + 1;
}

function generateAttemptId_(day) {
  return (
    normalizeDayName_(day) +
    "-ATT-" +
    Utilities.getUuid().replace(/-/g, "").substring(0, 10).toUpperCase()
  );
}

function recordSubmission_(studentName, email, day, sourceCode, judgeResult) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const submissionSheet = ss.getSheetByName(SYSTEM.SHEETS.SUBMISSIONS);
    if (!submissionSheet) throw new Error("SUBMISSIONS sheet not found.");

    const timestamp = new Date();
    const normalizedDay = normalizeDayName_(day);
    const attemptNumber = getNextAttemptNumber_(email, normalizedDay);
    const attemptId = generateAttemptId_(normalizedDay);
    const result = judgeResult.passed ? "PASS" : "FAIL";
    const certificateStatus = "NOT_ISSUED";

    submissionSheet.appendRow([
      timestamp,
      attemptId,
      studentName,
      email,
      normalizedDay,
      attemptNumber,
      judgeResult.passedCount,
      judgeResult.totalCount,
      result,
      certificateStatus,
      sourceCode,
    ]);

    const daySheet = createDaySheet_(normalizedDay);
    daySheet.appendRow([
      timestamp,
      attemptId,
      studentName,
      email,
      normalizedDay,
      getChallengeTitle_(normalizedDay),
      sourceCode,
      result,
      judgeResult.passedCount,
      judgeResult.totalCount,
      "",
      certificateStatus,
    ]);

    upsertStudent_(studentName, email, normalizedDay, result);
    return {
      attemptId: attemptId,
      attemptNumber: attemptNumber,
      result: result,
    };
  } finally {
    lock.releaseLock();
  }
}

// ============================================================
// STUDENT TRACKING
// ============================================================
function upsertStudent_(studentName, email, day, result) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SYSTEM.SHEETS.STUDENTS);
  const data = sheet.getDataRange().getValues();
  const normalizedEmail = String(email).trim().toLowerCase();

  for (let i = 1; i < data.length; i++) {
    if (
      String(data[i][2] || "")
        .trim()
        .toLowerCase() === normalizedEmail
    ) {
      sheet.getRange(i + 1, 2).setValue(studentName);
      sheet.getRange(i + 1, 5).setValue(new Date());
      sheet.getRange(i + 1, 6).setValue(Number(data[i][5] || 0) + 1);
      sheet
        .getRange(i + 1, 7)
        .setValue(Number(data[i][6] || 0) + (result === "PASS" ? 1 : 0));
      sheet
        .getRange(i + 1, 8)
        .setValue(Number(data[i][7] || 0) + (result === "FAIL" ? 1 : 0));
      sheet.getRange(i + 1, 10).setValue(day);
      sheet.getRange(i + 1, 11).setValue(new Date());
      return;
    }
  }

  const studentId =
    "STU-" +
    Utilities.getUuid().replace(/-/g, "").substring(0, 8).toUpperCase();
  sheet.appendRow([
    studentId,
    studentName,
    email,
    new Date(),
    new Date(),
    1,
    result === "PASS" ? 1 : 0,
    result === "FAIL" ? 1 : 0,
    0,
    day,
    new Date(),
  ]);
}

function incrementStudentCertificate_(email) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SYSTEM.SHEETS.STUDENTS);
  const data = sheet.getDataRange().getValues();
  const normalizedEmail = String(email).trim().toLowerCase();

  for (let i = 1; i < data.length; i++) {
    if (
      String(data[i][2] || "")
        .trim()
        .toLowerCase() === normalizedEmail
    ) {
      sheet.getRange(i + 1, 9).setValue(Number(data[i][8] || 0) + 1);
      sheet.getRange(i + 1, 11).setValue(new Date());
      return;
    }
  }
}

// ============================================================
// CERTIFICATE ID
// ============================================================
function generateCertificateId_(day) {
  const year = new Date().getFullYear();
  const randomPart = Utilities.getUuid()
    .replace(/-/g, "")
    .substring(0, 10)
    .toUpperCase();
  return (
    "CHS-" +
    year +
    "-" +
    normalizeDayName_(day).replace("DAY_", "D") +
    "-" +
    randomPart
  );
}

// ============================================================
// VERIFICATION URL
// ============================================================
function buildVerificationUrl_(certificateId) {
  const base = String(getConfigValue_("VERIFICATION_URL") || "").trim();
  if (!base) throw new Error("VERIFICATION_URL is not configured.");
  return base + "?id=" + encodeURIComponent(certificateId);
}

// ============================================================
// CERTIFICATE DATA
// ============================================================
function buildCertificateData_(
  studentName,
  email,
  day,
  challengeTitle,
  attemptId,
) {
  const certificateId = generateCertificateId_(day);
  return {
    issueDate: new Date(),
    certificateId: certificateId,
    studentName: studentName,
    email: email,
    day: normalizeDayName_(day),
    challenge: challengeTitle,
    attemptId: attemptId,
    status: "ISSUED",
    verificationUrl: buildVerificationUrl_(certificateId),
  };
}

// ============================================================
// EXISTING CERTIFICATE CHECK
// ============================================================
function findIssuedCertificateForStudentDay_(email, day) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SYSTEM.SHEETS.CERTIFICATES);
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();

  for (let i = data.length - 1; i >= 1; i--) {
    if (
      String(data[i][3] || "")
        .trim()
        .toLowerCase() === String(email).trim().toLowerCase() &&
      normalizeDayName_(data[i][4]) === normalizeDayName_(day) &&
      String(data[i][7] || "").trim() === "ISSUED"
    ) {
      return {
        issueDate: data[i][0],
        certificateId: data[i][1],
        studentName: data[i][2],
        email: data[i][3],
        day: data[i][4],
        challenge: data[i][5],
        attemptId: data[i][6],
        status: data[i][7],
        verificationUrl: data[i][8],
        pdfFileId: data[i][9],
        pdfFileUrl: data[i][10],
        emailStatus: data[i][11],
        rowNumber: i + 1,
      };
    }
  }
  return null;
}

// ============================================================
// QR CODE
// ============================================================
function getCertificateQrBlob_(verificationUrl) {
  const qrUrl =
    "https://quickchart.io/qr?text=" +
    encodeURIComponent(verificationUrl) +
    "&size=500&margin=2&ecLevel=H";
  const response = UrlFetchApp.fetch(qrUrl, {
    method: "get",
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() !== 200)
    throw new Error("QR generation failed. HTTP " + response.getResponseCode());
  return response.getBlob().setName("certificate_qr.png");
}

function blobToBase64_(blob) {
  return Utilities.base64Encode(blob.getBytes());
}

// ============================================================
// OFFICIAL SQUAD LOGO LOADER
// ============================================================
function getSquadLogoData_() {
  const folderId = String(SYSTEM.SQUAD_LOGO_FOLDER_ID || "").trim();
  if (!folderId) return { base64: "", mimeType: "" };

  try {
    const folder = DriveApp.getFolderById(folderId);
    const files = folder.getFiles();
    let firstImage = null;

    while (files.hasNext()) {
      const file = files.next();
      const mimeType = String(file.getMimeType() || "").toLowerCase();
      if (!mimeType.startsWith("image/")) continue;
      if (!firstImage) firstImage = file;
      if (/logo/i.test(file.getName())) {
        firstImage = file;
        break;
      }
    }

    if (!firstImage) return { base64: "", mimeType: "" };
    const blob = firstImage.getBlob();
    return {
      base64: Utilities.base64Encode(blob.getBytes()),
      mimeType: String(blob.getContentType() || "image/png"),
    };
  } catch (error) {
    return { base64: "", mimeType: "" };
  }
}

// ============================================================
// FINAL CERTIFICATE DESIGN
// ============================================================
function buildCertificateHtml_(
  certificate,
  qrBase64,
  squadLogoBase64,
  squadLogoMimeType,
) {
  let issueDateStr = "";
  if (certificate && certificate.issueDate) {
    const d = new Date(certificate.issueDate);
    issueDateStr = !isNaN(d.getTime())
      ? Utilities.formatDate(d, Session.getScriptTimeZone(), "dd MMMM yyyy")
      : certificate.issueDate;
  }

  const safeLogoMimeType = /^image\//i.test(String(squadLogoMimeType || ""))
    ? String(squadLogoMimeType)
    : "image/png";
  const logoHtml = squadLogoBase64
    ? `<img src="data:${safeLogoMimeType};base64,${squadLogoBase64}" alt="CodeHack Squad Logo">`
    : `<svg viewBox="0 0 100 100" style="width:75%; height:75%;">
        <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="none" stroke="#f4d675" stroke-width="3"/>
        <text x="50%" y="45%" text-anchor="middle" fill="#00d9ff" font-family="'Cinzel', serif" font-size="12" font-weight="bold">CODE</text>
        <text x="50%" y="62%" text-anchor="middle" fill="#ffffff" font-family="'Cinzel', serif" font-size="10" font-weight="bold">HACK</text>
       </svg>`;

  const qrHtml = qrBase64
    ? `<div class="qr-container"><div class="qr-box"><img src="data:image/png;base64,${qrBase64}" alt="Verification QR Code"></div><div class="qr-badge">SCAN TO VERIFY</div></div>`
    : ``;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Great+Vibes&family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
@page { size: A4 landscape; margin: 0; }
* { box-sizing: border-box; }
html, body { width: 100%; height: 100%; margin: 0; padding: 0; background-color: #030a16; font-family: 'Montserrat', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.certificate { width: 297mm; height: 210mm; position: relative; overflow: hidden; background: radial-gradient(circle at center, #ffffff 0%, #f8f6f0 70%, #eae3d2 100%); border: 5px solid #c89628; }
.watermark { position: absolute; top: 48%; left: 50%; transform: translate(-50%, -50%); font-family: 'Cinzel', serif; font-size: 180px; font-weight: 900; color: rgba(11, 29, 52, 0.03); letter-spacing: 15px; user-select: none; z-index: 1; }
.side-panel-left { position: absolute; top: 0; left: 0; width: 55mm; height: 210mm; z-index: 2; }
.side-panel-right { position: absolute; top: 0; right: 0; width: 55mm; height: 210mm; z-index: 2; }
.outer-border { position: absolute; top: 6mm; left: 6mm; right: 6mm; bottom: 6mm; border: 1px solid #d4a62a; z-index: 3; pointer-events: none; }
.inner-border { position: absolute; top: 8.5mm; left: 8.5mm; right: 8.5mm; bottom: 8.5mm; border: 1px solid rgba(212, 166, 42, 0.4); z-index: 3; pointer-events: none; }
.corner-ornament { position: absolute; width: 20mm; height: 20mm; z-index: 10; }
.corner-tl { top: 4mm; left: 4mm; }
.corner-tr { top: 4mm; right: 4mm; transform: scaleX(-1); }
.corner-bl { bottom: 4mm; left: 4mm; transform: scaleY(-1); }
.corner-br { bottom: 4mm; right: 4mm; transform: scale(-1, -1); }
.top-header { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 150mm; height: 19mm; background: #06172b; clip-path: polygon(0 0, 100% 0, 90% 100%, 10% 100%); border-bottom: 2px solid #f4d675; text-align: center; padding-top: 3.5mm; z-index: 12; }
.brand-title { font-family: 'Cinzel', serif; font-size: 18px; font-weight: 800; letter-spacing: 4px; color: #ffffff; }
.brand-title span { color: #00d9ff; }
.brand-tagline { margin-top: 1mm; font-size: 8px; font-weight: 600; letter-spacing: 3px; color: #aeb8c5; }
.logo-badge { position: absolute; top: 11mm; left: 12mm; width: 32mm; height: 32mm; border-radius: 50%; background: radial-gradient(circle, #0b223d 0%, #040f1c 100%); border: 2px solid #d4a62a; box-shadow: 0 0 0 2px rgba(244, 214, 117, 0.4), 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; overflow: hidden; z-index: 15; }
.logo-badge img { width: 90%; height: 90%; object-fit: contain; border-radius: 50%; }
.qr-container { position: absolute; top: 11mm; right: 12mm; width: 30mm; text-align: center; z-index: 15; }
.qr-box { width: 27mm; height: 27mm; margin: 0 auto; padding: 1.5mm; background: #ffffff; border: 2px solid #d4a62a; border-radius: 2mm; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
.qr-box img { width: 100%; height: 100%; display: block; }
.qr-badge { display: inline-block; margin-top: 1.5mm; padding: 1mm 2.5mm; background: #06172b; border: 1px solid #d4a62a; border-radius: 1mm; color: #ffffff; font-size: 6.5px; font-weight: 700; letter-spacing: 1px; }
.main-content { position: absolute; top: 27mm; left: 45mm; right: 45mm; text-align: center; z-index: 10; }
.cert-title { margin: 0; font-family: 'Cinzel', serif; font-size: 36px; font-weight: 800; letter-spacing: 6px; background: linear-gradient(135deg, #8a6414 0%, #d4a62a 50%, #704e0a 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; color: #b8860b; }
.cert-subtitle { margin-top: 1mm; font-family: 'Cinzel', serif; font-size: 16px; font-weight: 700; letter-spacing: 5px; color: #9e721d; }
.title-divider { display: flex; align-items: center; justify-content: center; margin: 3.5mm auto; width: 85mm; }
.title-divider .line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, #d4a62a, transparent); }
.title-divider .diamond { color: #d4a62a; font-size: 9px; margin: 0 2mm; }
.challenge-badge { display: inline-block; font-size: 10px; font-weight: 800; letter-spacing: 3px; color: #0b1d34; text-transform: uppercase; }
.presented-to { margin-top: 5mm; font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 500; color: #5a6578; letter-spacing: 0.5px; }
.student-name { margin-top: 2mm; font-family: 'Great Vibes', cursive; font-size: 52px; color: #07192f; line-height: 1.1; }
.student-underline { width: 115mm; height: 1px; margin: 2mm auto 0 auto; background: linear-gradient(90deg, transparent, #d4a62a, transparent); }
.description-text { width: 175mm; margin: 4.5mm auto 0 auto; font-family: 'Montserrat', sans-serif; font-size: 12px; line-height: 1.55; color: #4a5568; font-weight: 500; }
.challenge-box-wrapper { margin-top: 5mm; display: flex; justify-content: center; }
.challenge-box { width: 135mm; padding: 2.8mm 8mm; background: #06172b; clip-path: polygon(3% 0%, 97% 0%, 100% 50%, 97% 100%, 3% 100%, 0% 50%); border-top: 1.5px solid #f4d675; border-bottom: 1.5px solid #f4d675; }
.challenge-label { font-size: 8px; font-weight: 700; color: #a1b0c4; letter-spacing: 2.5px; }
.challenge-title { font-family: 'Cinzel', serif; font-size: 17px; font-weight: 700; color: #f4d675; margin-top: 0.8mm; letter-spacing: 1.5px; }
.bottom-panel { position: absolute; left: 0; right: 0; bottom: 0; height: 44mm; background: #051426; clip-path: polygon(0 22%, 50% 0, 100% 22%, 100% 100%, 0 100%); z-index: 5; }
.bottom-gold-wave { position: absolute; left: 0; right: 0; bottom: 43mm; height: 2mm; background: linear-gradient(90deg, #c89628, #f4d675, #c89628); clip-path: polygon(0 0, 50% 100%, 100% 0, 100% 50%, 50% 100%, 0 50%); z-index: 6; }
.info-block { position: absolute; left: 18mm; bottom: 14mm; z-index: 12; color: #ffffff; font-size: 9px; text-align: left; }
.info-item { display: flex; align-items: center; margin-bottom: 1.8mm; }
.info-icon { width: 3.8mm; height: 3.8mm; margin-right: 2.5mm; fill: #d4a62a; }
.info-label { color: #8c9bae; font-size: 7.5px; text-transform: uppercase; letter-spacing: 1px; display: block; }
.info-val-id { color: #00d9ff; font-weight: 700; font-size: 9px; font-family: monospace; }
.info-val-text { color: #ffffff; font-weight: 700; font-size: 9px; }
.seal-wrapper { position: absolute; left: 50%; bottom: 17mm;  transform: translateX(-50%); z-index: 15; text-align: center; }
.seal-ribbon-tails { position: absolute; bottom: -4mm; left: 50%; transform: translateX(-50%); width: 26mm; height: 12mm; z-index: 1; }
.seal-badge { position: relative; width: 27mm; height: 27mm; border-radius: 50%; background: radial-gradient(circle, #0b223d 0%, #040f1c 100%); border: 2px solid #d4a62a; box-shadow: 0 0 0 2px #f4d675, inset 0 0 6px rgba(244, 214, 117, 0.4); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 2; margin: 0 auto; }
.seal-crown { width: 6.5mm; height: 4.5mm; fill: #f4d675; }
.seal-text { font-family: 'Cinzel', serif; font-size: 5.8px; font-weight: 800; color: #ffffff; letter-spacing: 1px; margin-top: 0.5mm; line-height: 1.1; }
.seal-stars { color: #f4d675; font-size: 6.5px; margin-top: 0.5mm; }
.signature-block { position: absolute; right: 18mm; bottom: 14mm; width: 55mm; text-align: center; z-index: 12; }
.signature-img-text { font-family: 'Great Vibes', cursive; font-size: 27px; color: #ffffff; line-height: 1; }
.signature-line { width: 48mm; height: 1px; background: linear-gradient(90deg, transparent, #d4a62a, transparent); margin: 1.8mm auto; }
.signature-title { font-family: 'Cinzel', serif; font-size: 9px; font-weight: 800; color: #ffffff; letter-spacing: 1.8px; }
.signature-subtitle { font-size: 7.5px; color: #909dae; letter-spacing: 1px; margin-top: 0.8mm; }
.footer-credit { position: absolute; left: 0; right: 0; bottom: 3.5mm; text-align: center; font-size: 8.5px; color: #c0cddc; letter-spacing: 1.2px; z-index: 15; }
.footer-credit strong { color: #f4d675; font-weight: 700; }
</style>
</head>
<body>
<div class="certificate">
  <div class="watermark">CHS</div>
  <div class="outer-border"></div>
  <div class="inner-border"></div>
  <svg class="corner-ornament corner-tl" viewBox="0 0 100 100"><path d="M5,5 L40,5 L40,9 L9,9 L9,40 L5,40 Z" fill="#d4a62a"/><path d="M15,15 L30,15 L30,17 L17,17 L17,30 L15,30 Z" fill="#f4d675"/><circle cx="8" cy="8" r="3" fill="#d4a62a"/></svg>
  <svg class="corner-ornament corner-tr" viewBox="0 0 100 100"><path d="M5,5 L40,5 L40,9 L9,9 L9,40 L5,40 Z" fill="#d4a62a"/><path d="M15,15 L30,15 L30,17 L17,17 L17,30 L15,30 Z" fill="#f4d675"/><circle cx="8" cy="8" r="3" fill="#d4a62a"/></svg>
  <svg class="corner-ornament corner-bl" viewBox="0 0 100 100"><path d="M5,5 L40,5 L40,9 L9,9 L9,40 L5,40 Z" fill="#d4a62a"/><path d="M15,15 L30,15 L30,17 L17,17 L17,30 L15,30 Z" fill="#f4d675"/><circle cx="8" cy="8" r="3" fill="#d4a62a"/></svg>
  <svg class="corner-ornament corner-br" viewBox="0 0 100 100"><path d="M5,5 L40,5 L40,9 L9,9 L9,40 L5,40 Z" fill="#d4a62a"/><path d="M15,15 L30,15 L30,17 L17,17 L17,30 L15,30 Z" fill="#f4d675"/><circle cx="8" cy="8" r="3" fill="#d4a62a"/></svg>
  <svg class="side-panel-left" viewBox="0 0 100 400" preserveAspectRatio="none"><polygon points="0,0 60,0 15,180 80,400 0,400" fill="#06172b"/><polygon points="60,0 65,0 20,180 85,400 80,400 15,180" fill="#d4a62a"/></svg>
  <svg class="side-panel-right" viewBox="0 0 100 400" preserveAspectRatio="none"><polygon points="100,0 40,0 85,180 20,400 100,400" fill="#06172b"/><polygon points="40,0 35,0 80,180 15,400 20,400 85,180" fill="#d4a62a"/></svg>
  <div class="top-header">
    <div class="brand-title">CODEHACK <span>SQUAD</span></div>
    <div class="brand-tagline">CODE • BUILD • SOLVE • GROW</div>
  </div>
  <div class="logo-badge">${logoHtml}</div>
  ${qrHtml}
  <div class="main-content">
    <h1 class="cert-title">CERTIFICATE</h1>
    <div class="cert-subtitle">OF ACHIEVEMENT</div>
    <div class="title-divider"><div class="line"></div><div class="diamond">◆</div><div class="line"></div></div>
    <div class="challenge-badge">◆ PYTHON DAILY CHALLENGE ◆</div>
    <div class="presented-to">This certificate is proudly presented to</div>
    <div class="student-name">${escapeHtml_(certificate.studentName)}</div>
    <div class="student-underline"></div>
    <div class="description-text">for successfully completing the Python challenge and passing all required hidden test cases. Your dedication, problem-solving skills and consistency have made you a valuable part of the CodeHack Squad community.</div>
    <div class="challenge-box-wrapper"><div class="challenge-box"><div class="challenge-label">COMPLETED CHALLENGE</div><div class="challenge-title">${escapeHtml_(certificate.challenge)}</div></div></div>
  </div>
  <div class="bottom-gold-wave"></div>
  <div class="bottom-panel"></div>
  <div class="info-block">
    <div class="info-item"><svg class="info-icon" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v2H7zm0 4h2v2H7zm4-4h6v2h-6zm0 4h6v2h-6z"/></svg><div><span class="info-label">Certificate ID</span><span class="info-val-id">${escapeHtml_(certificate.certificateId)}</span></div></div>
    <div class="info-item"><svg class="info-icon" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg><div><span class="info-label">Challenge Day</span><span class="info-val-text">${escapeHtml_(certificate.day)}</span></div></div>
    <div class="info-item"><svg class="info-icon" viewBox="0 0 24 24"><path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/></svg><div><span class="info-label">Issue Date</span><span class="info-val-text">${escapeHtml_(issueDateStr)}</span></div></div>
  </div>
  <div class="seal-wrapper">
    <svg class="seal-ribbon-tails" viewBox="0 0 100 50"><polygon points="30,0 15,50 35,40 45,50 42,0" fill="#c89628"/><polygon points="58,0 55,50 65,40 85,50 70,0" fill="#a87618"/></svg>
    <div class="seal-badge">
      <svg class="seal-crown" viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>
      <div class="seal-text">CODEHACK<br>SQUAD</div>
      <div class="seal-stars">★ ★ ★</div>
    </div>
  </div>
  <div class="signature-block">
    <div class="signature-img-text">Sorif Hossain</div>
    <div class="signature-line"></div>
    <div class="signature-title">FOUNDER</div>
    <div class="signature-subtitle">Code Hack With Sorif</div>
  </div>
  <div class="footer-credit">Computer Generated Certificate, Powered by <strong>Code Hack With Sorif</strong></div>
</div>
</body>
</html>`;
}

// ============================================================
// HTML → PDF
// ============================================================
function htmlToPdf_(html, fileName) {
  const htmlBlob = Utilities.newBlob(
    html,
    MimeType.HTML,
    fileName.replace(/\.pdf$/i, ".html"),
  );
  return htmlBlob.getAs(MimeType.PDF).setName(fileName);
}

// ============================================================
// GOOGLE DRIVE CERTIFICATE ARCHIVE
// ============================================================
function getCertificateArchiveFolder_() {
  const configuredId = getConfigValue_("CERTIFICATE_FOLDER_ID");
  if (configuredId) {
    try {
      return DriveApp.getFolderById(String(configuredId));
    } catch (error) {}
  }
  const folders = DriveApp.getFoldersByName("CodeHack Squad Certificates");
  const folder = folders.hasNext()
    ? folders.next()
    : DriveApp.createFolder("CodeHack Squad Certificates");
  updateConfigValue_("CERTIFICATE_FOLDER_ID", folder.getId());
  return folder;
}

// ============================================================
// SAVE CERTIFICATE RECORD
// ============================================================
function saveCertificateRecord_(certificate, pdfFile) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SYSTEM.SHEETS.CERTIFICATES);
  if (!sheet) throw new Error("CERTIFICATES sheet not found.");

  sheet.appendRow([
    certificate.issueDate,
    certificate.certificateId,
    certificate.studentName,
    certificate.email,
    certificate.day,
    certificate.challenge,
    certificate.attemptId,
    certificate.status,
    certificate.verificationUrl,
    pdfFile ? pdfFile.getId() : "",
    pdfFile ? pdfFile.getUrl() : "",
    "PENDING",
  ]);
  return sheet.getLastRow();
}

function updateCertificateEmailStatus_(certificateId, emailStatus) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SYSTEM.SHEETS.CERTIFICATES);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (
      String(data[i][1] || "")
        .trim()
        .toUpperCase() ===
      String(certificateId || "")
        .trim()
        .toUpperCase()
    ) {
      sheet.getRange(i + 1, 12).setValue(emailStatus);
      return;
    }
  }
}

// ============================================================
// MARK SUBMISSION CERTIFICATE STATUS
// ============================================================
function markSubmissionCertificateStatus_(
  attemptId,
  certificateStatus,
  certificateId,
) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;

  const sheet = ss.getSheetByName(SYSTEM.SHEETS.SUBMISSIONS);
  if (sheet) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1] || "").trim() === String(attemptId || "").trim()) {
        sheet.getRange(i + 1, 10).setValue(certificateStatus);
        break;
      }
    }
  }

  if (!certificateId) return;
  const sheets = ss.getSheets();

  for (let s = 0; s < sheets.length; s++) {
    const daySheet = sheets[s];
    if (!/^DAY_\d{2,}$/.test(daySheet.getName())) continue;

    const dayData = daySheet.getDataRange().getValues();
    for (let r = 1; r < dayData.length; r++) {
      if (
        String(dayData[r][1] || "").trim() === String(attemptId || "").trim()
      ) {
        daySheet.getRange(r + 1, 11).setValue(certificateId);
        daySheet.getRange(r + 1, 12).setValue(certificateStatus);
        return;
      }
    }
  }
}

// ============================================================
// SUCCESS EMAIL
// ============================================================
function sendCertificateEmail_(certificate, pdf) {
  const subject = "CodeHack Squad | Certificate Issued — " + certificate.day;
  const studentName = escapeHtml_(certificate.studentName);
  const challenge = escapeHtml_(certificate.challenge);
  const certificateId = escapeHtml_(certificate.certificateId);

  const emailBody = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0; padding:30px; background:#f4f6f8; font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:650px; margin:auto; background:#ffffff; border:1px solid #e1e5e9; border-radius:14px; padding:32px;">
<h2 style="margin-top:0; color:#111827;">CodeHack Squad</h2>
<p>Hello <strong>${studentName}</strong>,</p>
<p>Congratulations! Your submission for <strong>${challenge}</strong> on <strong>${escapeHtml_(certificate.day)}</strong> has successfully passed all required hidden test cases.</p>
<div style="background:#ecfdf5; border-left:4px solid #00b878; padding:18px; margin:24px 0;">
<strong style="color:#00875a;">✓ CHALLENGE PASSED</strong><br><br>Certificate ID: <strong>${certificateId}</strong>
</div>
<p>Your official certificate is attached to this email as a PDF.</p>
<p>You can verify the certificate online:</p>
<p><a href="${certificate.verificationUrl}" style="display:inline-block; padding:12px 20px; background:#00b8d4; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:bold;">Verify Certificate</a></p>
<hr style="border:none; border-top:1px solid #e5e7eb; margin:28px 0;">
<p style="font-size:13px; color:#6b7280; line-height:1.8;">Developed and Designed by <strong style="color:#00a8c6;">Code Hack With Sorif</strong><br>Official Certificate Verification System</p>
</div>
</body>
</html>`;

  const plainText =
    "Hello " +
    certificate.studentName +
    ",\n\nCongratulations! Your " +
    certificate.day +
    " Python challenge was successfully completed.\n\nCertificate ID: " +
    certificate.certificateId +
    "\n\nYour certificate PDF is attached.\n\nVerification URL:\n" +
    certificate.verificationUrl +
    "\n\nDeveloped and Designed by Code Hack With Sorif";

  MailApp.sendEmail({
    to: certificate.email,
    subject: subject,
    body: plainText,
    htmlBody: emailBody,
    attachments: [pdf],
    name: "CodeHack Squad",
  });
}

// ============================================================
// FAILURE EMAIL
// ============================================================
function sendFailureEmail_(
  studentName,
  email,
  day,
  attemptNumber,
  attemptId,
  passedCount,
  totalCount,
  reason,
) {
  const subject = "CodeHack Squad | Challenge Attempt Failed — " + day;

  const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0; padding:30px; background:#f4f6f8; font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:650px; margin:auto; background:#ffffff; border-radius:12px; padding:32px; border:1px solid #e1e5e9;">
<h2 style="margin-top:0;">CodeHack Squad</h2>
<p>Hello <strong>${escapeHtml_(studentName)}</strong>,</p>
<p>Your submission for <strong>${escapeHtml_(day)}</strong> was automatically evaluated.</p>
<div style="background:#fff3f3; border-left:4px solid #d93025; padding:16px; margin:20px 0;">
<strong style="color:#d93025;">✕ SUBMISSION FAILED</strong><br><br>Test Cases Passed: <strong>${passedCount}/${totalCount}</strong><br>Attempt: <strong>#${attemptNumber}</strong><br>Reason: <strong>${escapeHtml_(reason)}</strong>
</div>
<p>Your submitted code did not pass all required hidden test cases.</p>
<p>Please review your solution, fix the problem, and submit again through the official challenge form.</p>
<p style="color:#d93025; font-weight:bold;">No certificate will be issued for this failed attempt.</p>
<hr style="border:none; border-top:1px solid #e5e5e5; margin:28px 0;">
<p style="font-size:13px; color:#666666;">Attempt ID: <strong>${escapeHtml_(attemptId)}</strong></p>
<p style="font-size:13px; color:#666666;">Developed and Designed by <strong>Code Hack With Sorif</strong></p>
</div>
</body>
</html>`;

  const body =
    "Your CodeHack Squad submission for " +
    day +
    " did not pass all hidden test cases.\n\nTests Passed: " +
    passedCount +
    "/" +
    totalCount +
    "\nReason: " +
    reason +
    "\n\nPlease fix your code and submit again.\nNo certificate will be issued for this failed attempt.\n\nAttempt ID: " +
    attemptId;

  MailApp.sendEmail({
    to: email,
    subject: subject,
    body: body,
    htmlBody: htmlBody,
    name: "CodeHack Squad",
  });
}

// ============================================================
// SYSTEM ERROR EMAIL
// ============================================================
function sendEvaluationErrorEmail_(studentName, email, day) {
  try {
    MailApp.sendEmail({
      to: email,
      subject: "CodeHack Squad | Temporary Evaluation Issue — " + day,
      body:
        "Hello " +
        studentName +
        ",\n\nYour submission could not be evaluated because the automated judging system encountered a temporary technical issue.\n\nYour submission has NOT been marked as a failed attempt and no certificate has been issued.\n\nPlease wait and contact the CodeHack Squad administrator rather than repeatedly resubmitting the same code.\n\nDeveloped and Designed by Code Hack With Sorif",
      name: "CodeHack Squad",
    });
  } catch (error) {}
}

function sendAdminAlert_(subject, message) {
  const adminEmail = String(getConfigValue_("ADMIN_EMAIL") || "").trim();
  if (!adminEmail) return;
  try {
    MailApp.sendEmail({
      to: adminEmail,
      subject: subject,
      body: message,
      name: "CodeHack Squad Automation",
    });
  } catch (error) {}
}

// ============================================================
// COMPLETE CERTIFICATE PIPELINE
// ============================================================
function issueAndSendCertificate_(studentName, email, day, attemptId) {
  const challengeTitle = getChallengeTitle_(day);
  const certificate = buildCertificateData_(
    studentName,
    email,
    day,
    challengeTitle,
    attemptId,
  );
  const qrBlob = getCertificateQrBlob_(certificate.verificationUrl);
  const qrBase64 = blobToBase64_(qrBlob);
  const squadLogo = getSquadLogoData_();
  const html = buildCertificateHtml_(
    certificate,
    qrBase64,
    squadLogo.base64,
    squadLogo.mimeType,
  );
  const fileName =
    "CodeHack_Squad_" +
    certificate.day +
    "_" +
    certificate.certificateId +
    ".pdf";
  const pdf = htmlToPdf_(html, fileName);
  const folder = getCertificateArchiveFolder_();
  const pdfFile = folder.createFile(pdf);

  saveCertificateRecord_(certificate, pdfFile);
  incrementStudentCertificate_(email);
  markSubmissionCertificateStatus_(
    attemptId,
    "ISSUED",
    certificate.certificateId,
  );

  try {
    sendCertificateEmail_(certificate, pdf);
    updateCertificateEmailStatus_(certificate.certificateId, "SENT");
  } catch (emailError) {
    updateCertificateEmailStatus_(certificate.certificateId, "FAILED");
    sendAdminAlert_(
      "Certificate Email Failed | " + certificate.certificateId,
      emailError.toString() +
        "\n\nStudent: " +
        certificate.studentName +
        "\nEmail: " +
        certificate.email +
        "\nCertificate: " +
        certificate.certificateId,
    );
  }

  return {
    certificateId: certificate.certificateId,
    verificationUrl: certificate.verificationUrl,
    fileName: fileName,
    pdfFileId: pdfFile.getId(),
    pdfFileUrl: pdfFile.getUrl(),
  };
}

// ============================================================
// CERTIFICATE ISSUANCE WITH DUPLICATE + RESEND PROTECTION
// ============================================================
function issueCertificateOnce_(studentName, email, day, attemptId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const existingCertificate = findIssuedCertificateForStudentDay_(email, day);

    if (existingCertificate) {
      const emailStatus = String(existingCertificate.emailStatus || "")
        .trim()
        .toUpperCase();
      if (
        (emailStatus === "FAILED" || emailStatus === "PENDING") &&
        existingCertificate.pdfFileId
      ) {
        try {
          resendCertificateEmail(existingCertificate.certificateId);
        } catch (resendError) {}
      }
      markSubmissionCertificateStatus_(
        attemptId,
        "ALREADY_ISSUED",
        existingCertificate.certificateId,
      );
      return {
        attemptId: attemptId,
        result: "PASS",
        certificateStatus: "ALREADY_ISSUED",
        certificateId: existingCertificate.certificateId,
      };
    }

    const certificate = issueAndSendCertificate_(
      studentName,
      email,
      day,
      attemptId,
    );
    return {
      attemptId: attemptId,
      result: "PASS",
      certificateId: certificate.certificateId,
      verificationUrl: certificate.verificationUrl,
    };
  } finally {
    lock.releaseLock();
  }
}

// ============================================================
// REAL FORM SUBMISSION HANDLER
// ============================================================
function handleSubmission(e) {
  if (!e || !e.namedValues) throw new Error("Invalid form submission event.");

  const activeDay = normalizeDayName_(getConfigValue_("ACTIVE_DAY"));
  if (!activeDay) throw new Error("ACTIVE_DAY is not configured.");

  const responses = e.namedValues;
  const studentName = getFormValue_(responses, "Full Name");
  const email = getFormValue_(responses, "Email Address");
  const sourceCode = getFormValue_(responses, "Python Code");

  if (!studentName) throw new Error("Student name is missing.");
  if (!email) throw new Error("Student email is missing.");
  if (!sourceCode) throw new Error("Python code is missing.");

  let judgeResult;
  try {
    judgeResult = judgePythonChallenge_(sourceCode, activeDay);
  } catch (judgeError) {
    sendEvaluationErrorEmail_(studentName, email, activeDay);
    sendAdminAlert_(
      "Judge0 Evaluation Error",
      judgeError.toString() +
        "\n\nStudent: " +
        studentName +
        "\nEmail: " +
        email +
        "\nDay: " +
        activeDay,
    );
    return { result: "SYSTEM_ERROR" };
  }

  const record = recordSubmission_(
    studentName,
    email,
    activeDay,
    sourceCode,
    judgeResult,
  );

  if (!judgeResult.passed) {
    const reason = getJudgeFailureReason_(judgeResult);
    try {
      sendFailureEmail_(
        studentName,
        email,
        activeDay,
        record.attemptNumber,
        record.attemptId,
        judgeResult.passedCount,
        judgeResult.totalCount,
        reason,
      );
    } catch (emailError) {}
    return record;
  }

  try {
    return issueCertificateOnce_(
      studentName,
      email,
      activeDay,
      record.attemptId,
    );
  } catch (certificateError) {
    sendEvaluationErrorEmail_(studentName, email, activeDay);
    sendAdminAlert_(
      "Certificate Generation Error",
      certificateError.toString() +
        "\n\nStudent: " +
        studentName +
        "\nEmail: " +
        email +
        "\nDay: " +
        activeDay,
    );
    return {
      attemptId: record.attemptId,
      result: "PASS",
      certificateStatus: "GENERATION_ERROR",
    };
  }
}

// ============================================================
// VERIFICATION WEB APP
// ============================================================
function doGet(e) {
  const certificateId =
    e && e.parameter && e.parameter.id ? String(e.parameter.id).trim() : "";
  if (!certificateId)
    return HtmlService.createHtmlOutput(
      buildVerificationPage_(null, "NO_CERTIFICATE_ID"),
    ).setTitle("Certificate Verification");

  const certificate = findCertificateById_(certificateId);
  if (!certificate)
    return HtmlService.createHtmlOutput(
      buildVerificationPage_(null, "INVALID"),
    ).setTitle("Certificate Verification");

  const status = String(certificate.status || "")
    .trim()
    .toUpperCase();
  if (status === "REVOKED")
    return HtmlService.createHtmlOutput(
      buildVerificationPage_(certificate, "REVOKED"),
    ).setTitle("Certificate Verification");
  if (status !== "ISSUED")
    return HtmlService.createHtmlOutput(
      buildVerificationPage_(certificate, "INVALID"),
    ).setTitle("Certificate Verification");

  return HtmlService.createHtmlOutput(
    buildVerificationPage_(certificate, "VALID"),
  ).setTitle("Certificate Verification");
}

function findCertificateById_(certificateId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SYSTEM.SHEETS.CERTIFICATES);
  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  const target = String(certificateId).trim().toUpperCase();

  for (let i = 1; i < data.length; i++) {
    if (
      String(data[i][1] || "")
        .trim()
        .toUpperCase() === target
    ) {
      return {
        issueDate: data[i][0],
        certificateId: data[i][1],
        studentName: data[i][2],
        email: data[i][3],
        day: data[i][4],
        challenge: data[i][5],
        attemptId: data[i][6],
        status: data[i][7],
        verificationUrl: data[i][8],
        pdfFileId: data[i][9],
        pdfFileUrl: data[i][10],
        emailStatus: data[i][11],
      };
    }
  }
  return null;
}

function buildVerificationPage_(certificate, status) {
  let content = "";
  if (status === "VALID") {
    const issueDate = certificate.issueDate
      ? Utilities.formatDate(
          new Date(certificate.issueDate),
          Session.getScriptTimeZone(),
          "dd MMMM yyyy",
        )
      : "N/A";
    content = `
      <div class="status valid">✓ VALID CERTIFICATE</div>
      <div class="details">
        <div class="row"><span>Certificate ID</span><strong>${escapeHtml_(certificate.certificateId)}</strong></div>
        <div class="row"><span>Student Name</span><strong>${escapeHtml_(certificate.studentName)}</strong></div>
        <div class="row"><span>Challenge</span><strong>${escapeHtml_(certificate.challenge)}</strong></div>
        <div class="row"><span>Day</span><strong>${escapeHtml_(certificate.day)}</strong></div>
        <div class="row"><span>Issue Date</span><strong>${escapeHtml_(issueDate)}</strong></div>
        <div class="row"><span>Status</span><strong>ISSUED</strong></div>
      </div>`;
  } else if (status === "REVOKED") {
    content = `<div class="status revoked">✕ CERTIFICATE REVOKED</div><p class="message">This certificate has been marked as revoked in the official CodeHack Squad certificate database.</p>`;
  } else if (status === "INVALID") {
    content = `<div class="status invalid">✕ INVALID CERTIFICATE</div><p class="message">The certificate ID provided could not be verified in the CodeHack Squad certificate database.</p>`;
  } else {
    content = `<div class="status invalid">⚠ CERTIFICATE ID REQUIRED</div><p class="message">Please scan a valid certificate QR code or provide a certificate verification link.</p>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Certificate Verification</title>
<style>
* { box-sizing:border-box; }
body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; background: radial-gradient(circle at top, #182033 0%, #080b12 45%, #030406 100%); font-family: Arial, Helvetica, sans-serif; color:#ffffff; }
.container { width:100%; max-width:720px; background: rgba(15, 20, 31, 0.96); border: 1px solid rgba(0, 220, 255, 0.25); border-radius:20px; padding:38px; box-shadow: 0 20px 70px rgba(0, 0, 0, 0.55); }
.brand { text-align:center; margin-bottom:30px; }
.brand h1 { margin:0; font-size:27px; letter-spacing:2px; color:#00d9ff; }
.brand p { margin-top:9px; color:#9da8b8; font-size:14px; }
.title { text-align:center; font-size:20px; font-weight:bold; letter-spacing:1px; margin-bottom:24px; }
.status { text-align:center; padding:15px; border-radius:10px; font-weight:bold; margin-bottom:24px; }
.valid { background: rgba(0, 220, 150, 0.12); color:#00e59a; border: 1px solid rgba(0, 229, 154, 0.3); }
.invalid, .revoked { background: rgba(255, 70, 70, 0.12); color:#ff6b6b; border: 1px solid rgba(255, 107, 107, 0.3); }
.details { border: 1px solid rgba(255, 255, 255, 0.08); border-radius:12px; overflow:hidden; }
.row { display:flex; justify-content:space-between; gap:20px; padding:16px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.07); }
.row:last-child { border-bottom:none; }
.row span { color:#8f9aaa; }
.row strong { text-align:right; color:#ffffff; }
.message { text-align:center; color:#aeb7c5; line-height:1.7; }
.footer { text-align:center; margin-top:35px; padding-top:20px; border-top: 1px solid rgba(255, 255, 255, 0.08); color:#7f8998; font-size:12px; line-height:1.8; }
.footer strong { color:#00d9ff; font-size:17px; font-weight:700; letter-spacing:0.4px; }
.footer span { color:#7f8998; font-size:12px; }
@media(max-width:600px) { .container { padding: 25px 18px; } .brand h1 { font-size:22px; } .row { flex-direction:column; gap:6px; } .row strong { text-align:left; } }
</style>
</head>
<body>
<div class="container">
  <div class="brand"><h1>CODEHACK SQUAD</h1><p>Official Certificate Verification</p></div>
  <div class="title">CERTIFICATE VERIFICATION</div>
  ${content}
  <div class="footer">Developed and Designed by <strong>Code Hack With Sorif</strong><br><span>Official Certificate Verification System</span></div>
</div>
</body>
</html>`;
}

// ============================================================
// CERTIFICATE REVOKE
// ============================================================
function revokeCertificate(certificateId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SYSTEM.SHEETS.CERTIFICATES);
  const data = sheet.getDataRange().getValues();
  const target = String(certificateId).trim().toUpperCase();

  for (let i = 1; i < data.length; i++) {
    if (
      String(data[i][1] || "")
        .trim()
        .toUpperCase() === target
    ) {
      sheet.getRange(i + 1, 8).setValue("REVOKED");
      return "Certificate revoked: " + certificateId;
    }
  }
  throw new Error("Certificate not found: " + certificateId);
}

// ============================================================
// RESEND EXISTING CERTIFICATE
// ============================================================
function resendCertificateEmail(certificateId) {
  const certificate = findCertificateById_(certificateId);
  if (!certificate) throw new Error("Certificate not found.");
  if (!certificate.pdfFileId)
    throw new Error("PDF archive not found for this certificate.");

  const file = DriveApp.getFileById(certificate.pdfFileId);
  sendCertificateEmail_(certificate, file.getBlob());
  updateCertificateEmailStatus_(certificate.certificateId, "RESENT");
  return "Certificate email resent successfully.";
}

// ============================================================
// AUTHORIZATION HELPER
// ============================================================
function authorizeSystem() {
  const judgeUrl = getConfigValue_("JUDGE0_URL");
  if (!judgeUrl) throw new Error("JUDGE0_URL is missing.");

  const response = UrlFetchApp.fetch(
    String(judgeUrl).replace(/\/+$/, "") + "/languages/",
    { method: "get", muteHttpExceptions: true, headers: getJudge0Headers_() },
  );
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300)
    throw new Error("Judge0 authorization check failed.");

  MailApp.getRemainingDailyQuota();
  getCertificateArchiveFolder_();
  Logger.log("SYSTEM AUTHORIZATION COMPLETE");
}

// ============================================================
// TESTS
// ============================================================
function testPythonExecution() {
  return runJudge0Case_("n = int(input())\nprint(n * n)", "5", "25");
}

function testFlexibleOutput() {
  return runJudge0Case_(
    'N = int(input("Enter an integer : "))\nsquare = N * N\nprint("square =", square)',
    "5",
    "25",
  );
}

function testHiddenJudge() {
  return judgePythonChallenge_("n = int(input())\nprint(n * n)", "DAY_01");
}

function testFullCertificatePipeline() {
  return issueAndSendCertificate_(
    "Full Pipeline Test Student",
    "[YOUR_TEST_EMAIL_HERE]",
    "DAY_01",
    "DAY_01-FULL-TEST-XXXXXXXXXX",
  );
}

// ============================================================
// UTILITY
// ============================================================
function escapeHtml_(value) {
  if (value === null || value === undefined) return "";
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setVerificationUrl() {
  const url = "[YOUR_WEB_APP_URL_HERE]";
  updateConfigValue_("VERIFICATION_URL", url);
  return "Verification URL saved successfully.";
}
