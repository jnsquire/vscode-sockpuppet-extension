import * as vscode from 'vscode';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

/**
 * Manages a webview panel and its associated event disposables
 */
class WebviewPanelState {
    constructor(
        public readonly panel: vscode.WebviewPanel,
        public readonly disposables: vscode.Disposable[]
    ) {}

    /**
     * Dispose all event listeners for this panel
     */
    disposeListeners(): void {
        this.disposables.forEach(d => d.dispose());
    }

    /**
     * Dispose the panel and all its listeners
     */
    dispose(): void {
        this.disposeListeners();
        this.panel.dispose();
    }
}

/**
 * Manages a file system watcher and its associated event disposables
 */
class FileSystemWatcherState {
    constructor(
        public readonly watcher: vscode.FileSystemWatcher,
        public readonly disposables: vscode.Disposable[]
    ) {}

    /**
     * Dispose all event listeners for this watcher
     */
    disposeListeners(): void {
        this.disposables.forEach(d => d.dispose());
    }

    /**
     * Dispose the watcher and all its listeners
     */
    dispose(): void {
        this.disposeListeners();
        this.watcher.dispose();
    }
}

export class VSCodeServer {
    private server: net.Server | undefined;
    private pipePath: string;
    private clients: Set<net.Socket> = new Set();
    private clientSubscriptions: Map<net.Socket, Set<string>> = new Map();
    private eventDisposables: vscode.Disposable[] = [];
    private webviewPanels: Map<string, WebviewPanelState> = new Map();
    private diagnosticCollections: Map<string, vscode.DiagnosticCollection> = new Map();
    private statusBarItems: Map<string, vscode.StatusBarItem> = new Map();
    private progressTokens: Map<string, vscode.CancellationTokenSource> = new Map();
    private terminals: Map<string, vscode.Terminal> = new Map();
    private fileWatchers: Map<string, FileSystemWatcherState> = new Map();
    private decorationTypes: Map<string, vscode.TextEditorDecorationType> = new Map();

    constructor(private context: vscode.ExtensionContext) {
        // Create unique pipe path for this VS Code instance
        this.pipePath = this.generateUniquePipePath();
        
        // Store pipe path in environment variable for child processes
        process.env.VSCODE_SOCKPUPPET_PIPE = this.pipePath;
        
        // Set up event listeners
        this.setupEventListeners();
    }

    private generateUniquePipePath(): string {
        // Create a unique identifier based on workspace and process
        let uniqueId: string;
        
        // Try to use workspace folder for consistency across terminal sessions
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            // Use hash of first workspace folder path
            const workspacePath = workspaceFolders[0].uri.fsPath;
            uniqueId = crypto.createHash('md5').update(workspacePath).digest('hex').substring(0, 8);
        } else {
            // No workspace, use process ID (less consistent but works)
            uniqueId = process.pid.toString();
        }
        
        if (os.platform() === 'win32') {
            return `\\\\.\\pipe\\vscode-sockpuppet-${uniqueId}`;
        } else {
            const tmpDir = os.tmpdir();
            return path.join(tmpDir, `vscode-sockpuppet-${uniqueId}.sock`);
        }
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
            console.log('Python client connected to', this.pipePath);
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
            
