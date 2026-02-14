const Enquiry = require('../models/Enquiry');
const nodemailer = require('nodemailer');

// @desc    Create new enquiry
// @route   POST /api/enquiries
// @access  Public
const createEnquiry = async (req, res) => {
    const {
        name,
        email,
        phone,
        service,
        projectType,
        budget,
        timeline,
        message,
        referenceLinks
    } = req.body;

    try {
        const enquiry = new Enquiry({
            name,
            email,
            phone,
            service,
            projectType,
            budget,
            timeline,
            message,
            referenceLinks,
        });

        const createdEnquiry = await enquiry.save();

        // Send email notification
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Admin receives notification
            subject: `New Project Inquiry: ${service} from ${name}`,
            text: `
You have a new enquiry from Klypso Website:

Name: ${name}
Email: ${email}
Phone: ${phone || 'N/A'}
Service: ${service}
Project Type: ${projectType || 'N/A'}
Budget: ${budget || 'N/A'}
Timeline: ${timeline || 'N/A'}

Message:
${message}

Reference Links:
${referenceLinks && referenceLinks.length > 0 ? referenceLinks.join('\n') : 'None'}

---
View in Dashboard: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin
            `,
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log('Error sending email:', error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

        res.status(201).json(createdEnquiry);
    } catch (error) {
        console.error('Error creating enquiry:', error);
        res.status(400).json({ message: error.message });
    }
};

const getEnquiries = async (req, res) => {
    try {
        const enquiries = await Enquiry.find({}).sort({ createdAt: -1 });
        res.json(enquiries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteEnquiry = async (req, res) => {
    try {
        const enquiry = await Enquiry.findById(req.params.id);

        if (enquiry) {
            await enquiry.deleteOne();
            res.json({ message: 'Enquiry removed' });
        } else {
            res.status(404).json({ message: 'Enquiry not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createEnquiry,
    getEnquiries,
    deleteEnquiry,
};
