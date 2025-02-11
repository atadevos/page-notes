// Import CryptoJS from local file
const script = document.createElement("script");
script.src = "libs/crypto-js.min.js";
document.head.appendChild(script);

document.addEventListener("DOMContentLoaded", function () {
    const textarea = document.getElementById("metaInput");
    const saveBtn = document.getElementById("saveBtn");
    const deleteBtn = document.getElementById("deleteBtn");
    const statusMsg = document.getElementById("statusMessage");

    let originalText = "";

    async function getEncryptionKey() {
        return new Promise((resolve) => {
            chrome.storage.local.get(["encryptionKey"], function (result) {
                if (result.encryptionKey) {
                    resolve(result.encryptionKey);
                } else {
                    let newKey = CryptoJS.lib.WordArray.random(32).toString();
                    chrome.storage.local.set({ encryptionKey: newKey }, function () {
                        resolve(newKey);
                    });
                }
            });
        });
    }

    async function encryptData(plainText) {
        let key = await getEncryptionKey();
        return CryptoJS.AES.encrypt(plainText, key).toString();
    }

    async function decryptData(cipherText) {
        let key = await getEncryptionKey();
        let bytes = CryptoJS.AES.decrypt(cipherText, key);
        return bytes.toString(CryptoJS.enc.Utf8);
    }

    function updateButtonStates() {
        saveBtn.disabled = textarea.value.trim() === originalText.trim();
        deleteBtn.disabled = originalText.trim() === ""; // Disable delete if there's no saved note
    }

    chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
        let url = new URL(tabs[0].url);
        let host = url.hostname;

        // Load encrypted data and decrypt it
        chrome.storage.local.get([host], async function (result) {
            if (result[host]) {
                let decryptedText = await decryptData(result[host]);
                textarea.value = decryptedText;
                originalText = decryptedText;
            } else {
                originalText = "";
            }
            updateButtonStates();
        });

        // Save meta information
        saveBtn.addEventListener("click", async function () {
            let encryptedData = await encryptData(textarea.value);
            let data = {};
            data[host] = encryptedData;
            chrome.storage.local.set(data, function () {
                console.log("Encrypted data saved for:", host);

                // Show temporary "Saved!" message
                statusMsg.textContent = "Saved!";
                setTimeout(() => {
                    statusMsg.textContent = "";
                }, 1500);

                originalText = textarea.value;
                updateButtonStates();
            });
        });

        // Delete meta information
        deleteBtn.addEventListener("click", function () {
            chrome.storage.local.remove(host, function () {
                console.log("Data deleted for:", host);
                textarea.value = "";
                originalText = "";
                updateButtonStates();

                // Show temporary "Deleted!" message
                statusMsg.textContent = "Deleted!";
                setTimeout(() => {
                    statusMsg.textContent = "";
                }, 1500);
            });
        });

        // Detect changes in textarea to enable/disable Save button
        textarea.addEventListener("input", updateButtonStates);
    });
});
