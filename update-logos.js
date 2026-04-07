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

async function updateLogos() {
  const url = 'https://imagehosting-hulf.onrender.com/uploads/743d26dac03143284afd0f450db04d85.png';
  try {
    console.log('Downloading new logo...');
    await download(url, './public/logo.png');
    await download(url, './public/logo-192x192.png');
    await download(url, './public/logo-512x512.png');
    console.log('All logos updated successfully!');
  } catch (error) {
    console.error('Failed to download logos:', error);
  }
}

updateLogos();
