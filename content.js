chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.action === "injectPrompt") {

        const element = document.activeElement;

        if (
            element &&
            (
                element.tagName === "TEXTAREA" ||
                element.tagName === "INPUT"
            )
        ) {

            element.value += message.prompt;

            element.dispatchEvent(new Event("input", {
                bubbles: true
            }));

        } else {

            alert("Please click inside a text input first.");

        }
    }
});