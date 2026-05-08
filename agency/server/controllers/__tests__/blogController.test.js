const {
    getBlogs,
    getBlogById,
    createBlog,
    updateBlog,
    deleteBlog,
} = require('../blogController');

const Blog = require('../../models/Blog');

jest.mock('../../models/Blog');

describe('Blog Controller Tests', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            params: {},
            user: {}
        };

        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };

        jest.clearAllMocks();
    });

    describe('getBlogs', () => {
        it('should retrieve published blogs for a regular user', async () => {
            const blogs = [{ title: 'Published Blog', status: 'published' }];
            const mockSort = jest.fn().mockResolvedValue(blogs);
            Blog.find.mockReturnValue({ sort: mockSort });

            await getBlogs(req, res);

            expect(Blog.find).toHaveBeenCalledWith({ status: 'published' });
            expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
            expect(res.json).toHaveBeenCalledWith(blogs);
        });

        it('should retrieve all blogs for an admin', async () => {
            req.user = { isAdmin: true };
            const blogs = [{ title: 'Published Blog' }, { title: 'Draft Blog' }];
            const mockSort = jest.fn().mockResolvedValue(blogs);
            Blog.find.mockReturnValue({ sort: mockSort });

            await getBlogs(req, res);

            expect(Blog.find).toHaveBeenCalledWith({});
            expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
            expect(res.json).toHaveBeenCalledWith(blogs);
        });

        it('should handle 500 error', async () => {
            const error = new Error('Database error');
            Blog.find.mockImplementation(() => { throw error; });

            await getBlogs(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: error.message });
        });
    });

    describe('getBlogById', () => {
        it('should find blog by slug', async () => {
            req.params.id = 'my-slug';
            const blog = { title: 'Slug Blog', slug: 'my-slug', status: 'published' };
            Blog.findOne.mockResolvedValue(blog);

            await getBlogById(req, res);

            expect(Blog.findOne).toHaveBeenCalledWith({ slug: 'my-slug' });
            expect(res.json).toHaveBeenCalledWith(blog);
        });

        it('should find blog by ID if slug not found and ID matches regex', async () => {
            req.params.id = '507f1f77bcf86cd799439011';
            const blog = { title: 'ID Blog', _id: '507f1f77bcf86cd799439011', status: 'published' };
            Blog.findOne.mockResolvedValue(null);
            Blog.findById.mockResolvedValue(blog);

            await getBlogById(req, res);

            expect(Blog.findOne).toHaveBeenCalledWith({ slug: req.params.id });
            expect(Blog.findById).toHaveBeenCalledWith(req.params.id);
            expect(res.json).toHaveBeenCalledWith(blog);
        });

        it('should return 404 when blog not found', async () => {
            req.params.id = 'non-existent-slug';
            Blog.findOne.mockResolvedValue(null);

            await getBlogById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Blog post not found' });
        });

        it('should handle 500 error', async () => {
            req.params.id = 'some-id';
            const error = new Error('Find error');
            Blog.findOne.mockRejectedValue(error);

            await getBlogById(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: error.message });
        });
    });

    describe('createBlog', () => {
        it('should create a blog successfully', async () => {
            req.body = {
                title: 'New Blog',
                author: 'John Doe',
                category: 'Tech',
                status: 'published'
            };

            const createdBlog = { ...req.body, _id: 'some-id' };

            // Mock the constructor and save
            Blog.mockImplementation(() => ({
                save: jest.fn().mockResolvedValue(createdBlog)
            }));

            await createBlog(req, res);

            expect(Blog).toHaveBeenCalledWith({
                title: 'New Blog',
                author: 'John Doe',
                category: 'Tech',
                image: undefined,
                excerpt: undefined,
                content: undefined,
                readTime: undefined,
                tags: undefined,
                slug: undefined,
                status: 'published'
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(createdBlog);
        });

        it('should handle 400 error on save', async () => {
            const error = new Error('Validation failed');
            Blog.mockImplementation(() => ({
                save: jest.fn().mockRejectedValue(error)
            }));

            await createBlog(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: error.message });
        });
    });

    describe('updateBlog', () => {
        it('should update a blog successfully', async () => {
            req.params.id = 'some-id';
            req.body = { title: 'Updated Title' };

            const mockBlog = {
                title: 'Old Title',
                save: jest.fn().mockImplementation(function() {
                    return Promise.resolve(this);
                })
            };

            Blog.findById.mockResolvedValue(mockBlog);

            await updateBlog(req, res);

            expect(Blog.findById).toHaveBeenCalledWith('some-id');
            expect(mockBlog.title).toBe('Updated Title');
            expect(mockBlog.save).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(mockBlog);
        });

        it('should return 404 when blog not found', async () => {
            req.params.id = 'non-existent-id';
            Blog.findById.mockResolvedValue(null);

            await updateBlog(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Blog post not found' });
        });

        it('should handle 400 error', async () => {
            req.params.id = 'some-id';
            const error = new Error('Update error');
            Blog.findById.mockRejectedValue(error);

            await updateBlog(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: error.message });
        });
    });

    describe('deleteBlog', () => {
        it('should delete a blog successfully', async () => {
            req.params.id = 'some-id';
            const mockBlog = {
                deleteOne: jest.fn().mockResolvedValue({})
            };

            Blog.findById.mockResolvedValue(mockBlog);

            await deleteBlog(req, res);

            expect(Blog.findById).toHaveBeenCalledWith('some-id');
            expect(mockBlog.deleteOne).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({ message: 'Blog post removed' });
        });

        it('should return 404 when blog not found', async () => {
            req.params.id = 'non-existent-id';
            Blog.findById.mockResolvedValue(null);

            await deleteBlog(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Blog post not found' });
        });

        it('should handle 500 error', async () => {
            req.params.id = 'some-id';
            const error = new Error('Delete error');
            Blog.findById.mockRejectedValue(error);

            await deleteBlog(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: error.message });
        });
    });
});