export interface AnalyticsData {
  users: any[];
  bookings: any[];
  rides: any[];
}

export interface DailyStats {
  id: string; // usually the date "YYYY-MM-DD"
  date: string;
  users: number;
  bookings: number;
  revenue: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsCache {
  id: string; // hash or date based
  result: string;
  timestamp: string;
  language: string;
}
