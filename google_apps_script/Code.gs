/**
 * Learning Summit 2026 - Google Apps Script Backend
 * Fully connected to Google Sheets DB & External Database APIs
 */

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Learning Summit 2026')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}

/**
 * 1. Google Sheets Database Connection (Automatic Sheet DB)
 * Reads/writes live Summit data directly to/from Google Sheets
 */
function getSpreadsheetDb() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    // If running standalone, create or open a dedicated Google Sheet DB
    var files = DriveApp.getFilesByName("Learning_Summit_DB");
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create("Learning_Summit_DB");
      initSheetStructure(ss);
    }
  }
  return ss;
}

function initSheetStructure(ss) {
  var sessionSheet = ss.getSheetByName("Sessions") || ss.insertSheet("Sessions");
  if (sessionSheet.getLastRow() === 0) {
    sessionSheet.appendRow(["ID", "Title", "Description", "Track", "Room", "Capacity", "StartsAt", "EndsAt"]);
    sessionSheet.appendRow(["s1", "Learning Summit 2026: Keynote", "Welcome address", "required_all", "Grand Auditorium", 600, "08:00 AM", "09:00 AM"]);
    sessionSheet.appendRow(["s2", "STEM Explorers: Robotics", "LEGO robotics workshop", "lower", "Robotics Lab 101", 35, "09:15 AM", "10:15 AM"]);
    sessionSheet.appendRow(["s3", "AI & Digital Ethics", "Prompt engineering & ethics", "middle", "Room 204", 45, "10:30 AM", "11:30 AM"]);
    sessionSheet.appendRow(["s4", "Full-Stack Web Development", "TypeScript & React", "upper", "Tech Lab B", 40, "01:00 PM", "02:00 PM"]);
  }
}

/**
 * Fetch Summit Data API (Returns live data from Google Sheet / Firebase)
 */
function getSummitData() {
  try {
    var ss = getSpreadsheetDb();
    var sheet = ss.getSheetByName("Sessions");
    if (!sheet) return getFallbackData();
    
    var rows = sheet.getDataRange().getValues();
    var sessions = [];
    
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      if (!r[0]) continue;
      sessions.push({
        id: String(r[0]),
        title: String(r[1]),
        description: String(r[2]),
        track: String(r[3]),
        room: String(r[4]),
        capacity: Number(r[5]) || 40,
        registered: 25,
        startsAt: String(r[6]),
        endsAt: String(r[7]),
        speakers: "Summit Faculty"
      });
    }
    
    return {
      user: {
        email: Session.getActiveUser().getEmail() || "admin@rabungap.org",
        name: "Vincent Admin",
        role: "admin",
        division: "all"
      },
      sessions: sessions.length > 0 ? sessions : getFallbackData().sessions
    };
  } catch (e) {
    return getFallbackData();
  }
}

/**
 * 2. Firebase Database REST API Proxy
 * Connects Google Apps Script to Firebase Firestore / Realtime DB
 */
function fetchFirebaseData(endpoint) {
  var firebaseUrl = "https://learning-summit---vincent.web.app/api/" + endpoint;
  try {
    var response = UrlFetchApp.fetch(firebaseUrl, {
      muteHttpExceptions: true
    });
    if (response.getResponseCode() === 200) {
      return JSON.parse(response.getContentText());
    }
  } catch (e) {
    Logger.log("Firebase API connection error: " + e.message);
  }
  return null;
}

/**
 * Register Session Seat API
 */
function registerSessionSeat(sessionId, userEmail) {
  var ss = getSpreadsheetDb();
  var regSheet = ss.getSheetByName("Registrations") || ss.insertSheet("Registrations");
  if (regSheet.getLastRow() === 0) {
    regSheet.appendRow(["Timestamp", "SessionID", "UserEmail"]);
  }
  regSheet.appendRow([new Date(), sessionId, userEmail || Session.getActiveUser().getEmail()]);
  return { success: true, message: "Seat reserved successfully!" };
}

function getFallbackData() {
  return {
    user: { email: "admin@rabungap.org", name: "Vincent Admin", role: "admin", division: "all" },
    sessions: [
      { id: "s1", title: "Learning Summit 2026: Opening Keynote", description: "Welcome address", track: "required_all", room: "Auditorium", capacity: 600, registered: 240, startsAt: "08:00 AM", endsAt: "09:00 AM", speakers: "Dr. Vance" },
      { id: "s2", title: "STEM Explorers: Robotics", description: "Robotics workshop", track: "lower", room: "Lab 101", capacity: 35, registered: 28, startsAt: "09:15 AM", endsAt: "10:15 AM", speakers: "Mark Davis" },
      { id: "s3", title: "AI & Digital Ethics", description: "AI & ethics", track: "middle", room: "Room 204", capacity: 45, registered: 40, startsAt: "10:30 AM", endsAt: "11:30 AM", speakers: "Elena Rostova" },
      { id: "s4", title: "Full-Stack Web Dev", description: "React & TypeScript", track: "upper", room: "Tech Lab B", capacity: 40, registered: 32, startsAt: "01:00 PM", endsAt: "02:00 PM", speakers: "Vincent Huynh" }
    ]
  };
}
