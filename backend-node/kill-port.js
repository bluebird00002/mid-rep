// Quick script to kill process on port 3000
// Usage: node kill-port.js [port]

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const port = process.argv[2] || '3000';

async function killPort() {
  try {
    console.log(`Finding process on port ${port}...`);
    
    // Windows command
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    const lines = stdout.trim().split('\n');
    
    if (lines.length === 0) {
      console.log(`No process found on port ${port}`);
      return;
    }
    
    // Extract PID from first line
    const pidMatch = lines[0].match(/\s+(\d+)$/);
    if (!pidMatch) {
      console.log('Could not find PID');
      return;
    }
    
    const pid = pidMatch[1];
    console.log(`Killing process ${pid}...`);
    
    await execAsync(`taskkill /PID ${pid} /F`);
    console.log(`✅ Process ${pid} killed successfully!`);
    console.log(`You can now start the server with: npm run dev`);
  } catch (error) {
    if (error.message.includes('No process found')) {
      console.log(`No process found on port ${port}`);
    } else {
      console.error('Error:', error.message);
    }
  }
}

killPort();

