import fs from 'fs';
import https from 'https';

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

async function fix() {
  try {
    console.log('Downloading 192x192 logo...');
    await download('https://placehold.co/192x192/10b981/ffffff/png?text=TC', './public/logo-192x192.png');
    
    console.log('Downloading 512x512 logo...');
    await download('https://placehold.co/512x512/10b981/ffffff/png?text=TC', './public/logo-512x512.png');
    
    console.log('Downloading main logo...');
    await download('https://placehold.co/512x512/10b981/ffffff/png?text=TezChipta', './public/logo.png');
    
    console.log('All logos downloaded successfully!');
  } catch (error) {
    console.error('Failed to download logos:', error);
  }
}

fix();
