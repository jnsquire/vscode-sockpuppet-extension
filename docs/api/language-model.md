# Language Model API

The Language Model API provides access to AI language models available in VS Code, including GitHub Copilot and other custom language model providers.

## Overview

The Language Model API allows Python scripts to:
- Query available language models
- Send chat requests with conversation history
- Count tokens for cost/limit estimation
- Generate code, documentation, and explanations
- Integrate AI capabilities into automation workflows

## Basic Usage

```python
from vscode_sockpuppet import VSCodeClient, LanguageModelChatMessage

with VSCodeClient() as client:
    # Get available models
    models = client.lm.select_chat_models()
    
    if models:
        model = models[0]
        
        # Send a simple request
        messages = [LanguageModelChatMessage.user("Explain async/await in Python")]
        response = model.send_request(messages)
        
        print(response["text"])
```

## API Reference

### LanguageModel

Entry point for accessing language model functionality.

**Access**: `client.lm`

#### `select_chat_models(filters=None) -> list[LanguageModelChat]`

Query available language models with optional filtering.

**Parameters**:
- `filters` (dict, optional): Filter criteria
  - `vendor`: Filter by vendor (e.g., "copilot")
  - `family`: Filter by model family (e.g., "gpt-4")
  - `version`: Filter by version (e.g., "gpt-4o")
  - `id`: Filter by exact model ID

**Returns**: List of `LanguageModelChat` instances

**Example**:
```python
# Get all models
all_models = client.lm.select_chat_models()

# Get GPT-4 family models
gpt4_models = client.lm.select_chat_models({"family": "gpt-4"})

# Get specific model
copilot_models = client.lm.select_chat_models({"vendor": "copilot", "id": "gpt-4o"})
```

### LanguageModelChat

Represents a specific language model instance.

#### Properties

- `id` (str): Unique identifier for the model
- `name` (str): Display name of the model
- `vendor` (str): Provider of the model (e.g., "copilot")
- `family` (str): Model family (e.g., "gpt-4", "claude-3.5-sonnet")
- `version` (str): Specific version string
- `max_input_tokens` (int): Maximum tokens allowed in input

#### `send_request(messages, options=None) -> dict`

Send a chat request to the language model.

**Parameters**:
- `messages` (list): List of `LanguageModelChatMessage` objects
- `options` (dict, optional):
  - `justification` (str): Reason for the request (shown to user)

**Returns**: Dictionary with:
- `text` (str): Complete response text from the model

**Example**:
```python
messages = [
    LanguageModelChatMessage.user("What is Python?"),
    LanguageModelChatMessage.assistant("Python is a programming language..."),
    LanguageModelChatMessage.user("Can you show an example?")
]

response = model.send_request(messages, {
    "justification": "Generating code example"
})

print(response["text"])
```

#### `count_tokens(text) -> int`

Count tokens in a given text for cost estimation.

**Parameters**:
- `text` (str): Text to count tokens for

**Returns**: Number of tokens

**Example**:
```python
code = "def hello():\n    print('Hello, world!')"
token_count = model.count_tokens(code)
print(f"Code uses {token_count} tokens")
```

### LanguageModelChatMessage

Represents a message in a conversation.

#### Factory Methods

**`LanguageModelChatMessage.user(content: str)`**

Create a user message.

**`LanguageModelChatMessage.assistant(content: str)`**

Create an assistant (model) message for conversation history.

**Example**:
```python
messages = [
    LanguageModelChatMessage.user("Write a function to calculate factorial"),
    LanguageModelChatMessage.assistant("Here's a factorial function: def factorial(n): ..."),
    LanguageModelChatMessage.user("Now make it recursive")
]
```

## Use Cases

### Code Generation

```python
messages = [
    LanguageModelChatMessage.user(
        "Write a Python function to check if a number is prime. "
        "Include type hints and a docstring."
    )
]

response = model.send_request(messages)
print(response["text"])
```

### Code Explanation

