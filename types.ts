export enum UserType {
  ADMIN = 'admin',
  TEHSIL = 'tehsil'
}

export interface User {
  User_ID: string;
  User_Name: string;
  Password?: string;
  User_Type: UserType;
  Officer_Name: string;
  Designation: string;
  Mobile: string;
  T_STMP_ADD: string;
  T_STMP_UPD: string;
}

export interface Bank {
  Bank_ID: string;
  Bank_Name: string;
  T_STMP_ADD: string;
  T_STMP_UPD: string;
}

export interface BankBranch {
  Branch_ID: string;
  Branch_Name: string;
  IFSC_Code: string;
  Bank_ID: string;
  T_STMP_ADD: string;
  T_STMP_UPD: string;
}

export interface Department {
  Dept_ID: string;
  Dept_Name: string;
}

export interface Designation {
  Desg_ID: string;
  Desg_Name: string;
  Dept_ID: string; // Required for cascading dropdown from Department
}

export interface BLOAccount {
  BLO_ID: string;
  User_ID: string;
  AC_No: string;
  AC_Name: string;
  Tehsil: string;
  Part_No: string;
  Part_Name_EN: string;
  Part_Name_HI: string;
  BLO_Name: string;
  Gender: 'Male' | 'Female' | 'Other';
  Desg_ID: string;
  Dept_ID: string;
  Mobile: string;
  EPIC: string;
  Bank_ID: string;
  Branch_ID: string;
  IFSC_Code: string;
  Account_Number: string;
  Account_Passbook_Doc: string;
  Verified: 'yes' | 'no';
  T_STMP_ADD: string;
  T_STMP_UPD: string;
}

export interface AppState {
  currentUser: User | null;
  accounts: BLOAccount[];
  banks: Bank[];
  branches: BankBranch[];
  users: User[];
  departments: Department[];
  designations: Designation[];
}