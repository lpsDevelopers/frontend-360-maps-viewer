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
  statePanorama: string;
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

export interface Hotspot3 {
  id: number;
  label: string;
  theta: number;
  phi: number;
}


export interface ErrorDetail {
  PropertyName: string;
  ErrorMessage: string;
}

  type ColorOption = 'verde' | 'amarillo' | 'rojo';
  type TypeHotspot = 'hotspot' | 'equipamiento' | 'saturado' | 'inclinado'   ;


  export interface HotspotSelected  {
    id: number;
    name: TypeHotspot;
    color_hotspot: ColorOption;
  }
  export interface Hotspot2 {
    id: number;
    pitch: number;
    yaw: number;
    text: string;
    title: string;
    filePath: string;
    parentImageId: number;
    viewCapturePath: string;
    label: string;
    description?: string;
    theta: number;
    phi: number;
    panoramasId: number;
    typeHotspot:  TypeHotspot ;
    state: boolean;
  }

export interface Hotspot {
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
