const fs=require('fs');
const path=require('path');

const targets=[
  path.resolve(__dirname,'..','android','app','capacitor.build.gradle'),
  path.resolve(__dirname,'..','node_modules','@capacitor','android','capacitor','build.gradle'),
  path.resolve(__dirname,'..','node_modules','@capacitor','local-notifications','android','build.gradle')
];

let changed=0;
for(const target of targets){
  if(!fs.existsSync(target)){
    console.warn(`skip android java fix: missing ${target}`);
    continue;
  }
  const source=fs.readFileSync(target,'utf8');
  const updated=source
    .replace(/sourceCompatibility\s+JavaVersion\.VERSION_\d+/g,'sourceCompatibility JavaVersion.VERSION_17')
    .replace(/targetCompatibility\s+JavaVersion\.VERSION_\d+/g,'targetCompatibility JavaVersion.VERSION_17');
  if(updated!==source){
    fs.writeFileSync(target,updated,'utf8');
    changed++;
  }
}

if(changed){
  console.log(`Pinned Android compile options to Java 17 in ${changed} file(s)`);
}else{
  console.log('Android compile options already use Java 17');
}