            // Clear environment variable
            delete process.env.VSCODE_SOCKPUPPET_PIPE;
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
            } else if (method.startsWith('fs.')) {
                result = await this.handleFileSystemRequest(method.substring(3), params);
            } else if (method.startsWith('languages.')) {
                result = await this.handleLanguagesRequest(method.substring(10), params);
            } else if (method.startsWith('terminal.')) {
                result = await this.handleTerminalRequest(method.substring(9), params);
            } else if (method.startsWith('lm.')) {
                result = await this.handleLanguageModelRequest(method.substring(3), params);
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

            case 'showOpenDialog':
                return await this.showOpenDialog(params);

            case 'showSaveDialog':
                return await this.showSaveDialog(params);

            case 'showWorkspaceFolderPick':
                return await this.showWorkspaceFolderPick(params);

            case 'showTextDocument':
                const doc = await vscode.workspace.openTextDocument(params.uri);
                await vscode.window.showTextDocument(doc, params.options);
                return { success: true };

            case 'visibleTextEditors':
                return this.getVisibleTextEditors();

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
                const terminalId = `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const terminal = vscode.window.createTerminal(params.name, params.shellPath, params.shellArgs);
                this.terminals.set(terminalId, terminal);
                return { terminalId };

            case 'setStatusBarMessage':
                vscode.window.setStatusBarMessage(params.text, params.hideAfterTimeout);
                return { success: true };

            case 'activeTextEditor.edit':
                return await this.handleEditorEdit(params);

            case 'activeTextEditor.selection':
                return this.handleEditorGetSelection();

            case 'activeTextEditor.setSelection':
                return this.handleEditorSetSelection(params);

            case 'activeTextEditor.selections':
                return this.handleEditorGetSelections();

            case 'activeTextEditor.setSelections':
                return this.handleEditorSetSelections(params);

            case 'activeTextEditor.insertSnippet':
                return await this.handleEditorInsertSnippet(params);

            case 'activeTextEditor.revealRange':
                return this.handleEditorRevealRange(params);

            case 'activeTextEditor.options':
                return this.handleEditorGetOptions();

            case 'activeTextEditor.setOptions':
                return this.handleEditorSetOptions(params);

            case 'activeTextEditor.visibleRanges':
                return this.handleEditorGetVisibleRanges();

            case 'activeTextEditor.viewColumn':
                return this.handleEditorGetViewColumn();

            case 'createWebviewPanel':
                return this.createWebviewPanel(params);

            case 'updateWebviewPanel':
                return this.updateWebviewPanel(params);

            case 'disposeWebviewPanel':
                return this.disposeWebviewPanel(params);

            case 'postMessageToWebview':
                return this.postMessageToWebview(params);

            case 'asWebviewUri':
                return this.asWebviewUri(params);

            case 'createStatusBarItem':
                return this.createStatusBarItem(params);

            case 'updateStatusBarItem':
                return this.updateStatusBarItem(params);

            case 'disposeStatusBarItem':
                return this.disposeStatusBarItem(params);

            case 'withProgress':
                return await this.withProgress(params);

            case 'state':
                // Return current window state (focused) and include `active`
                // when the property is available on the runtime WindowState.
                const state: any = { focused: vscode.window.state.focused };
                if ('active' in vscode.window.state) {
                    // Property may exist on some platforms/VS Code versions
                    state.active = (vscode.window.state as any).active;
                }
                return state;

            case 'tabGroups.all':
                return this.getTabGroups();

            case 'tabGroups.activeTabGroup':
                return this.getActiveTabGroup();

            case 'tabGroups.closeTab':
                return await this.closeTab(params);

            case 'tabGroups.closeGroup':
                return await this.closeTabGroup(params);
                
            case 'createTextEditorDecorationType':
                return this.createTextEditorDecorationType(params);

            case 'activeTextEditor.setDecorations':
                return this.handleSetDecorations(params);

            case 'disposeTextEditorDecorationType':
                return this.disposeTextEditorDecorationType(params);

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

    private handleEditorGetSelections(): any {
        if (!vscode.window.activeTextEditor) {
            throw new Error('No active text editor');
        }

        return vscode.window.activeTextEditor.selections.map(selection => ({
            start: { line: selection.start.line, character: selection.start.character },
            end: { line: selection.end.line, character: selection.end.character },
            anchor: { line: selection.anchor.line, character: selection.anchor.character },
            active: { line: selection.active.line, character: selection.active.character }
        }));
    }

    private handleEditorSetSelections(params: any): any {
        if (!vscode.window.activeTextEditor) {
            throw new Error('No active text editor');
        }

        vscode.window.activeTextEditor.selections = params.selections.map((sel: any) => {
            const anchor = new vscode.Position(sel.anchor.line, sel.anchor.character);
            const active = new vscode.Position(sel.active.line, sel.active.character);
            return new vscode.Selection(anchor, active);
        });
        return { success: true };
    }

    private async handleEditorInsertSnippet(params: any): Promise<any> {
        if (!vscode.window.activeTextEditor) {
            throw new Error('No active text editor');
        }

        const snippet = new vscode.SnippetString(params.snippet);
        
        let location: vscode.Position | vscode.Range | vscode.Position[] | vscode.Range[] | undefined;
        if (params.location) {
            if (Array.isArray(params.location)) {
                location = params.location.map((loc: any) => {
                    if (loc.start) {
                        // It's a range
                        return new vscode.Range(
                            loc.start.line,
                            loc.start.character,
                            loc.end.line,
                            loc.end.character
                        );
                    } else {
                        // It's a position
                        return new vscode.Position(loc.line, loc.character);
                    }
                });
            } else if (params.location.start) {
                // Single range
                location = new vscode.Range(
                    params.location.start.line,
                    params.location.start.character,
                    params.location.end.line,
                    params.location.end.character
                );
            } else {
                // Single position
                location = new vscode.Position(params.location.line, params.location.character);
            }
        }

        const options = params.options ? {
            undoStopBefore: params.options.undoStopBefore,
            undoStopAfter: params.options.undoStopAfter
        } : undefined;

        const success = await vscode.window.activeTextEditor.insertSnippet(snippet, location, options);
        return { success };
    }

    private handleEditorRevealRange(params: any): any {
        if (!vscode.window.activeTextEditor) {
            throw new Error('No active text editor');
        }

        const range = new vscode.Range(
            params.start.line,
            params.start.character,
            params.end.line,
            params.end.character
        );

        // Map reveal type string to VS Code enum
        let revealType = vscode.TextEditorRevealType.Default;
        if (params.revealType === 'InCenter') {
            revealType = vscode.TextEditorRevealType.InCenter;
        } else if (params.revealType === 'AtTop') {
            revealType = vscode.TextEditorRevealType.AtTop;
        } else if (params.revealType === 'InCenterIfOutsideViewport') {
            revealType = vscode.TextEditorRevealType.InCenterIfOutsideViewport;
        }

        vscode.window.activeTextEditor.revealRange(range, revealType);
        return { success: true };
    }

    private handleEditorGetOptions(): any {
        if (!vscode.window.activeTextEditor) {
            throw new Error('No active text editor');
        }

        const options = vscode.window.activeTextEditor.options;
        return {
            tabSize: options.tabSize,
            insertSpaces: options.insertSpaces,
            cursorStyle: options.cursorStyle,
            lineNumbers: options.lineNumbers
        };
    }

    private handleEditorSetOptions(params: any): any {
        if (!vscode.window.activeTextEditor) {
            throw new Error('No active text editor');
        }

        vscode.window.activeTextEditor.options = {
            ...vscode.window.activeTextEditor.options,
            ...params
        };
        return { success: true };
    }

    private handleEditorGetVisibleRanges(): any {
        if (!vscode.window.activeTextEditor) {
            throw new Error('No active text editor');
        }

        return vscode.window.activeTextEditor.visibleRanges.map(range => ({
            start: { line: range.start.line, character: range.start.character },
            end: { line: range.end.line, character: range.end.character }
        }));
    }

    private handleEditorGetViewColumn(): any {
        if (!vscode.window.activeTextEditor) {
            throw new Error('No active text editor');
        }

        return { viewColumn: vscode.window.activeTextEditor.viewColumn || -1 };
    }

    private getVisibleTextEditors(): any[] {
        return vscode.window.visibleTextEditors.map(editor => ({
            uri: editor.document.uri.toString(),
            viewColumn: editor.viewColumn || -1,
            selection: {
                start: { line: editor.selection.start.line, character: editor.selection.start.character },
                end: { line: editor.selection.end.line, character: editor.selection.end.character }
            }
        }));
    }

    private createTextEditorDecorationType(params: any): any {
        const id = `decoration-${Date.now()}-${Math.random().toString(36).substr(2,9)}`;
        const options: vscode.DecorationRenderOptions = params.options || {};
        const decorationType = vscode.window.createTextEditorDecorationType(options);
        this.decorationTypes.set(id, decorationType);
        return { id };
    }

    private disposeTextEditorDecorationType(params: any): any {
        const { decorationId } = params;
        if (!this.decorationTypes.has(decorationId)) {
            throw new Error(`Decoration id not found: ${decorationId}`);
        }

        const decorationType = this.decorationTypes.get(decorationId)!;
        try {
            decorationType.dispose();
        } catch (err) {
            // Disposal should not throw, but if it does, surface a helpful error
            throw new Error(`Failed to dispose decoration ${decorationId}: ${err instanceof Error ? err.message : String(err)}`);
        }

        this.decorationTypes.delete(decorationId);
        return { success: true };
    }

    private handleSetDecorations(params: any): any {
        const { decorationId, ranges } = params;
        if (!this.decorationTypes.has(decorationId)) {
            throw new Error(`Decoration id not found: ${decorationId}`);
        }
        const decorationType = this.decorationTypes.get(decorationId)!;
        // Convert ranges to vscode.Range
        const vscodeRanges = ranges.map((r: any) => {
            return new vscode.Range(r.start.line, r.start.character, r.end.line, r.end.character);
        });

        if (!vscode.window.activeTextEditor) {
            throw new Error('No active text editor');
        }

        vscode.window.activeTextEditor.setDecorations(decorationType, vscodeRanges);
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

            case 'getConfiguration':
                return this.getConfiguration(params.section, params.scope);

            case 'hasConfiguration':
                return this.hasConfiguration(params.section, params.scope);

            case 'inspectConfiguration':
                return this.inspectConfiguration(params.section, params.scope);

            case 'updateConfiguration':
                return await this.updateConfiguration(
                    params.section,
                    params.value,
                    params.configurationTarget,
                    params.scope,
                    params.overrideInLanguage
                );

            case 'createFileSystemWatcher':
                return this.createFileSystemWatcher(params);

            case 'disposeFileSystemWatcher':
                return this.disposeFileSystemWatcher(params);

            case 'findFiles':
                return await this.findFiles(params);

            case 'getWorkspaceFolder':
                return this.getWorkspaceFolder(params);

            case 'asRelativePath':
                return this.asRelativePath(params);

            case 'applyEdit':
                return await this.applyWorkspaceEdit(params);

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

            case 'asExternalUri':
                const externalUri = await vscode.env.asExternalUri(vscode.Uri.parse(params.uri));
                return externalUri.toString();

            case 'appName':
                return vscode.env.appName;

            case 'appRoot':
                return vscode.env.appRoot;

            case 'language':
                return vscode.env.language;

            case 'machineId':
                return vscode.env.machineId;

            case 'sessionId':
                return vscode.env.sessionId;

            case 'uriScheme':
                return vscode.env.uriScheme;

            case 'shell':
                return vscode.env.shell;

            case 'uiKind':
                return vscode.env.uiKind;

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

    private async showOpenDialog(params: any): Promise<any> {
        const options = params.options || {};
        
        // Build OpenDialogOptions
        const dialogOptions: vscode.OpenDialogOptions = {};
        
        if (options.defaultUri) {
            dialogOptions.defaultUri = vscode.Uri.parse(options.defaultUri);
        }
        
        if (options.openLabel) {
            dialogOptions.openLabel = options.openLabel;
        }
        
        if (options.canSelectFiles !== undefined) {
            dialogOptions.canSelectFiles = options.canSelectFiles;
        }
        
        if (options.canSelectFolders !== undefined) {
            dialogOptions.canSelectFolders = options.canSelectFolders;
        }
        
        if (options.canSelectMany !== undefined) {
            dialogOptions.canSelectMany = options.canSelectMany;
        }
        
        if (options.filters) {
            dialogOptions.filters = options.filters;
        }
        
        if (options.title) {
            dialogOptions.title = options.title;
        }
        
        // Show dialog
        const result = await vscode.window.showOpenDialog(dialogOptions);
        
        if (result) {
            return {
                uris: result.map(uri => uri.toString())
            };
        }
        
        return null;
    }

    private async showSaveDialog(params: any): Promise<any> {
        const options = params.options || {};
        
        // Build SaveDialogOptions
        const dialogOptions: vscode.SaveDialogOptions = {};
        
        if (options.defaultUri) {
            dialogOptions.defaultUri = vscode.Uri.parse(options.defaultUri);
        }
        
        if (options.saveLabel) {
            dialogOptions.saveLabel = options.saveLabel;
        }
        
        if (options.filters) {
            dialogOptions.filters = options.filters;
        }
        
        if (options.title) {
            dialogOptions.title = options.title;
        }
        
        // Show dialog
        const result = await vscode.window.showSaveDialog(dialogOptions);
        
        if (result) {
            return {
                uri: result.toString()
            };
        }
        
        return null;
    }

    private async showWorkspaceFolderPick(params: any): Promise<any> {
        const options = params.options || {};

        // VS Code accepts an options object for workspace folder pick with
        // properties like placeHolder and ignoreFocusOut.
        const folder = await vscode.window.showWorkspaceFolderPick(options);
        if (!folder) {
            return null;
        }
        return { uri: folder.uri.toString(), name: folder.name, index: folder.index };
    }

    private createWebviewPanel(params: any): any {
        const { id, viewType, title, showOptions, options, html } = params;
        
        // Dispose existing panel with same ID if it exists
        const existingState = this.webviewPanels.get(id);
        if (existingState) {
            existingState.dispose();
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

        // Track disposables for this panel
        const disposables: vscode.Disposable[] = [];

        // Handle panel disposal
        disposables.push(panel.onDidDispose(() => {
            // Dispose all event listeners for this panel
            const panelState = this.webviewPanels.get(id);
            if (panelState) {
                panelState.disposeListeners();
                this.webviewPanels.delete(id);
            }
            
            // Broadcast disposal event to Python clients
            this.broadcastEvent('webview.onDidDispose', { id });
        }));

        // Handle view state changes (visibility, active state)
        disposables.push(panel.onDidChangeViewState(e => {
            this.broadcastEvent('webview.onDidChangeViewState', {
                id,
                visible: e.webviewPanel.visible,
                active: e.webviewPanel.active
            });
        }));

        // Handle messages from webview
        disposables.push(panel.webview.onDidReceiveMessage(message => {
            this.broadcastEvent('webview.onDidReceiveMessage', {
                id,
                message
            });
        }));

        // Store the panel state
        const panelState = new WebviewPanelState(panel, disposables);
        this.webviewPanels.set(id, panelState);

        // This needs to be done after all the event listeners are registered
        if (html) {
            panel.webview.html = html;
        }

        return { 
            success: true,
            id,
            visible: panel.visible,
            active: panel.active
        };
    }

    private updateWebviewPanel(params: any): any {
        const { id, html, title, iconPath } = params;
        
        const panelState = this.webviewPanels.get(id);
        if (!panelState) {
            throw new Error(`Webview panel not found: ${id}`);
        }
        const panel = panelState.panel;

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
        
        const panelState = this.webviewPanels.get(id);
        if (!panelState) {
            throw new Error(`Webview panel not found: ${id}`);
        }

        // Dispose the panel (this will trigger onDidDispose which cleans up disposables)
        panelState.panel.dispose();

        return { success: true };
    }

    private postMessageToWebview(params: any): any {
        const { id, message } = params;
        
        const panelState = this.webviewPanels.get(id);
        if (!panelState) {
            throw new Error(`Webview panel not found: ${id}`);
        }

        panelState.panel.webview.postMessage(message);

        return { success: true };
    }

    private asWebviewUri(params: any): any {
        const { id, uri } = params;
        
        const panelState = this.webviewPanels.get(id);
        if (!panelState) {
            throw new Error(`Webview panel not found: ${id}`);
        }

        // Parse the local URI and convert it to a webview URI
        const localUri = vscode.Uri.parse(uri);
        const webviewUri = panelState.panel.webview.asWebviewUri(localUri);

        return { 
            webviewUri: webviewUri.toString()
        };
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
            lineCount: doc.lineCount,
            encoding: doc.encoding
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

    // File System API Handlers
    private async handleFileSystemRequest(method: string, params: any): Promise<any> {
        switch (method) {
            case 'readFile':
                const readData = await vscode.workspace.fs.readFile(vscode.Uri.parse(params.uri));
                return Array.from(readData); // Convert Uint8Array to regular array for JSON

            case 'writeFile':
                const writeData = new Uint8Array(params.content);
                await vscode.workspace.fs.writeFile(vscode.Uri.parse(params.uri), writeData);
                return { success: true };

            case 'delete':
                await vscode.workspace.fs.delete(vscode.Uri.parse(params.uri), params.options);
                return { success: true };

            case 'rename':
                await vscode.workspace.fs.rename(
                    vscode.Uri.parse(params.source),
                    vscode.Uri.parse(params.target),
                    params.options
                );
                return { success: true };

            case 'copy':
                await vscode.workspace.fs.copy(
                    vscode.Uri.parse(params.source),
                    vscode.Uri.parse(params.target),
                    params.options
                );
                return { success: true };

            case 'createDirectory':
                await vscode.workspace.fs.createDirectory(vscode.Uri.parse(params.uri));
                return { success: true };

            case 'readDirectory':
                const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.parse(params.uri));
                return entries.map(([name, type]) => ({ name, type }));

            case 'stat':
                const stat = await vscode.workspace.fs.stat(vscode.Uri.parse(params.uri));
                return {
                    type: stat.type,
                    ctime: stat.ctime,
                    mtime: stat.mtime,
                    size: stat.size
                };

            default:
                throw new Error(`Unknown fs method: fs.${method}`);
        }
    }

    // Languages API Handlers (Diagnostics)
    private async handleLanguagesRequest(method: string, params: any): Promise<any> {
        switch (method) {
            case 'createDiagnosticCollection':
                const name = params.name || 'default';
                if (!this.diagnosticCollections.has(name)) {
                    this.diagnosticCollections.set(name, vscode.languages.createDiagnosticCollection(name));
                }
                return { success: true, name };

            case 'setDiagnostics':
                const collection = this.diagnosticCollections.get(params.name || 'default');
                if (!collection) {
                    throw new Error(`Diagnostic collection not found: ${params.name}`);
                }

                const uri = vscode.Uri.parse(params.uri);
                const diagnostics = params.diagnostics.map((d: any) => {
                    const range = new vscode.Range(
                        d.range.start.line,
                        d.range.start.character,
                        d.range.end.line,
                        d.range.end.character
                    );
                    const severity = this.parseDiagnosticSeverity(d.severity);
                    const diagnostic = new vscode.Diagnostic(range, d.message, severity);
                    
                    if (d.source) {
                        diagnostic.source = d.source;
                    }
                    if (d.code) {
                        diagnostic.code = d.code;
                    }
                    if (d.relatedInformation) {
                        diagnostic.relatedInformation = d.relatedInformation.map((info: any) => {
                            return new vscode.DiagnosticRelatedInformation(
                                new vscode.Location(
                                    vscode.Uri.parse(info.location.uri),
                                    new vscode.Range(
                                        info.location.range.start.line,
                                        info.location.range.start.character,
                                        info.location.range.end.line,
                                        info.location.range.end.character
                                    )
                                ),
                                info.message
                            );
                        });
                    }
                    return diagnostic;
                });

                collection.set(uri, diagnostics);
                return { success: true };

            case 'clearDiagnostics':
                const clearCollection = this.diagnosticCollections.get(params.name || 'default');
                if (!clearCollection) {
                    throw new Error(`Diagnostic collection not found: ${params.name}`);
                }
                if (params.uri) {
                    clearCollection.delete(vscode.Uri.parse(params.uri));
                } else {
                    clearCollection.clear();
                }
                return { success: true };

            case 'disposeDiagnosticCollection':
                const disposeCollection = this.diagnosticCollections.get(params.name || 'default');
                if (disposeCollection) {
                    disposeCollection.dispose();
                    this.diagnosticCollections.delete(params.name || 'default');
                }
                return { success: true };

            default:
                throw new Error(`Unknown languages method: languages.${method}`);
        }
    }

    private parseDiagnosticSeverity(severity: string | number): vscode.DiagnosticSeverity {
        if (typeof severity === 'number') {
            return severity;
        }
        switch (severity?.toLowerCase()) {
            case 'error':
                return vscode.DiagnosticSeverity.Error;
            case 'warning':
                return vscode.DiagnosticSeverity.Warning;
            case 'information':
            case 'info':
                return vscode.DiagnosticSeverity.Information;
            case 'hint':
                return vscode.DiagnosticSeverity.Hint;
            default:
                return vscode.DiagnosticSeverity.Error;
        }
    }

    // Configuration API Handlers
    private getConfiguration(section: string | undefined, scope: string | undefined): any {
        const scopeUri = scope ? vscode.Uri.parse(scope) : undefined;
        const config = vscode.workspace.getConfiguration(section, scopeUri);
        
        // Get the value for the section
        // If section is undefined, we return the whole configuration object
        // If section has a key, we get that specific value
        return section ? config.get(section) : config;
    }

    private hasConfiguration(section: string, scope: string | undefined): boolean {
        const scopeUri = scope ? vscode.Uri.parse(scope) : undefined;
        const config = vscode.workspace.getConfiguration(undefined, scopeUri);
        return config.has(section);
    }

    private inspectConfiguration(section: string, scope: string | undefined): any {
        const scopeUri = scope ? vscode.Uri.parse(scope) : undefined;
        const config = vscode.workspace.getConfiguration(undefined, scopeUri);
        const inspection = config.inspect(section);
        
        if (!inspection) {
            return null;
        }

        return {
            key: inspection.key,
            defaultValue: inspection.defaultValue,
            globalValue: inspection.globalValue,
            workspaceValue: inspection.workspaceValue,
            workspaceFolderValue: inspection.workspaceFolderValue,
            defaultLanguageValue: inspection.defaultLanguageValue,
            globalLanguageValue: inspection.globalLanguageValue,
            workspaceLanguageValue: inspection.workspaceLanguageValue,
            workspaceFolderLanguageValue: inspection.workspaceFolderLanguageValue,
            languageIds: inspection.languageIds
        };
    }

    private async updateConfiguration(
        section: string,
        value: any,
        configurationTarget: number | null | undefined,
        scope: string | undefined,
        overrideInLanguage: boolean
    ): Promise<any> {
        const scopeUri = scope ? vscode.Uri.parse(scope) : undefined;
        const config = vscode.workspace.getConfiguration(undefined, scopeUri);
        
        // Convert configuration target number to ConfigurationTarget enum
        let target: vscode.ConfigurationTarget | boolean | null | undefined;
        if (configurationTarget === 1) {
            target = vscode.ConfigurationTarget.Global;
        } else if (configurationTarget === 2) {
            target = vscode.ConfigurationTarget.Workspace;
        } else if (configurationTarget === 3) {
            target = vscode.ConfigurationTarget.WorkspaceFolder;
        } else {
            target = configurationTarget;
        }

        await config.update(section, value, target, overrideInLanguage);
        return { success: true };
    }

    // Status Bar Item Handlers
    private createStatusBarItem(params: any): any {
        const { id, alignment, priority } = params;
        
        if (this.statusBarItems.has(id)) {
            throw new Error(`Status bar item already exists: ${id}`);
        }

        const alignmentValue = alignment === 'right' 
            ? vscode.StatusBarAlignment.Right 
            : vscode.StatusBarAlignment.Left;
        
        const item = vscode.window.createStatusBarItem(alignmentValue, priority);
        this.statusBarItems.set(id, item);

        return { success: true, id };
    }

    private updateStatusBarItem(params: any): any {
        const { id, text, tooltip, command, color, backgroundColor, show } = params;
        
        const item = this.statusBarItems.get(id);
        if (!item) {
            throw new Error(`Status bar item not found: ${id}`);
        }

        if (text !== undefined) {
            item.text = text;
        }
        if (tooltip !== undefined) {
            item.tooltip = tooltip;
        }
        if (command !== undefined) {
            item.command = command;
        }
        if (color !== undefined) {
            item.color = color;
        }
        if (backgroundColor !== undefined) {
            item.backgroundColor = new vscode.ThemeColor(backgroundColor);
        }
        if (show !== undefined) {
            if (show) {
                item.show();
            } else {
                item.hide();
            }
        }

        return { success: true };
    }

    private disposeStatusBarItem(params: any): any {
        const { id } = params;
        
        const item = this.statusBarItems.get(id);
        if (!item) {
            throw new Error(`Status bar item not found: ${id}`);
        }

        item.dispose();
        this.statusBarItems.delete(id);

        return { success: true };
    }

    // Progress Indicator Handler
    private async withProgress(params: any): Promise<any> {
        const { location, title, cancellable, task } = params;
        
        const locationValue = this.parseProgressLocation(location);
        
        return await vscode.window.withProgress(
            {
                location: locationValue,
                title: title,
                cancellable: cancellable || false
            },
            async (progress, token) => {
                // Report initial progress
                if (params.message) {
                    progress.report({ message: params.message });
                }

                // If this is a long-running operation that will be controlled from Python,
                // we need to wait for updates
                if (task === 'wait') {
                    const progressId = params.progressId || Math.random().toString(36);
                    
                    // Store the cancellation token
                    const tokenSource = new vscode.CancellationTokenSource();
                    this.progressTokens.set(progressId, tokenSource);
                    
                    // Set up a promise that will be resolved when the progress is complete
                    return new Promise((resolve, reject) => {
                        // Listen for progress updates
                        const checkInterval = setInterval(() => {
                            if (token.isCancellationRequested || tokenSource.token.isCancellationRequested) {
                                clearInterval(checkInterval);
                                this.progressTokens.delete(progressId);
                                reject(new Error('Progress cancelled'));
                            }
                        }, 100);

                        // Store the resolve/reject functions for external control
                        (this.progressTokens.get(progressId) as any).resolve = (result: any) => {
                            clearInterval(checkInterval);
                            this.progressTokens.delete(progressId);
                            resolve(result);
                        };
                        (this.progressTokens.get(progressId) as any).reject = (error: any) => {
                            clearInterval(checkInterval);
                            this.progressTokens.delete(progressId);
                            reject(error);
                        };
                        (this.progressTokens.get(progressId) as any).report = (update: any) => {
                            progress.report(update);
                        };
                    });
                }

                return { success: true };
            }
        );
    }

    private parseProgressLocation(location: string): vscode.ProgressLocation {
        switch (location?.toLowerCase()) {
            case 'notification':
                return vscode.ProgressLocation.Notification;
            case 'window':
                return vscode.ProgressLocation.Window;
            case 'sourcecontrol':
                return vscode.ProgressLocation.SourceControl;
            default:
                return vscode.ProgressLocation.Notification;
        }
    }

    // Terminal Handlers
    private async handleTerminalRequest(method: string, params: any): Promise<any> {
        switch (method) {
            case 'sendText':
                return this.terminalSendText(params);

            case 'show':
                return this.terminalShow(params);

            case 'hide':
                return this.terminalHide(params);

            case 'dispose':
                return this.terminalDispose(params);

            default:
                throw new Error(`Unknown terminal method: terminal.${method}`);
        }
    }

    private terminalSendText(params: any): any {
        const { terminalId, text, addNewLine = true } = params;
        const terminal = this.terminals.get(terminalId);

        if (!terminal) {
            throw new Error(`Terminal not found: ${terminalId}`);
        }

        terminal.sendText(text, addNewLine);
        return { success: true };
    }

    private terminalShow(params: any): any {
        const { terminalId, preserveFocus = true } = params;
        const terminal = this.terminals.get(terminalId);

        if (!terminal) {
            throw new Error(`Terminal not found: ${terminalId}`);
        }

        terminal.show(preserveFocus);
        return { success: true };
    }

    private terminalHide(params: any): any {
        const { terminalId } = params;
        const terminal = this.terminals.get(terminalId);

        if (!terminal) {
            throw new Error(`Terminal not found: ${terminalId}`);
        }

        terminal.hide();
        return { success: true };
    }

    private terminalDispose(params: any): any {
        const { terminalId } = params;
        const terminal = this.terminals.get(terminalId);

        if (!terminal) {
            throw new Error(`Terminal not found: ${terminalId}`);
        }

        terminal.dispose();
        this.terminals.delete(terminalId);
        return { success: true };
    }

    // File System Watcher Handlers
    private createFileSystemWatcher(params: any): any {
        const { globPattern, ignoreCreateEvents, ignoreChangeEvents, ignoreDeleteEvents } = params;
        const watcherId = `watcher-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const watcher = vscode.workspace.createFileSystemWatcher(
            globPattern,
            ignoreCreateEvents,
            ignoreChangeEvents,
            ignoreDeleteEvents
        );

        // Track disposables for this watcher
        const disposables: vscode.Disposable[] = [];

        // Subscribe to watcher events and broadcast to Python clients
        if (!ignoreCreateEvents) {
            disposables.push(watcher.onDidCreate(uri => {
                this.broadcastEvent(`watcher.${watcherId}.onCreate`, {
                    uri: uri.toString()
                });
            }));
        }

        if (!ignoreChangeEvents) {
            disposables.push(watcher.onDidChange(uri => {
                this.broadcastEvent(`watcher.${watcherId}.onChange`, {
                    uri: uri.toString()
                });
            }));
        }

        if (!ignoreDeleteEvents) {
            disposables.push(watcher.onDidDelete(uri => {
                this.broadcastEvent(`watcher.${watcherId}.onDelete`, {
                    uri: uri.toString()
                });
            }));
        }

        // Store the watcher state
        const watcherState = new FileSystemWatcherState(watcher, disposables);
        this.fileWatchers.set(watcherId, watcherState);
        return { watcherId };
    }

    private disposeFileSystemWatcher(params: any): any {
        const { watcherId } = params;
        const watcherState = this.fileWatchers.get(watcherId);

        if (!watcherState) {
            throw new Error(`File watcher not found: ${watcherId}`);
        }

        // Dispose the watcher and all its event listeners
        watcherState.dispose();
        this.fileWatchers.delete(watcherId);
        return { success: true };
    }

    // Workspace Search and Path Handlers
    private async findFiles(params: any): Promise<any> {
        const { include, exclude, maxResults } = params;
        
        try {
            const files = await vscode.workspace.findFiles(
                include,
                exclude === null ? null : (exclude || undefined),
                maxResults || undefined
            );
            
            return {
                files: files.map(uri => uri.toString())
            };
        } catch (error) {
            throw new Error(`Failed to find files: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private getWorkspaceFolder(params: any): any {
        const { uri } = params;
        
        if (!uri) {
            throw new Error('URI is required for getWorkspaceFolder');
        }

        const parsedUri = vscode.Uri.parse(uri);
        const folder = vscode.workspace.getWorkspaceFolder(parsedUri);

        if (!folder) {
            return { folder: null };
        }

        return {
            folder: {
                uri: folder.uri.toString(),
                name: folder.name,
                index: folder.index
            }
        };
    }

    private asRelativePath(params: any): any {
        const { pathOrUri, includeWorkspaceFolder } = params;
        
        if (!pathOrUri) {
            throw new Error('Path or URI is required for asRelativePath');
        }

        const relativePath = vscode.workspace.asRelativePath(
            pathOrUri,
            includeWorkspaceFolder
        );

        return { relativePath };
    }

    private async applyWorkspaceEdit(params: any): Promise<any> {
        const edit = new vscode.WorkspaceEdit();

        // Process document changes (text edits)
        if (params.documentChanges && Array.isArray(params.documentChanges)) {
            for (const docChange of params.documentChanges) {
                const uri = vscode.Uri.parse(docChange.uri);
                const textEdits = docChange.edits.map((e: any) => {
                    const range = new vscode.Range(
                        e.range.start.line,
                        e.range.start.character,
                        e.range.end.line,
                        e.range.end.character
                    );
                    return new vscode.TextEdit(range, e.newText);
                });
                edit.set(uri, textEdits);
            }
        }

        // Process file creates
        if (params.createFiles && Array.isArray(params.createFiles)) {
            for (const file of params.createFiles) {
                const uri = vscode.Uri.parse(file.uri);
                const options = file.options || {};
                edit.createFile(uri, {
                    overwrite: options.overwrite,
                    ignoreIfExists: options.ignoreIfExists
                });
            }
        }

        // Process file deletes
        if (params.deleteFiles && Array.isArray(params.deleteFiles)) {
            for (const file of params.deleteFiles) {
                const uri = vscode.Uri.parse(file.uri);
                const options = file.options || {};
                edit.deleteFile(uri, {
                    recursive: options.recursive,
                    ignoreIfNotExists: options.ignoreIfNotExists
                });
            }
        }

        // Process file renames
        if (params.renameFiles && Array.isArray(params.renameFiles)) {
            for (const file of params.renameFiles) {
                const oldUri = vscode.Uri.parse(file.oldUri);
                const newUri = vscode.Uri.parse(file.newUri);
                const options = file.options || {};
                edit.renameFile(oldUri, newUri, {
                    overwrite: options.overwrite,
                    ignoreIfExists: options.ignoreIfExists
                });
            }
        }

        // Apply the edit
        const success = await vscode.workspace.applyEdit(edit);
        return { success };
    }

    // Tab Groups Handlers
    private getTabGroups(): any {
        const groups = vscode.window.tabGroups.all.map((group, index) => ({
            groupId: index,
            isActive: group.isActive,
            viewColumn: group.viewColumn,
            tabs: group.tabs.map(tab => ({
                label: tab.label,
                isActive: tab.isActive,
                isDirty: tab.isDirty,
                isPinned: tab.isPinned,
                isPreview: tab.isPreview,
                groupId: index
            }))
        }));

        return { groups };
    }

    private getActiveTabGroup(): any {
        const activeGroup = vscode.window.tabGroups.activeTabGroup;
        if (!activeGroup) {
            return { group: null };
        }

        const groupIndex = vscode.window.tabGroups.all.indexOf(activeGroup);
        return {
            group: {
                groupId: groupIndex,
                isActive: activeGroup.isActive,
                viewColumn: activeGroup.viewColumn,
                tabs: activeGroup.tabs.map(tab => ({
                    label: tab.label,
                    isActive: tab.isActive,
                    isDirty: tab.isDirty,
                    isPinned: tab.isPinned,
                    isPreview: tab.isPreview,
                    groupId: groupIndex
                }))
            }
        };
    }

    private async closeTab(params: any): Promise<any> {
        const { groupId, tabLabel } = params;
        const groups = vscode.window.tabGroups.all;

        if (groupId >= groups.length) {
            throw new Error(`Tab group not found: ${groupId}`);
        }

        const group = groups[groupId];
        const tab = group.tabs.find(t => t.label === tabLabel);

        if (!tab) {
            throw new Error(`Tab not found: ${tabLabel}`);
        }

        const success = await vscode.window.tabGroups.close(tab, params.preserveFocus);
        return { success };
    }

    private async closeTabGroup(params: any): Promise<any> {
        const { groupId } = params;
        const groups = vscode.window.tabGroups.all;

        if (groupId >= groups.length) {
            throw new Error(`Tab group not found: ${groupId}`);
        }

        const group = groups[groupId];
        const success = await vscode.window.tabGroups.close(group, params.preserveFocus);
        return { success };
    }

    private async handleLanguageModelRequest(method: string, params: any): Promise<any> {
        switch (method) {
            case 'selectChatModels': {
                const selector = params.selector || {};
                const models = await vscode.lm.selectChatModels(selector);
                
                return models.map(model => ({
                    id: model.id,
                    name: model.name,
                    vendor: model.vendor,
                    family: model.family,
                    version: model.version,
                    maxInputTokens: model.maxInputTokens
                }));
            }

            case 'sendRequest': {
                const { modelId, messages, options = {} } = params;
                
                // Find the model
                const models = await vscode.lm.selectChatModels({ id: modelId });
                if (models.length === 0) {
                    throw new Error(`Language model not found: ${modelId}`);
                }
                const model = models[0];

                // Convert messages to LanguageModelChatMessage objects
                const chatMessages = messages.map((msg: any) => {
                    if (msg.role === 'user') {
                        return vscode.LanguageModelChatMessage.User(msg.content);
                    } else if (msg.role === 'assistant') {
                        return vscode.LanguageModelChatMessage.Assistant(msg.content);
                    } else {
                        throw new Error(`Unknown message role: ${msg.role}`);
                    }
                });

                // Send request and collect response
                const response = await model.sendRequest(chatMessages, options);
                const textParts: string[] = [];
                
                for await (const fragment of response.text) {
                    textParts.push(fragment);
                }

                return {
                    text: textParts.join(''),
                    parts: textParts
                };
            }

            case 'countTokens': {
                const { modelId, text } = params;
                
                // Find the model
                const models = await vscode.lm.selectChatModels({ id: modelId });
                if (models.length === 0) {
                    throw new Error(`Language model not found: ${modelId}`);
                }
                const model = models[0];

                return await model.countTokens(text);
            }

            default:
                throw new Error(`Unknown language model method: ${method}`);
        }
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

        this.eventDisposables.push(
            vscode.window.onDidChangeTerminalState(e => {
                this.broadcastEvent('window.onDidChangeTerminalState', {
                    name: e.name,
                    isInteractedWith: e.state?.isInteractedWith || false
                });
            })
        );

        // Text editor change events
        this.eventDisposables.push(
            vscode.window.onDidChangeTextEditorVisibleRanges(e => {
                this.broadcastEvent('window.onDidChangeTextEditorVisibleRanges', {
                    uri: e.textEditor.document.uri.toString(),
                    visibleRanges: e.visibleRanges.map(range => ({
                        start: { line: range.start.line, character: range.start.character },
                        end: { line: range.end.line, character: range.end.character }
                    }))
                });
            })
        );

        this.eventDisposables.push(
            vscode.window.onDidChangeTextEditorOptions(e => {
                this.broadcastEvent('window.onDidChangeTextEditorOptions', {
                    uri: e.textEditor.document.uri.toString(),
                    options: {
                        tabSize: e.options.tabSize,
                        insertSpaces: e.options.insertSpaces,
                        cursorStyle: e.options.cursorStyle,
                        lineNumbers: e.options.lineNumbers
                    }
                });
            })
        );

        this.eventDisposables.push(
            vscode.window.onDidChangeTextEditorViewColumn(e => {
                this.broadcastEvent('window.onDidChangeTextEditorViewColumn', {
                    uri: e.textEditor.document.uri.toString(),
                    viewColumn: e.viewColumn
                });
            })
        );

        // Window state events
        this.eventDisposables.push(
            vscode.window.onDidChangeWindowState(e => {
                this.broadcastEvent('window.onDidChangeWindowState', {
                    focused: e.focused
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

        // File system events
        this.eventDisposables.push(
            vscode.workspace.onDidCreateFiles(e => {
                this.broadcastEvent('workspace.onDidCreateFiles', {
                    files: e.files.map(f => ({ uri: f.toString() }))
                });
            })
        );

        this.eventDisposables.push(
            vscode.workspace.onDidDeleteFiles(e => {
                this.broadcastEvent('workspace.onDidDeleteFiles', {
                    files: e.files.map(f => ({ uri: f.toString() }))
                });
            })
        );

        this.eventDisposables.push(
            vscode.workspace.onDidRenameFiles(e => {
                this.broadcastEvent('workspace.onDidRenameFiles', {
                    files: e.files.map(f => ({
                        oldUri: f.oldUri.toString(),
                        newUri: f.newUri.toString()
                    }))
                });
            })
        );

        // Tab groups events
        this.eventDisposables.push(
            vscode.window.tabGroups.onDidChangeTabGroups(e => {
                this.broadcastEvent('window.onDidChangeTabGroups', {
                    opened: e.opened.length,
                    closed: e.closed.length,
                    changed: e.changed.length
                });
            })
        );

        this.eventDisposables.push(
            vscode.window.tabGroups.onDidChangeTabs(e => {
                this.broadcastEvent('window.onDidChangeTabs', {
                    opened: e.opened.length,
                    closed: e.closed.length,
                    changed: e.changed.length
                });
            })
        );
    }
}
