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

            switch (method) {
                // Window operations
                case 'window.showInformationMessage':
                    result = await vscode.window.showInformationMessage(params.message, ...(params.items || []));
                    break;

                case 'window.showWarningMessage':
                    result = await vscode.window.showWarningMessage(params.message, ...(params.items || []));
                    break;

                case 'window.showErrorMessage':
                    result = await vscode.window.showErrorMessage(params.message, ...(params.items || []));
                    break;

                case 'window.showQuickPick':
                    result = await vscode.window.showQuickPick(params.items, params.options);
                    break;

                case 'window.showInputBox':
                    result = await vscode.window.showInputBox(params.options);
                    break;

                case 'window.showTextDocument':
                    const doc = await vscode.workspace.openTextDocument(params.uri);
                    result = await vscode.window.showTextDocument(doc, params.options);
                    result = { success: true };
                    break;

                case 'window.createOutputChannel':
                    const channel = vscode.window.createOutputChannel(params.name);
                    if (params.show) {
                        channel.show(params.preserveFocus);
                    }
                    if (params.text) {
                        channel.appendLine(params.text);
                    }
                    result = { success: true };
                    break;

                case 'window.createTerminal':
                    const terminal = vscode.window.createTerminal(params.name, params.shellPath, params.shellArgs);
                    if (params.show) {
                        terminal.show(params.preserveFocus);
                    }
                    if (params.text) {
                        terminal.sendText(params.text, params.addNewLine !== false);
                    }
                    result = { success: true };
                    break;

                case 'window.setStatusBarMessage':
                    vscode.window.setStatusBarMessage(params.text, params.hideAfterTimeout);
                    result = { success: true };
                    break;

                // Editor operations
                case 'window.activeTextEditor.edit':
                    if (vscode.window.activeTextEditor) {
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
                        result = { success: true };
                    } else {
                        throw new Error('No active text editor');
                    }
                    break;

                case 'window.activeTextEditor.selection':
                    if (vscode.window.activeTextEditor) {
                        const selection = vscode.window.activeTextEditor.selection;
                        result = {
                            start: { line: selection.start.line, character: selection.start.character },
                            end: { line: selection.end.line, character: selection.end.character },
                            text: vscode.window.activeTextEditor.document.getText(selection)
                        };
                    } else {
                        throw new Error('No active text editor');
                    }
                    break;

                case 'window.activeTextEditor.setSelection':
                    if (vscode.window.activeTextEditor) {
                        const start = new vscode.Position(params.start.line, params.start.character);
                        const end = new vscode.Position(params.end.line, params.end.character);
                        vscode.window.activeTextEditor.selection = new vscode.Selection(start, end);
                        result = { success: true };
                    } else {
                        throw new Error('No active text editor');
                    }
                    break;

                // Workspace operations
                case 'workspace.openTextDocument':
                    const document = await vscode.workspace.openTextDocument(params.uri || { content: params.content, language: params.language });
                    result = this.serializeTextDocument(document);
                    break;

                case 'workspace.saveAll':
                    result = await vscode.workspace.saveAll(params.includeUntitled);
                    break;

                case 'workspace.workspaceFolders':
                    result = vscode.workspace.workspaceFolders?.map(folder => ({
                        uri: folder.uri.toString(),
                        name: folder.name,
                        index: folder.index
                    })) || [];
                    break;

                case 'workspace.textDocuments':
                    result = vscode.workspace.textDocuments.map(doc => this.serializeTextDocument(doc));
                    break;

                case 'workspace.getTextDocument':
                    const foundDoc = vscode.workspace.textDocuments.find(d => d.uri.toString() === params.uri);
                    if (foundDoc) {
                        result = this.serializeTextDocument(foundDoc);
                    } else {
                        throw new Error(`Document not found: ${params.uri}`);
                    }
                    break;

                // Document operations
                case 'document.save':
                    const docToSave = vscode.workspace.textDocuments.find(d => d.uri.toString() === params.uri);
                    if (docToSave) {
                        const saved = await docToSave.save();
                        result = { success: saved, version: docToSave.version };
                    } else {
                        throw new Error(`Document not found: ${params.uri}`);
                    }
                    break;

                case 'document.lineAt':
                    const docForLine = vscode.workspace.textDocuments.find(d => d.uri.toString() === params.uri);
                    if (docForLine) {
                        const line = docForLine.lineAt(params.line);
                        result = this.serializeTextLine(line);
                    } else {
                        throw new Error(`Document not found: ${params.uri}`);
                    }
                    break;

                case 'document.offsetAt':
                    const docForOffset = vscode.workspace.textDocuments.find(d => d.uri.toString() === params.uri);
                    if (docForOffset) {
                        const position = new vscode.Position(params.position.line, params.position.character);
                        result = docForOffset.offsetAt(position);
                    } else {
                        throw new Error(`Document not found: ${params.uri}`);
                    }
                    break;

                case 'document.positionAt':
                    const docForPosition = vscode.workspace.textDocuments.find(d => d.uri.toString() === params.uri);
                    if (docForPosition) {
                        const position = docForPosition.positionAt(params.offset);
                        result = { line: position.line, character: position.character };
                    } else {
                        throw new Error(`Document not found: ${params.uri}`);
                    }
                    break;

                case 'document.getText':
                    const docForText = vscode.workspace.textDocuments.find(d => d.uri.toString() === params.uri);
                    if (docForText) {
                        if (params.range) {
                            const range = new vscode.Range(
                                params.range.start.line,
                                params.range.start.character,
                                params.range.end.line,
                                params.range.end.character
                            );
                            result = docForText.getText(range);
                        } else {
                            result = docForText.getText();
                        }
                    } else {
                        throw new Error(`Document not found: ${params.uri}`);
                    }
                    break;

                case 'document.getWordRangeAtPosition':
                    const docForWord = vscode.workspace.textDocuments.find(d => d.uri.toString() === params.uri);
                    if (docForWord) {
                        const position = new vscode.Position(params.position.line, params.position.character);
                        const regex = params.regex ? new RegExp(params.regex) : undefined;
                        const wordRange = docForWord.getWordRangeAtPosition(position, regex);
                        if (wordRange) {
                            result = {
                                start: { line: wordRange.start.line, character: wordRange.start.character },
                                end: { line: wordRange.end.line, character: wordRange.end.character }
                            };
                        } else {
                            result = null;
                        }
                    } else {
                        throw new Error(`Document not found: ${params.uri}`);
                    }
                    break;

                case 'document.validateRange':
                    const docForValidateRange = vscode.workspace.textDocuments.find(d => d.uri.toString() === params.uri);
                    if (docForValidateRange) {
                        const range = new vscode.Range(
                            params.range.start.line,
                            params.range.start.character,
                            params.range.end.line,
                            params.range.end.character
                        );
                        const validated = docForValidateRange.validateRange(range);
                        result = {
                            start: { line: validated.start.line, character: validated.start.character },
                            end: { line: validated.end.line, character: validated.end.character }
                        };
                    } else {
                        throw new Error(`Document not found: ${params.uri}`);
                    }
                    break;

                case 'document.validatePosition':
                    const docForValidatePos = vscode.workspace.textDocuments.find(d => d.uri.toString() === params.uri);
                    if (docForValidatePos) {
                        const position = new vscode.Position(params.position.line, params.position.character);
                        const validated = docForValidatePos.validatePosition(position);
                        result = { line: validated.line, character: validated.character };
                    } else {
                        throw new Error(`Document not found: ${params.uri}`);
                    }
                    break;

                // Commands
                case 'commands.executeCommand':
                    result = await vscode.commands.executeCommand(params.command, ...(params.args || []));
                    break;

                case 'commands.getCommands':
                    result = await vscode.commands.getCommands(params.filterInternal);
                    break;

                // Environment
                case 'env.clipboard.writeText':
                    await vscode.env.clipboard.writeText(params.text);
                    result = { success: true };
                    break;

                case 'env.clipboard.readText':
                    result = await vscode.env.clipboard.readText();
                    break;

                case 'env.openExternal':
                    result = await vscode.env.openExternal(vscode.Uri.parse(params.uri));
                    break;

                // Event subscriptions
                case 'events.subscribe':
                    result = this.subscribeToEvent(request.socket, params.event);
                    break;

                case 'events.unsubscribe':
                    result = this.unsubscribeFromEvent(request.socket, params.event);
                    break;

                case 'events.listSubscriptions':
                    result = Array.from(this.clientSubscriptions.get(request.socket) || []);
                    break;

                default:
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
