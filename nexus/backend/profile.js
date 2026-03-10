
const axios = require('axios');
async function run() {
  const t0 = Date.now();
  const res = await axios.post('http://127.0.0.1:3001/api/v1/auth/login/web', {email: 'debug_admin_local_3@klypso.in', password: 'password123'}, {validateStatus: () => true});
  console.log('Login took:', Date.now() - t0, 'ms. Status:', res.status);
  
  if(res.status !== 200) { console.log(res.data); return; }
  const cookie = res.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ');

  const endpoints = ['analytics/summary', 'analytics/performance', 'analytics/health', 'analytics/activity', 'analytics/value-chain', 'system/config'];
  
  for(const ep of endpoints) {
      const start = Date.now();
      const er = await axios.get('http://127.0.0.1:3001/api/v1/' + ep, {headers: {Cookie: cookie}, validateStatus:()=>true});
      console.log(ep, 'took:', Date.now() - start, 'ms. Status:', er.status);
  }
}
run();

