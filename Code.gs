/**
 * Ticket Scan Backend (Google Apps Script)
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet.
 * 2. Rename 'Sheet1' if needed, but this script uses 'Sheet1' by default.
 * 3. Add Headers in Row 1: ID Ticket | Nama | Kelas | Seat | isScan | scanned_at | isPrinted | printed_at
 * 4. Extensions > Apps Script > Paste this code.
 * 5. Deploy > New Deployment > Type: Web App > Execute as: Me > Who has access: Anyone.
 * 6. Copy the Web App URL and paste it into the Frontend 'apiURL' variable.
 */

// Configuration
var SHEET_NAME = "Sheet1";

function doGet(e) {
  return ContentService.createTextOutput("Backend Ticket Scan is Running. Use POST requests for actions.");
}

function doPost(e) {
  try {
    var params = JSON.parse(e.postData.contents);
    var action = params.action;
    var id = params.id;
    
    if (!action || !id) {
      return jsonResponse({ status: "error", message: "Missing action or ID" });
    }
    
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;
    
    // Find row by ID (Assuming ID is in column 1 -> index 0)
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == id) {
        rowIndex = i;
        break;
      }
    }
    
    if (rowIndex == -1) {
      return jsonResponse({ status: "error", message: "Ticket ID not found" });
    }
    
    // Column Indices (0-based from getValues, but getRange is 1-based)
    // ID(0), Nama(1), Kelas(2), Seat(3), isScan(4), scanned_at(5), isPrinted(6), printed_at(7)
    
    var rowNum = rowIndex + 1;
    
    if (action === "scan") {
      var isAlreadyScanned = data[rowIndex][4]; // Column E
      var scannedAt = data[rowIndex][5]; // Column F
      
      if (isAlreadyScanned === true || isAlreadyScanned === "TRUE") {
        return jsonResponse({
          status: "success",
          message: "Ticket already used",
          data: {
            id: data[rowIndex][0],
            nama: data[rowIndex][1],
            kelas: data[rowIndex][2],
            seat: data[rowIndex][3],
            isScan: true,
            scanned_at: scannedAt ? Utilities.formatDate(new Date(scannedAt), "GMT+7", "yyyy-MM-dd HH:mm:ss") : "Unknown"
          }
        });
      }
      
      // Update Scan
      var now = new Date();
      var formattedNow = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd HH:mm:ss");
      
      sheet.getRange(rowNum, 5).setValue(true); // isScan
      sheet.getRange(rowNum, 6).setValue(formattedNow); // scanned_at
      
      return jsonResponse({
        status: "success",
        message: "Scan successful",
        data: {
          id: data[rowIndex][0],
          nama: data[rowIndex][1],
          kelas: data[rowIndex][2],
          seat: data[rowIndex][3],
          isScan: false, // It was false before this scan, but for UI we might want to know it's fresh
          scanned_at: formattedNow
        }
      });
      
    } else if (action === "print") {
      // Update Print
      var now = new Date();
      var formattedNow = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd HH:mm:ss");
      
      sheet.getRange(rowNum, 7).setValue(true); // isPrinted
      sheet.getRange(rowNum, 8).setValue(formattedNow); // printed_at
      
      return jsonResponse({
        status: "success",
        message: "Print recorded",
        printed_at: formattedNow
      });
    }
    
    return jsonResponse({ status: "error", message: "Invalid action" });
    
  } catch (error) {
    return jsonResponse({ status: "error", message: error.toString() });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Test function to initialize headers if sheet is empty (Optional helper)
function setupSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["ID Ticket", "Nama", "Kelas", "Seat", "isScan", "scanned_at", "isPrinted", "printed_at"]);
    // Add Dummy Data
    sheet.appendRow(["T001", "John Doe", "VIP", "A1", false, "", false, ""]);
    sheet.appendRow(["T002", "Jane Smith", "Reguler", "", false, "", false, ""]);
  }
}
