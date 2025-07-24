export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  userId: number;
  role: string;
  permissions: string[];
}

export interface AllUsers {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  password: string;
  role: string | null;
  companyId: number;
  emailVerified: boolean;
  auditCreateDate: string | null;
  stateList: string;
}

export interface AllPostes {
  id: number;
  item: number;
  codigoPosteAntiguo: string;
  pitch: number;
  yaw: number;
  theta: number;
  phi: number;
  tipoPoste: string;
  criticidad: string;
  red: string;
  tipoRed: string;
  alturaSoporte: number;
  alturaVano: number;
  codigoDistrito: string;
  tipoVia: string;
  nombreVia: string;
  numero: string;
  manzana: string;
  lote: string;
  coordenadas: string;
  latitudS: string;
  longitudW: string;
  urbanizacion: string;
  posteSiguiente: string;
  observacion1: string;
  observacion2: string;
  observacion3: string;
  condicion: string;
  trabajoARealizar: string;
  panoramasId: number;
  viewCapturePath: number;
  filePath1: string;
  filePath2: string;
  filePath3: string;
}


export interface AllHotspots {
  id: number;
  item: number;
  codigoPosteAntiguo: string;
  pitch: number;
  yaw: number;
  theta: number;
  phi: number;
  tipoPoste: string;
  criticidad: string;
  red: string;
  tipoRed: string;
  alturaSoporte: number;
  alturaVano: number;
  codigoDistrito: string;
  tipoVia: string;
  nombreVia: string;
  numero: string;
  manzana: string;
  lote: string;
  coordenadas: string;
  latitudS: string;
  longitudW: string;
  urbanizacion: string;
  posteSiguiente: string;
  observacion1: string;
  observacion2: string;
  observacion3: string;
  condicion: string;
  trabajoARealizar: string;
  panoramasId: number;
  viewCapturePath: number;
  filePath1: string;
  filePath2: string;
  filePath3: string;
}


export interface AllPanoramas {
  id: number;
  locationId: number;
  filename: string;
  address: string;
  viewerUrl: string;
  thumbnail: string;
  latitude: number;
  longitude: number;
}
export interface AllLocations {
  id: number;
  companyId: number;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
}

export interface AllCompanies {
  id: number;
  name: string;
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


export interface LoginResponse {
  isSucces: boolean;
  message: string;
  data: {
    token: string;
    role: string;
    userId: number;
    firstName: string;
    lastName: string;
    permissions: string;
  };
  errors: any;
}


export interface ErrorDetail {
  PropertyName: string;
  ErrorMessage: string;
}

// Nuevas interfaces para CSV Analysis
export interface CsvQueryResponse {
  success: boolean;
  message: string;
  data: {
    query: string;
    response: string;
    timestamp: string;
    context: {
      dataContext: string;
    };
  };
  errors: ErrorDetail[];
}


export interface ApiResponse<T> {
  isSucces: boolean;
  message: string;
  data: T;
  errors: ErrorDetail[] | null;
}



export interface UserEmail {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  userId: number;
  role: string;
  permissions: string[] ;
}

export interface AdminEmail{
  userId: number;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
}

export interface DecodedToken {
  sub: string;
  given_name: string;
  family_name: string;
  role: string;
  Permissions: string;
  exp: number;
}
export interface AdminEmailToken {
  email: string;
}
export interface MenuItem {
  path: string;
  icon: string;
  label: string;
  permission?: string;
}
