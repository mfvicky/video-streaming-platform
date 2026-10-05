export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthData {
  user: User;
  accessToken: string;
}

export interface AuthResponse {
  success: boolean;
  data: AuthData;
}