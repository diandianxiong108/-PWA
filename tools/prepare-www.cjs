const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'www');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
for(const name of ['index.html','ai-memory.js','v2.js','v2.css','manifest.json','sw.js','quick-add.html','小猫图标.jpg','小猫图标（2）.jpg','小猫图标（3）.jpg','小猫图标（4）.jpg'])fs.copyFileSync(path.join(root,name),path.join(out,name));
fs.cpSync(path.join(root,'icons'),path.join(out,'icons'),{recursive:true});
console.log('Prepared Capacitor web assets in v2/www');
