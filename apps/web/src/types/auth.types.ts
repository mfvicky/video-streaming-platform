export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthData {
  user: User;
}

export interface AuthResponse {
  success: boolean;
  data: AuthData;
}
