import * as XLSX from 'xlsx';
import { AnalyticsData } from '../types';

export const exportToCSV = (data: AnalyticsData) => {
  if (!data || !data.bookings) return;
  
  const bookingsData = data.bookings.map(b => ({
    'ID': b.id,
    'Foydalanuvchi': b.userId || 'Mehmon',
    'Chipta holati': b.status || 'Kutilmoqda',
    'Narxi': b.totalPrice || b.price || 0,
    'Yaratilgan sana': b.createdAt ? new Date(b.createdAt).toLocaleString() : 'Noma\'lum',
  }));

  const worksheet = XLSX.utils.json_to_sheet(bookingsData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Bookings");
  XLSX.writeFile(workbook, `tezchipta_hisobot_${new Date().toISOString().split('T')[0]}.xlsx`);
};
