import fs from 'fs';
import path from 'path';

const LOGO_URL = 'https://imagehosting-hulf.onrender.com/uploads/743d26dac03143284afd0f450db04d85.png';

const filesToUpdate = [
  './src/components/FloatingMenu.tsx',
  './src/components/SafeImage.tsx',
  './src/components/NetworkSpeedIndicator.tsx',
  './src/pages/Home.tsx',
  './src/pages/Blog.tsx',
  './src/pages/TermsOfService.tsx',
  './src/pages/Admin.tsx',
  './src/pages/PrivacyPolicy.tsx',
  './src/pages/Login.tsx',
  './src/pages/Profile.tsx',
  './src/pages/Register.tsx',
  './index.html'
];

filesToUpdate.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace /logo.png with the new URL
    content = content.replace(/"\/logo\.png"/g, `"${LOGO_URL}"`);
    content = content.replace(/'\/logo\.png'/g, `'${LOGO_URL}'`);
    
    // Replace https://tezchipta.onrender.com/logo.png in index.html
    content = content.replace(/https:\/\/tezchipta\.onrender\.com\/logo\.png/g, LOGO_URL);
    
    // Fix NetworkSpeedIndicator if it has cache_bust
    content = content.replace(new RegExp(`'${LOGO_URL}\\?cache_bust='`, 'g'), `'${LOGO_URL}?cache_bust='`);
    content = content.replace(new RegExp(`"${LOGO_URL}\\?cache_bust="`, 'g'), `"${LOGO_URL}?cache_bust="`);

    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
