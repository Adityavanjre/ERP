const API_URL = import.meta.env.VITE_API_URL || '/api/agency';

if (import.meta.env.DEV) {
    console.log('--- Klypso Agency API ---');
    console.log('Target API:', API_URL);
}

export default API_URL;
