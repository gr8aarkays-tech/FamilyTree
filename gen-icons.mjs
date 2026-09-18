import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

fs.mkdirSync(path.join(__dirname, 'public', 'icons'), { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
sizes.forEach(s => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#3b82f6"/><circle cx="50" cy="38" r="26" fill="white"/><rect x="44" y="60" width="12" height="22" fill="#bfdbfe"/></svg>`;
  fs.writeFileSync(path.join(__dirname, 'public', 'icons', 'icon-' + s + '.svg'), svg);
  console.log('Created icon-' + s + '.svg');
});
