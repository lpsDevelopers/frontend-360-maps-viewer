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

export interface Hotspot {
  id: number;
  label: string;
  theta: number;
  phi: number;
}


export interface ErrorDetail {
  PropertyName: string;
  ErrorMessage: string;
}

export interface Hotspot {
  id: number;
  locationId?: number;
  description?: string | null;
  equipment_location?: string;
  street_name?: string;
  street_number?: string;
  province?: string;
  locality?: string;
  postal_code?: string;
  identifier?: string;
  project?: string;
  new_equipment_location?: string;
  assigned_to?: string;
  location_details?: string;
  repair_type?: string;
  repair_type_2?: string;
  registration_date?: string;
  latitude?: number;
  longitude?: number;
  additional_notes?: string;
  other_repair_type_1?: string;
  other_repair_type_2?: string;
}
