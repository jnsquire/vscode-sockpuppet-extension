/**
 * Example: How to use VSCode Sockpuppet API from another extension
 * 
 * This example shows how to integrate with VSCode Sockpuppet to launch
 * Python scripts that can control VS Code.
 */

import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';

// Import the API type definition
interface SockpuppetAPI {
    getPipePath(): string;
    isRunning(): boolean;
    getPythonConnectionCode(): string;
    getEnvironmentVariables(): { [key: string]: string };
    executeMethod(method: string, params?: any): Promise<any>;
}

/**
 * Get the Sockpuppet API
 */
async function getSockpuppetAPI(): Promise<SockpuppetAPI> {
    const extensionId = 'undefined_publisher.vscode-sockpuppet';
    const extension = vscode.extensions.getExtension<SockpuppetAPI>(extensionId);
    
    if (!extension) {
        throw new Error('VSCode Sockpuppet extension is not installed. Please install it from the marketplace.');
    }

    const api = await extension.activate();

    if (!api.isRunning()) {
        throw new Error('VSCode Sockpuppet server is not running. Please restart VS Code.');
    }

    return api;
}

/**
 * Example 1: Show Python connection info
 */
async function showConnectionInfo() {
    try {
        const api = await getSockpuppetAPI();
        
        const pipePath = api.getPipePath();
        const code = api.getPythonConnectionCode();
        
        // Create a new document with connection info
        const doc = await vscode.workspace.openTextDocument({
            content: `# VSCode Sockpuppet Connection Info\n\nPipe Path: ${pipePath}\n\n## Python Code:\n\n${code}`,
            language: 'python'
        });
        
        await vscode.window.showTextDocument(doc);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to get Sockpuppet info: ${error}`);
    }
}

/**
 * Example 2: Launch a Python script with Sockpuppet
 */
async function launchPythonScript(scriptPath: string) {
    try {
        const api = await getSockpuppetAPI();
        const env = {
            ...process.env,
            ...api.getEnvironmentVariables()
        };

        // Launch Python process
        const python = child_process.spawn('python', [scriptPath], { env });

        // Handle output
        python.stdout.on('data', (data) => {
            console.log(`[Python] ${data}`);
        });

        python.stderr.on('data', (data) => {
            console.error(`[Python Error] ${data}`);
        });

        python.on('close', (code) => {
            if (code === 0) {
                vscode.window.showInformationMessage('Python script completed successfully');
            } else {
                vscode.window.showErrorMessage(`Python script exited with code ${code}`);
            }
        });

        vscode.window.showInformationMessage(`Launched: ${path.basename(scriptPath)}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to launch Python: ${error}`);
    }
}

/**
 * Example 3: Execute VS Code methods directly
 */
async function executeVSCodeMethods() {
    try {
        const api = await getSockpuppetAPI();

        // Show a message and get response
        const response = await api.executeMethod('window.showInformationMessage', {
            message: 'Which action would you like to perform?',
            items: ['Create File', 'Open Terminal', 'Get Workspace Info']
        });

        switch (response) {
            case 'Create File':
                await api.executeMethod('workspace.openTextDocument', {
                    content: '# New file created via Sockpuppet API',
                    language: 'markdown'
                });
                break;

            case 'Open Terminal':
                await api.executeMethod('window.createTerminal', {
                    name: 'Sockpuppet Terminal',
                    text: 'echo "Hello from Sockpuppet API"',
                    show: true
                });
                break;

            case 'Get Workspace Info':
                const folders = await api.executeMethod('workspace.workspaceFolders');
                vscode.window.showInformationMessage(`Workspace folders: ${JSON.stringify(folders)}`);
                break;
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error: ${error}`);
    }
}

/**
 * Example 4: Run Python with live progress updates
 */
async function runPythonWithProgress(scriptPath: string) {
    try {
        const api = await getSockpuppetAPI();

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Running Python Script',
                cancellable: true
            },
            async (progress, token) => {
                return new Promise<void>((resolve, reject) => {
                    const env = {
                        ...process.env,
                        ...api.getEnvironmentVariables()
                    };

                    const python = child_process.spawn('python', [scriptPath], { env });

                    // Cancel handler
                    token.onCancellationRequested(() => {
                        python.kill();
                        reject(new Error('Cancelled by user'));
                    });

                    python.stdout.on('data', (data) => {
                        const message = data.toString().trim();
                        progress.report({ message });
                    });

                    python.on('close', (code) => {
                        if (code === 0) {
                            resolve();
                        } else {
                            reject(new Error(`Exit code: ${code}`));
                        }
                    });
                });
            }
        );

        vscode.window.showInformationMessage('Python script completed!');
    } catch (error) {
        vscode.window.showErrorMessage(`Error: ${error}`);
    }
}

/**
 * Example 5: Create a Python automation command
 */
export function activate(context: vscode.ExtensionContext) {
    // Register commands that use Sockpuppet

    const showInfo = vscode.commands.registerCommand('extension.sockpuppet.showInfo', showConnectionInfo);
    
    const runScript = vscode.commands.registerCommand('extension.sockpuppet.runScript', async () => {
        const scriptPath = path.join(context.extensionPath, 'python', 'automation.py');
        await launchPythonScript(scriptPath);
    });

    const executeMethods = vscode.commands.registerCommand('extension.sockpuppet.execute', executeVSCodeMethods);

    context.subscriptions.push(showInfo, runScript, executeMethods);

    // Show a welcome message
    vscode.window.showInformationMessage('Extension with Sockpuppet integration loaded!');
}

export function deactivate() {
    // Cleanup if needed
}
