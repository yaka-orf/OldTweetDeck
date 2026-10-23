let solveId = 0;
let solveCallbacks = {};
let solverErrored = false;
let ready = false;

// SOLVER_URL is replaced with the extension's own solver.html by injection.js.
// The Firefox build has no sandbox page, so it keeps using the hosted solver.
const OTD_REMOTE_SOLVER = "https://tweetdeck.dimden.dev/solver.html?4";
const OTD_IS_FIREFOX = navigator.userAgent.indexOf('Firefox') > -1;
const OTD_LOCAL_SOLVER = "SOLVER_URL";
let solverUsingRemote = OTD_IS_FIREFOX;
let otdSendInit = null;

let solverIframe = document.createElement('iframe');
solverIframe.style.position = 'absolute';
solverIframe.width = '0px';
solverIframe.height = '0px';
solverIframe.style.border = 'none';
solverIframe.style.opacity = 0;
solverIframe.style.pointerEvents = 'none';
solverIframe.tabIndex = -1;
solverIframe.src = solverUsingRemote ? OTD_REMOTE_SOLVER : OTD_LOCAL_SOLVER;
let injectedBody = document.getElementById('injected-body');
if(injectedBody) injectedBody.appendChild(solverIframe);
else {
    let int = setInterval(() => {
        injectedBody = document.getElementById('injected-body');
        if(injectedBody) {
            clearInterval(int);
            injectedBody.appendChild(solverIframe);
        }
    }, 50);
}

function uuidV4() {
    const uuid = new Array(36);
    for (let i = 0; i < 36; i++) {
      uuid[i] = Math.floor(Math.random() * 16);
    }
    uuid[14] = 4; // set bits 12-15 of time-high-and-version to 0100
    uuid[19] = uuid[19] &= ~(1 << 2); // set bit 6 of clock-seq-and-reserved to zero
    uuid[19] = uuid[19] |= (1 << 3); // set bit 7 of clock-seq-and-reserved to one
    uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
    return uuid.map((x) => x.toString(16)).join('');
}

async function readCryptoKey() {
    return new Promise((resolve, reject) => {
        let request = indexedDB.open("localforage");

        request.onerror = function(event) {
            reject(event);
        };

        request.onsuccess = function(event) {
            const db = event.target.result;

            // Open a transaction to access the keyvaluepairs object store
            if (db.objectStoreNames.contains('keyvaluepairs')) {
                const transaction = db.transaction(['keyvaluepairs'], 'readonly');
                const objectStore = transaction.objectStore('keyvaluepairs');
            
                objectStore.openCursor().onsuccess = function(event) {
                    const cursor = event.target.result;
                    if (cursor) {
                        // Check if the key matches the pattern
                        const key = cursor.key;
                        if (key.startsWith('device:rweb.dmCryptoKeys')) {
                            resolve(cursor.value);
                        }
                
                        // Move to the next entry
                        cursor.continue();
                    } else {
                        // No more entries, reject the promise
                        reject("No key found");
                    }
                };
            } else {
                reject("No key found");
            }
        };
    });
}

function solveChallenge(path, method) {
    return new Promise((resolve, reject) => {
        if(solverErrored) {
            reject('Solver errored');
            return;
        }
        let id = solveId++;
        solveCallbacks[id] = { resolve, reject, time: Date.now() };
        if(!solverIframe.contentWindow) {
            solverIframe.addEventListener('load', () => {
                solverIframe.contentWindow.postMessage({ action: 'solve', id, path, method }, '*');
                setTimeout(() => {
                    if(solveCallbacks[id]) {
                        // try again
                        solverIframe.contentWindow.postMessage({ action: 'solve', id, path, method }, '*');
                    }
                }, 5000);
                setTimeout(() => {
                    if(solveCallbacks[id]) {
                        solveCallbacks[id].reject('Solver timed out');
                        delete solveCallbacks[id];
                    }
                }, 20000);
            });
        } else {
            solverIframe.contentWindow.postMessage({ action: 'solve', id, path, method }, '*');
            setTimeout(() => {
                if(solveCallbacks[id]) {
                    // try again
                    solverIframe.contentWindow.postMessage({ action: 'solve', id, path, method }, '*');
                }
            }, 5000);
            setTimeout(() => {
                if(solveCallbacks[id]) {
                    solveCallbacks[id].reject('Solver timed out');
                    delete solveCallbacks[id];
                }
            }, 20000);
        }
    });
}

