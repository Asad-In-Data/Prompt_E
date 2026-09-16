const titleInput = document.getElementById("title");
const bodyInput = document.getElementById("body");
const saveBtn = document.getElementById("saveBtn");
const promptList = document.getElementById("promptList");

let editingId = null;

loadPrompts();


// Save / Update prompt
saveBtn.addEventListener("click", async () => {

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();

    if (!title || !body) {
        alert("Please enter both title and prompt.");
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
        saveBtn.textContent = "Save Prompt";

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

    loadPrompts();
});


// Display prompts
async function loadPrompts() {

    const result = await chrome.storage.local.get("prompts");

    const prompts = result.prompts || [];

    promptList.innerHTML = "";

    if (prompts.length === 0) {
        promptList.innerHTML = "<p>No prompts saved yet.</p>";
        return;
    }


    prompts.forEach(prompt => {

        const div = document.createElement("div");

        div.className = "prompt";

        div.innerHTML = `
            <strong>${prompt.title}</strong>
            <p>${prompt.body}</p>

            <button class="injectBtn">Inject</button>
            <button class="editBtn">Edit</button>
            <button class="deleteBtn">Delete</button>
        `;


        // INJECT
        div.querySelector(".injectBtn").addEventListener("click", async () => {

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
        div.querySelector(".editBtn").addEventListener("click", () => {

            titleInput.value = prompt.title;
            bodyInput.value = prompt.body;

            editingId = prompt.id;

            saveBtn.textContent = "Update Prompt";

        });


        // DELETE
        div.querySelector(".deleteBtn").addEventListener("click", async () => {

            const updatedPrompts = prompts.filter(
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