```python
# Get selected code from editor
selection = client.editor.get_selection()
code = selection.get("text", "")

if code:
    messages = [
        LanguageModelChatMessage.user(f"Explain this code:\n\n{code}")
    ]
    response = model.send_request(messages)
    print(response["text"])
```

### Multi-turn Conversations

```python
conversation = []

# First question
conversation.append(LanguageModelChatMessage.user("What is a Python decorator?"))
response = model.send_request(conversation)
conversation.append(LanguageModelChatMessage.assistant(response["text"]))

# Follow-up question with context
conversation.append(LanguageModelChatMessage.user("Can you show me an example?"))
response = model.send_request(conversation)
print(response["text"])
```

### Documentation Generation

```python
function_code = """
def calculate_total(items, tax_rate=0.08, discount=0):
    subtotal = sum(item['price'] * item['quantity'] for item in items)
    discount_amount = subtotal * discount
    taxable = subtotal - discount_amount
    tax = taxable * tax_rate
    return taxable + tax
"""

messages = [
    LanguageModelChatMessage.user(
        f"Write a complete docstring for this function:\n\n{function_code}"
    )
]

response = model.send_request(messages)
print(response["text"])
```

### Error Analysis

```python
error_code = """
def divide(a, b):
    return a / b

result = divide(10, 0)
"""

error_message = "ZeroDivisionError: division by zero"

messages = [
    LanguageModelChatMessage.user(
        f"This code produces an error:\n\n{error_code}\n\n"
        f"Error: {error_message}\n\n"
        "Explain the error and provide a fix."
    )
]

response = model.send_request(messages)
print(response["text"])
```

### Token Estimation

```python
# Estimate tokens before sending
prompt = "Write a comprehensive guide to Python async programming"
token_count = model.count_tokens(prompt)

if token_count < model.max_input_tokens:
    messages = [LanguageModelChatMessage.user(prompt)]
    response = model.send_request(messages)
else:
    print(f"Prompt too long: {token_count} tokens")
```

## Model Selection Strategies

### Get the Most Capable Model

```python
models = client.lm.select_chat_models()
if models:
    # Sort by max tokens (rough proxy for capability)
    best_model = max(models, key=lambda m: m.max_input_tokens)
    print(f"Using: {best_model.name}")
```

### Get Specific Model Family

```python
# Prefer GPT-4, fall back to available models
gpt4_models = client.lm.select_chat_models({"family": "gpt-4"})
if gpt4_models:
    model = gpt4_models[0]
else:
    # Fall back to any available model
    models = client.lm.select_chat_models()
    model = models[0] if models else None
```

### Filter by Vendor

```python
# Use only Copilot models
copilot_models = client.lm.select_chat_models({"vendor": "copilot"})
```

## Best Practices

### 1. Check Model Availability

Always check if models are available before using them:

```python
models = client.lm.select_chat_models()
if not models:
    print("No language models available")
    return

model = models[0]
```

### 2. Provide Context in Conversations

For better responses, maintain conversation history:

```python
conversation = []
conversation.append(LanguageModelChatMessage.user("First question"))
response = model.send_request(conversation)
conversation.append(LanguageModelChatMessage.assistant(response["text"]))
# Continue with context...
```

### 3. Use Justification for Transparency

Provide justification to inform users why the model is being invoked:

```python
response = model.send_request(messages, {
    "justification": "Generating documentation for user's code"
})
```

### 4. Handle Token Limits

Check token counts for large inputs:

```python
if model.count_tokens(large_text) < model.max_input_tokens:
    # Safe to send
    pass
else:
    # Truncate or split into smaller requests
    pass
```

### 5. Error Handling

Wrap model requests in try-except blocks:

```python
try:
    response = model.send_request(messages)
except Exception as e:
    print(f"Language model request failed: {e}")
```

## Requirements

- GitHub Copilot subscription (for Copilot models)
- VS Code with language model extensions installed
- Extension must be running (press F5 for Extension Development Host)

## See Also

- `example_language_model.py` - Comprehensive usage examples
- [VS Code Language Model API](https://code.visualstudio.com/api/extension-guides/language-model)
