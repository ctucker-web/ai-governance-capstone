import { spawn } from 'node:child_process';
import { mkdirSync, appendFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const phase=process.argv[2]||'verification';
if(!/^[a-z0-9-]+$/.test(phase))throw new Error('Use a lowercase phase name.');
mkdirSync('.local/validation',{recursive:true});
const log=path.resolve('.local/validation',`${phase}.log`);
writeFileSync(log,`Verification ${phase} started ${new Date().toISOString()}\nNode ${process.version}; ${process.platform}\n`);
const commands=[
  ['lint',['node_modules/eslint/bin/eslint.js','.']],
  ['prisma-generate',['node_modules/prisma/build/index.js','generate']],
  ['typecheck',['node_modules/typescript/bin/tsc','--noEmit']],
  ['unit-tests',['node_modules/vitest/vitest.mjs','run']],
  ['test-database',['scripts/prepare-test-db.mjs']],
  ['integration-tests',['node_modules/vitest/vitest.mjs','run','--config','vitest.integration.config.ts']],
  ['production-build',['node_modules/next/dist/bin/next','build']],
  ['browser-tests',['node_modules/@playwright/test/cli.js','test']],
];
const results=[];
for(const [name,args] of commands){
  console.log(`\n[${phase}] ${name}`);appendFileSync(log,`\n## ${name}\n`);
  const started=Date.now();
  const code=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,args,{env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});
    for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{process.stdout.write(chunk);appendFileSync(log,chunk);});
    child.on('error',reject);child.on('close',resolve);
  });
  results.push({name,exitCode:code,milliseconds:Date.now()-started});
  writeFileSync(path.resolve('.local/validation',`${phase}.json`),JSON.stringify({phase,timestamp:new Date().toISOString(),results},null,2));
  if(code!==0){console.error(`Gate failed: ${name}. Later checks were not run.`);process.exit(code||1);}
}
console.log(`All ${phase} gates passed. Evidence: .local/validation/${phase}.log`);
