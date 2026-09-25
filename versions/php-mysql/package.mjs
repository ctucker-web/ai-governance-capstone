import {mkdirSync,copyFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const source=fileURLToPath(new URL('.',import.meta.url));
const target=resolve(process.argv[2] || '.local/php-mysql-release');
function copy(from,to) {
  mkdirSync(to,{recursive:true});
  for(const entry of readdirSync(from,{withFileTypes:true})) {
    if(entry.name==='deployment-path.php') continue;
    if(entry.isDirectory()) copy(join(from,entry.name),join(to,entry.name));
    else copyFileSync(join(from,entry.name),join(to,entry.name));
  }
}
for(const dir of ['app','bin','database']) copy(join(source,dir),join(target,'private',dir));
copy(join(source,'public'),join(target,'public'));
copyFileSync(join(source,'config.example.php'),join(target,'private/config.example.php'));
copyFileSync(join(source,'README.md'),join(target,'README.md'));
writeFileSync(join(target,'public/deployment-path.php'),"<?php\nreturn '/home/chrrai4/ai-governance-php/app/bootstrap.php';\n");
console.log('Release prepared at '+target+'; configuration and secrets are excluded.');
