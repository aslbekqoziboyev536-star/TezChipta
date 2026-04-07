const fs = require('fs');

const langFile = './src/context/LanguageContext.tsx';
let langContent = fs.readFileSync(langFile, 'utf8');

const newUz = {
  'profile.title': "Shaxsiy kabinet",
  'profile.subtitle': "Ma'lumotlaringiz va chiptalaringiz",
  'profile.tabs.tickets': "Faol chiptalar",
  'profile.tabs.history': "Tarix",
  'profile.tabs.settings': "Sozlamalar",
  'profile.tickets.empty': "Sizda hozircha faol chiptalar yo'q",
  'profile.tickets.find': "Qatnovlarni izlash",
  'profile.history.empty': "Sayohatlar tarixi bo'sh",
  'profile.settings.name': "Ism va familiya",
  'profile.settings.phone': "Telefon raqam",
  'profile.settings.email': "Email",
  'profile.settings.save': "Saqlash",
  'profile.settings.success': "Ma'lumotlar saqlandi!",
  'profile.ticket.download': "Yuklab olish",
  'profile.ticket.cancel': "Bekor qilish",
  'profile.ticket.status.pending': "Kutilmoqda",
  'profile.ticket.status.confirmed': "Tasdiqlangan",
  'profile.ticket.status.cancelled': "Bekor qilingan",
  'profile.ticket.seat': "O'rindiq",
  'profile.ticket.price': "Narxi",
  'profile.ticket.date': "Xarid",
  'profile.driver.rides': "Mening qatnovlarim",
  'profile.driver.add_ride': "Qatnov qo'shish",
  'profile.driver.stop_sharing': "To'xtatish"
};

const newRu = {
  'profile.title': "Личный кабинет",
  'profile.subtitle': "Ваши данные и билеты",
  'profile.tabs.tickets': "Активные билеты",
  'profile.tabs.history': "История",
  'profile.tabs.settings': "Настройки",
  'profile.tickets.empty': "У вас пока нет активных билетов",
  'profile.tickets.find': "Найти рейсы",
  'profile.history.empty': "История поездок пуста",
  'profile.settings.name': "Имя и фамилия",
  'profile.settings.phone': "Номер телефона",
  'profile.settings.email': "Email",
  'profile.settings.save': "Сохранить",
  'profile.settings.success': "Данные сохранены!",
  'profile.ticket.download': "Скачать",
  'profile.ticket.cancel': "Отменить",
  'profile.ticket.status.pending': "В ожидании",
  'profile.ticket.status.confirmed': "Подтвержден",
  'profile.ticket.status.cancelled': "Отменен",
  'profile.ticket.seat': "Место",
  'profile.ticket.price': "Цена",
  'profile.ticket.date': "Покупка",
  'profile.driver.rides': "Мои рейсы",
  'profile.driver.add_ride': "Добавить рейс",
  'profile.driver.stop_sharing': "Остановить"
};

const newEn = {
  'profile.title': "Personal Cabinet",
  'profile.subtitle': "Your details and tickets",
  'profile.tabs.tickets': "Active tickets",
  'profile.tabs.history': "History",
  'profile.tabs.settings': "Settings",
  'profile.tickets.empty': "You have no active tickets yet",
  'profile.tickets.find': "Find rides",
  'profile.history.empty': "Trip history is empty",
  'profile.settings.name': "Full name",
  'profile.settings.phone': "Phone number",
  'profile.settings.email': "Email",
  'profile.settings.save': "Save",
  'profile.settings.success': "Data saved!",
  'profile.ticket.download': "Download",
  'profile.ticket.cancel': "Cancel",
  'profile.ticket.status.pending': "Pending",
  'profile.ticket.status.confirmed': "Confirmed",
  'profile.ticket.status.cancelled': "Cancelled",
  'profile.ticket.seat': "Seat",
  'profile.ticket.price': "Price",
  'profile.ticket.date': "Purchase",
  'profile.driver.rides': "My rides",
  'profile.driver.add_ride': "Add ride",
  'profile.driver.stop_sharing': "Stop"
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
console.log('LanguageContext updated for Profile');
