const { execSync } = require('child_process');

// Determine the operating system type
const os = require('os');
const osType = os.platform();

// Define the command to execute based on the OS
let command;
if (osType.match(/aix|darwin|freebsd|linux|openbsd|sunos|android/)) {
    command =
        'test -f chain_params.json || cp chain_params.prod.json chain_params.json';
} else if (osType.match(/win32/)) {
    command =
        'if not exist chain_params.json copy chain_params.prod.json chain_params.json';
} else {
    console.error('Unsupported operating system');
    process.exit(1);
}

// Execute the command
try {
    execSync(command, { stdio: 'inherit' });
    console.log('Postinstall script executed successfully');
} catch (error) {
    console.error('Error executing postinstall script:', error);
    process.exit(1);
}
