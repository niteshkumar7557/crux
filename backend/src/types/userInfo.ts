// Request bodies for register and login.

export interface userRegisterData {
  name: string;
  userName: string;
  email: string;
  password: string;
}
export interface userLoginData {
  email: string;
  password: string;
}
