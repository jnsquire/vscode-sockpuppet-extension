<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file --><!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Documentation Guidelines

- **DO NOT** create separate summary documents (like LANGUAGE_MODEL_API.md, WEBVIEW_DISPOSAL_EVENTS.md, etc.)	Project: VS Code extension with Python package integration for programmatic VS Code API access

- **DO** update the running NOTES.md file with recent work and changes

- **DO** keep NOTES.md concise and trim older content periodically

- **DO** update existing documentation in docs/ folder when relevant

- **DO** add examples to python/examples/ folder with clear inline comments	

	Ensure that the previous step has been marked as completed.

## Project Overview	Call project setup tool with projectType parameter.

	Run scaffolding command to create project files and folders.

VS Code extension with Python package integration for programmatic VS Code API access

	If no appropriate projectType is available, search documentation using available tools.

### Key Components	Otherwise, create the project structure manually using available file creation tools.

- TypeScript extension: WebSocket/Named Pipe server exposing VS Code APIs	-->

- Python package: Client library with idiomatic Python wrappers

- IPC: Named pipes (Windows) and Unix sockets (Linux/Mac)

- Multi-instance support: Unique pipe names per workspace

### Development Workflow

1. Make TypeScript changes in `src/`	Develop a plan to modify codebase according to user requirements.

2. Make Python changes in `python/vscode_sockpuppet/`	Apply modifications using appropriate tools and user-provided references.

3. Run `npm run compile` to build and lint	Skip this step for "Hello World" projects.

4. Test with F5 (Extension Development Host)

5. Update NOTES.md with significant changes

### Architecture Notes	No additional extensions needed beyond esbuild-problem-matchers (recommended)

- Environment variable: VSCODE_SOCKPUPPET_PIPE for IPC discovery

- Zero Python dependencies (removed pywin32)

- Event-driven with subscription support

- Context managers for resource cleanup

	Verify that all previous steps have been completed.
	Install any missing dependencies.
	Run diagnostics and resolve any issues.
	Check for markdown files in project folder for relevant instructions on how to do this.
