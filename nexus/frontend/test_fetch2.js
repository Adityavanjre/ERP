fetch('http://localhost:4000/portal/api/v1/auth/tenants').then(res => { console.log(res.status, res.statusText); return res.text(); }).then(console.log).catch(console.error);
