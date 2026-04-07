import fs from 'fs';

const files = [
  './src/pages/Home.tsx',
  './src/pages/Blog.tsx',
  './src/pages/TermsOfService.tsx',
  './src/pages/Admin.tsx',
  './src/pages/PrivacyPolicy.tsx',
  './src/pages/Login.tsx',
  './src/pages/Profile.tsx',
  './src/pages/Register.tsx',
  './src/components/NetworkSpeedIndicator.tsx'
];

const URL = 'https://imagehosting-hulf.onrender.com/uploads/743d26dac03143284afd0f450db04d85.png';

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Add import if not present
    if (file !== './src/pages/Admin.tsx' && file !== './src/components/NetworkSpeedIndicator.tsx') {
      if (!content.includes('useSettings')) {
        content = content.replace(/import React/, "import { useSettings } from '../context/SettingsContext';\nimport React");
        if (!content.includes('useSettings')) {
            content = "import { useSettings } from '../context/SettingsContext';\n" + content;
        }
      }
      
      // Add const { logoUrl } = useSettings(); inside the component
      const componentMatch = content.match(/export (const|default function) ([A-Za-z0-9_]+)[^\{]*\{/);
      if (componentMatch && !content.includes('const { logoUrl } = useSettings()')) {
        content = content.replace(componentMatch[0], componentMatch[0] + "\n  const { logoUrl } = useSettings();");
      }
    }

    if (file === './src/components/NetworkSpeedIndicator.tsx') {
        if (!content.includes('useSettings')) {
            content = "import { useSettings } from '../context/SettingsContext';\n" + content;
        }
        const componentMatch = content.match(/export const NetworkSpeedIndicator = \(\) => \{/);
        if (componentMatch && !content.includes('const { logoUrl } = useSettings()')) {
            content = content.replace(componentMatch[0], componentMatch[0] + "\n  const { logoUrl } = useSettings();");
        }
    }

    // Replace URL
    if (file === './src/components/NetworkSpeedIndicator.tsx') {
        content = content.replace(`'${URL}?cache_bust='`, '`${logoUrl}?cache_bust=`');
    } else {
        content = content.replace(new RegExp(`"${URL}"`, 'g'), '{logoUrl}');
    }

    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
