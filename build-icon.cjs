const fs = require('fs');
const b64 = fs.readFileSync('public/favicon.png').toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="transparent"/>
  <image href="data:image/png;base64,${b64}" x="0" y="0" width="512" height="512" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
fs.writeFileSync('public/pwa-icon.svg', svg);
console.log('pwa-icon.svg generated successfully');
