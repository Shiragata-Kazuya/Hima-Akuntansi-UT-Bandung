const fs = require('fs');

// Ganti dengan nama file JSON kamu!
const serviceAccountPath = './firebase-key.json';

// Baca file JSON
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Encode private key to base64
const privateKeyBase64 = Buffer.from(serviceAccount.private_key).toString('base64');

console.log('\n=== FIREBASE_PRIVATE_KEY_BASE64 ===');
console.log(privateKeyBase64);
console.log('===================================\n');