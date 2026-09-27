/* 
   ___  _____    ___
  /   ||  _  |  /   | _
 / /| || |/' | / /| |(_)
/ /_| ||  /| |/ /_| |
\_CONEXIÓN INESTABLE| _
    |_/ \___/     |_/(_)

  https://angeldivinopsv.vercel.app/

*/
const fs = require('fs');
const path = require('path');

const targetFile = 'n:/Angel Divino/js/modules/ranking.js';

try {
    let contentBytes = fs.readFileSync(targetFile);
    // Convert to string using latin1 to preserve arbitrary non-utf8 bytes
    let content = contentBytes.toString('latin1');

    // Replace the exact badge array
    content = content.replace(
        /const RANK_BADGES = \["\?\?", "\?\?", "\?\?"\];/g,
        'const RANK_BADGES = ["🥇", "🥈", "🥉"];'
    );

    // Also try normal replace if previous didn't match due to exact string differences
    content = content.replace('const RANK_BADGES = ["??", "??", "??"];', 'const RANK_BADGES = ["🥇", "🥈", "🥉"];');

    // We write back in UTF-8 so the emojis work parsing in browser correctly, 
    // though the browser interprets the whole file as utf-8 and that's why it was failing before.
    fs.writeFileSync(targetFile, content, 'utf8');

    console.log('Successfully updated the medals in ranking.js');
    process.exit(0);
} catch (e) {
    console.error('Error:', e);
    process.exit(1);
}
