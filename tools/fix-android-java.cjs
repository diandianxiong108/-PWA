const fs=require('fs');
const path=require('path');

const target=path.resolve(__dirname,'..','android','app','capacitor.build.gradle');

if(!fs.existsSync(target)){
  console.warn(`skip android java fix: missing ${target}`);
  process.exit(0);
}

const source=fs.readFileSync(target,'utf8');
const updated=source
  .replace(/sourceCompatibility\s+JavaVersion\.VERSION_\d+/g,'sourceCompatibility JavaVersion.VERSION_17')
  .replace(/targetCompatibility\s+JavaVersion\.VERSION_\d+/g,'targetCompatibility JavaVersion.VERSION_17');

if(updated!==source){
  fs.writeFileSync(target,updated,'utf8');
  console.log('Pinned Capacitor Android compile options to Java 17');
}else{
  console.log('Android compile options already use Java 17');
}
