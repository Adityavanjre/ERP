const { updateBlog } = require('../controllers/blogController');
const { updateJob } = require('../controllers/jobController');
const Blog = require('../models/Blog');
const Job = require('../models/Job');

jest.mock('../models/Blog');
jest.mock('../models/Job');

describe('Mass Assignment Vulnerability Fixes', () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: { id: 'test-id' },
            body: {}
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    describe('blogController.updateBlog', () => {
        it('should only update allowed fields and ignore unauthorized fields', async () => {
            const mockBlogDoc = {
                title: 'Old Title',
                author: 'Old Author',
                save: jest.fn().mockResolvedValue(true)
            };
            Blog.findById.mockResolvedValue(mockBlogDoc);

            req.body = {
                title: 'New Title',
                isAdmin: true, // Vulnerable field attempt
                status: 'published',
                _id: 'injected-id' // Vulnerable field attempt
            };

            await updateBlog(req, res);

            // Expect the explicitly allowed fields to be updated
            expect(mockBlogDoc.title).toBe('New Title');
            expect(mockBlogDoc.status).toBe('published');

            // Expect unauthorized fields to NOT be assigned
            expect(mockBlogDoc.isAdmin).toBeUndefined();
            expect(mockBlogDoc._id).toBeUndefined();

            // Original un-updated field should remain untouched
            expect(mockBlogDoc.author).toBe('Old Author');

            expect(mockBlogDoc.save).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(true); // Since save() resolves to true
        });
    });

    describe('jobController.updateJob', () => {
        it('should only update allowed fields and ignore unauthorized fields', async () => {
            const mockJobDoc = {
                role: 'Old Role',
                type: 'Full-time',
                save: jest.fn().mockResolvedValue(true)
            };
            Job.findById.mockResolvedValue(mockJobDoc);

            req.body = {
                role: 'New Role',
                isActive: false,
                isAdmin: true, // Vulnerable field attempt
                _id: 'injected-id' // Vulnerable field attempt
            };

            await updateJob(req, res);

            // Expect explicitly allowed fields to be updated
            expect(mockJobDoc.role).toBe('New Role');
            expect(mockJobDoc.isActive).toBe(false);

            // Expect unauthorized fields to NOT be assigned
            expect(mockJobDoc.isAdmin).toBeUndefined();
            expect(mockJobDoc._id).toBeUndefined();

            // Original un-updated field should remain untouched
            expect(mockJobDoc.type).toBe('Full-time');

            expect(mockJobDoc.save).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(true); // Since save() resolves to true
        });
    });
});
