# Two-Repository Structure - Complete Setup

## Overview

The VSCode Sockpuppet project has been prepared for a two-repository structure:

1. **vscode-sockpuppet-extension** - VS Code extension (TypeScript)
2. **vscode-sockpuppet-python** - Python client package (Python)

The Python package will be included in the extension repository as a Git submodule.

## Files Created for Two-Repo Setup

### Extension Repository Files
- `README_NEW.md` - New README for extension repo with two-repo structure
- `.gitmodules.template` - Template for submodule configuration
- `vscode-sockpuppet.code-workspace` - VS Code workspace configuration
- `setup-two-repos.ps1` - PowerShell script to help with setup
- `docs/TWO_REPO_SETUP.md` - Complete guide for two-repo structure

### Python Repository Files
- `python/README_STANDALONE.md` - README for standalone Python repo
- `python/.gitignore` - Python-specific gitignore
- `python/LICENSE` - MIT License
- `python/.github/workflows/test.yml` - CI/CD for Python package

## Current Project Structure

```
vscode-sockpuppet/
├── .github/
│   └── copilot-instructions.md
├── .vscode/
├── docs/                           # Comprehensive documentation
│   ├── README.md                   # Documentation index
│   ├── QUICKSTART.md
│   ├── DOCUMENT_API.md
│   ├── EVENTS.md
│   ├── EXTENSION_API.md
│   ├── DEVELOPMENT.md
│   ├── API_IMPLEMENTATION.md
│   ├── DOCUMENT_IMPLEMENTATION.md
│   ├── MIGRATION.md
│   └── TWO_REPO_SETUP.md          # ← Setup guide
├── examples/                       # TypeScript examples
├── python/                         # Python package (will become submodule)
│   ├── .github/
│   │   └── workflows/
│   │       └── test.yml           # Python CI/CD
│   ├── vscode_sockpuppet/
│   │   ├── __init__.py
│   │   ├── client.py
│   │   ├── document.py
│   │   ├── editor.py
│   │   ├── window.py
│   │   └── workspace.py
│   ├── example.py
│   ├── example_events.py
│   ├── example_document.py
│   ├── pyproject.toml
│   ├── README.md                  # Current Python README
│   ├── README_STANDALONE.md       # ← For standalone repo
│   ├── .gitignore                 # ← Python-specific
│   └── LICENSE                    # ← MIT License
├── src/                           # TypeScript extension source
│   ├── extension.ts
│   ├── server.ts
│   └── api.ts
├── package.json                   # Extension manifest (updated)
├── README.md                      # Current README
├── README_NEW.md                  # ← New README for extension repo
├── .gitmodules.template           # ← Submodule configuration
├── vscode-sockpuppet.code-workspace  # ← VS Code workspace
└── setup-two-repos.ps1            # ← Setup helper script
```

## Setup Process

### Automated Setup (Recommended)

```powershell
# Run the setup script
.\setup-two-repos.ps1 `
    -PythonRepoUrl "https://github.com/yourusername/vscode-sockpuppet-python.git" `
    -ExtensionRepoUrl "https://github.com/yourusername/vscode-sockpuppet-extension.git"
```

This script will:
1. ✓ Check prerequisites (Git installed)
2. ✓ Create a backup of current state
3. ✓ Verify Python package structure
4. ✓ Show configuration
5. ✓ Create detailed setup instructions file

### Manual Setup

Follow the instructions in `docs/TWO_REPO_SETUP.md` for step-by-step manual setup.

## After Creating Repositories

### 1. Create Python Repository on GitHub

```bash
cd python/
git init
git add .
git commit -m "Initial commit: Python package"
git remote add origin https://github.com/yourusername/vscode-sockpuppet-python.git
git push -u origin main
```

### 2. Create Extension Repository with Submodule

```bash
cd ..  # Back to extension root

# Remove python folder
rm -rf python

# Add as submodule
git submodule add https://github.com/yourusername/vscode-sockpuppet-python.git python

# Initialize extension repo
git init
git add .
git commit -m "Initial commit: Extension with Python submodule"
git remote add origin https://github.com/yourusername/vscode-sockpuppet-extension.git
git push -u origin main
```

