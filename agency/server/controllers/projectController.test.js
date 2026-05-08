const {
    getProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject,
} = require('./projectController');
const Project = require('../models/Project');

// Mock the Project model
jest.mock('../models/Project');

describe('Project Controller', () => {
    let req;
    let res;

    beforeEach(() => {
        // Clear all mock implementations before each test
        jest.clearAllMocks();

        // Setup common mock req and res objects
        req = {
            params: {},
            body: {}
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };
    });

    describe('getProjects', () => {
        it('should return all projects sorted by createdAt descending', async () => {
            const mockProjects = [
                { _id: '1', title: 'Project 1' },
                { _id: '2', title: 'Project 2' }
            ];

            // Mock the method chain: Project.find().sort()
            const mockSort = jest.fn().mockResolvedValue(mockProjects);
            Project.find.mockReturnValue({ sort: mockSort });

            await getProjects(req, res);

            expect(Project.find).toHaveBeenCalledWith({});
            expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
            expect(res.json).toHaveBeenCalledWith(mockProjects);
        });

        it('should handle errors and return status 500', async () => {
            const errorMessage = 'Database error';

            const mockSort = jest.fn().mockRejectedValue(new Error(errorMessage));
            Project.find.mockReturnValue({ sort: mockSort });

            await getProjects(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
        });
    });

    describe('getProjectById', () => {
        it('should return a project if found', async () => {
            const mockProject = { _id: '1', title: 'Project 1' };
            req.params.id = '1';

            Project.findById.mockResolvedValue(mockProject);

            await getProjectById(req, res);

            expect(Project.findById).toHaveBeenCalledWith('1');
            expect(res.json).toHaveBeenCalledWith(mockProject);
        });

        it('should return 404 if project is not found', async () => {
            req.params.id = '999';
            Project.findById.mockResolvedValue(null);

            await getProjectById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        it('should return 500 on database error', async () => {
            req.params.id = '1';
            const errorMessage = 'Invalid ID format';
            Project.findById.mockRejectedValue(new Error(errorMessage));

            await getProjectById(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
        });
    });

    describe('createProject', () => {
        it('should create a new project and return 201', async () => {
            const projectData = {
                title: 'New Project',
                description: 'Description',
                image: 'image.jpg'
            };
            req.body = projectData;

            const savedProject = { _id: '1', ...projectData };

            // Mock the constructor and save method
            const mockSave = jest.fn().mockResolvedValue(savedProject);
            Project.mockImplementation(() => ({
                save: mockSave
            }));

            await createProject(req, res);

            expect(Project).toHaveBeenCalledWith(expect.objectContaining(projectData));
            expect(mockSave).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(savedProject);
        });

        it('should handle validation/save errors with 400', async () => {
            req.body = {}; // Missing required fields
            const errorMessage = 'Validation error';

            const mockSave = jest.fn().mockRejectedValue(new Error(errorMessage));
            Project.mockImplementation(() => ({
                save: mockSave
            }));

            await createProject(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
        });
    });

    describe('updateProject', () => {
        it('should update an existing project and return it', async () => {
            req.params.id = '1';
            req.body = { title: 'Updated Title' };

            const mockSave = jest.fn().mockResolvedValue({ _id: '1', title: 'Updated Title' });
            const existingProject = { _id: '1', title: 'Old Title', save: mockSave };

            Project.findById.mockResolvedValue(existingProject);

            await updateProject(req, res);

            expect(Project.findById).toHaveBeenCalledWith('1');
            expect(existingProject.title).toBe('Updated Title');
            expect(mockSave).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({ _id: '1', title: 'Updated Title' });
        });

        it('should only update fields provided in the request body', async () => {
            req.params.id = '1';
            req.body = { description: 'Updated Description' };

            const mockSave = jest.fn().mockResolvedValue({ _id: '1', title: 'Keep Title', description: 'Updated Description' });
            const existingProject = { _id: '1', title: 'Keep Title', description: 'Old Description', save: mockSave };

            Project.findById.mockResolvedValue(existingProject);

            await updateProject(req, res);

            expect(existingProject.title).toBe('Keep Title');
            expect(existingProject.description).toBe('Updated Description');
            expect(mockSave).toHaveBeenCalled();
        });

        it('should return 404 if project to update is not found', async () => {
            req.params.id = '999';
            req.body = { title: 'Updated Title' };

            Project.findById.mockResolvedValue(null);

            await updateProject(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        it('should handle errors with 400', async () => {
            req.params.id = '1';
            req.body = { title: 'Updated Title' };
            const errorMessage = 'Update failed';

            Project.findById.mockRejectedValue(new Error(errorMessage));

            await updateProject(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
        });
    });

    describe('deleteProject', () => {
        it('should delete an existing project and return success message', async () => {
            req.params.id = '1';

            const mockDeleteOne = jest.fn().mockResolvedValue({});
            const existingProject = { _id: '1', deleteOne: mockDeleteOne };

            Project.findById.mockResolvedValue(existingProject);

            await deleteProject(req, res);

            expect(Project.findById).toHaveBeenCalledWith('1');
            expect(mockDeleteOne).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({ message: 'Project removed' });
        });

        it('should return 404 if project to delete is not found', async () => {
            req.params.id = '999';

            Project.findById.mockResolvedValue(null);

            await deleteProject(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        it('should handle errors with 500', async () => {
            req.params.id = '1';
            const errorMessage = 'Delete failed';

            Project.findById.mockRejectedValue(new Error(errorMessage));

            await deleteProject(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
        });
    });
});
