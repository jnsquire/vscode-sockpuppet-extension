# VSCode Sockpuppet - Extension Integration API

## Overview

VSCode Sockpuppet exposes a public API that allows other VS Code extensions to:
- Launch Python processes that can control VS Code
- Get the pipe path for direct communication
- Execute VS Code API methods programmatically
- Generate Python connection code

## Getting the API

```typescript
import * as vscode from 'vscode';

// Get the Sockpuppet extension
const sockpuppetExtension = vscode.extensions.getExtension('undefined_publisher.vscode-sockpuppet');

if (!sockpuppetExtension) {
    vscode.window.showErrorMessage('VSCode Sockpuppet is not installed');
    return;
}

// Activate if needed and get the API
const api = await sockpuppetExtension.activate();

// Now you can use the API
const pipePath = api.getPipePath();
console.log(`Sockpuppet is listening on: ${pipePath}`);
```

## API Reference

### `getPipePath(): string`

Returns the platform-specific pipe path where the Sockpuppet server is listening.

**Returns:**
- Windows: `\\.\pipe\vscode-sockpuppet`
- Unix/Linux/Mac: `/tmp/vscode-sockpuppet.sock`

**Example:**
```typescript
const pipePath = api.getPipePath();
console.log(`Connect to: ${pipePath}`);
```

---

### `isRunning(): boolean`

Checks if the Sockpuppet server is currently running and accepting connections.

**Returns:** `true` if server is active, `false` otherwise

**Example:**
```typescript
if (api.isRunning()) {
    console.log('Sockpuppet is ready');
} else {
    console.log('Sockpuppet is not running');
}
```

---

### `getPythonConnectionCode(): string`

Generates Python code snippet that connects to the current Sockpuppet instance.
Useful for generating scripts, documentation, or showing users how to connect.

**Returns:** Python code as a string

**Example:**
```typescript
const code = api.getPythonConnectionCode();
// Returns:
// from vscode_sockpuppet import VSCodeClient
//
// with VSCodeClient(pipe_path='\\.\pipe\vscode-sockpuppet') as vscode:
//     vscode.window.show_information_message("Hello from Python!")
```

---

### `getEnvironmentVariables(): { [key: string]: string }`

Returns environment variables that should be set when launching a Python process.
The Python client can read these variables to auto-configure the connection.

**Returns:** Object with environment variable names and values

**Environment Variables:**
- `VSCODE_SOCKPUPPET_PIPE` - The pipe path
- `VSCODE_PID` - The VS Code process ID

**Example:**
```typescript
const env = api.getEnvironmentVariables();
// { 
//   'VSCODE_SOCKPUPPET_PIPE': '\\.\pipe\vscode-sockpuppet',
//   'VSCODE_PID': '12345'
// }
```

---

### `executeMethod(method: string, params?: any): Promise<any>`

Execute a VS Code API method directly through Sockpuppet without launching Python.
This is useful for extensions that want to use Sockpuppet's method infrastructure.

**Parameters:**
- `method` - The method name (e.g., 'window.showInformationMessage')
- `params` - Optional parameters object

**Returns:** Promise that resolves with the result

**Example:**
```typescript
// Show a message
const result = await api.executeMethod('window.showInformationMessage', {
    message: 'Hello from another extension!',
    items: ['OK', 'Cancel']
});
console.log(`User clicked: ${result}`);

// Get workspace folders
const folders = await api.executeMethod('workspace.workspaceFolders');
console.log('Workspace folders:', folders);
```

## Complete Example: Launching Python with Sockpuppet

Here's a complete example of an extension that launches a Python script with Sockpuppet integration:

