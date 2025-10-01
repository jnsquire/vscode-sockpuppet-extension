# Two-Repository Setup Guide

This document explains how to set up VSCode Sockpuppet as two separate GitHub repositories.

## Repository Structure

The project is split into two repositories:

1. **vscode-sockpuppet-extension** (This repo) - VS Code extension (TypeScript)
2. **vscode-sockpuppet-python** - Python package (separate repo)

The extension repository includes the Python package as a Git submodule for development convenience.

## Setting Up the Repositories

### Step 1: Create Python Package Repository

```bash
# Create a new directory for the Python package
cd /path/to/your/projects
mkdir vscode-sockpuppet-python
cd vscode-sockpuppet-python

# Copy Python package files from the current python/ folder
cp -r /path/to/vscode-sockpuppet/python/* .

# Initialize Git
git init
git add .
git commit -m "Initial commit: Python package"

# Create GitHub repository and push
git remote add origin https://github.com/yourusername/vscode-sockpuppet-python.git
git branch -M main
git push -u origin main
```

### Step 2: Set Up Extension Repository with Submodule

```bash
# In the extension repository (this repo)
cd /path/to/vscode-sockpuppet

# Remove the old python folder (after backing up to the new repo)
rm -rf python

# Add the Python repo as a submodule
git submodule add https://github.com/yourusername/vscode-sockpuppet-python.git python

# Commit the submodule
git add .gitmodules python
git commit -m "Add Python package as submodule"

# Create GitHub repository for extension and push
git remote add origin https://github.com/yourusername/vscode-sockpuppet-extension.git
git branch -M main
git push -u origin main
```

### Step 3: Cloning with Submodules

When others clone the extension repository:

```bash
# Clone with submodules
git clone --recursive https://github.com/yourusername/vscode-sockpuppet-extension.git

# Or if already cloned without --recursive:
git submodule init
git submodule update
```

## Directory Structure After Setup

### Extension Repository (vscode-sockpuppet-extension)
```
vscode-sockpuppet-extension/
├── .git/
├── .gitmodules                 # Submodule configuration
├── src/                        # TypeScript source
├── docs/                       # Documentation
├── examples/                   # TypeScript examples
├── python/                     # → Git submodule to Python repo
│   ├── .git/                   # Points to Python repo
│   ├── vscode_sockpuppet/
│   ├── pyproject.toml
│   └── README.md
├── package.json
└── README.md
```

### Python Repository (vscode-sockpuppet-python)
```
vscode-sockpuppet-python/
├── .git/
├── .github/
│   └── workflows/
│       └── test.yml            # CI/CD for Python package
├── vscode_sockpuppet/          # Python source
│   ├── __init__.py
│   ├── client.py
│   ├── document.py
│   ├── editor.py
│   ├── window.py
│   └── workspace.py
├── example.py
├── example_events.py
├── example_document.py
├── pyproject.toml
├── README.md
├── LICENSE
└── .gitignore
```

## Workflow for Development

### Working on the Extension

```bash
cd vscode-sockpuppet-extension
npm install
npm run compile
# Press F5 to debug
```

### Working on the Python Package

```bash
cd vscode-sockpuppet-extension/python
pip install -e .
# Make changes to Python code
# Test with examples
```

### Committing Python Changes

```bash
cd vscode-sockpuppet-extension/python
git checkout -b feature/my-feature
# Make changes
git add .
git commit -m "Add new feature"
git push origin feature/my-feature
# Create PR in Python repository

# After merging, update submodule in extension repo
cd ..
git add python
git commit -m "Update Python package submodule"
git push
```

### Updating Submodule Reference

To update the extension to use the latest Python package:

```bash
cd vscode-sockpuppet-extension
cd python
git pull origin main
cd ..
git add python
git commit -m "Update to latest Python package"
git push
```

## Publishing

### Publishing Python Package to PyPI

```bash
cd vscode-sockpuppet-python

# Build package
pip install build twine
python -m build

# Upload to PyPI
python -m twine upload dist/*
```

### Publishing Extension to VS Code Marketplace

```bash
cd vscode-sockpuppet-extension

# Install vsce
npm install -g @vscode/vsce

# Package extension
vsce package

# Publish
vsce publish
```

## Benefits of Two-Repository Setup

1. **Separate Concerns**: Extension and Python package have different:
   - Release cycles
   - Version numbers
   - CI/CD pipelines
   - Issue trackers

2. **Independent Distribution**:
   - Python package on PyPI
   - Extension on VS Code Marketplace
   - Users can install just what they need

3. **Easier Contribution**:
   - Contributors can work on extension or Python separately
   - Simpler review process
   - Clearer ownership

4. **Better Organization**:
   - Each repo has its own README, docs, license
   - Separate GitHub Actions workflows
   - Independent testing and linting

5. **Flexible Development**:
   - Can version packages independently
   - Python package usable without extension code
   - Extension can pin to specific Python package version

## CI/CD Setup

### Extension Repository (.github/workflows/build.yml)

```yaml
name: Extension CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm run compile
      - run: npm test
```

### Python Repository (.github/workflows/test.yml)

Already created in `python/.github/workflows/test.yml`

## Migration Checklist

- [ ] Create Python repository on GitHub
- [ ] Copy Python package files to new repo
- [ ] Initialize Git in Python repo
- [ ] Push Python repo to GitHub
- [ ] Remove `python/` folder from extension repo
- [ ] Add Python repo as submodule
- [ ] Update extension README with submodule instructions
- [ ] Update Python README with standalone instructions
- [ ] Set up GitHub Actions for both repos
- [ ] Update documentation links between repos
- [ ] Test cloning both repos
- [ ] Publish Python package to PyPI
- [ ] Publish extension to Marketplace

## Support

For questions about this setup:
- Extension repo: [Issues](https://github.com/yourusername/vscode-sockpuppet-extension/issues)
- Python repo: [Issues](https://github.com/yourusername/vscode-sockpuppet-python/issues)