window.addEventListener('message', e => {
    if(e.source !== solverIframe.contentWindow) return;
    let data = e.data;
    if(data.action === 'solved') {
        let { id, result } = data;
        if(solveCallbacks[id]) {
            solveCallbacks[id].resolve(result);
            delete solveCallbacks[id];
        }
    } else if(data.action === 'error') {
        let { id, error } = data;
        if(solveCallbacks[id]) {
            solveCallbacks[id].reject(error);
            delete solveCallbacks[id];
        }
    } else if(data.action === 'initError') {
        console.error('Solver init error:', data.error);
        solverErrored = true;
        for(let id in solveCallbacks) {
            solveCallbacks[id].reject('Solver errored');
            delete solveCallbacks[id];
        }
    } else if(data.action === 'ready') {
        ready = true;
    }
});

(async () => {
    try {
        try {
            let cryptoKey = await readCryptoKey();
            if(cryptoKey) {
                localStorage.device_id = cryptoKey.deviceId;
            } else if(!localStorage.device_id) {
                localStorage.device_id = uuidV4();
            }
        } catch(e) {
            console.warn(`Error during device id generation:`, e);
            if(!localStorage.device_id) {
                localStorage.device_id = uuidV4();
            }
        }

        let homepageData = await fetch(`https://${location.hostname}/`).then(res => res.text());
        let dom = new DOMParser().parseFromString(homepageData, 'text/html');
        let anims = Array.from(dom.querySelectorAll('svg[id^="loading-x"]')).map(svg => svg.outerHTML);

        let vendorCode = homepageData.match(/vendor.(\w+).js"/)[1];
        let challengePos = homepageData.match(/(\d+):"ondemand.s"/)[1];
        let challengeCode = homepageData.match(new RegExp(`${challengePos}:"(\\w+)"`))[1];
        let challengeData = await fetch(`https://abs.twimg.com/responsive-web/client-web/ondemand.s.${challengeCode}a.js`).then(res => res.text());
        console.log(`Successfully fetched challenge data (${challengeCode} / ${challengeData.length})`);
        let vendorData = await fetch(`https://abs.twimg.com/responsive-web/client-web/vendor.${vendorCode}.js`).then(res => res.text());
        console.log(`Successfully fetched vendor data (${vendorCode} / ${vendorData.length})`);

        function sendInit() {
            console.log('Sending init');
            solverIframe.contentWindow.postMessage({
                action: 'init',
                challenge: challengeData,
                vendor: vendorData,
                anims,
                verificationCode: dom.querySelector('meta[name="twitter-site-verification"]').content,
            }, '*');
        }
        otdSendInit = sendInit;
        if(solverIframe.contentWindow) {
            sendInit();
            setTimeout(() => {
                if(!ready) {
                    sendInit();
                }
            }, 2500);
        } else {
            setTimeout(() => {
                if(!ready) {
                    sendInit();
                }
            }, 2500);
            solverIframe.addEventListener('load', () => sendInit());
        }
        // If the bundled solver never answers (a page CSP can refuse the
        // chrome-extension: frame, and a future X bundle can defeat the extraction),
        // switch this session over to the hosted solver instead of leaving the
        // extension without a challenge solver.
        if(!OTD_IS_FIREFOX) {
            setTimeout(() => {
                if(ready || solverUsingRemote) return;
                console.warn('[OTD] local solver did not initialize, falling back to the hosted solver');
                solverUsingRemote = true;
                solverErrored = false;
                ready = false;
                solverIframe.addEventListener('load', () => otdSendInit && otdSendInit(), { once: true });
                solverIframe.src = OTD_REMOTE_SOLVER;
            }, 8000);
        }
    } catch (e) {
        console.error(`Error during challenge:`);
        console.error(e);
    }
})()