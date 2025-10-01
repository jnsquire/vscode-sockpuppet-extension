import * as vscode from 'vscode';

/**
 * API exposed to other VS Code extensions for integration with VSCode Sockpuppet.
 * 
 * Other extensions can access this API like:
 * ```typescript
 * const sockpuppetExt = vscode.extensions.getExtension('undefined_publisher.vscode-sockpuppet');
 * const api = sockpuppetExt?.exports;
 * const pipePath = api.getPipePath();
 * ```
 */
export interface SockpuppetAPI {
    /**
     * Get the path to the named pipe/Unix domain socket that the server is listening on.
     * 
     * @returns The pipe path (e.g., '\\.\pipe\vscode-sockpuppet' on Windows or '/tmp/vscode-sockpuppet.sock' on Unix)
     */
    getPipePath(): string;

    /**
     * Check if the Sockpuppet server is currently running.
     * 
     * @returns True if the server is active and accepting connections
     */
    isRunning(): boolean;

    /**
     * Get the default Python code snippet to connect to this extension.
     * Useful for generating scripts or documentation.
     * 
     * @returns Python code string that connects to the server
     */
    getPythonConnectionCode(): string;

    /**
     * Get environment variables that should be set when launching a Python process
     * that will connect to Sockpuppet.
     * 
     * @returns Object with environment variable key-value pairs
     */
    getEnvironmentVariables(): { [key: string]: string };

    /**
     * Execute a VS Code API method through the server.
     * This allows extensions to use the Sockpuppet infrastructure programmatically.
     * 
     * @param method The method name (e.g., 'window.showInformationMessage')
     * @param params Parameters for the method
     * @returns Promise that resolves with the result
     */
    executeMethod(method: string, params?: any): Promise<any>;
}
