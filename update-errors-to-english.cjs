const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  './src/pages/Admin.tsx',
  './src/pages/Home.tsx',
  './src/pages/Profile.tsx',
  './src/pages/PaymentSuccess.tsx',
  './src/pages/Blog.tsx',
  './src/pages/Login.tsx',
  './src/pages/Register.tsx',
  './src/hooks/useAsync.ts'
];

const translations = [
  ["Chiptani yuklab olishda xatolik yuz berdi", "An error occurred while downloading the ticket"],
  ["Ism bo'sh bo'lishi mumkin emas", "Name cannot be empty"],
  ["Profilni o'zgartirishda xatolik yuz berdi", "An error occurred while updating the profile"],
  ["Brauzeringiz geolokatsiyani qo'llab-quvvatlamaydi", "Your browser does not support geolocation"],
  ["Manzilingizni aniqlashga ruxsat berilmadi", "Permission to access location was denied"],
  ["Sozlamalarni saqlashda xatolik yuz berdi", "An error occurred while saving settings"],
  ["Amalni bajarishda xatolik yuz berdi", "An error occurred while performing the action"],
  ["To'lov seans identifikatori topilmadi.", "Payment session ID not found."],
  ["Server bilan bog'lanishda xatolik yuz berdi.", "An error occurred while connecting to the server."],
  ["Iltimos, to'g'ri telefon raqamini kiriting (+998-XX-XXX-XX-XX)", "Please enter a valid phone number (+998-XX-XXX-XX-XX)"],
  ["Iltimos, haydovchini tanlang", "Please select a driver"],
  ["Foydalanuvchi rolini o'zgartirishda xatolik yuz berdi", "An error occurred while changing user role"],
  ["Xabarni o'qilgan deb belgilashda xatolik yuz berdi", "An error occurred while marking message as read"],
  ["Fikr holatini o'zgartirishda xatolik yuz berdi", "An error occurred while changing review status"],
  ["Fikrni tanlanganlar ro'yxatiga qo'shishda xatolik yuz berdi", "An error occurred while adding review to featured list"],
  ["Stripe to'lovida xatolik yuz berdi.", "An error occurred during Stripe payment."],
  ["Band qilishda xatolik yuz berdi.", "An error occurred during booking."],
  ["Chekni yuklashda xatolik yuz berdi.", "An error occurred while uploading the receipt."],
  ["Iltimos, to'g'ri email yoki telefon raqamini kiriting (+998XXXXXXXXX)", "Please enter a valid email or phone number (+998XXXXXXXXX)"],
  ["Xabar yuborishda xatolik yuz berdi.", "An error occurred while sending the message."],
  ["Fikringiz yuborildi va admin tomonidan ko'rib chiqilgandan so'ng e'lon qilinadi.", "Your review has been submitted and will be published after admin approval."],
  ["Yangiliklarga muvaffaqiyatli obuna bo'ldingiz!", "You have successfully subscribed to news!"],
  ["Haydovchi muvaffaqiyatli yaratildi va unga login/parol biriktirildi.", "Driver created successfully with login/password."],
  ["Ma'lumotlar muvaffaqiyatli yuklandi!", "Data loaded successfully!"],
  ["Ma'lumotlarni yuklashda xatolik yuz berdi.", "An error occurred while loading data."],
  ["Haqiqatan ham ushbu postni o'chirmoqchimisiz?", "Are you sure you want to delete this post?"],
  ["Xatolik:", "Error:"],
  ["Muvaffaqiyatli saqlandi!", "Saved successfully!"],
  ["Profilingiz yuklanmoqda...", "Loading your profile..."],
  ["Mening profilim", "My Profile"],
  ["Xush kelibsiz!", "Welcome back!"],
  ["Kirishda xatolik yuz berdi.", "An error occurred during login."],
  ["Tasdiqlash kodi yuborildi!", "Verification code sent!"],
  ["Tasdiqlash kodi noto'g'ri.", "Invalid verification code."],
  ["Muvaffaqiyatli ro'yxatdan o'tdingiz!", "Registration successful!"],
  ["Ro'yxatdan o'tishda xatolik yuz berdi.", "An error occurred during registration."],
  ["Parol kamida 6 ta belgidan iborat bo'lishi kerak.", "Password must be at least 6 characters long."],
  ["Kirishga qaytish", "Back to login"],
  ["Yangi hisob yarating", "Create a new account"],
  ["Oddiy foydalanuvchilar uchun. Haydovchilar admin orqali ro'yxatdan o'tishlari kerak.", "For regular users. Drivers must register through admin."],
  ["To'liq ismingiz", "Full Name"],
  ["Noma'lum xatolik yuz berdi", "An unknown error occurred"],
  ["FAQni saqlashda xatolik yuz berdi", "An error occurred while saving FAQ"],
  ["Sessiya tokenini olishda xatolik yuz berdi. Iltimos, qayta kiring.", "An error occurred while getting session token. Please log in again."],
  ["Haydovchini yaratishda xatolik yuz berdi", "An error occurred while creating driver"],
  ["Haydovchini saqlashda xatolik yuz berdi", "An error occurred while saving driver"],
  ["Yo'nalishni saqlashda xatolik yuz berdi", "An error occurred while saving route"]
];

filesToUpdate.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    translations.forEach(([uz, en]) => {
      const escapedUz = uz.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      content = content.replace(new RegExp(escapedUz, 'g'), en);
    });
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
