import fs from 'fs';
import path from 'path';
import git from 'isomorphic-git';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  try {
    const dir = __dirname;
    
    // Check status of files
    const status = await git.statusMatrix({ fs, dir });
    
    console.log("Modified files:");
    const modified = status.filter(row => row[1] !== row[2] || row[2] !== row[3]);
    for (const [filepath, head, workdir, stage] of modified) {
      console.log(`${filepath}: HEAD=${head} WORKDIR=${workdir} STAGE=${stage}`);
    }
  } catch(err) {
    console.error(err);
  }
}
run();
