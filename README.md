# Prompt_E

Prompt_E is a Chrome extension for saving, organizing, and instantly inserting reusable prompts anywhere on the web.

## Features

- Save, edit, delete, and search reusable prompts.
- Organize prompts with categories and tags.
- Insert prompts from the popup, a webpage context menu, or a keyboard shortcut.
- Use dynamic variables such as `{{topic}}` and fill them in before insertion.
- Track prompt usage and sort the library by most used.
- Export the local prompt library to JSON and import it on another device.
- Store all prompt data locally with `chrome.storage.local`.

## Installation

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the project folder containing `manifest.json`.
5. Pin Prompt_E to the browser toolbar for quick access.

Reload the extension from the Extensions page after changing extension files.

## Usage

### Create a prompt

Open the Prompt_E popup, enter a title and prompt body, then optionally choose a category, add comma-separated tags, and assign a shortcut such as `Alt+Shift+1`.

### Insert a prompt

- Open the popup and select **Use prompt**.
- Focus an editable field on a webpage, right-click, and choose **Insert saved prompt**.
- Focus an editable field and press the shortcut assigned to a prompt.

The context menu and keyboard shortcut work with text inputs, textareas, and contenteditable fields.

### Use variables

Add placeholders to a prompt using double braces:

```text
Write a concise product description for {{product}} aimed at {{audience}}.
```

When the prompt is used, Prompt_E opens a form for the variable values and inserts the completed prompt.

### Import and export

Use **Export JSON** to download a backup of your library. Use **Import JSON** to merge prompts from a Prompt_E export file. Older prompts without categories, tags, shortcuts, or usage data remain compatible.

## Permissions

- `storage`: Save prompts and usage data locally.
- `contextMenus`: Add saved prompts to the webpage right-click menu.
- `activeTab` and `scripting`: Insert prompts into the active webpage.
- `<all_urls>`: Enable prompt insertion on supported webpages.

## Project structure

| File | Purpose |
| --- | --- |
| `manifest.json` | Chrome extension configuration and permissions |
| `popup.html` | Prompt library interface |
| `popup.css` | Popup styling |
| `popup.js` | Prompt management, filtering, import/export, and usage tracking |
| `background.js` | Dynamic context-menu registration and context-menu usage tracking |
| `content.js` | Webpage insertion, variables, and keyboard shortcuts |