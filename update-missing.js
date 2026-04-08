import fs from 'fs';

const langFile = './src/context/LanguageContext.tsx';
let langContent = fs.readFileSync(langFile, 'utf8');

const missingUz = {
  'home.reviews.empty': "Hozircha fikrlar yo'q",
  'home.reviews.login_to_review': "Fikr qoldirish uchun tizimga kiring",
  'home.faq.subtitle': "Barcha savollaringizga batafsil javoblar",
  'home.contact.success_desc': "Sizning xabaringiz muvaffaqiyatli yuborildi. Biz tez orada bog'lanamiz.",
  'home.hero.search': "Reyslarni izlash"
};

const missingRu = {
  'home.reviews.empty': "Пока нет отзывов",
  'home.reviews.login_to_review': "Войдите, чтобы оставить отзыв",
  'home.faq.subtitle': "Подробные ответы на все ваши вопросы",
  'home.contact.success_desc': "Ваше сообщение успешно отправлено. Мы ответим вам в ближайшее время.",
  'home.hero.search': "Поиск рейсов"
};

const missingEn = {
  'home.reviews.empty': "No reviews yet",
  'home.reviews.login_to_review': "Log in to leave a review",
  'home.faq.subtitle': "Answers to all your questions",
  'home.contact.success_desc': "Your message has been sent successfully. We will contact you soon.",
  'home.hero.search': "Search for rides"
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

langContent = insertTranslations(langContent, 'uz', missingUz);
langContent = insertTranslations(langContent, 'ru', missingRu);
langContent = insertTranslations(langContent, 'en', missingEn);

fs.writeFileSync(langFile, langContent);
console.log('LanguageContext updated securely with missing keys.');
