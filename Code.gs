var HEADER_ROW     = 2;
var DATA_START_ROW = 3;

var SPECIAL_HEADERS = {
  no:      "no.",
  hei:     "higher education institution",
  program: "program",
  major:   "major",           // <--- ADDED THIS
  agency:  "accrediting agency",
  status:  "level/status",
  date:    "date of validity",
  files:   "file"
};

function testRun() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  Logger.log("Sheet: " + ss.getName());
  Logger.log("getLastColumn(): " + sheet.getLastColumn());
  Logger.log("getMaxColumns(): " + sheet.getMaxColumns());
  var headers = readHeaderLabels(sheet);
  Logger.log("Headers found (" + headers.length + "): " + JSON.stringify(headers));
}

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile("Schoolview")
    .setTitle("Accredited List of Programs in Region X")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function readHeaderLabels(sheet) {
  var allCols  = sheet.getMaxColumns();
  var raw      = sheet.getRange(HEADER_ROW, 1, 1, allCols).getValues()[0];
  var lastUsed = 0;
  for (var i = 0; i < raw.length; i++) {
    if (String(raw[i] || "").trim() !== "") lastUsed = i + 1;
  }
  return raw.slice(0, lastUsed).map(function(h){ return String(h || "").trim(); });
}

function buildIDX(labels) {
  // Added major:-1 to the initial object
  var idx = { no:-1, hei:-1, program:-1, major:-1, agency:-1, status:-1, date:-1, files:-1 };
  
  labels.forEach(function(label, i) {
    var l = String(label || "").toLowerCase().trim();
    if      (l === SPECIAL_HEADERS.no)                idx.no      = i;
    else if (l === SPECIAL_HEADERS.hei)               idx.hei     = i;
    else if (l === SPECIAL_HEADERS.program)           idx.program = i;
    else if (l === SPECIAL_HEADERS.major)             idx.major   = i; // <--- ADDED THIS
    else if (l === SPECIAL_HEADERS.agency)            idx.agency  = i;
    else if (l === SPECIAL_HEADERS.status)            idx.status  = i;
    else if (l === SPECIAL_HEADERS.date)              idx.date    = i;
    else if (l.indexOf(SPECIAL_HEADERS.files) > -1)   idx.files   = i;
  });
  return idx;
}

function getAllRecords() {
  var ss      = SpreadsheetApp.getActiveSpreadsheet();
  var sheet   = ss.getSheets()[0];
  var lastRow = sheet.getLastRow();

  if (lastRow < DATA_START_ROW) return { labels: [], idx: {}, records: [] };

  var labels  = readHeaderLabels(sheet);
  var lastCol = labels.length;

  if (lastCol < 1) return { labels: [], idx: {}, records: [] };

  var idx     = buildIDX(labels);
  var numRows = lastRow - DATA_START_ROW + 1;
  var values  = sheet.getRange(DATA_START_ROW, 1, numRows, lastCol).getValues();

  var records = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    if (idx.hei < 0 || !row[idx.hei]) continue;

    var cols = row.map(function(cell, ci) {
      if (ci === idx.date)  return formatDate(cell);
      if (ci === idx.files) return cell;
      return String(cell == null ? "" : cell);
    });

    records.push({
      cols:  cols,
      files: idx.files >= 0 ? parseLinks(row[idx.files]) : [],
      date:  idx.date  >= 0 ? cols[idx.date]             : ""
    });
  }

  return { labels: labels, idx: idx, records: records };
}

function formatDate(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "MMMM dd, yyyy");
  }
  var str = String(value).trim();
  if (!str || str === "NaN") return "";
  var parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, Session.getScriptTimeZone(), "MMMM dd, yyyy");
  }
  return str;
}

function parseLinks(value) {
  if (!value) return [];
  var str = String(value).trim();
  if (!str) return [];
  var links = [];
  str.split(",").forEach(function(part) {
    var url = part.trim();
    if (url.indexOf("http") === 0) links.push(url);
  });
  return links;
}
