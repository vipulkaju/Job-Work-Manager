export type Party = {
  id: string;
  name: string;
  mobile: string;
  address: string;
  gst: string;
  discount?: number | null;
  dalali?: number | null;
  createdAt: string;
};

export type JobCardStatus = 'Pending' | 'In Process' | 'Completed';

export type JobCard = {
  id: string;
  cardNumber: string;
  date: string;
  partyId: string;
  designName: string;
  quality: string;
  quantity: number;
  shortage?: number;
  rate: number;
  amount: number;
  deliveryDate: string;
  status: JobCardStatus;
  createdAt: string;
};

export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer';

export type Payment = {
  id: string;
  partyId: string;
  jobCardId?: string;
  jobCardIds?: string[];
  date: string;
  amount: number;
  discount?: number | null; // Kasar
  mode: PaymentMode;
  remark: string;
  createdAt: string;
};

export type AppState = {
  language: 'en' | 'gu';
  theme: 'dark' | 'light';
  parties: Party[];
  jobCards: JobCard[];
  payments: Payment[];
};

