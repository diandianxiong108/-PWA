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
function copyFileFresh(name){
  const src=path.join(root,name),dest=path.join(out,name);
  try{
    if(fs.existsSync(dest))fs.chmodSync(dest,0o666);
  }catch(error){}
  try{
    fs.copyFileSync(src,dest);
  }catch(error){
    try{
      fs.rmSync(dest,{force:true});
      fs.copyFileSync(src,dest);
    }catch(second){
      throw new Error(`failed to copy ${name}: ${second.message}`);
    }
  }
}
for(const name of ['index.html','ai-memory.js','v2.js','v2.css','homev2-shell.js','homev2-shell.css','manifest.json','version.json','sw.js','quick-add.html','小猫图标.jpg','小猫图标（2）.jpg','小猫图标（3）.jpg','小猫图标（4）.jpg'])copyFileFresh(name);
fs.cpSync(path.join(root,'icons'),path.join(out,'icons'),{recursive:true,force:true});
if(fs.existsSync(path.join(root,'assets'))){
  fs.cpSync(path.join(root,'assets'),path.join(out,'assets'),{recursive:true,force:true});
}
console.log('Prepared Capacitor web assets in v2/www');
