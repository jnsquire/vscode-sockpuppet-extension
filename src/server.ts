import * as vscode from 'vscode';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

interface ClientSubscriptions {
    socket: net.Socket;
    subscriptions: Set<string>;
}

export class VSCodeServer {
    private server: net.Server | undefined;
    private pipePath: string;
    private clients: Set<net.Socket> = new Set();
    private clientSubscriptions: Map<net.Socket, Set<string>> = new Map();
    private eventDisposables: vscode.Disposable[] = [];
    private webviewPanels: Map<string, vscode.WebviewPanel> = new Map();

    constructor(private context: vscode.ExtensionContext) {
        // Create platform-specific pipe path
        if (os.platform() === 'win32') {
            this.pipePath = '\\\\.\\pipe\\vscode-sockpuppet';
        } else {
            const tmpDir = os.tmpdir();
            this.pipePath = path.join(tmpDir, 'vscode-sockpuppet.sock');
        }
        
        // Set up event listeners
        this.setupEventListeners();
    }

    start(): void {
        // Clean up existing socket file on Unix systems
        if (os.platform() !== 'win32' && fs.existsSync(this.pipePath)) {
            try {
                fs.unlinkSync(this.pipePath);
            } catch (err) {
                console.error('Failed to remove existing socket file:', err);
            }
        }

        this.server = net.createServer((socket: net.Socket) => {
            console.log('Python client connected');
            this.clients.add(socket);
            this.clientSubscriptions.set(socket, new Set());
            
            let buffer = '';
            
            socket.on('data', async (data: Buffer) => {
                buffer += data.toString();
                
                // Process complete JSON messages (newline-delimited)
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const request = JSON.parse(line);
                            // Add socket reference to request for event subscriptions
                            request.socket = socket;
                            const response = await this.handleRequest(request);
                            socket.write(JSON.stringify(response) + '\n');
                        } catch (error) {
                            const errorResponse = {
                                id: null,
                                error: error instanceof Error ? error.message : String(error)
                            };
                            socket.write(JSON.stringify(errorResponse) + '\n');
                        }
                    }
                }
            });

            socket.on('close', () => {
                console.log('Python client disconnected');
                this.clients.delete(socket);
                this.clientSubscriptions.delete(socket);
            });

