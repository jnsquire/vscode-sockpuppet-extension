# Repository Setup Guide

## Overview

The VSCode Sockpuppet project uses a two-repository structure:

1. **vscode-sockpuppet-extension** - VS Code extension (TypeScript)
2. **vscode-sockpuppet-python** - Python client package (Python)

The Python package is included in the extension repository as a Git submodule for development convenience.

## Current Structure

```
vscode-sockpuppet-extension/
├── .github/
│   └── copilot-instructions.md
├── .vscode/
│   └── launch.json                # Debug configurations
├── docs/                          # Documentation
│   ├── getting-started/
│   ├── api/
│   ├── guides/
│   └── implementation/
├── examples/                      # TypeScript examples
│   ├── extension-integration.ts
│   └── launched-by-extension.py
├── python/                        # Git submodule
│   ├── .github/
│   │   └── workflows/
│   │       └── test.yml          # Python CI/CD
│   ├── vscode_sockpuppet/        # Python package
│   ├── examples/                 # Python examples
│   ├── tests/                    # Python tests
│   ├── pyproject.toml
│   └── README.md
├── src/                          # TypeScript extension code
│   ├── extension.ts
│   ├── server.ts
│   └── api.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Setting Up from Scratch

### Step 1: Create Python Package Repository

```bash
# Create a new directory for the Python package
mkdir vscode-sockpuppet-python
cd vscode-sockpuppet-python

# Initialize Git
git init
git add .
git commit -m "Initial commit: Python package"

# Create GitHub repository and push
gh repo create vscode-sockpuppet-python --public --source=. --remote=origin --push
# Or manually:
# git remote add origin https://github.com/yourusername/vscode-sockpuppet-python.git
# git branch -M main
# git push -u origin main
```

### Step 2: Create Extension Repository with Submodule

```bash
# Create extension repository
mkdir vscode-sockpuppet-extension
cd vscode-sockpuppet-extension

# Initialize Git
git init

# Add the Python repo as a submodule
git submodule add https://github.com/yourusername/vscode-sockpuppet-python.git python

# Commit the submodule
git add .
git commit -m "Add Python package as submodule"

# Create GitHub repository and push
gh repo create vscode-sockpuppet-extension --public --source=. --remote=origin --push
```

### Step 3: Clone with Submodules

When cloning the extension repository:

```bash
# Clone with submodules in one command
git clone --recursive https://github.com/yourusername/vscode-sockpuppet-extension.git

# Or if already cloned, initialize submodules
git clone https://github.com/yourusername/vscode-sockpuppet-extension.git
cd vscode-sockpuppet-extension
git submodule init
git submodule update
```

## Working with Submodules

### Update Python Package

```bash
# Navigate to Python submodule
cd python

# Make changes, commit, and push
git add .
git commit -m "Update Python package"
git push

# Back in main repo, update submodule reference
cd ..
git add python
git commit -m "Update Python package reference"
git push
```

### Pull Latest Changes

```bash
# Update main repository and all submodules
git pull
git submodule update --remote

# Or update just the Python submodule
cd python
git pull origin main
cd ..
git add python
git commit -m "Update Python package to latest"
```

### Switch Submodule Branch

```bash
cd python
git checkout develop  # or any other branch
cd ..
git add python
git commit -m "Switch Python package to develop branch"
```

## CI/CD Setup

### Extension Repository (GitHub Actions)

`.github/workflows/build.yml`:
```yaml
name: Build and Test Extension

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: true  # Important: fetch submodules
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Compile
        run: npm run compile
      
      - name: Run tests
        run: npm test
```

### Python Package Repository (GitHub Actions)

`.github/workflows/test.yml`:
```yaml
name: Python Package CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        python-version: ['3.8', '3.9', '3.10', '3.11', '3.12']
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Install uv
        uses: astral-sh/setup-uv@v3
        with:
          enable-cache: true
      
      - name: Set up Python
        run: uv python install ${{ matrix.python-version }}
      
      - name: Install dependencies
        run: uv pip install --system -e ".[dev]"
      
      - name: Lint with ruff
        run: ruff check vscode_sockpuppet
      
      - name: Run tests
        run: pytest tests/ -v
```

## Development Workflow

### Making Changes

1. **Python package changes:**
   ```bash
   cd python
   # Make changes
   git add .
   git commit -m "Description"
   git push
   cd ..
   git add python
   git commit -m "Update Python package"
   git push
   ```

2. **Extension changes:**
   ```bash
   # Make changes in src/
   git add .
   git commit -m "Description"
   git push
   ```

### Testing Integration

```bash
# Install dependencies for both
npm install           # Extension dependencies
cd python
uv pip install -e .   # Python package
cd ..

# Run extension in debug mode
npm run compile
code .                # Open in VS Code
# Press F5 to launch extension
```

## Publishing

### Publishing Python Package to PyPI

```bash
cd python

# Build the package
python -m build

# Upload to PyPI
python -m twine upload dist/*
```

### Publishing Extension to Marketplace

```bash
# Install vsce
npm install -g @vscode/vsce

# Package extension
vsce package

# Publish to marketplace
vsce publish
```

## Workspace Configuration

Create `vscode-sockpuppet.code-workspace`:

```json
{
  "folders": [
    {
      "name": "Extension",
      "path": "."
    },
    {
      "name": "Python Package",
      "path": "python"
    }
  ],
  "settings": {
    "python.defaultInterpreterPath": "${workspaceFolder:Python Package}/.venv/bin/python",
    "files.exclude": {
      "**/.git": true,
      "**/.vscode": false,
      "**/node_modules": true,
      "**/__pycache__": true,
      "**/*.pyc": true,
      "out": true,
      "dist": true
    }
  }
}
```

## Troubleshooting

### Submodule Not Updating

```bash
# Force update
git submodule update --init --recursive --remote

# If detached HEAD state
cd python
git checkout main
git pull
```

### Submodule Conflicts

```bash
# Reset submodule to remote state
cd python
git fetch origin
git reset --hard origin/main
cd ..
git add python
```

### Missing Submodule After Clone

```bash
git submodule init
git submodule update
```

## Best Practices

1. **Always commit submodule changes first** before updating the parent repo
2. **Use descriptive commit messages** when updating submodule references
3. **Document breaking changes** in both repositories
4. **Keep CI/CD in sync** between repositories
5. **Use semantic versioning** for Python package releases
6. **Tag releases** in both repositories
7. **Update documentation** when structure changes

## Resources

- [Git Submodules Documentation](https://git-scm.com/book/en/v2/Git-Tools-Submodules)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [VS Code Extension Publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Python Packaging Guide](https://packaging.python.org/)
