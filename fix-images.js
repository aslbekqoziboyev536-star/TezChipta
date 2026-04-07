import fs from 'fs';

// 1x1 transparent PNG
const pngData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==', 'base64');

fs.writeFileSync('./public/logo.png', pngData);
fs.writeFileSync('./public/logo-192x192.png', pngData);
fs.writeFileSync('./public/logo-512x512.png', pngData);

console.log('Created valid PNG files');
