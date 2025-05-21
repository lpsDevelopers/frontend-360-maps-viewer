export interface LoginResponse {
  session: {
    access_token: string;
    refresh_token: string;
    user: {
      id: string;
      email: string;
      role: string;
      user_metadata: {
        email_verified: boolean;
      }
    }
  };
  user: {
    id: string;
    email: string;
  };
}

export interface User {
  id: string;
  email: string;
  role: string;
  email_verified: boolean;
}


export interface ErrorDetail {
  PropertyName: string;
  ErrorMessage: string;
}

export interface ServerResponse {
  isSucces: boolean;
  message: string;
  data:  string;
  errors: ErrorDetail[] | null;
}

export interface ErrorDetail {
  PropertyName: string;
  ErrorMessage: string;
}

export interface ApiResponse<T> {
  isSucces: boolean;
  message: string;
  data: T;
  errors: ErrorDetail[] | null;
}

export interface Location {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  company_id: string;
  created_at: string; // ISO timestamp (puedes usar `Date` si lo parseas)
}

