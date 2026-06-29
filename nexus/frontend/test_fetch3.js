fetch('http://localhost:4000/portal/api/v1/auth/login/web', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ email: 'admin@klypso.in', password: 'SuperSecretPassword123!' })
}).then(res => res.json().then(data => ({status: res.status, data})))
  .then(console.log)
  .catch(console.error);
