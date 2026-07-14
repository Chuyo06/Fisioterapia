const { Jimp } = require('jimp');

async function resize() {
  try {
    const image = await Jimp.read('public/favicon.png');
    
    const img192 = image.clone().resize({ w: 192, h: 192 });
    await img192.write('public/pwa-192x192.png');
    
    const img512 = image.clone().resize({ w: 512, h: 512 });
    await img512.write('public/pwa-512x512.png');
    
    console.log('Images resized successfully');
  } catch (err) {
    console.error(err);
  }
}

resize();
