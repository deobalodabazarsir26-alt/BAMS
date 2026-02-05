/**
 * BLO Account Management System - Google Sheets Backend
 */

const SPREADSHEET_ID = '199EWhTKl3E1MxSSL2-xFFIHrvhKJnADLCtLyWI4pSMc';
const TARGET_FOLDER_ID = '1kOZQqX8bBNLswS-ogfmmL0-dnvPjODPv';

/**
 * Normalizes headers: "Officer Name" -> "Officer_Name"
 */
function normalizeHeader(header) {
  return String(header).trim().replace(/[^a-zA-Z0-9]/g, '_');
}

function doGet(e) {
  try {
    if (e.parameter.check === 'true') {
      return createSafeResponse(checkConfig());
    }

    const data = {
      users: getSheetData('User'),
      accounts: getSheetData('BLO_Account'),
      banks: getSheetData('Bank'),
      branches: getSheetData('Bank_Branch'),
      departments: getSheetData('Department'),
      designations: getSheetData('Designation')
    };
    
    return createSafeResponse(data);
  } catch (err) {
    return createSafeResponse({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    const payload = params.payload;
    
    let result = { success: false };
    
    if (action === 'updateAccount') {
      result = updateRecord('BLO_Account', 'BLO_ID', payload.BLO_ID, payload);
    } else if (action === 'updateUser') {
      result = updateRecord('User', 'User_ID', payload.User_ID, payload);
    } else if (action === 'addBank') {
      result = addRecord('Bank', payload);
    } else if (action === 'addBranch') {
      result = addRecord('Bank_Branch', payload);
    } else if (action === 'verifyAccount') {
      result = updateRecord('BLO_Account', 'BLO_ID', payload.BLO_ID, { Verified: payload.Verified });
    }
    
    return createSafeResponse(result);
  } catch (error) {
    return createSafeResponse({ success: false, error: "Post Error: " + error.toString() });
  }
}

/**
 * Creates a safe response to bypass Content-Length browser bugs
 */
function createSafeResponse(data) {
  const json = JSON.stringify(data);
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.TEXT); // Using TEXT helps avoid browser body mismatch errors with GAS
}

function checkConfig() {
  const reports = {
    spreadsheet: { status: 'Checking...', id: SPREADSHEET_ID },
    folder: { status: 'Checking...', id: TARGET_FOLDER_ID },
    success: true
  };
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    reports.spreadsheet.status = 'OK - Access granted. Name: ' + ss.getName();
  } catch (e) {
    reports.spreadsheet.status = 'ERROR: ' + e.toString();
    reports.success = false;
  }
  return reports;
}

function getSheetData(sheetName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) return [];
    
    // Normalize headers to match React state keys (e.g., "Officer_Name")
    const headers = values[0].map(h => normalizeHeader(h));
    const data = [];
    
    for (let i = 1; i < values.length; i++) {
      const obj = {};
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = String(values[i][j]);
      }
      data.push(obj);
    }
    return data;
  } catch (e) {
    console.error("Read Error [" + sheetName + "]: " + e.toString());
    return [];
  }
}

function updateRecord(sheetName, idColumnName, idValue, updateObj) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, message: 'Sheet not found' };

    const data = sheet.getDataRange().getValues();
    const rawHeaders = data[0];
    const normalizedHeaders = rawHeaders.map(h => normalizeHeader(h));
    const idColIndex = normalizedHeaders.indexOf(normalizeHeader(idColumnName));
    
    if (idColIndex === -1) return { success: false, message: 'ID Column not found' };
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idColIndex]) === String(idValue)) {
        updateObj['T_STMP_UPD'] = new Date().toISOString();
        
        // Literal string for Account Numbers
        if (updateObj['Account_Number']) {
           let acVal = String(updateObj['Account_Number']);
           if (!acVal.startsWith("'")) updateObj['Account_Number'] = "'" + acVal;
        }

        // Handle File Logic only if column exists
        if (updateObj['Account_Passbook_Doc'] && updateObj['Account_Passbook_Doc'].startsWith('data:')) {
          const docIdx = normalizedHeaders.indexOf('Account_Passbook_Doc');
          if (docIdx !== -1) {
            const fileName = (updateObj['AC_No'] || 'NA') + "_" + (updateObj['Part_No'] || 'NA');
            const driveUrl = uploadBase64ToDrive(updateObj['Account_Passbook_Doc'], fileName);
            if (driveUrl) updateObj['Account_Passbook_Doc'] = driveUrl;
          }
        }
        
        // Map normalized keys back to original column indices
        for (let key in updateObj) {
          const colIndex = normalizedHeaders.indexOf(normalizeHeader(key));
          if (colIndex !== -1) {
            sheet.getRange(i + 1, colIndex + 1).setValue(updateObj[key]);
          }
        }
        return { success: true };
      }
    }
    return { success: false, message: 'ID ' + idValue + ' not found' };
  } catch (e) {
    return { success: false, message: 'Update Error: ' + e.toString() };
  }
}

function uploadBase64ToDrive(base64Data, fileName) {
  try {
    const parts = base64Data.split(',');
    const mimeType = parts[0].match(/:(.*?);/)[1];
    const decodedData = Utilities.base64Decode(parts[1].replace(/\s/g, ''));
    const blob = Utilities.newBlob(decodedData, mimeType, fileName);
    const folder = DriveApp.getFolderById(TARGET_FOLDER_ID);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) { return null; }
}

function addRecord(sheetName, recordObj) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const normalizedHeaders = headers.map(h => normalizeHeader(h));
    const newRow = new Array(headers.length).fill('');
    
    recordObj['T_STMP_ADD'] = new Date().toISOString();
    recordObj['T_STMP_UPD'] = new Date().toISOString();
    
    for (let key in recordObj) {
      const colIndex = normalizedHeaders.indexOf(normalizeHeader(key));
      if (colIndex !== -1) newRow[colIndex] = recordObj[key];
    }
    sheet.appendRow(newRow);
    return { success: true };
  } catch (e) { return { success: false, error: e.toString() }; }
}