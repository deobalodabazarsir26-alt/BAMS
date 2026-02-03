/**
 * BLO Account Management System - Google Sheets Backend
 * Sheets expected: User, BLO_Account, Bank, Bank_Branch, Department, Designation
 */

const SPREADSHEET_ID = '199EWhTKl3E1MxSSL2-xFFIHrvhKJnADLCtLyWI4pSMc';
const TARGET_FOLDER_ID = '1kOZQqX8bBNLswS-ogfmmL0-dnvPjODPv';

function doGet(e) {
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
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheetData(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const values = sheet.getDataRange().getValues();
  if (values.length === 0) return [];
  
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
}

function updateRecord(sheetName, idColumnName, idValue, updateObj) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idColIndex = headers.indexOf(idColumnName);
  
  if (idColIndex === -1) return { success: false, message: 'ID Column not found' };
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idColIndex] == idValue) {
      // Update timestamps
      updateObj['T_STMP_UPD'] = new Date().toISOString();
      
      // Special handling for file upload to Google Drive
      if (updateObj['Account_Passbook_Doc'] && updateObj['Account_Passbook_Doc'].startsWith('data:')) {
        // Construct filename: AC_No + Part_No + Mobile
        const getValFromSource = (key) => {
          if (updateObj[key] !== undefined && updateObj[key] !== null && updateObj[key] !== '') {
            return updateObj[key];
          }
          const colIdx = headers.indexOf(key);
          return colIdx !== -1 ? data[i][colIdx] : '';
        };

        const acNo = getValFromSource('AC_No');
        const partNo = getValFromSource('Part_No');
        const mobile = getValFromSource('Mobile');
        const fileName = `${acNo}_${partNo}_${mobile}`;
        
        try {
          const driveUrl = uploadBase64ToDrive(updateObj['Account_Passbook_Doc'], fileName);
          updateObj['Account_Passbook_Doc'] = driveUrl; // Replace base64 with Drive URL
        } catch (e) {
          console.error("Drive upload failed:", e);
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
  return { success: false, message: 'Record not found' };
}

function uploadBase64ToDrive(base64Data, fileName) {
  // Extract parts from data URI
  const split = base64Data.split(',');
  const contentTypeMatch = split[0].match(/:(.*?);/);
  const contentType = contentTypeMatch ? contentTypeMatch[1] : 'application/octet-stream';
  const rawData = Utilities.base64Decode(split[1]);
  
  // Append extension based on content type
  let extension = '';
  if (contentType === 'application/pdf') extension = '.pdf';
  else if (contentType.includes('image/jpeg')) extension = '.jpg';
  else if (contentType.includes('image/png')) extension = '.png';
  
  const blob = Utilities.newBlob(rawData, contentType, fileName + extension);
  
  // Get the target folder by ID
  const folder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  return file.getUrl();
}

function addRecord(sheetName, recordObj) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
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
}