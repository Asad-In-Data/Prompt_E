const titleInput = document.getElementById("title");
const bodyInput = document.getElementById("body");
const categoryInput = document.getElementById("category");
const tagsInput = document.getElementById("tags");
const shortcutInput = document.getElementById("shortcut");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const promptList = document.getElementById("promptList");
const promptCount = document.getElementById("promptCount");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const sortFilter = document.getElementById("sortFilter");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");
const statusMessage = document.getElementById("statusMessage");

let editingId = null;
let savedPrompts = [];

loadPrompts();


cancelBtn.addEventListener("click", resetComposer);
searchInput.addEventListener("input", () => renderPrompts());
categoryFilter.addEventListener("change", () => renderPrompts());
sortFilter.addEventListener("change", () => renderPrompts());
exportBtn.addEventListener("click", exportPrompts);
importBtn.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", importPrompts);


// Save / Update prompt
saveBtn.addEventListener("click", async () => {

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();
    const category = categoryInput.value;
    const tags = parseTags(tagsInput.value);
    const shortcut = normalizeShortcut(shortcutInput.value);
    const wasEditing = editingId !== null;

    if (!title || !body) {
        statusMessage.textContent = "Add a title and prompt before saving.";
        statusMessage.style.color = "#a83f35";
        return;
    }

    const result = await chrome.storage.local.get("prompts");
    let prompts = result.prompts || [];

    if (shortcut && prompts.some(prompt => prompt.shortcut && normalizeShortcut(prompt.shortcut) === shortcut && prompt.id !== editingId)) {
        statusMessage.textContent = "That shortcut is already assigned to another prompt.";
        statusMessage.style.color = "#a83f35";
        return;
    }


    // EDIT MODE
    if (editingId !== null) {

        prompts = prompts.map(prompt => {

            if (prompt.id === editingId) {
                return {
                    ...prompt,
                    title: title,
                    body: body,
                    category: category,
                    tags: tags,
                    shortcut: shortcut
                };
            }

            return prompt;
        });

        editingId = null;
        resetComposer();

    }

    // ADD MODE
    else {

        const newPrompt = {
            id: Date.now(),
            title: title,
            body: body,
            category: category,
            tags: tags,
            shortcut: shortcut,
            usageCount: 0,
            lastUsed: null
        };

        prompts.push(newPrompt);
    }


    await chrome.storage.local.set({
        prompts: prompts
    });

    titleInput.value = "";
    bodyInput.value = "";
    statusMessage.textContent = wasEditing ? "Prompt updated." : "Prompt saved to your library.";
    statusMessage.style.color = "#56705d";

    loadPrompts();
});


// Display prompts
async function loadPrompts() {

    const result = await chrome.storage.local.get("prompts");

    savedPrompts = (result.prompts || []).map(normalizePrompt);
    promptCount.textContent = savedPrompts.length;
    renderPrompts(searchInput.value);
}


function renderPrompts() {

    promptList.innerHTML = "";

    const normalizedSearch = searchInput.value.trim().toLowerCase();
    const selectedCategory = categoryFilter.value;
    const prompts = savedPrompts.filter(prompt => {
        const matchesSearch = !normalizedSearch ||
            prompt.title.toLowerCase().includes(normalizedSearch) ||
            prompt.body.toLowerCase().includes(normalizedSearch) ||
            prompt.tags.join(" ").toLowerCase().includes(normalizedSearch);
        const matchesCategory = selectedCategory === "all" || prompt.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    prompts.sort((first, second) => sortFilter.value === "used"
        ? second.usageCount - first.usageCount || second.id - first.id
        : second.id - first.id);

    if (savedPrompts.length === 0) {
        promptList.innerHTML = `
            <div class="empty-state">
                <strong>Your library is waiting.</strong>
                Add your first reusable prompt above.
            </div>
        `;
        return;
    }

    if (prompts.length === 0) {
        promptList.innerHTML = `
            <div class="empty-state">
                <strong>No matches found.</strong>
                Try a different search term.
            </div>
        `;
        return;
    }


    prompts.forEach(prompt => {

        const div = document.createElement("div");

        div.className = "prompt";

        div.innerHTML = `
            <strong class="prompt-title"></strong>
            <div class="prompt-meta">
                <span class="category-pill"></span>
                <span class="tag-pill"></span>
                <span class="usage-pill"></span>
                <span class="shortcut-pill"></span>
            </div>
            <p class="prompt-body"></p>
            <div class="prompt-actions">
                <button class="card-button inject-btn" type="button">Use prompt</button>
                <button class="card-button edit-btn" type="button">Edit</button>
                <button class="card-button delete-btn" type="button">Delete</button>
            </div>
        `;

        div.querySelector(".prompt-title").textContent = prompt.title;
        div.querySelector(".category-pill").textContent = prompt.category;
        div.querySelector(".tag-pill").textContent = prompt.tags.length ? `#${prompt.tags.join(" #")}` : "No tags";
        div.querySelector(".usage-pill").textContent = `${prompt.usageCount} use${prompt.usageCount === 1 ? "" : "s"}`;
        div.querySelector(".shortcut-pill").textContent = prompt.shortcut || "No shortcut";
        div.querySelector(".prompt-body").textContent = prompt.body;


        // INJECT
        div.querySelector(".inject-btn").addEventListener("click", async () => {

            const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true
            });

            chrome.tabs.sendMessage(tab.id, {
                action: "injectPrompt",
                prompt: prompt.body
            });

            await markPromptUsed(prompt.id);
            loadPrompts();

        });


        // EDIT
        div.querySelector(".edit-btn").addEventListener("click", () => {

            titleInput.value = prompt.title;
            bodyInput.value = prompt.body;
            categoryInput.value = prompt.category;
            tagsInput.value = prompt.tags.join(", ");
            shortcutInput.value = prompt.shortcut;

            editingId = prompt.id;

            saveBtn.querySelector("span").textContent = "Update prompt";
            cancelBtn.hidden = false;
            titleInput.focus();

        });


        // DELETE
        div.querySelector(".delete-btn").addEventListener("click", async () => {

            const updatedPrompts = savedPrompts.filter(
                p => p.id !== prompt.id
            );

            await chrome.storage.local.set({
                prompts: updatedPrompts
            });

            loadPrompts();
        });


        promptList.appendChild(div);
    });
}


