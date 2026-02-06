/**
 * BLO Account Management System - Google Sheets Backend
 */

const SPREADSHEET_ID = '199EWhTKl3E1MxSSL2-xFFIHrvhKJnADLCtLyWI4pSMc';
const TARGET_FOLDER_ID = '1kOZQqX8bBNLswS-ogfmmL0-dnvPjODPv';

function normalizeHeader(header) {
  return String(header || '').trim().replace(/[^a-zA-Z0-9]/g, '_');
}

function doGet(e) {
  try {
    if (e.parameter.check === 'true') {
      return createSafeResponse(checkConfig());
    }

    const data = {
      users: getSheetData('User'),
      accounts: getSheetData('BLO_Account'),
      avihitAccounts: getSheetData('Avihit_Account'),
      supervisorAccounts: getSheetData('Supervisor_Account'),
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
    
    // Robust ID lookup
    const id = payload.BLO_ID || payload.Supervisor_ID || payload.Avihit_ID || payload.ID;

    if (action === 'updateAccount') {
      result = updateRecord('BLO_Account', 'BLO_ID', id, payload);
    } else if (action === 'updateAvihitAccount') {
      result = updateRecord('Avihit_Account', 'BLO_ID', id, payload);
    } else if (action === 'updateSupervisorAccount') {
      result = updateRecord('Supervisor_Account', 'BLO_ID', id, payload);
    } else if (action === 'verifyAccount') {
      result = updateRecord('BLO_Account', 'BLO_ID', id, { Verified: payload.Verified });
    } else if (action === 'verifyAvihitAccount') {
      result = updateRecord('Avihit_Account', 'BLO_ID', id, { Verified: payload.Verified });
    } else if (action === 'verifySupervisorAccount') {
      result = updateRecord('Supervisor_Account', 'BLO_ID', id, { Verified: payload.Verified });
    } else if (action === 'updateUser') {
      result = updateRecord('User', 'User_ID', payload.User_ID, payload);
    } else if (action === 'addBank') {
      result = addRecord('Bank', payload);
    } else if (action === 'addBranch') {
      result = addRecord('Bank_Branch', payload);
    }
    
    return createSafeResponse(result);
  } catch (error) {
    return createSafeResponse({ success: false, error: "Post Error: " + error.toString() });
  }
}

function createSafeResponse(data) {
  const json = JSON.stringify(data);
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.TEXT);
}

function getSheetData(sheetName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) return [];
    
    const rawHeaders = values[0];
    const headers = rawHeaders.map(h => normalizeHeader(h));
    const data = [];
    
    // Identity & Name Column Aliasing
    const idAlts = ['BLO_ID', 'Supervisor_ID', 'Avihit_ID', 'ID', 'User_ID'];
    const nameAlts = ['BLO_Name', 'Supervisor_Name', 'Avihit_Name', 'Officer_Name', 'Name'];
    const genderAlts = ['Gender', 'Sex'];
    
    let idHeader = idAlts.find(alt => headers.includes(alt)) || '';
    let nameHeader = nameAlts.find(alt => headers.includes(alt)) || '';
    let genderHeader = genderAlts.find(alt => headers.includes(alt)) || '';
    
    for (let i = 1; i < values.length; i++) {
      const obj = {};
      for (let j = 0; j < headers.length; j++) {
        const h = headers[j];
        const val = String(values[i][j]);
        obj[h] = val;
        
        // Ensure frontend sees standardized keys
        if (sheetName.toLowerCase().includes('account')) {
          if (h === idHeader) obj['BLO_ID'] = val;
          if (h === nameHeader) obj['BLO_Name'] = val;
          if (h === genderHeader) obj['Gender'] = val;
        }
      }
      data.push(obj);
    }
    return data;
  } catch (e) {
    return [];
  }
}

/**
 * Updates a record.
 * Handles field aliasing and ensures standardized keys (BLO_Name, Gender) 
 * take priority over sheet-specific keys in the payload.
 */
function updateRecord(sheetName, idColumnName, idValue, updateObj) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, message: 'Sheet not found: ' + sheetName };

    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => normalizeHeader(h));
    
    // 1. Find the ID Column
    let idColIndex = headers.indexOf(normalizeHeader(idColumnName));
    if (idColIndex === -1) {
      const alternatives = ['BLO_ID', 'ID', 'Supervisor_ID', 'Avihit_ID', 'User_ID'];
      for (let alt of alternatives) {
        let idx = headers.indexOf(normalizeHeader(alt));
        if (idx !== -1) { idColIndex = idx; break; }
      }
    }
    if (idColIndex === -1) idColIndex = 0;

    // 2. Resolve Field Mappings & Priority
    const fieldMappings = {
      'BLO_Name': ['Supervisor_Name', 'Avihit_Name', 'Officer_Name', 'Name', 'BLO_Name'],
      'Gender': ['Sex', 'Gender']
    };

    // Clean up payload to avoid conflicting aliases
    for (let standardKey in fieldMappings) {
      if (updateObj[standardKey] !== undefined) {
        fieldMappings[standardKey].forEach(alias => {
          if (alias !== standardKey) delete updateObj[alias];
        });
      }
    }

    // 3. Find the Row and Update
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idColIndex]) === String(idValue)) {
        updateObj['T_STMP_UPD'] = new Date().toISOString();
        
        for (let key in updateObj) {
          let colIndex = headers.indexOf(normalizeHeader(key));

          // If standard key isn't found directly, check its aliases
          if (colIndex === -1 && fieldMappings[key]) {
            for (let alias of fieldMappings[key]) {
              let altIdx = headers.indexOf(normalizeHeader(alias));
              if (altIdx !== -1) {
                colIndex = altIdx;
                break;
              }
            }
          }

          if (colIndex !== -1) {
            let val = updateObj[key];
            
            // Critical: Avoid saving undefined or problematic values for critical fields
            if (key === 'Gender' && !val) val = 'Male'; 
            
            // Special handling for specific fields
            if (key === 'Account_Number') {
               val = String(val);
               if (!val.startsWith("'")) val = "'" + val;
            }
            if (key === 'Account_Passbook_Doc' && String(val).startsWith('data:')) {
               const partInfo = updateObj['Sector_No'] ? ("S_" + updateObj['Sector_No']) : (updateObj['Part_No'] ? ("P_" + updateObj['Part_No']) : "ID_" + idValue);
               val = uploadBase64ToDrive(val, partInfo + "_" + (updateObj['BLO_Name'] || 'Officer')) || val;
            }
            
            sheet.getRange(i + 1, colIndex + 1).setValue(val);
          }
        }
        return { success: true };
      }
    }
    return { success: false, message: 'ID not found: ' + idValue };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function uploadBase64ToDrive(base64Data, fileName) {
  try {
    const parts = base64Data.split(',');
    if (parts.length < 2) return null;
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
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => normalizeHeader(h));
    const newRow = new Array(headers.length).fill('');
    recordObj['T_STMP_ADD'] = recordObj['T_STMP_UPD'] = new Date().toISOString();
    for (let key in recordObj) {
      const idx = headers.indexOf(normalizeHeader(key));
      if (idx !== -1) newRow[idx] = recordObj[key];
    }
    sheet.appendRow(newRow);
    return { success: true };
  } catch (e) { return { success: false, error: e.toString() }; }
}

function checkConfig() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    return { success: true, spreadsheet: ss.getName() };
  } catch (e) { return { success: false, error: e.toString() }; }
}