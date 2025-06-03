export interface LoginResponse {
  isSucces: boolean;
  message: string;
  data: string;
  errors: any;
}

export interface User {
  id: number;
  email: string;
  role: number;
  emailVerified: boolean;
  passwordHash: string;
  companyId: number;
}

export interface ApiResponse<T> {
  isSucces: boolean;
  message: string;
  data: T ;
  errors: ErrorDetail[] | null;
}

export interface Location {
  id: number;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  companyId: number;
}

export interface Panorama {
  id: number;
  locationId: number;
  filename: string;
  address: string;
  viewerUrl: string;
  thumbnail: string;
  latitude: number;
  longitude: number;
}


export interface UserEmailToken {
  email: string;
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