```typescript
import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';

export async function activate(context: vscode.ExtensionContext) {
    // Register a command to run a Python script
    const disposable = vscode.commands.registerCommand('myextension.runPythonScript', async () => {
        // Get Sockpuppet API
        const sockpuppetExt = vscode.extensions.getExtension('undefined_publisher.vscode-sockpuppet');
        
        if (!sockpuppetExt) {
            vscode.window.showErrorMessage('VSCode Sockpuppet extension is required');
            return;
        }

        const api = await sockpuppetExt.activate();

        if (!api.isRunning()) {
            vscode.window.showErrorMessage('Sockpuppet server is not running');
            return;
        }

        // Get environment variables for Python
        const env = {
            ...process.env,
            ...api.getEnvironmentVariables()
        };

        // Path to your Python script
        const scriptPath = path.join(context.extensionPath, 'scripts', 'automation.py');

        // Launch Python with environment variables
        const pythonProcess = child_process.spawn('python', [scriptPath], {
            env,
            cwd: context.extensionPath
        });

        pythonProcess.stdout.on('data', (data) => {
            console.log(`Python: ${data}`);
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python Error: ${data}`);
        });

        pythonProcess.on('close', (code) => {
            console.log(`Python process exited with code ${code}`);
        });

        vscode.window.showInformationMessage('Python automation started!');
    });

    context.subscriptions.push(disposable);
}
```

## Python Script Using Environment Variables

Your Python script can automatically detect the pipe path:

```python
import os
from vscode_sockpuppet import VSCodeClient

# Read pipe path from environment variable
pipe_path = os.environ.get('VSCODE_SOCKPUPPET_PIPE')

if not pipe_path:
    print("Error: VSCODE_SOCKPUPPET_PIPE environment variable not set")
    exit(1)

# Connect to VS Code
with VSCodeClient(pipe_path=pipe_path) as vscode:
    vscode.window.show_information_message("Connected via environment variable!")
    
    # Your automation code here
    folders = vscode.workspace.get_workspace_folders()
    print(f"Workspace folders: {folders}")
```

## Use Cases

### 1. **AI/ML Extensions**

Launch Python scripts that use ML libraries while controlling VS Code UI:

```typescript
// Launch a Python script that uses TensorFlow/PyTorch
// and reports progress via VS Code notifications
const api = await getSockpuppetAPI();
launchMLTraining(api.getEnvironmentVariables());
```

### 2. **Testing Automation**

Create test scripts that interact with VS Code:

```typescript
// Run end-to-end tests that control VS Code
const api = await getSockpuppetAPI();
await api.executeMethod('window.showInformationMessage', {
    message: 'Starting test suite...'
});
runTests(api.getPipePath());
```

### 3. **Data Science Workflows**

Integration with Jupyter notebooks or data analysis:

```typescript
// Launch Python data analysis that updates VS Code UI
const api = await getSockpuppetAPI();
launchDataAnalysis(api.getEnvironmentVariables());
```

### 4. **Build/Deploy Scripts**

Python deployment scripts that show progress in VS Code:

```typescript
// Deployment script that updates status bar and shows results
const api = await getSockpuppetAPI();
runDeployment(api.getPipePath());
```

## TypeScript Type Definitions

For TypeScript extensions, you can copy the API interface:

```typescript
interface SockpuppetAPI {
    getPipePath(): string;
    isRunning(): boolean;
    getPythonConnectionCode(): string;
    getEnvironmentVariables(): { [key: string]: string };
    executeMethod(method: string, params?: any): Promise<any>;
}
```

## Error Handling

Always check if Sockpuppet is installed and running:

```typescript
async function useSockpuppet() {
    const ext = vscode.extensions.getExtension('undefined_publisher.vscode-sockpuppet');
    
    if (!ext) {
        throw new Error('VSCode Sockpuppet is not installed');
    }

    const api = await ext.activate();

    if (!api.isRunning()) {
        throw new Error('VSCode Sockpuppet server is not running');
    }

    return api;
}
```

## Best Practices

1. **Check for Sockpuppet** - Always verify the extension is installed before using it
2. **Handle Errors** - Wrap API calls in try-catch blocks
3. **Environment Variables** - Use `getEnvironmentVariables()` for cleaner Python integration
4. **Process Management** - Properly manage spawned Python processes (cleanup on deactivation)
5. **User Feedback** - Show status messages when launching Python scripts

## Support

For issues or questions:
- Extension repository: [GitHub](https://github.com/your-repo/vscode-sockpuppet)
- File bugs: [Issues](https://github.com/your-repo/vscode-sockpuppet/issues)
