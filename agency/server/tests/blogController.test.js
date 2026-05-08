const { getBlogs, getBlogById, createBlog, updateBlog, deleteBlog } = require('../controllers/blogController');
const Blog = require('../models/Blog');

jest.mock('../models/Blog');

describe('Blog Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: {},
            body: {},
            user: undefined
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    describe('getBlogs', () => {
        it('should fetch published blogs for public users', async () => {
            const mockBlogs = [{ title: 'Blog 1' }, { title: 'Blog 2' }];
            const sortMock = jest.fn().mockResolvedValue(mockBlogs);
            Blog.find.mockReturnValue({ sort: sortMock });

            await getBlogs(req, res);

            expect(Blog.find).toHaveBeenCalledWith({ status: 'published' });
            expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
            expect(res.json).toHaveBeenCalledWith(mockBlogs);
        });

        it('should fetch all blogs for admin users', async () => {
            req.user = { isAdmin: true };
            const mockBlogs = [{ title: 'Blog 1' }, { title: 'Draft' }];
            const sortMock = jest.fn().mockResolvedValue(mockBlogs);
            Blog.find.mockReturnValue({ sort: sortMock });

            await getBlogs(req, res);

            expect(Blog.find).toHaveBeenCalledWith({});
            expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
            expect(res.json).toHaveBeenCalledWith(mockBlogs);
        });

        it('should handle errors', async () => {
            const errorMessage = 'Database error';
            Blog.find.mockImplementation(() => {
                throw new Error(errorMessage);
            });

            await getBlogs(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
        });
    });

    describe('getBlogById', () => {
        it('should find blog by slug first', async () => {
            req.params.id = 'my-blog-post';
            const mockBlog = { title: 'My Blog Post', status: 'published' };
            Blog.findOne.mockResolvedValue(mockBlog);

            await getBlogById(req, res);

            expect(Blog.findOne).toHaveBeenCalledWith({ slug: 'my-blog-post' });
            expect(Blog.findById).not.toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(mockBlog);
        });

        it('should find blog by ID if slug not found and ID is valid', async () => {
            req.params.id = '507f1f77bcf86cd799439011';
            const mockBlog = { title: 'My Blog Post', status: 'published' };
            Blog.findOne.mockResolvedValue(null);
            Blog.findById.mockResolvedValue(mockBlog);

            await getBlogById(req, res);

            expect(Blog.findOne).toHaveBeenCalledWith({ slug: '507f1f77bcf86cd799439011' });
            expect(Blog.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
            expect(res.json).toHaveBeenCalledWith(mockBlog);
        });

        it('should not search by ID if slug not found and ID is invalid format', async () => {
            req.params.id = 'invalid-id-format';
            Blog.findOne.mockResolvedValue(null);

            await getBlogById(req, res);

            expect(Blog.findOne).toHaveBeenCalledWith({ slug: 'invalid-id-format' });
            expect(Blog.findById).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Blog post not found' });
        });

        it('should return 404 if not found', async () => {
            req.params.id = 'non-existent-slug';
            Blog.findOne.mockResolvedValue(null);

            await getBlogById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Blog post not found' });
        });

        it('should handle errors', async () => {
            req.params.id = 'my-blog-post';
            const errorMessage = 'Database error';
            Blog.findOne.mockRejectedValue(new Error(errorMessage));

            await getBlogById(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
        });
    });

    describe('createBlog', () => {
        it('should create a new blog post', async () => {
            req.body = {
                title: 'New Blog',
                author: 'Test Author',
                category: 'Tech',
                image: 'image.jpg',
                excerpt: 'Excerpt',
                content: 'Content',
                readTime: '5 min',
                tags: ['test'],
                slug: 'new-blog',
                status: 'draft'
            };

            const mockSavedBlog = { _id: '123', ...req.body };
            const saveMock = jest.fn().mockResolvedValue(mockSavedBlog);
            Blog.mockImplementation(() => ({
                save: saveMock
            }));

            await createBlog(req, res);

            expect(Blog).toHaveBeenCalledWith(req.body);
            expect(saveMock).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockSavedBlog);
        });

        it('should handle validation errors', async () => {
            req.body = { title: 'Missing Fields' };
            const errorMessage = 'Validation Error';
            Blog.mockImplementation(() => ({
                save: jest.fn().mockRejectedValue(new Error(errorMessage))
            }));

            await createBlog(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
        });
    });

    describe('updateBlog', () => {
        it('should update a blog post', async () => {
            req.params.id = '123';
            req.body = { title: 'Updated Title', content: 'Updated content' };

            const saveMock = jest.fn().mockResolvedValue({ _id: '123', ...req.body });
            const mockBlog = { _id: '123', title: 'Old Title', save: saveMock };
            Blog.findById.mockResolvedValue(mockBlog);

            await updateBlog(req, res);

            expect(Blog.findById).toHaveBeenCalledWith('123');
            expect(mockBlog.title).toBe('Updated Title');
            expect(mockBlog.content).toBe('Updated content');
            expect(saveMock).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({ _id: '123', ...req.body });
        });

        it('should return 404 if blog to update not found', async () => {
            req.params.id = 'non-existent-id';
            Blog.findById.mockResolvedValue(null);

            await updateBlog(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Blog post not found' });
        });

        it('should handle update errors', async () => {
            req.params.id = '123';
            const errorMessage = 'Update Error';
            Blog.findById.mockRejectedValue(new Error(errorMessage));

            await updateBlog(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
        });
    });

    describe('deleteBlog', () => {
        it('should delete a blog post', async () => {
            req.params.id = '123';
            const deleteOneMock = jest.fn().mockResolvedValue();
            const mockBlog = { _id: '123', title: 'Blog to Delete', deleteOne: deleteOneMock };
            Blog.findById.mockResolvedValue(mockBlog);

            await deleteBlog(req, res);

            expect(Blog.findById).toHaveBeenCalledWith('123');
            expect(deleteOneMock).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({ message: 'Blog post removed' });
        });

        it('should return 404 if blog to delete not found', async () => {
            req.params.id = 'non-existent-id';
            Blog.findById.mockResolvedValue(null);

            await deleteBlog(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Blog post not found' });
        });

        it('should handle deletion errors', async () => {
            req.params.id = '123';
            const errorMessage = 'Delete Error';
            Blog.findById.mockRejectedValue(new Error(errorMessage));

            await deleteBlog(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
        });
    });
});
