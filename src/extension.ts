// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { VSCodeServer } from './server';
import { SockpuppetAPI } from './api';

let server: VSCodeServer | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;
let extensionContext: vscode.ExtensionContext | undefined;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext): SockpuppetAPI {
	console.log('VSCode Sockpuppet extension is now active!');

	// Store context for deactivate function
	extensionContext = context;

	// Start the server for Python communication
	server = new VSCodeServer(context);
	server.start();

	// Set environment variable for terminals
	const pipePath = server.getPipePath();
	const envCollection = context.environmentVariableCollection;
	envCollection.replace('VSCODE_SOCKPUPPET_PIPE', pipePath);
	envCollection.description = 'VSCode Sockpuppet IPC configuration';

	// Create status bar item to show pipe path
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.text = `$(plug) Sockpuppet`;
	statusBarItem.tooltip = `Sockpuppet IPC: ${pipePath}\nClick to copy pipe path`;
	statusBarItem.command = 'vscode-sockpuppet.copyPipePath';
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

	// Register command to copy pipe path to clipboard
	const copyPipePathCommand = vscode.commands.registerCommand('vscode-sockpuppet.copyPipePath', async () => {
		if (server) {
			await vscode.env.clipboard.writeText(pipePath);
			vscode.window.showInformationMessage(`Sockpuppet pipe path copied: ${pipePath}`);
		}
	});
	context.subscriptions.push(copyPipePathCommand);

	// Register a command to show the server status
	const statusCommand = vscode.commands.registerCommand('vscode-sockpuppet.showStatus', () => {
		if (server) {
			vscode.window.showInformationMessage(`VSCode Sockpuppet server is running on: ${server.getPipePath()}`);
		} else {
			vscode.window.showWarningMessage('VSCode Sockpuppet server is not running');
		}
	});

	context.subscriptions.push(statusCommand);

	// Log pipe path for debugging
	console.log(`VSCode Sockpuppet IPC pipe: ${pipePath}`);
	console.log(`Environment variable VSCODE_SOCKPUPPET_PIPE set to: ${pipePath}`);

	// Create and return the external API
	const api: SockpuppetAPI = {
		getPipePath: () => {
			if (!server) {
				throw new Error('VSCode Sockpuppet server is not running');
			}
			return server.getPipePath();
		},

		isRunning: () => {
			return server !== undefined && server.isRunning();
		},

		getPythonConnectionCode: () => {
			const pipePath = server?.getPipePath() || '';
			return `from vscode_sockpuppet import VSCodeClient

# Connect to VS Code
with VSCodeClient(pipe_path='${pipePath}') as vscode:
    # Your code here
    vscode.window.show_information_message("Hello from Python!")
`;
		},

		getEnvironmentVariables: () => {
			const pipePath = server?.getPipePath() || '';
			return {
				'VSCODE_SOCKPUPPET_PIPE': pipePath,
				'VSCODE_PID': process.pid.toString()
			};
		},

		executeMethod: async (method: string, params?: any) => {
			if (!server) {
				throw new Error('VSCode Sockpuppet server is not running');
			}
			return server.executeMethod(method, params);
		}
	};

	return api;
}

// This method is called when your extension is deactivated
export function deactivate() {
	if (server) {
		server.stop();
	}
	statusBarItem?.dispose();
	extensionContext?.environmentVariableCollection.clear();
}
