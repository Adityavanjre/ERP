module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: '.',
    testEnvironment: 'node',
    testRegex: '.e2e-spec.ts$',
    transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
    },
    moduleNameMapper: {
        '^@nexus/shared$': '<rootDir>/../../packages/shared/src/index',
        '^@nexus/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
        '^src/(.*)$': '<rootDir>/../src/$1',
    },
};
