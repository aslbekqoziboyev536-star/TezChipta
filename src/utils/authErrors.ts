export const getAuthErrorMessage = (error: any): string => {
  if (!error) return '';
  
  const message = error.message || error.toString();
  
  // Supabase Errors
  if (message.includes('User already registered') || message.includes('already registered')) {
    return "Ushbu email manzili bilan allaqachon ro'yxatdan o'tilgan. Iltimos, tizimga kiring.";
  }
  
  if (message.includes('Password should be at least 6 characters') || message.includes('at least 6 characters')) {
    return "Parol kamida 6 ta belgidan iborat bo'lishi kerak.";
  }

  if (message.includes('Invalid login credentials') || message.includes('Invalid credentials')) {
    return "Email yoki parol xato kiritildi.";
  }

  if (message.includes('Email not confirmed') || message.includes('not confirmed')) {
    return "Email manzilingiz hali tasdiqlanmagan. Iltimos, pochtangizni tekshiring.";
  }

  if (message.includes('rate limit')) {
    return "Harakatlar juda ko'payib ketdi. Iltimos, birozdan so'ng urinib ko'ring.";
  }

  // Firebase fallbacks (if still used)
  if (error.code === 'auth/email-already-in-use') {
    return "Ushbu email manzili allaqachon foydalanilmoqda.";
  }

  return message;
};
