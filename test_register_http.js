const https = require('https');

const data = JSON.stringify({
    email: 'debug_admin@klypso.in',
    password: 'StrongPassword123!',
    fullName: 'Debug Admin',
    tenantName: 'Debug Corp',
    companyType: 'Technology'
});

const options = {
    hostname: 'nexus-backend-3ukg.onrender.com',
    port: 443,
    path: '/api/v1/auth/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

    let body = '';
    res.on('data', (chunk) => {
        body += chunk;
    });

    res.on('end', () => {
        console.log('BODY:', body);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
