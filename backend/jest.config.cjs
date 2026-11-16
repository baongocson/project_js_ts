const common={rootDir:'.',testEnvironment:'node',transform:{'^.+[.]ts$':['ts-jest',{tsconfig:'<rootDir>/tsconfig.spec.json',diagnostics:true}]},setupFilesAfterEnv:['<rootDir>/src/test/setup.ts'],clearMocks:true,restoreMocks:true};
module.exports={testTimeout:15000,projects:[
 {...common,displayName:'unit',testMatch:['<rootDir>/src/test/unit/**/*.spec.ts']},
 {...common,displayName:'e2e',testMatch:['<rootDir>/src/test/e2e/**/*.e2e-spec.ts']},
 {...common,displayName:'integration',testMatch:['<rootDir>/src/test/integration/**/*.integration-spec.ts']}
]};
