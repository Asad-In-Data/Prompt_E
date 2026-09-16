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

        } else if (element && element.isContentEditable) {

            const selection = window.getSelection();

            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(message.prompt));
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                element.append(document.createTextNode(message.prompt));
            }

            element.dispatchEvent(new InputEvent("input", {
                bubbles: true,
                inputType: "insertText",
                data: message.prompt
            }));

        } else {

            alert("Please click inside a text input first.");

        }
    }
});