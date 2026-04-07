export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  // Basic Uzbek phone validation: +998 followed by 9 digits
  const phoneRegex = /^\+998\d{9}$/;
  // Also allow simple 9 digit format
  const simplePhoneRegex = /^\d{9}$/;
  // Also allow masked format: +998-XX-XXX-XX-XX
  const maskedPhoneRegex = /^\+998-\d{2}-\d{3}-\d{2}-\d{2}$/;
  return phoneRegex.test(phone) || simplePhoneRegex.test(phone) || maskedPhoneRegex.test(phone);
};

export const isValidContact = (contact: string): boolean => {
  return isValidEmail(contact) || isValidPhone(contact);
};
