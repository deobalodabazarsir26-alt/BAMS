/**
 * BLO Account Management System - Google Sheets Backend
 * Sheets expected: User, BLO_Account, Bank, Bank_Branch, Department, Designation
 */

const SPREADSHEET_ID = '199EWhTKl3E1MxSSL2-xFFIHrvhKJnADLCtLyWI4pSMc';
const TARGET_FOLDER_ID = '1kOZQqX8bBNLswS-ogfmmL0-dnvPjODPv';

function doGet(e) {
  // If a 'check' parameter is provided, run diagnostics
  if (e.parameter.check === 'true') {
    return ContentService.createTextOutput(JSON.stringify(checkConfig()))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = {
    users: getSheetData('User'),
    accounts: getSheetData('BLO_Account'),
    banks: getSheetData('Bank'),
    branches: getSheetData('Bank_Branch'),
    departments: getSheetData('Department'),
    designations: getSheetData('Designation')
  };
  
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    const payload = params.payload;
    
    let result = { success: false };
    
    if (action === 'updateAccount') {
      result = updateRecord('BLO_Account', 'BLO_ID', payload.BLO_ID, payload);
    } else if (action === 'addBank') {
      result = addRecord('Bank', payload);
    } else if (action === 'addBranch') {
      result = addRecord('Bank_Branch', payload);
    } else if (action === 'verifyAccount') {
      result = updateRecord('BLO_Account', 'BLO_ID', payload.BLO_ID, { Verified: payload.Verified });
    } else if (action === 'checkConfig') {
      result = checkConfig();
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error("Critical doPost Error: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: "Critical Error: " + error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Diagnostics function to check folder and spreadsheet accessibility
 */
function checkConfig() {
  const reports = {
    spreadsheet: { status: 'Checking...', id: SPREADSHEET_ID },
    folder: { status: 'Checking...', id: TARGET_FOLDER_ID },
    success: true,
    timestamp: new Date().toISOString()
  };

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    reports.spreadsheet.status = 'OK - Access granted. Name: ' + ss.getName();
    reports.spreadsheet.sheets = ss.getSheets().map(s => s.getName());
  } catch (e) {
    reports.spreadsheet.status = 'ERROR: ' + e.toString();
    reports.success = false;
  }

  try {
    const folder = DriveApp.getFolderById(TARGET_FOLDER_ID);
    reports.folder.status = 'OK - Access granted. Name: ' + folder.getName();
    // Test write permission
    const tempFile = folder.createFile('diag_test_' + Date.now() + '.txt', 'Testing permissions...');
    reports.folder.writePermission = 'OK - File creation successful. URL: ' + tempFile.getUrl();
    tempFile.setTrashed(true);
  } catch (e) {
    reports.folder.status = 'ERROR: ' + e.toString();
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
    
    const headers = values[0];
    const data = [];
    
    for (let i = 1; i < values.length; i++) {
      const obj = {};
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = values[i][j];
      }
      data.push(obj);
    }
    return data;
  } catch (e) {
    console.error("Get Sheet Data Error [" + sheetName + "]: " + e.toString());
    return [];
  }
}

function updateRecord(sheetName, idColumnName, idValue, updateObj) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, message: 'Sheet "' + sheetName + '" not found' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idColIndex = headers.indexOf(idColumnName);
    
    if (idColIndex === -1) return { success: false, message: 'ID Column "' + idColumnName + '" not found' };
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][idColIndex] == idValue) {
        // Update timestamps
        updateObj['T_STMP_UPD'] = new Date().toISOString();
        
        // Handle file upload
        if (updateObj['Account_Passbook_Doc'] && updateObj['Account_Passbook_Doc'].startsWith('data:')) {
          const getVal = (key) => {
            if (updateObj[key] !== undefined && updateObj[key] !== null && updateObj[key] !== '') return updateObj[key];
            const colIdx = headers.indexOf(key);
            return colIdx !== -1 ? data[i][colIdx] : '';
          };

          const acNo = getVal('AC_No');
          const partNo = getVal('Part_No');
          const mobile = getVal('Mobile');
          const fileName = (acNo || 'NA') + "_" + (partNo || 'NA') + "_" + (mobile || 'NA');
          
          try {
            console.log("Processing upload for: " + fileName);
            const driveUrl = uploadBase64ToDrive(updateObj['Account_Passbook_Doc'], fileName);
            if (driveUrl) {
              updateObj['Account_Passbook_Doc'] = driveUrl; // Replace base64 with Drive URL
              console.log("Uploaded successfully: " + driveUrl);
            }
          } catch (e) {
            console.error("Upload process failed: " + e.toString());
            return { success: false, message: 'Google Drive Upload Error: ' + e.toString() };
          }
        }
        
        // Update sheet row
        for (let key in updateObj) {
          const colIndex = headers.indexOf(key);
          if (colIndex !== -1) {
            sheet.getRange(i + 1, colIndex + 1).setValue(updateObj[key]);
          }
        }
        return { success: true };
      }
    }
    return { success: false, message: 'Record with ID ' + idValue + ' not found' };
  } catch (e) {
    console.error("Update Record Error: " + e.toString());
    return { success: false, message: 'Update Error: ' + e.toString() };
  }
}

function uploadBase64ToDrive(base64Data, fileName) {
  if (!base64Data || !base64Data.includes(',')) {
    throw new Error("Invalid base64 string format. Data URL prefix missing.");
  }

  const parts = base64Data.split(',');
  const meta = parts[0];
  const base64Content = parts[1];
  
  const mimeTypeMatch = meta.match(/:(.*?);/);
  const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'application/octet-stream';
  
  // Clean up content: sometimes filereader includes whitespace/newlines
  const cleanContent = base64Content.replace(/\s/g, '');
  const decodedData = Utilities.base64Decode(cleanContent);
  
  let extension = '';
  if (mimeType.includes('pdf')) extension = '.pdf';
  else if (mimeType.includes('jpeg')) extension = '.jpg';
  else if (mimeType.includes('png')) extension = '.png';
  else if (mimeType.includes('gif')) extension = '.gif';
  
  const blob = Utilities.newBlob(decodedData, mimeType, fileName + extension);
  
  let folder;
  try {
    folder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  } catch (e) {
    throw new Error("Target folder not accessible (ID: " + TARGET_FOLDER_ID + "). Ensure the script owner has access. Details: " + e.toString());
  }
  
  const file = folder.createFile(blob);
  
  // Set permissions - handle potential Workspace policy restrictions gracefully
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    console.warn("Could not set public permissions on file: " + e.toString());
  }
  
  return file.getUrl();
}

function addRecord(sheetName, recordObj) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, message: 'Sheet "' + sheetName + '" not found' };

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = new Array(headers.length).fill('');
    
    recordObj['T_STMP_ADD'] = new Date().toISOString();
    recordObj['T_STMP_UPD'] = new Date().toISOString();
    
    for (let key in recordObj) {
      const colIndex = headers.indexOf(key);
      if (colIndex !== -1) {
        newRow[colIndex] = recordObj[key];
      }
    }
    
    sheet.appendRow(newRow);
    return { success: true };
  } catch (e) {
    console.error("Add Record Error: " + e.toString());
    return { success: false, message: 'Add Record Error: ' + e.toString() };
  }
}
