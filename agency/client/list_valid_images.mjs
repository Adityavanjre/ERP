import fs from 'fs';

const photographyFile = 'd:/code/klypso/client/src/pages/Photography.tsx';
const content = fs.readFileSync(photographyFile, 'utf8');

const regex = /url:\s*['"](https:\/\/images\.unsplash\.com\/[^'"]+)['"]/g;
let match;
const urls = [];

while ((match = regex.exec(content)) !== null) {
    urls.push(match[1]);
}

console.log(`Checking ${urls.length} urls...`);

async function checkUrl(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
            return { url, ok: true };
        }
        return { url, ok: false };
    } catch (error) {
        return { url, ok: false };
    }
}

async function run() {
    const passed = [];
    // check first 20 just to see what works
    for (const url of urls) {
        const res = await checkUrl(url);
        if (res.ok) {
            console.log(`PASS: ${url}`);
            passed.push(url);
        } else {
            // quiet fail
        }
    }
    console.log(`\nTotal Valid Images Found: ${passed.length}`);
}

run();
