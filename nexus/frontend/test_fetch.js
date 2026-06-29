fetch('http://localhost:4000/portal/api/v1/sync/metadata').then(res => { console.log(res.status); return res.text(); }).then(console.log).catch(console.error);
