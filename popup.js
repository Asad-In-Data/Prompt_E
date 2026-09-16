const titleInput = document.getElementById("title");
const bodyInput = document.getElementById("body");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const promptList = document.getElementById("promptList");
const promptCount = document.getElementById("promptCount");
const searchInput = document.getElementById("searchInput");
const statusMessage = document.getElementById("statusMessage");

let editingId = null;
let savedPrompts = [];

loadPrompts();


cancelBtn.addEventListener("click", resetComposer);
searchInput.addEventListener("input", () => renderPrompts(searchInput.value));


// Save / Update prompt
saveBtn.addEventListener("click", async () => {

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();
    const wasEditing = editingId !== null;

    if (!title || !body) {
        statusMessage.textContent = "Add a title and prompt before saving.";
        statusMessage.style.color = "#a83f35";
        return;
    }

    const result = await chrome.storage.local.get("prompts");
    let prompts = result.prompts || [];


    // EDIT MODE
    if (editingId !== null) {

        prompts = prompts.map(prompt => {

            if (prompt.id === editingId) {
                return {
                    ...prompt,
                    title: title,
                    body: body
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
            body: body
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

    savedPrompts = result.prompts || [];
    promptCount.textContent = savedPrompts.length;
    renderPrompts(searchInput.value);
}


function renderPrompts(searchTerm = "") {

    promptList.innerHTML = "";

    const normalizedSearch = searchTerm.trim().toLowerCase();
    const prompts = savedPrompts.filter(prompt => {
        return !normalizedSearch ||
            prompt.title.toLowerCase().includes(normalizedSearch) ||
            prompt.body.toLowerCase().includes(normalizedSearch);
    });

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
            <p class="prompt-body"></p>
            <div class="prompt-actions">
                <button class="card-button inject-btn" type="button">Use prompt</button>
                <button class="card-button edit-btn" type="button">Edit</button>
                <button class="card-button delete-btn" type="button">Delete</button>
            </div>
        `;

        div.querySelector(".prompt-title").textContent = prompt.title;
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

        });


        // EDIT
        div.querySelector(".edit-btn").addEventListener("click", () => {

            titleInput.value = prompt.title;
            bodyInput.value = prompt.body;

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
    saveBtn.querySelector("span").textContent = "Save prompt";
    cancelBtn.hidden = true;
    statusMessage.textContent = "";
    statusMessage.style.color = "";
}