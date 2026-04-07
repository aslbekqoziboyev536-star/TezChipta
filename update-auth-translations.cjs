const fs = require('fs');

const langFile = './src/context/LanguageContext.tsx';
let langContent = fs.readFileSync(langFile, 'utf8');

const newUz = {
  'auth.login.title': "Xush kelibsiz",
  'auth.login.subtitle': "Tizimga kirish uchun ma'lumotlaringizni kiriting",
  'auth.login.email_tab': "Email orqali",
  'auth.login.phone_tab': "Telefon orqali",
  'auth.login.email_label': "Email manzil",
  'auth.login.phone_label': "Telefon raqam",
  'auth.login.password_label': "Parol",
  'auth.login.forgot_password': "Parolni unutdingizmi?",
  'auth.login.btn': "Tizimga kirish",
  'auth.login.google_btn': "Google orqali kirish",
  'auth.login.no_account': "Hisobingiz yo'qmi?",
  'auth.login.register_link': "Ro'yxatdan o'tish",
  'auth.login.send_code': "Kodni yuborish",
  'auth.login.verify_code': "Kodni tasdiqlash",
  'auth.login.code_label': "Tasdiqlash kodi",
  'auth.login.back': "Orqaga",
  'auth.register.title': "Ro'yxatdan o'tish",
  'auth.register.subtitle': "Yangi hisob yaratish uchun ma'lumotlarni kiriting",
  'auth.register.name_label': "Ism va familiya",
  'auth.register.role_label': "Kim sifatida ro'yxatdan o'tmoqchisiz?",
  'auth.register.role_user': "Yo'lovchi",
  'auth.register.role_driver': "Haydovchi",
  'auth.register.btn': "Ro'yxatdan o'tish",
  'auth.register.has_account': "Hisobingiz bormi?",
  'auth.register.login_link': "Tizimga kirish"
};

const newRu = {
  'auth.login.title': "Добро пожаловать",
  'auth.login.subtitle': "Введите данные для входа в систему",
  'auth.login.email_tab': "Через Email",
  'auth.login.phone_tab': "Через телефон",
  'auth.login.email_label': "Email адрес",
  'auth.login.phone_label': "Номер телефона",
  'auth.login.password_label': "Пароль",
  'auth.login.forgot_password': "Забыли пароль?",
  'auth.login.btn': "Войти",
  'auth.login.google_btn': "Войти через Google",
  'auth.login.no_account': "Нет аккаунта?",
  'auth.login.register_link': "Зарегистрироваться",
  'auth.login.send_code': "Отправить код",
  'auth.login.verify_code': "Подтвердить код",
  'auth.login.code_label': "Код подтверждения",
  'auth.login.back': "Назад",
  'auth.register.title': "Регистрация",
  'auth.register.subtitle': "Введите данные для создания нового аккаунта",
  'auth.register.name_label': "Имя и фамилия",
  'auth.register.role_label': "Кем вы хотите зарегистрироваться?",
  'auth.register.role_user': "Пассажир",
  'auth.register.role_driver': "Водитель",
  'auth.register.btn': "Зарегистрироваться",
  'auth.register.has_account': "У вас есть аккаунт?",
  'auth.register.login_link': "Войти"
};

const newEn = {
  'auth.login.title': "Welcome back",
  'auth.login.subtitle': "Enter your details to log in",
  'auth.login.email_tab': "Via Email",
  'auth.login.phone_tab': "Via Phone",
  'auth.login.email_label': "Email address",
  'auth.login.phone_label': "Phone number",
  'auth.login.password_label': "Password",
  'auth.login.forgot_password': "Forgot password?",
  'auth.login.btn': "Log in",
  'auth.login.google_btn': "Log in with Google",
  'auth.login.no_account': "Don't have an account?",
  'auth.login.register_link': "Register",
  'auth.login.send_code': "Send code",
  'auth.login.verify_code': "Verify code",
  'auth.login.code_label': "Verification code",
  'auth.login.back': "Back",
  'auth.register.title': "Register",
  'auth.register.subtitle': "Enter your details to create a new account",
  'auth.register.name_label': "Full name",
  'auth.register.role_label': "Register as",
  'auth.register.role_user': "Passenger",
  'auth.register.role_driver': "Driver",
  'auth.register.btn': "Register",
  'auth.register.has_account': "Already have an account?",
  'auth.register.login_link': "Log in"
};

function insertTranslations(content, lang, newObj) {
  const regex = new RegExp(`(${lang}:\\s*\\{[\\s\\S]*?)(\\n\\s*\\},|\\n\\s*\\}\\s*;)`);
  const match = content.match(regex);
  if (match) {
    let newProps = '';
    for (const [k, v] of Object.entries(newObj)) {
      if (!match[1].includes(`'${k}'`)) {
        newProps += `\n    '${k}': "${v.replace(/"/g, '\\"')}",`;
      }
    }
    return content.replace(regex, `$1${newProps}$2`);
  }
  return content;
}

langContent = insertTranslations(langContent, 'uz', newUz);
langContent = insertTranslations(langContent, 'ru', newRu);
langContent = insertTranslations(langContent, 'en', newEn);

fs.writeFileSync(langFile, langContent);
console.log('LanguageContext updated for Auth');
