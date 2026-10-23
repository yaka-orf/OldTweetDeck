// Builds build/solver-test.html: solver.html with the origin check relaxed and a
// synthetic challenge injected, so the extraction logic can be exercised in a plain
// browser tab without an X session.
//
//   node tests/make-solver-harness.js
//   python -m http.server 8123 -d build      (then open http://localhost:8123/solver-test.html)
//
// The page drives itself: it posts "init" with a fake challenge, waits for "ready",
// posts "solve", and records every message in window.__log.

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const solver = fs.readFileSync(path.join(root, 'solver.html'), 'utf8');

const originCheck = `\t\t\tif (
\t\t\t\tevent.origin !== "https://twitter.com" &&
\t\t\t\tevent.origin !== "https://x.com"
\t\t\t) {
\t\t\t\treturn;
\t\t\t}`;

if (!solver.includes(originCheck)) {
    console.error('Origin check block not found in solver.html; update tests/make-solver-harness.js');
    process.exit(1);
}

const cases = {
    'prop': '(self.webpackChunk_twitter_responsive_web=self.webpackChunk_twitter_responsive_web||[]).push([[20113],{353567:(e,t,r)=>{r.d(t,{default:()=>n});const n=()=>async(path,method)=>path+"|"+method;}}]);',
    'array': '(self.webpackChunk_twitter_responsive_web=self.webpackChunk_twitter_responsive_web||[]).push([[20113],{353567:(e,t,r)=>{const n=()=>async(path,method)=>"ARRAY:"+path;r.d(t,["default",1,n]);}}]);',
    'assign': '(self.webpackChunk_twitter_responsive_web=self.webpackChunk_twitter_responsive_web||[]).push([[20113],{353567:(e,t,r)=>{e.default = () => (async(path,method)=>"ASSIGN:"+path);}}]);',
    'broken': 'this bundle has no recognizable module shape'
};

const caseName = process.argv[2] || 'prop';
if (!cases[caseName]) {
    console.error('Unknown case: ' + caseName + ' (have: ' + Object.keys(cases).join(', ') + ')');
    process.exit(1);
}

const harness = `
<script>
const CHALLENGE = ${JSON.stringify(cases[caseName])};
window.__log = [];
window.addEventListener('message', (e) => {
    window.__log.push(e.data);
    if (e.data.action === 'ready') {
        window.postMessage({action: 'solve', id: 1, path: '/1.1/account/verify_credentials.json', method: 'GET'}, '*');
    }
});
window.addEventListener('load', () => {
    window.postMessage({action: 'init', challenge: CHALLENGE, vendor: 'window.__vendor_loaded = 1;', anims: [], verificationCode: 'test'}, '*');
});
</script>
`;

const out = solver
    .replace(originCheck, '\t\t\tif (false) { return; } // test harness: origin check relaxed')
    .replace('</body>', harness + '</body>');

fs.mkdirSync(path.join(root, 'build'), { recursive: true });
const target = path.join(root, 'build', 'solver-test-' + caseName + '.html');
fs.writeFileSync(target, out);
console.log('wrote ' + target);
