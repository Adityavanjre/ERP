const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/klypso';

console.log('Using URI:', uri);

mongoose.connect(uri)
    .then(() => {
        console.log('MongoDB Connected Successfully');
        process.exit(0);
    })
    .catch(err => {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    });
