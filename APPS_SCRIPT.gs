/**
 * BLO Account Management System - Google Sheets Backend
 * Sheets expected: User, BLO_Account, Bank, Bank_Branch, Department, Designation
 */

const SPREADSHEET_ID = '199EWhTKl3E1MxSSL2-xFFIHrvhKJnADLCtLyWI4pSMc';
const TARGET_FOLDER_ID = '1kOZQqX8bBNLswS-ogfmmL0-dnvPjODPv';

function doGet(e) {
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
        // Force all values to string to preserve leading zeros in ID and Account fields
        obj[headers[j]] = String(values[i][j]);
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
        updateObj['T_STMP_UPD'] = new Date().toISOString();
        
        // Ensure Account Number is saved as a literal string to preserve leading zeros
        if (updateObj['Account_Number']) {
           let acVal = String(updateObj['Account_Number']);
           if (!acVal.startsWith("'")) {
             updateObj['Account_Number'] = "'" + acVal;
           }
        }

        // Handle file upload and deletion of old file
        if (updateObj['Account_Passbook_Doc'] && updateObj['Account_Passbook_Doc'].startsWith('data:')) {
          const colIdxDoc = headers.indexOf('Account_Passbook_Doc');
          const oldDocUrl = colIdxDoc !== -1 ? data[i][colIdxDoc] : '';
          
          // Delete old file if it exists and is a Drive URL
          if (oldDocUrl && oldDocUrl.indexOf('drive.google.com') !== -1) {
            try {
              const fileId = extractFileIdFromUrl(oldDocUrl);
              if (fileId) {
                DriveApp.getFileById(fileId).setTrashed(true);
                console.log("Trashed old file: " + fileId);
              }
            } catch (err) {
              console.warn("Could not delete old file: " + err.toString());
            }
          }

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
            const driveUrl = uploadBase64ToDrive(updateObj['Account_Passbook_Doc'], fileName);
            if (driveUrl) {
              updateObj['Account_Passbook_Doc'] = driveUrl;
            }
          } catch (e) {
            return { success: false, message: 'Google Drive Upload Error: ' + e.toString() };
          }
        }
        
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
    return { success: false, message: 'Update Error: ' + e.toString() };
  }
}

function extractFileIdFromUrl(url) {
  const match = url.match(/[-\w]{25,}/);
  return match ? match[0] : null;
}

function uploadBase64ToDrive(base64Data, fileName) {
  const parts = base64Data.split(',');
  const meta = parts[0];
  const base64Content = parts[1];
  const mimeType = meta.match(/:(.*?);/)[1];
  const cleanContent = base64Content.replace(/\s/g, '');
  const decodedData = Utilities.base64Decode(cleanContent);
  
  let extension = '';
  if (mimeType.includes('pdf')) extension = '.pdf';
  else if (mimeType.includes('jpeg')) extension = '.jpg';
  else if (mimeType.includes('png')) extension = '.png';
  
  const blob = Utilities.newBlob(decodedData, mimeType, fileName + extension);
  const folder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  const file = folder.createFile(blob);
  
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {}
  
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

    // Ensure Account Number is saved as a literal string to preserve leading zeros
    if (recordObj['Account_Number']) {
       let acVal = String(recordObj['Account_Number']);
       if (!acVal.startsWith("'")) {
         recordObj['Account_Number'] = "'" + acVal;
       }
    }
    
    for (let key in recordObj) {
      const colIndex = headers.indexOf(key);
      if (colIndex !== -1) {
        newRow[colIndex] = recordObj[key];
      }
    }
    
    sheet.appendRow(newRow);
    return { success: true };
  } catch (e) {
    return { success: false, message: 'Add Record Error: ' + e.toString() };
  }
}