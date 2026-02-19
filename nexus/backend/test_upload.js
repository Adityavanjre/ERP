const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Config from render.yaml
cloudinary.config({
    cloud_name: 'ddqppdopk',
    api_key: '181917616772918',
    api_secret: 'mCkwxmje-22nNYLSZ5xaTRvoQjw'
});

async function testUpload() {
    console.log('Testing Cloudinary Connection...');
    try {
        // Create a dummy file to upload
        fs.writeFileSync('test_image.txt', 'This is a test upload from the debug script.');

        const result = await cloudinary.uploader.upload('test_image.txt', {
            resource_type: 'auto',
            folder: 'debug_tests'
        });

        console.log('Upload SUCCESS!');
        console.log('URL:', result.secure_url);
        console.log('Public ID:', result.public_id);
    } catch (error) {
        console.error('Upload FAILED');
        console.error(error);
    } finally {
        if (fs.existsSync('test_image.txt')) {
            fs.unlinkSync('test_image.txt');
        }
    }
}

testUpload();
