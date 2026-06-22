const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'www');

function safeClearDir(dir){
  if(!fs.existsSync(dir)){fs.mkdirSync(dir,{recursive:true});return}
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const target=path.join(dir,entry.name);
    try{
      fs.rmSync(target,{recursive:true,force:true,maxRetries:3,retryDelay:120});
    }catch(error){
      console.warn(`skip clearing ${entry.name}: ${error.message}`);
    }
  }
}

safeClearDir(out);
for(const name of ['index.html','ai-memory.js','v2.js','v2.css','manifest.json','sw.js','quick-add.html','小猫图标.jpg','小猫图标（2）.jpg','小猫图标（3）.jpg','小猫图标（4）.jpg'])fs.copyFileSync(path.join(root,name),path.join(out,name));
fs.cpSync(path.join(root,'icons'),path.join(out,'icons'),{recursive:true,force:true});
console.log('Prepared Capacitor web assets in v2/www');
