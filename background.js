const promptMenuId = "prompt-e-menu";
const promptItemPrefix = "prompt-e-item-";

chrome.runtime.onInstalled.addListener(() => {

    console.log("Prompt_E installed successfully.");
    refreshContextMenus();

});

chrome.runtime.onStartup.addListener(refreshContextMenus);

chrome.storage.onChanged.addListener((changes, areaName) => {

    if (areaName === "local" && changes.prompts) {
        refreshContextMenus();
    }

});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {

    if (!tab.id || typeof info.menuItemId !== "string" || !info.menuItemId.startsWith(promptItemPrefix)) {
        return;
    }

    const promptId = Number(info.menuItemId.slice(promptItemPrefix.length));
    const result = await chrome.storage.local.get("prompts");
    const prompt = (result.prompts || []).find(savedPrompt => savedPrompt.id === promptId);

    if (!prompt) {
        return;
    }

    chrome.tabs.sendMessage(tab.id, {
        action: "injectPrompt",
        prompt: prompt.body
    });

});

async function refreshContextMenus() {

    await chrome.contextMenus.removeAll();

    chrome.contextMenus.create({
        id: promptMenuId,
        title: "Insert saved prompt",
        contexts: ["editable"]
    });

    const result = await chrome.storage.local.get("prompts");
    const prompts = result.prompts || [];

    prompts.forEach(prompt => {

        chrome.contextMenus.create({
            id: `${promptItemPrefix}${prompt.id}`,
            parentId: promptMenuId,
            title: prompt.title,
            contexts: ["editable"]
        });

    });
}