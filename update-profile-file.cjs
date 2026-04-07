const fs = require('fs');

const file = './src/pages/Profile.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  ['Shaxsiy kabinet', "{t('profile.title')}"],
  ["Ma'lumotlaringiz va chiptalaringiz", "{t('profile.subtitle')}"],
  ['Faol chiptalar', "{t('profile.tabs.tickets')}"],
  ['Tarix', "{t('profile.tabs.history')}"],
  ['Sozlamalar', "{t('profile.tabs.settings')}"],
  ["Sizda hozircha faol chiptalar yo'q", "{t('profile.tickets.empty')}"],
  ['Qatnovlarni izlash', "{t('profile.tickets.find')}"],
  ["Sayohatlar tarixi bo'sh", "{t('profile.history.empty')}"],
  ['Ism va familiya', "{t('profile.settings.name')}"],
  ['Telefon raqam', "{t('profile.settings.phone')}"],
  ['Email', "{t('profile.settings.email')}"],
  ['Saqlash', "{t('profile.settings.save')}"],
  ['Yuklab olish', "{t('profile.ticket.download')}"],
  ['Bekor qilish', "{t('profile.ticket.cancel')}"],
  ['Kutilmoqda', "{t('profile.ticket.status.pending')}"],
  ['Tasdiqlangan', "{t('profile.ticket.status.confirmed')}"],
  ['Bekor qilingan', "{t('profile.ticket.status.cancelled')}"],
  ["O'rindiq", "{t('profile.ticket.seat')}"],
  ['Narxi', "{t('profile.ticket.price')}"],
  ['Xarid', "{t('profile.ticket.date')}"],
  ['Mening qatnovlarim', "{t('profile.driver.rides')}"],
  ["Qatnov qo'shish", "{t('profile.driver.add_ride')}"],
  ["To'xtatish", "{t('profile.driver.stop_sharing')}"]
];

// Add useLanguage if not present
if (!content.includes('useLanguage')) {
  content = content.replace(/import React/, "import { useLanguage } from '../context/LanguageContext';\nimport React");
  const componentMatch = content.match(/export default function ([A-Za-z0-9_]+)[^\{]*\{/);
  if (componentMatch && !content.includes('const { t } = useLanguage()')) {
    content = content.replace(componentMatch[0], componentMatch[0] + "\n  const { t } = useLanguage();");
  }
}

replacements.forEach(([oldText, newText]) => {
  content = content.replace(new RegExp(`>\\s*${oldText}\\s*<`, 'g'), `>${newText}<`);
  content = content.replace(new RegExp(`placeholder="${oldText}"`, 'g'), `placeholder={${newText.replace(/^{|}$/g, '')}}`);
  content = content.replace(new RegExp(`'${oldText}'`, 'g'), newText.replace(/^{|}$/g, ''));
  content = content.replace(new RegExp(`"${oldText}"`, 'g'), newText.replace(/^{|}$/g, ''));
});

// Fix specific cases
content = content.replace(/Xarid: /g, "{t('profile.ticket.date')}: ");

fs.writeFileSync(file, content);
console.log(`${file} updated`);
