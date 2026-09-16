const titleInput = document.getElementById("title");
const bodyInput = document.getElementById("body");
const saveBtn = document.getElementById("saveBtn");
const promptList = document.getElementById("promptList");


// Load prompts when popup opens
loadPrompts();


// Save prompt
saveBtn.addEventListener("click", async () => {

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();

    if (!title || !body) {
        alert("Please enter both title and prompt.");
        return;
    }

    const result = await chrome.storage.local.get("prompts");

    const prompts = result.prompts || [];

    const newPrompt = {
        id: Date.now(),
        title: title,
        body: body
    };

    prompts.push(newPrompt);

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
            <button class="deleteBtn">Delete</button>
        `;


        // Inject button
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


        // Delete button
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