const fs = require('fs');

const homeFile = './src/pages/Home.tsx';
let content = fs.readFileSync(homeFile, 'utf8');

const replacements = [
  ['Mavjud reyslar', "{t('home.rides.title')}"],
  ["Eng mos vaqtni tanlang va o'z o'rningizni band qiling.", "{t('home.rides.subtitle')}"],
  ['Bugun', "{t('home.search.today')}"],
  ['Ertaga', "{t('home.search.tomorrow')}"],
  ['Haftalik', "{t('home.search.weekly')}"],
  ['Qatnovlar qidirilmoqda...', "{t('home.rides.loading')}"],
  ['Tavsiya etiladi', "{t('home.rides.recommended')}"],
  ['Chipta narxi', "{t('home.rides.price')}"],
  ["Jo'nash", "{t('home.rides.departure')}"],
  ['Kelish', "{t('home.rides.arrival')}"],
  ["ta o'rin qoldi", "{t('home.rides.seats_left')}"],
  ["O'rindiq tanlash", "{t('home.rides.book_btn')}"],
  ['Haydovchi', "{t('home.rides.driver')}"],
  ["Avtobus ma'lumotlari", "{t('home.rides.bus_info')}"],
  ['Qulayliklar', "{t('home.rides.amenities')}"],
  ['Konditsioner', "{t('home.rides.ac')}"],
  ['Rozetka', "{t('home.rides.socket')}"],
  ['Suv', "{t('home.rides.water')}"],
  ["O'rindiqni tanlang", "{t('home.rides.select_seat')}"],
  ["Tanlangan o'rindiq", "{t('home.rides.selected_seat')}"],
  ['Davom etish', "{t('home.rides.continue')}"],
  ['Bekor qilish', "{t('home.rides.cancel')}"],
  ["To'lov usulini tanlang", "{t('home.payment.title')}"],
  ['Karta orqali (Stripe)', "{t('home.payment.card')}"],
  ["Karta raqamiga o'tkazish", "{t('home.payment.manual')}"],
  ["Quyidagi karta raqamiga pul o'tkazing va chekni yuklang", "{t('home.payment.manual_desc')}"],
  ['Chekni yuklash', "{t('home.payment.upload_receipt')}"],
  ["To'lovni tasdiqlash", "{t('home.payment.confirm')}"],
  ["To'lov tekshirilmoqda...", "{t('home.payment.processing')}"],
  ["Biz bilan bog'lanish", "{t('home.contact.title')}"],
  ["Savollaringiz bormi? Bizga yozing", "{t('home.contact.subtitle')}"],
  ['Ismingiz', "{t('home.contact.name')}"],
  ['Telefon yoki Email', "{t('home.contact.contact')}"],
  ['Xabaringiz', "{t('home.contact.message')}"],
  ['Yuborish', "{t('home.contact.send')}"],
  ['Mijozlar fikrlari', "{t('home.reviews.title')}"],
  ['Bizning xizmatlarimiz haqida mijozlarimiz nima deydi?', "{t('home.reviews.subtitle')}"],
  ['Fikr qoldirish', "{t('home.reviews.add')}"],
  ['Baho', "{t('home.reviews.rating')}"],
  ['Fikringiz', "{t('home.reviews.comment')}"],
  ["Yo'lovchilar", "{t('home.stats.passengers')}"],
  ['Qatnovlar', "{t('home.stats.routes')}"],
  ['Haydovchilar', "{t('home.stats.drivers')}"],
  ['Yillik tajriba', "{t('home.stats.experience')}"],
  ["TezChipta - O'zbekiston bo'ylab xavfsiz va qulay avtobus qatnovlari.", "{t('home.footer.about')}"],
  ['Foydali havolalar', "{t('home.footer.links')}"],
  ['Aloqa', "{t('home.footer.contact')}"],
  ['Barcha huquqlar himoyalangan.', "{t('home.footer.rights')}"],
  ['Nega aynan biz?', "{t('home.features.title')}"],
  ['Biz bilan sayohat qilishning afzalliklari', "{t('home.features.subtitle')}"],
  ['Tez va qulay', "{t('home.features.f1_title')}"],
  ['Chiptalarni uydan chiqmasdan, 1 daqiqada xarid qiling.', "{t('home.features.f1_desc')}"],
  ["Xavfsiz to'lov", "{t('home.features.f2_title')}"],
  ["Barcha to'lovlar himoyalangan va xavfsiz.", "{t('home.features.f2_desc')}"],
  ["24/7 Qo'llab-quvvatlash", "{t('home.features.f3_title')}"],
  ["Har qanday savol bo'yicha yordam berishga tayyormiz.", "{t('home.features.f3_desc')}"],
  ['Qulay avtobuslar', "{t('home.features.f4_title')}"],
  ['Barcha avtobuslarimiz zamonaviy va qulayliklarga ega.', "{t('home.features.f4_desc')}"]
];

replacements.forEach(([oldText, newText]) => {
  // Replace text inside JSX tags
  content = content.replace(new RegExp(`>\\s*${oldText}\\s*<`, 'g'), `>${newText}<`);
  
  // Replace text inside quotes (for placeholders)
  content = content.replace(new RegExp(`placeholder="${oldText}"`, 'g'), `placeholder={${newText.replace(/^{|}$/g, '')}}`);

  // Replace text inside ternary operators or expressions
  content = content.replace(new RegExp(`'${oldText}'`, 'g'), newText.replace(/^{|}$/g, ''));
  content = content.replace(new RegExp(`"${oldText}"`, 'g'), newText.replace(/^{|}$/g, ''));
});

fs.writeFileSync(homeFile, content);
console.log('Home.tsx updated');