function resetComposer() {

    editingId = null;
    titleInput.value = "";
    bodyInput.value = "";
    categoryInput.value = "General";
    tagsInput.value = "";
    shortcutInput.value = "";
    saveBtn.querySelector("span").textContent = "Save prompt";
    cancelBtn.hidden = true;
    statusMessage.textContent = "";
    statusMessage.style.color = "";
}


function parseTags(value) {

    return [...new Set(value.split(",").map(tag => tag.trim().replace(/^#/, "")).filter(Boolean))];
}


function normalizePrompt(prompt) {

    return {
        id: Number(prompt.id) || Date.now(),
        title: String(prompt.title || "Untitled prompt"),
        body: String(prompt.body || ""),
        category: String(prompt.category || "General"),
        tags: Array.isArray(prompt.tags) ? prompt.tags.map(String).filter(Boolean) : [],
        shortcut: normalizeShortcut(prompt.shortcut || ""),
        usageCount: Number(prompt.usageCount) || 0,
        lastUsed: prompt.lastUsed || null
    };
}


function normalizeShortcut(value) {

    const parts = String(value || "").trim().replace(/\s+/g, "").split("+").filter(Boolean);
    const modifiers = ["Alt", "Ctrl", "Meta", "Shift"].filter(modifier => parts.some(part => part.toLowerCase() === modifier.toLowerCase()));
    const key = parts.find(part => !modifiers.some(modifier => part.toLowerCase() === modifier.toLowerCase()));
    return key ? [...modifiers, key.length === 1 ? key.toUpperCase() : key].join("+") : "";
}


async function markPromptUsed(promptId) {

    const result = await chrome.storage.local.get("prompts");
    const prompts = (result.prompts || []).map(prompt => prompt.id === promptId
        ? { ...prompt, usageCount: (Number(prompt.usageCount) || 0) + 1, lastUsed: Date.now() }
        : prompt);
    await chrome.storage.local.set({ prompts });
}


function exportPrompts() {

    const file = new Blob([JSON.stringify(savedPrompts, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `prompt-e-library-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showStatus("Your prompt library was exported.", "#56705d");
}


async function importPrompts(event) {

    const file = event.target.files[0];
    event.target.value = "";

    if (!file) {
        return;
    }

    try {
        const imported = JSON.parse(await file.text());

        if (!Array.isArray(imported)) {
            throw new Error("Expected a prompt array.");
        }

        const importedPrompts = imported
            .map(normalizePrompt)
            .filter(prompt => prompt.title && prompt.body);
        const existingIds = new Set(savedPrompts.map(prompt => prompt.id));
        const newPrompts = importedPrompts.map(prompt => {
            if (existingIds.has(prompt.id)) {
                return { ...prompt, id: Date.now() + Math.random() };
            }
            return prompt;
        });

        await chrome.storage.local.set({ prompts: [...savedPrompts, ...newPrompts] });
        await loadPrompts();
        showStatus(`${newPrompts.length} prompt${newPrompts.length === 1 ? "" : "s"} imported.`, "#56705d");
    } catch (error) {
        showStatus("That file is not a valid Prompt_E export.", "#a83f35");
    }
}


function showStatus(message, color) {

    statusMessage.textContent = message;
    statusMessage.style.color = color;
}