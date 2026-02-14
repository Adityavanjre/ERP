import fs from 'fs';
import https from 'https';

const photographyFile = 'd:/code/klypso/client/src/pages/Photography.tsx';
const content = fs.readFileSync(photographyFile, 'utf8');
const regex = /url:\s*['"](https:\/\/images\.unsplash\.com\/[^'"]+)['"]/g;

let matches;
const urls = [];
while ((matches = regex.exec(content)) !== null) {
    urls.push(matches[1]);
}

console.log(`Found ${urls.length} images. Checking status...`);

const checkUrl = (url) => {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve({ url, status: res.statusCode, ok: true });
            } else {
                resolve({ url, status: res.statusCode, ok: false });
            }
        }).on('error', (e) => {
            resolve({ url, error: e.message, ok: false });
        });
    });
};

// Check in chunks to avoid overwhelming/timeouts
async function checkAll() {
    const results = [];
    const chunkSize = 10;
    for (let i = 0; i < urls.length; i += chunkSize) {
        const chunk = urls.slice(i, i + chunkSize);
        console.log(`Checking items ${i + 1} to ${Math.min(i + chunkSize, urls.length)}...`);
        const chunkResults = await Promise.all(chunk.map(checkUrl));
        results.push(...chunkResults);
    }

    const failed = results.filter(r => !r.ok);

    console.log('\n--- RESULTS ---');
    console.log(`Total Checked: ${results.length}`);
    console.log(`Passed: ${results.length - failed.length}`);
    console.log(`Failed: ${failed.length}`);

    if (failed.length > 0) {
        console.log('\nFailed Images:');
        failed.forEach(f => console.log(`${f.status || f.error}: ${f.url}`));
    }
}

checkAll();