### 3. Verify Setup

```bash
# Clone extension with submodule
git clone --recursive https://github.com/yourusername/vscode-sockpuppet-extension.git test
cd test

# Verify Python submodule
ls python/

# Test extension
npm install
npm run compile

# Test Python package
cd python
pip install -e .
```

## Benefits of This Structure

### Separation of Concerns
- **Extension (TypeScript)**: VS Code marketplace, extension development
- **Python Package (Python)**: PyPI, Python-focused development

### Independent Versioning
- Extension version: Marketplace releases
- Python version: PyPI releases
- Can update independently

### Better CI/CD
- Extension: TypeScript compilation, VS Code testing
- Python: Python testing across versions, PyPI publishing

### Clearer Contribution
- Extension PRs go to extension repo
- Python PRs go to Python repo
- Clearer ownership and review process

### Easier Distribution
- Python package: `pip install vscode-sockpuppet`
- Extension: Install from VS Code Marketplace
- Users only install what they need

## Development Workflow

### Extension Development
```bash
git clone --recursive https://github.com/yourusername/vscode-sockpuppet-extension.git
cd vscode-sockpuppet-extension
npm install
npm run compile
# Press F5 to debug
```

### Python Development
```bash
# Option 1: Work in submodule
cd vscode-sockpuppet-extension/python
git checkout -b feature/my-feature
# Make changes, commit, push to Python repo

# Option 2: Clone Python repo separately
git clone https://github.com/yourusername/vscode-sockpuppet-python.git
cd vscode-sockpuppet-python
pip install -e .
# Make changes
```

### Updating Submodule in Extension
```bash
cd vscode-sockpuppet-extension/python
git pull origin main
cd ..
git add python
git commit -m "Update Python package to latest"
git push
```

## Publishing

### Publish Python Package to PyPI
```bash
cd vscode-sockpuppet-python
python -m build
python -m twine upload dist/*
```

### Publish Extension to Marketplace
```bash
cd vscode-sockpuppet-extension
vsce package
vsce publish
```

## Documentation

All documentation remains in the extension repository (`docs/` folder) since it covers both components:

- **QUICKSTART.md** - Getting started with both
- **DOCUMENT_API.md** - Python API reference
- **EVENTS.md** - Event system
- **EXTENSION_API.md** - Extension integration
- **DEVELOPMENT.md** - Contributing to either repo
- **TWO_REPO_SETUP.md** - This setup process

The Python repository README will link back to extension repo for full documentation.

## Files to Update

Before pushing to GitHub:

### In Extension Repository
- [ ] Replace `README.md` with `README_NEW.md`
- [ ] Update `package.json` publisher and URLs
- [ ] Update `.github/copilot-instructions.md`
- [ ] Add `.gitmodules` from `.gitmodules.template`
- [ ] Update doc links if needed

### In Python Repository
- [ ] Rename `README_STANDALONE.md` to `README.md`
- [ ] Update `pyproject.toml` with correct URLs
- [ ] Ensure `.gitignore` is present
- [ ] Ensure `LICENSE` is present

## Next Steps

1. **Read** `docs/TWO_REPO_SETUP.md` for complete details
2. **Run** `setup-two-repos.ps1` to generate instructions
3. **Create** GitHub repositories
4. **Follow** generated `SETUP_INSTRUCTIONS.txt`
5. **Test** cloning and building both repos
6. **Update** documentation links as needed

## Support

- Extension issues: https://github.com/yourusername/vscode-sockpuppet-extension/issues
- Python issues: https://github.com/yourusername/vscode-sockpuppet-python/issues

## Summary

✅ Project structured for two repositories
✅ Python package ready for standalone repo
✅ Extension ready to use Python as submodule
✅ Documentation prepared
✅ CI/CD configs ready
✅ Setup scripts created
✅ Backup strategy in place

**Ready to split into two GitHub repositories!**
