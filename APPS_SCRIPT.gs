/**
 * BLO Account Management System - Google Sheets Backend
 * Sheets expected: User, BLO_Account, Bank, Bank_Branch, Department, Designation
 */

const SPREADSHEET_ID = '199EWhTKl3E1MxSSL2-xFFIHrvhKJnADLCtLyWI4pSMc';

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