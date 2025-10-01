// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { VSCodeServer } from './server';
import { SockpuppetAPI } from './api';

let server: VSCodeServer | undefined;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext): SockpuppetAPI {
	console.log('VSCode Sockpuppet extension is now active!');

	// Start the server for Python communication
	server = new VSCodeServer(context);
	server.start();

	// Register a command to show the server status
	const statusCommand = vscode.commands.registerCommand('vscode-sockpuppet.showStatus', () => {
		if (server) {
			vscode.window.showInformationMessage(`VSCode Sockpuppet server is running on: ${server.getPipePath()}`);
		} else {
			vscode.window.showWarningMessage('VSCode Sockpuppet server is not running');
		}
	});

	context.subscriptions.push(statusCommand);

	// Show activation message with pipe path
	const pipePath = server.getPipePath();
	vscode.window.showInformationMessage(`VSCode Sockpuppet is ready! Pipe: ${pipePath}`);

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
}
