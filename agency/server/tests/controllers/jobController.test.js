const { getJobs, createJob, updateJob, deleteJob } = require('../../controllers/jobController');
const Job = require('../../models/Job');

// Mock the Job model
jest.mock('../../models/Job');

describe('jobController', () => {
    let req;
    let res;

    beforeEach(() => {
        req = {
            params: {},
            body: {}
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    describe('getJobs', () => {
        it('should return all active jobs sorted by createdAt desc', async () => {
            const mockJobs = [{ _id: '1', role: 'Dev' }, { _id: '2', role: 'Designer' }];
            const sortMock = jest.fn().mockResolvedValue(mockJobs);
            const findMock = jest.fn().mockReturnValue({ sort: sortMock });
            Job.find.mockImplementation(findMock);

            await getJobs(req, res);

            expect(Job.find).toHaveBeenCalled();
            expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
            expect(res.json).toHaveBeenCalledWith(mockJobs);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should handle errors and return status 500', async () => {
            const errorMessage = 'Database error';
            Job.find.mockImplementation(() => { throw new Error(errorMessage) });

            await getJobs(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
        });
    });

    describe('createJob', () => {
        it('should create a job and return status 201', async () => {
            const reqBody = {
                role: 'Dev',
                type: 'Full-time',
                location: 'Remote',
                description: 'Build things',
                requirements: ['JS', 'React']
            };
            req.body = reqBody;

            const createdJob = { ...reqBody, _id: '1', isActive: true };

            // Mocking the constructor and save method
            Job.mockImplementation(() => {
                return {
                    save: jest.fn().mockResolvedValue(createdJob)
                };
            });

            await createJob(req, res);

            expect(Job).toHaveBeenCalledWith({
                ...reqBody,
                isActive: true
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(createdJob);
        });

        it('should handle errors and return status 400', async () => {
            const errorMessage = 'Validation error';
            Job.mockImplementation(() => {
                return {
                    save: jest.fn().mockRejectedValue(new Error(errorMessage))
                };
            });

            await createJob(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
        });
    });

    describe('updateJob', () => {
        it('should update an existing job and return it', async () => {
            req.params.id = '1';
            req.body = { role: 'Senior Dev' };

            const existingJob = {
                _id: '1',
                role: 'Dev',
                save: jest.fn().mockResolvedValue({ _id: '1', role: 'Senior Dev' })
            };

            Job.findById.mockResolvedValue(existingJob);

            await updateJob(req, res);

            expect(Job.findById).toHaveBeenCalledWith('1');
            expect(existingJob.role).toBe('Senior Dev'); // Object.assign applied
            expect(existingJob.save).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({ _id: '1', role: 'Senior Dev' });
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should return 404 if job is not found', async () => {
            req.params.id = '1';
            req.body = { role: 'Senior Dev' };

            Job.findById.mockResolvedValue(null);

            await updateJob(req, res);

            expect(Job.findById).toHaveBeenCalledWith('1');
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Job posting not found' });
        });

        it('should handle errors and return status 400', async () => {
            req.params.id = '1';
            const errorMessage = 'Update error';
            Job.findById.mockRejectedValue(new Error(errorMessage));

            await updateJob(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
        });
    });

    describe('deleteJob', () => {
        it('should delete an existing job and return success message', async () => {
            req.params.id = '1';

            const existingJob = {
                _id: '1',
                deleteOne: jest.fn().mockResolvedValue(true)
            };

            Job.findById.mockResolvedValue(existingJob);

            await deleteJob(req, res);

            expect(Job.findById).toHaveBeenCalledWith('1');
            expect(existingJob.deleteOne).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({ message: 'Job posting removed' });
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should return 404 if job is not found', async () => {
            req.params.id = '1';

            Job.findById.mockResolvedValue(null);

            await deleteJob(req, res);

            expect(Job.findById).toHaveBeenCalledWith('1');
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Job posting not found' });
        });

        it('should handle errors and return status 500', async () => {
            req.params.id = '1';
            const errorMessage = 'Deletion error';
            Job.findById.mockRejectedValue(new Error(errorMessage));

            await deleteJob(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
        });
    });
});