            socket.on('error', (error: Error) => {
                console.error('Socket error:', error);
                this.clients.delete(socket);
                this.clientSubscriptions.delete(socket);
            });
        });

        this.server.listen(this.pipePath, () => {
            console.log(`VSCode Sockpuppet server listening on ${this.pipePath}`);
            vscode.window.showInformationMessage(`VSCode Sockpuppet is ready! Pipe: ${this.pipePath}`);
        });

        this.server.on('error', (error: Error) => {
            console.error('Server error:', error);
            vscode.window.showErrorMessage(`VSCode Sockpuppet server error: ${error.message}`);
        });
    }

    stop(): void {
        if (this.server) {
            this.clients.forEach(client => client.destroy());
            this.clients.clear();
            this.clientSubscriptions.clear();
            this.server.close();
            
            // Dispose all event listeners
            this.eventDisposables.forEach(d => d.dispose());
            this.eventDisposables = [];
            
            // Clean up socket file on Unix systems
            if (os.platform() !== 'win32' && fs.existsSync(this.pipePath)) {
                try {
                    fs.unlinkSync(this.pipePath);
                } catch (err) {
                    console.error('Failed to remove socket file:', err);
                }
            }
        }
    }

    getPipePath(): string {
        return this.pipePath;
    }

    isRunning(): boolean {
        return this.server !== undefined && this.server.listening;
    }

    async executeMethod(method: string, params?: any): Promise<any> {
        // This allows extensions to call methods directly without going through the pipe
        const request = { id: -1, method, params: params || {} };
        const response = await this.handleRequest(request);
        if (response.error) {
            throw new Error(response.error);
        }
        return response.result;
    }

    private async handleRequest(request: any): Promise<any> {
        const { id, method, params = {} } = request;

        try {
            let result;

            // Route to appropriate handler based on method prefix
            if (method.startsWith('window.')) {
                result = await this.handleWindowRequest(method.substring(7), params);
            } else if (method.startsWith('workspace.')) {
                result = await this.handleWorkspaceRequest(method.substring(10), params);
            } else if (method.startsWith('document.')) {
                result = await this.handleDocumentRequest(method.substring(9), params);
            } else if (method.startsWith('commands.')) {
                result = await this.handleCommandsRequest(method.substring(9), params);
            } else if (method.startsWith('env.')) {
                result = await this.handleEnvironmentRequest(method.substring(4), params);
            } else if (method.startsWith('events.')) {
                result = this.handleEventsRequest(method.substring(7), params, request.socket);
            } else {
                throw new Error(`Unknown method: ${method}`);
            }

            return { id, result };
        } catch (error) {
            return {
                id,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private async handleWindowRequest(method: string, params: any): Promise<any> {
        switch (method) {
            case 'showInformationMessage':
                return await vscode.window.showInformationMessage(params.message, ...(params.items || []));

            case 'showWarningMessage':
                return await vscode.window.showWarningMessage(params.message, ...(params.items || []));

            case 'showErrorMessage':
                return await vscode.window.showErrorMessage(params.message, ...(params.items || []));

            case 'showQuickPick':
                return await vscode.window.showQuickPick(params.items, params.options);

            case 'showInputBox':
                return await vscode.window.showInputBox(params.options);

            case 'showTextDocument':
                const doc = await vscode.workspace.openTextDocument(params.uri);
                await vscode.window.showTextDocument(doc, params.options);
                return { success: true };

            case 'createOutputChannel':
                const channel = vscode.window.createOutputChannel(params.name);
                if (params.show) {
                    channel.show(params.preserveFocus);
                }
                if (params.text) {
                    channel.appendLine(params.text);
                }
                return { success: true };

            case 'createTerminal':
                const terminal = vscode.window.createTerminal(params.name, params.shellPath, params.shellArgs);
                if (params.show) {
                    terminal.show(params.preserveFocus);
                }
                if (params.text) {
                    terminal.sendText(params.text, params.addNewLine !== false);
                }
                return { success: true };

            case 'setStatusBarMessage':
                vscode.window.setStatusBarMessage(params.text, params.hideAfterTimeout);
                return { success: true };

            case 'activeTextEditor.edit':
                return await this.handleEditorEdit(params);

            case 'activeTextEditor.selection':
                return this.handleEditorGetSelection();

            case 'activeTextEditor.setSelection':
                return this.handleEditorSetSelection(params);

            case 'createWebviewPanel':
                return this.createWebviewPanel(params);

            case 'updateWebviewPanel':
                return this.updateWebviewPanel(params);

            case 'disposeWebviewPanel':
                return this.disposeWebviewPanel(params);

            case 'postMessageToWebview':
                return this.postMessageToWebview(params);

            default:
                throw new Error(`Unknown window method: window.${method}`);
        }
    }

    private async handleEditorEdit(params: any): Promise<any> {
        if (!vscode.window.activeTextEditor) {
            throw new Error('No active text editor');
        }

        await vscode.window.activeTextEditor.edit(editBuilder => {
            for (const edit of params.edits) {
                const range = new vscode.Range(
                    edit.range.start.line,
                    edit.range.start.character,
                    edit.range.end.line,
                    edit.range.end.character
                );
                if (edit.type === 'insert') {
                    editBuilder.insert(range.start, edit.text);
                } else if (edit.type === 'delete') {
                    editBuilder.delete(range);
                } else if (edit.type === 'replace') {
                    editBuilder.replace(range, edit.text);
                }
            }
        });
        return { success: true };
    }

    private handleEditorGetSelection(): any {
        if (!vscode.window.activeTextEditor) {
            throw new Error('No active text editor');
        }

        const selection = vscode.window.activeTextEditor.selection;
        return {
            start: { line: selection.start.line, character: selection.start.character },
            end: { line: selection.end.line, character: selection.end.character },
            text: vscode.window.activeTextEditor.document.getText(selection)
        };
    }

    private handleEditorSetSelection(params: any): any {
        if (!vscode.window.activeTextEditor) {
            throw new Error('No active text editor');
        }

        const start = new vscode.Position(params.start.line, params.start.character);
        const end = new vscode.Position(params.end.line, params.end.character);
        vscode.window.activeTextEditor.selection = new vscode.Selection(start, end);
        return { success: true };
    }

    private async handleWorkspaceRequest(method: string, params: any): Promise<any> {
        switch (method) {
            case 'openTextDocument':
                const document = await vscode.workspace.openTextDocument(
                    params.uri || { content: params.content, language: params.language }
                );
                return this.serializeTextDocument(document);

            case 'saveAll':
                return await vscode.workspace.saveAll(params.includeUntitled);

            case 'workspaceFolders':
                return vscode.workspace.workspaceFolders?.map(folder => ({
                    uri: folder.uri.toString(),
                    name: folder.name,
                    index: folder.index
                })) || [];

            case 'textDocuments':
                return vscode.workspace.textDocuments.map(doc => this.serializeTextDocument(doc));

            case 'getTextDocument':
                const foundDoc = vscode.workspace.textDocuments.find(d => d.uri.toString() === params.uri);
                if (!foundDoc) {
                    throw new Error(`Document not found: ${params.uri}`);
                }
                return this.serializeTextDocument(foundDoc);

            default:
                throw new Error(`Unknown workspace method: workspace.${method}`);
        }
    }

    private async handleDocumentRequest(method: string, params: any): Promise<any> {
        const doc = vscode.workspace.textDocuments.find(d => d.uri.toString() === params.uri);
        if (!doc) {
            throw new Error(`Document not found: ${params.uri}`);
        }

        switch (method) {
            case 'save':
                const saved = await doc.save();
                return { success: saved, version: doc.version };

            case 'lineAt':
                const line = doc.lineAt(params.line);
                return this.serializeTextLine(line);

            case 'offsetAt':
                const position = new vscode.Position(params.position.line, params.position.character);
                return doc.offsetAt(position);

            case 'positionAt':
                const pos = doc.positionAt(params.offset);
                return { line: pos.line, character: pos.character };

            case 'getText':
                if (params.range) {
                    const range = new vscode.Range(
                        params.range.start.line,
                        params.range.start.character,
                        params.range.end.line,
                        params.range.end.character
                    );
                    return doc.getText(range);
                }
                return doc.getText();

            case 'getWordRangeAtPosition':
                const wordPos = new vscode.Position(params.position.line, params.position.character);
                const regex = params.regex ? new RegExp(params.regex) : undefined;
                const wordRange = doc.getWordRangeAtPosition(wordPos, regex);
                if (!wordRange) {
                    return null;
                }
                return {
                    start: { line: wordRange.start.line, character: wordRange.start.character },
                    end: { line: wordRange.end.line, character: wordRange.end.character }
                };

            case 'validateRange':
                const rangeToValidate = new vscode.Range(
                    params.range.start.line,
                    params.range.start.character,
                    params.range.end.line,
                    params.range.end.character
                );
                const validatedRange = doc.validateRange(rangeToValidate);
                return {
                    start: { line: validatedRange.start.line, character: validatedRange.start.character },
                    end: { line: validatedRange.end.line, character: validatedRange.end.character }
                };

            case 'validatePosition':
                const posToValidate = new vscode.Position(params.position.line, params.position.character);
                const validatedPos = doc.validatePosition(posToValidate);
                return { line: validatedPos.line, character: validatedPos.character };

            default:
                throw new Error(`Unknown document method: document.${method}`);
        }
    }

    private async handleCommandsRequest(method: string, params: any): Promise<any> {
        switch (method) {
            case 'executeCommand':
                return await vscode.commands.executeCommand(params.command, ...(params.args || []));

            case 'getCommands':
                return await vscode.commands.getCommands(params.filterInternal);

            default:
                throw new Error(`Unknown commands method: commands.${method}`);
        }
    }

    private async handleEnvironmentRequest(method: string, params: any): Promise<any> {
        switch (method) {
            case 'clipboard.writeText':
                await vscode.env.clipboard.writeText(params.text);
                return { success: true };

            case 'clipboard.readText':
                return await vscode.env.clipboard.readText();

            case 'openExternal':
                return await vscode.env.openExternal(vscode.Uri.parse(params.uri));

            default:
                throw new Error(`Unknown environment method: env.${method}`);
        }
    }

    private handleEventsRequest(method: string, params: any, socket: net.Socket): any {
        switch (method) {
            case 'subscribe':
                return this.subscribeToEvent(socket, params.event);

            case 'unsubscribe':
                return this.unsubscribeFromEvent(socket, params.event);

            case 'listSubscriptions':
                return Array.from(this.clientSubscriptions.get(socket) || []);

            default:
                throw new Error(`Unknown events method: events.${method}`);
        }
    }

    private subscribeToEvent(socket: net.Socket, eventName: string): { success: boolean } {
        const subscriptions = this.clientSubscriptions.get(socket);
        if (!subscriptions) {
            throw new Error('Client not found');
        }
        
        subscriptions.add(eventName);
        return { success: true };
    }

    private unsubscribeFromEvent(socket: net.Socket, eventName: string): { success: boolean } {
        const subscriptions = this.clientSubscriptions.get(socket);
        if (!subscriptions) {
            throw new Error('Client not found');
        }
        
        subscriptions.delete(eventName);
        return { success: true };
    }

    private broadcastEvent(eventName: string, data: any): void {
        const event = {
            type: 'event',
            event: eventName,
            data
        };
        
        const message = JSON.stringify(event) + '\n';
        
        this.clients.forEach(socket => {
            const subscriptions = this.clientSubscriptions.get(socket);
            if (subscriptions && subscriptions.has(eventName)) {
                try {
                    socket.write(message);
                } catch (error) {
                    console.error('Error broadcasting event:', error);
                }
            }
        });
    }

    private createWebviewPanel(params: any): any {
        const { id, viewType, title, showOptions, options, html } = params;
        
        // Dispose existing panel with same ID if it exists
        if (this.webviewPanels.has(id)) {
            this.webviewPanels.get(id)?.dispose();
        }

        // Create the webview panel
        const panel = vscode.window.createWebviewPanel(
            viewType,
            title,
            showOptions || vscode.ViewColumn.One,
            {
                enableScripts: options?.enableScripts ?? true,
                retainContextWhenHidden: options?.retainContextWhenHidden ?? false,
                localResourceRoots: options?.localResourceRoots?.map((uri: string) => vscode.Uri.parse(uri))
            }
        );

        // Set initial HTML content
        if (html) {
            panel.webview.html = html;
        }

        // Handle panel disposal
        panel.onDidDispose(() => {
            this.webviewPanels.delete(id);
        });

        // Handle messages from webview
        panel.webview.onDidReceiveMessage(message => {
            this.broadcastEvent('webview.onDidReceiveMessage', {
                id,
                message
            });
        });

        // Store the panel
        this.webviewPanels.set(id, panel);

        return { 
            success: true,
            id,
            visible: panel.visible,
            active: panel.active
        };
    }

    private updateWebviewPanel(params: any): any {
        const { id, html, title, iconPath } = params;
        
        const panel = this.webviewPanels.get(id);
        if (!panel) {
            throw new Error(`Webview panel not found: ${id}`);
        }

        if (html !== undefined) {
            panel.webview.html = html;
        }

        if (title !== undefined) {
            panel.title = title;
        }

        if (iconPath !== undefined) {
            panel.iconPath = vscode.Uri.file(iconPath);
        }

        return { 
            success: true,
            visible: panel.visible,
            active: panel.active
        };
    }

    private disposeWebviewPanel(params: any): any {
        const { id } = params;
        
        const panel = this.webviewPanels.get(id);
        if (!panel) {
            throw new Error(`Webview panel not found: ${id}`);
        }

        panel.dispose();
        this.webviewPanels.delete(id);

        return { success: true };
    }

    private postMessageToWebview(params: any): any {
        const { id, message } = params;
        
        const panel = this.webviewPanels.get(id);
        if (!panel) {
            throw new Error(`Webview panel not found: ${id}`);
        }

        panel.webview.postMessage(message);

        return { success: true };
    }

    private serializeTextDocument(doc: vscode.TextDocument): any {
        return {
            uri: doc.uri.toString(),
            fileName: doc.fileName,
            isUntitled: doc.isUntitled,
            languageId: doc.languageId,
            version: doc.version,
            isDirty: doc.isDirty,
            isClosed: doc.isClosed,
            eol: doc.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n',
            lineCount: doc.lineCount
        };
    }

    private serializeTextLine(line: vscode.TextLine): any {
        return {
            lineNumber: line.lineNumber,
            text: line.text,
            isEmptyOrWhitespace: line.isEmptyOrWhitespace,
            firstNonWhitespaceCharacterIndex: line.firstNonWhitespaceCharacterIndex,
            range: {
                start: { line: line.range.start.line, character: line.range.start.character },
                end: { line: line.range.end.line, character: line.range.end.character }
            },
            rangeIncludingLineBreak: {
                start: { line: line.rangeIncludingLineBreak.start.line, character: line.rangeIncludingLineBreak.start.character },
                end: { line: line.rangeIncludingLineBreak.end.line, character: line.rangeIncludingLineBreak.end.character }
            }
        };
    }

    private setupEventListeners(): void {
        // Text document events
        this.eventDisposables.push(
            vscode.workspace.onDidOpenTextDocument(doc => {
                this.broadcastEvent('workspace.onDidOpenTextDocument', {
                    uri: doc.uri.toString(),
                    languageId: doc.languageId,
                    fileName: doc.fileName
                });
            })
        );

        this.eventDisposables.push(
            vscode.workspace.onDidCloseTextDocument(doc => {
                this.broadcastEvent('workspace.onDidCloseTextDocument', {
                    uri: doc.uri.toString(),
                    fileName: doc.fileName
                });
            })
        );

        this.eventDisposables.push(
            vscode.workspace.onDidSaveTextDocument(doc => {
                this.broadcastEvent('workspace.onDidSaveTextDocument', {
                    uri: doc.uri.toString(),
                    fileName: doc.fileName
                });
            })
        );

        this.eventDisposables.push(
            vscode.workspace.onDidChangeTextDocument(e => {
                this.broadcastEvent('workspace.onDidChangeTextDocument', {
                    uri: e.document.uri.toString(),
                    contentChanges: e.contentChanges.map(change => ({
                        range: {
                            start: { line: change.range.start.line, character: change.range.start.character },
                            end: { line: change.range.end.line, character: change.range.end.character }
                        },
                        text: change.text
                    }))
                });
            })
        );

        // Window events
        this.eventDisposables.push(
            vscode.window.onDidChangeActiveTextEditor(editor => {
                this.broadcastEvent('window.onDidChangeActiveTextEditor', editor ? {
                    uri: editor.document.uri.toString(),
                    languageId: editor.document.languageId,
                    fileName: editor.document.fileName
                } : null);
            })
        );

        this.eventDisposables.push(
            vscode.window.onDidChangeTextEditorSelection(e => {
                this.broadcastEvent('window.onDidChangeTextEditorSelection', {
                    uri: e.textEditor.document.uri.toString(),
                    selections: e.selections.map(sel => ({
                        start: { line: sel.start.line, character: sel.start.character },
                        end: { line: sel.end.line, character: sel.end.character },
                        active: { line: sel.active.line, character: sel.active.character },
                        anchor: { line: sel.anchor.line, character: sel.anchor.character }
                    }))
                });
            })
        );

        this.eventDisposables.push(
            vscode.window.onDidChangeVisibleTextEditors(editors => {
                this.broadcastEvent('window.onDidChangeVisibleTextEditors', {
                    count: editors.length,
                    editors: editors.map(e => ({
                        uri: e.document.uri.toString(),
                        languageId: e.document.languageId
                    }))
                });
            })
        );

        // Terminal events
        this.eventDisposables.push(
            vscode.window.onDidOpenTerminal(terminal => {
                this.broadcastEvent('window.onDidOpenTerminal', {
                    name: terminal.name
                });
            })
        );

        this.eventDisposables.push(
            vscode.window.onDidCloseTerminal(terminal => {
                this.broadcastEvent('window.onDidCloseTerminal', {
                    name: terminal.name
                });
            })
        );

        // Workspace events
        this.eventDisposables.push(
            vscode.workspace.onDidChangeWorkspaceFolders(e => {
                this.broadcastEvent('workspace.onDidChangeWorkspaceFolders', {
                    added: e.added.map(f => ({ uri: f.uri.toString(), name: f.name })),
                    removed: e.removed.map(f => ({ uri: f.uri.toString(), name: f.name }))
                });
            })
        );

        this.eventDisposables.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                this.broadcastEvent('workspace.onDidChangeConfiguration', {
                    affectsConfiguration: (section: string) => e.affectsConfiguration(section)
                });
            })
        );
    }
}
