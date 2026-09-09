const fs = require('fs');
const content = fs.readFileSync('server/music/song-dna.ts', 'utf-8');
console.log(content.substring(0, 1000));
