pipeline {
    agent any

    parameters {
        booleanParam(name: 'DEPLOY_VERCEL', defaultValue: false, description: 'Deploy to Vercel production after build')
    }

    stages {
        stage('Install Dependencies') {
            steps {
                powershell 'npm ci'
            }
        }

        stage('Lint') {
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                    powershell 'npx eslint src --rule "prettier/prettier: [error, {endOfLine: auto}]"'
                }
            }
        }

        stage('Test') {
            steps {
                powershell 'npm test'
            }
        }

        stage('Build') {
            steps {
                powershell 'npm run build'
            }
        }

        stage('Deploy to Vercel') {
            when {
                expression { return params.DEPLOY_VERCEL }
            }
            steps {
                powershell 'vercel --prod'
            }
        }
    }
}
