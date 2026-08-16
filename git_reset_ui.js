import fs from 'fs';
import path from 'path';
import git from 'isomorphic-git';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  try {
    const dir = __dirname;
    
    const filesToReset = [
      'index.html',
      'src/App.css',
      'src/components/CalendarView.tsx',
      'src/components/ReminderForm.css',
      'src/components/ReminderForm.tsx',
      'src/components/ReminderList.css',
      'src/utils/theme.ts'
    ];

    console.log("Resetting files...");
    await git.checkout({
      fs,
      dir,
      filepaths: filesToReset,
      force: true
    });
    
    console.log("Successfully reset UI files to their original state.");
  } catch(err) {
    console.error(err);
  }
}
run();
