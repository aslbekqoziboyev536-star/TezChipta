const fs = require('fs');

const replacements = [
  ['Xush kelibsiz', "{t('auth.login.title')}"],
  ["Tizimga kirish uchun ma'lumotlaringizni kiriting", "{t('auth.login.subtitle')}"],
  ['Email orqali', "{t('auth.login.email_tab')}"],
  ['Telefon orqali', "{t('auth.login.phone_tab')}"],
  ['Email manzil', "{t('auth.login.email_label')}"],
  ['Telefon raqam', "{t('auth.login.phone_label')}"],
  ['Parol', "{t('auth.login.password_label')}"],
  ['Parolni unutdingizmi?', "{t('auth.login.forgot_password')}"],
  ['Tizimga kirish', "{t('auth.login.btn')}"],
  ['Google orqali kirish', "{t('auth.login.google_btn')}"],
  ["Hisobingiz yo'qmi?", "{t('auth.login.no_account')}"],
  ["Ro'yxatdan o'tish", "{t('auth.login.register_link')}"],
  ['Kodni yuborish', "{t('auth.login.send_code')}"],
  ['Kodni tasdiqlash', "{t('auth.login.verify_code')}"],
  ['Tasdiqlash kodi', "{t('auth.login.code_label')}"],
  ['Orqaga', "{t('auth.login.back')}"]
];

const registerReplacements = [
  ["Ro'yxatdan o'tish", "{t('auth.register.title')}"],
  ["Yangi hisob yaratish uchun ma'lumotlarni kiriting", "{t('auth.register.subtitle')}"],
  ['Ism va familiya', "{t('auth.register.name_label')}"],
  ["Kim sifatida ro'yxatdan o'tmoqchisiz?", "{t('auth.register.role_label')}"],
  ["Yo'lovchi", "{t('auth.register.role_user')}"],
  ['Haydovchi', "{t('auth.register.role_driver')}"],
  ["Hisobingiz bormi?", "{t('auth.register.has_account')}"],
  ['Tizimga kirish', "{t('auth.register.login_link')}"]
];

function updateFile(file, reps) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  // Add useLanguage if not present
  if (!content.includes('useLanguage')) {
    content = content.replace(/import React/, "import { useLanguage } from '../context/LanguageContext';\nimport React");
    const componentMatch = content.match(/export default function ([A-Za-z0-9_]+)[^\{]*\{/);
    if (componentMatch && !content.includes('const { t } = useLanguage()')) {
      content = content.replace(componentMatch[0], componentMatch[0] + "\n  const { t } = useLanguage();");
    }
  }

  reps.forEach(([oldText, newText]) => {
    content = content.replace(new RegExp(`>\\s*${oldText}\\s*<`, 'g'), `>${newText}<`);
    content = content.replace(new RegExp(`placeholder="${oldText}"`, 'g'), `placeholder={${newText.replace(/^{|}$/g, '')}}`);
    content = content.replace(new RegExp(`'${oldText}'`, 'g'), newText.replace(/^{|}$/g, ''));
    content = content.replace(new RegExp(`"${oldText}"`, 'g'), newText.replace(/^{|}$/g, ''));
  });

  fs.writeFileSync(file, content);
  console.log(`${file} updated`);
}

updateFile('./src/pages/Login.tsx', replacements);
updateFile('./src/pages/Register.tsx', [...replacements, ...registerReplacements]);
