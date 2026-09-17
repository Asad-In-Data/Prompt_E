chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.action === "injectPrompt") {

        const element = document.activeElement;

        if (!isEditableElement(element)) {

            alert("Please click inside a text input first.");
            return;
        }

        const variables = [...message.prompt.matchAll(/{{\s*([^{}]+?)\s*}}/g)]
            .map(match => match[1].trim())
            .filter((variable, index, all) => all.indexOf(variable) === index);

        if (variables.length > 0) {
            showVariableForm(element, message.prompt, variables);
            return;
        }

        insertPrompt(element, message.prompt);
    }
});


function isEditableElement(element) {

    return element && (
        element.tagName === "TEXTAREA" ||
        element.tagName === "INPUT" ||
        element.isContentEditable
    );
}


function insertPrompt(element, prompt, savedRange = null) {

    if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
        element.value += prompt;
        element.dispatchEvent(new Event("input", { bubbles: true }));
        return;
    }

    const selection = window.getSelection();

    if (savedRange) {
        savedRange.deleteContents();
        savedRange.insertNode(document.createTextNode(prompt));
        savedRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(savedRange);
    } else if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(prompt));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    } else {
        element.append(document.createTextNode(prompt));
    }

    element.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: prompt
    }));
}


function showVariableForm(element, prompt, variables) {

    document.querySelector("#prompt-e-variable-form")?.remove();
    const selection = window.getSelection();
    const savedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;

    const overlay = document.createElement("div");
    overlay.id = "prompt-e-variable-form";
    overlay.innerHTML = `
        <div class="prompt-e-variable-card" role="dialog" aria-label="Fill prompt variables">
            <div class="prompt-e-variable-header">
                <div>
                    <strong>Personalize prompt</strong>
                    <span>Fill in the details before inserting.</span>
                </div>
                <button type="button" data-close aria-label="Close">&times;</button>
            </div>
            <form>
                ${variables.map(variable => `
                    <label>
                        <span>${escapeHtml(variable)}</span>
                        <input required name="${escapeHtml(variable)}" placeholder="Enter ${escapeHtml(variable)}">
                    </label>
                `).join("")}
                <button class="prompt-e-variable-submit" type="submit">Insert prompt</button>
            </form>
        </div>
    `;

    addVariableFormStyles();
    document.body.appendChild(overlay);
    overlay.querySelector("[data-close]").addEventListener("click", () => overlay.remove());
    overlay.querySelector("form").addEventListener("submit", event => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        const filledPrompt = prompt.replace(/{{\s*([^{}]+?)\s*}}/g, (_, variable) => values.get(variable.trim()));
        overlay.remove();
        insertPrompt(element, filledPrompt, savedRange);
    });
    overlay.querySelector("input")?.focus();
}


function escapeHtml(value) {

    return value.replace(/[&<>'"]/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
    }[character]));
}


function addVariableFormStyles() {

    if (document.querySelector("#prompt-e-variable-styles")) {
        return;
    }

    const styles = document.createElement("style");
    styles.id = "prompt-e-variable-styles";
    styles.textContent = `
        #prompt-e-variable-form { position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center; padding: 20px; background: rgba(18, 27, 24, .42); font-family: Arial, sans-serif; }
        .prompt-e-variable-card { width: min(360px, 100%); padding: 20px; border: 1px solid #dfe3dc; border-radius: 14px; color: #1d2523; background: #fff; box-shadow: 0 24px 80px rgba(0, 0, 0, .22); }
        .prompt-e-variable-header { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
        .prompt-e-variable-header strong, .prompt-e-variable-header span { display: block; }
        .prompt-e-variable-header strong { font: 700 18px Georgia, serif; }
        .prompt-e-variable-header span { margin-top: 4px; color: #6b7470; font-size: 12px; }
        .prompt-e-variable-header button { border: 0; color: #6b7470; background: transparent; cursor: pointer; font-size: 22px; line-height: 1; }
        .prompt-e-variable-card label { display: block; margin: 12px 0 0; color: #6b7470; font-size: 11px; font-weight: 700; }
        .prompt-e-variable-card input { width: 100%; height: 36px; margin-top: 6px; padding: 0 10px; border: 1px solid #dfe3dc; border-radius: 7px; box-sizing: border-box; font: inherit; }
        .prompt-e-variable-submit { width: 100%; margin-top: 18px; padding: 10px; border: 0; border-radius: 7px; color: #fff; background: #1d2523; cursor: pointer; font-weight: 700; }
    `;
    document.head.appendChild(styles);
}
});

document.addEventListener("keydown", async event => {

    if (event.repeat || event.isComposing || !(event.altKey || event.ctrlKey || event.metaKey)) {
        return;
    }

    const shortcut = getEventShortcut(event);
    const result = await chrome.storage.local.get("prompts");
    const prompt = (result.prompts || []).find(savedPrompt => normalizeShortcut(savedPrompt.shortcut) === shortcut);

    if (!prompt) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    markPromptUsed(prompt.id);
    chrome.runtime.sendMessage({
        action: "injectPrompt",
        prompt: prompt.body
    });
});


function getEventShortcut(event) {

    const modifiers = [];

    if (event.altKey) modifiers.push("Alt");
    if (event.ctrlKey) modifiers.push("Ctrl");
    if (event.metaKey) modifiers.push("Meta");
    if (event.shiftKey) modifiers.push("Shift");

    const key = event.code.startsWith("Key") ? event.code.slice(3).toUpperCase()
        : event.code.startsWith("Digit") ? event.code.slice(5)
        : event.key.length === 1 ? event.key.toUpperCase() : event.key;
    return [...modifiers, key].join("+");
}


function normalizeShortcut(value) {

    const parts = String(value || "").trim().replace(/\s+/g, "").split("+").filter(Boolean);
    const modifiers = ["Alt", "Ctrl", "Meta", "Shift"].filter(modifier => parts.some(part => part.toLowerCase() === modifier.toLowerCase()));
    const key = parts.find(part => !modifiers.some(modifier => part.toLowerCase() === modifier.toLowerCase()));
    return key ? [...modifiers, key.length === 1 ? key.toUpperCase() : key].join("+") : "";
}


function markPromptUsed(promptId) {

    chrome.storage.local.get("prompts").then(result => {
        const prompts = (result.prompts || []).map(prompt => prompt.id === promptId
            ? { ...prompt, usageCount: (Number(prompt.usageCount) || 0) + 1, lastUsed: Date.now() }
            : prompt);
        chrome.storage.local.set({ prompts });
    });
}