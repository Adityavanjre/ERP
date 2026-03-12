import axios from 'axios';
async function main() {
    try {
        const res = await axios.get('http://localhost:3001/api/v1/accounting/auditor/dashboard', {
            headers: {
                'Authorization': 'Bearer YOUR_JWT'
            }
        });
        console.log(res.data);
    } catch (err: any) {
        if (err.response) {
            console.error('Error:', err.response.status, err.response.data);
        } else {
            console.error('Error:', err.message);
        }
    }
}
// Skip actual run since I don't have a JWT
// main();
