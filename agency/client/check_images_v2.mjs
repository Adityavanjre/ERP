import fs from 'fs';

const photographyFile = 'd:/code/klypso/client/src/pages/Photography.tsx';
const content = fs.readFileSync(photographyFile, 'utf8');

// More robust regex to capture the URL inside single or double quotes
const regex = /url:\s*['"](https:\/\/images\.unsplash\.com\/[^'"]+)['"]/g;
let match;
const urls = [];

while ((match = regex.exec(content)) !== null) {
    urls.push(match[1]);
}

console.log(`Found ${urls.length} images to check.`);

async function checkUrl(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
            return { url, status: response.status, ok: true };
        } else {
            return { url, status: response.status, ok: false };
        }
    } catch (error) {
        return { url, error: error.message, ok: false };
    }
}

async function run() {
    const results = [];
    const batchSize = 5; // cautious batch size

    for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        console.log(`Checking batch ${i + 1}-${Math.min(i + batchSize, urls.length)}...`);
        const batchResults = await Promise.all(batch.map(checkUrl));
        results.push(...batchResults);
    }

    const failed = results.filter(r => !r.ok);
    console.log('\n--- REPORT ---');
    console.log(`Passed: ${results.length - failed.length}`);
    console.log(`Failed: ${failed.length}`);

    if (failed.length > 0) {
        console.log('Failed URLs:');
        failed.forEach(f => console.log(`[${f.status || f.error}] ${f.url}`));
    } else {
        console.log('ALL IMAGES VALID.');
    }
}

run();
