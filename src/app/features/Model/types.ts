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
export interface UserAll {
  id: number;
  userRoleId: number;
  username: string;
  fname: string | null;
  lname: string | null;
  email: string;
  phone: string | null;
  country: string | null;
  status: number;
  refferedBy: number;
  verificationCode: string | null;
  ev: boolean;
  kyc: boolean;
  kycInfos: string | null;
  totalReferrals: number;
  interests: number;
  gReferrals: number;
  gBonus: number;
  balance: number;
  paymentMethod: string | null;
  currencyId: number;
  accountWallet: string | null;
  createdAt: string;
  updatedAt: string;
  balanceDisponible: number;
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

export interface Deposit {
  id: number;
  userId: number;
  gatewayId: number;
  transactionId: string | null;
  currencyId: number;
  amount: number;
  rate: number;
  finalAmount: number;
  paymentStatus: number;
  status: number;
  proof: string;
  createdAt: string;
  updatedAt: string;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
}
export interface Filter {
  field: string;
  filterType: string;
  value: any;
  valueEnd?: any;
  states: string[];
  type?: string;
  config?: {
    validation?: {
      required?: boolean;
    };
    options?: Array<{
      value: string;
      label: string;
    }>;
    filters?: any[];
  };
}

export interface FilterType {
  id: string;
  name: string;
  type: string;
  config?: {
    filters?: any[];
    options?: Array<{
      label: string;
      value: string;
    }>;
    min?: number;
    max?: number;
    step?: number;
    format?: string;
    placeholder?: string;
    validation?: {
      required?: boolean;
    };
  };
}

