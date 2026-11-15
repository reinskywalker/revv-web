pipeline {
    agent any

    parameters {
        booleanParam(name: 'SKIP_INSTALL', defaultValue: false, description: 'Skip npm ci')
        booleanParam(name: 'DEPLOY_VERCEL', defaultValue: false, description: 'Deploy to Vercel production after build')
    }

    stages {
        stage('Install Dependencies') {
            when {
                expression { return !params.SKIP_INSTALL }
            }
            steps {
                powershell 'npm ci'
            }
        }

        stage('Lint') {
            steps {
                powershell 'npm run lint'
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
