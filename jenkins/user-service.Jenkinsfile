pipeline {
  agent any

  environment {
    REGISTRY = 'ghcr.io/pony4021/msa-shop'
    MANIFEST_BRANCH = 'develop'
    MANIFEST_FILE = 'k8s/overlays/dev/kustomization.yaml'
    GITOPS_REPO = 'https://github.com/pony4021/msa-shop.git'
    SERVICE_NAME = 'user-service'
    BUILD_CONTEXT = 'services/user-service'
  }

  options {
    disableConcurrentBuilds()
    timestamps()
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Generate Image Tag') {
      steps {
        script {
          String today = sh(script: 'date +%Y%m%d', returnStdout: true).trim()
          String currentTag = sh(
            script: """
              awk '/name: <aws_account_id>\\.dkr\\.ecr\\.ap-northeast-2\\.amazonaws\\.com\\/shop-msa\\/${env.SERVICE_NAME}/ { found=1; next } found && /newTag:/ { print \$2; exit }' ${env.MANIFEST_FILE} || true
            """,
            returnStdout: true
          ).trim()

          String nextIndex = '01'
          if (currentTag ==~ /^${today}-\\d+$/) {
            int lastIndex = currentTag.split('-')[1] as int
            nextIndex = String.format('%02d', lastIndex + 1)
          }

          env.IMAGE_TAG = "${today}-${nextIndex}"
          echo "Using image tag ${env.IMAGE_TAG}"
        }
      }
    }

    stage('Docker Login') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'ghcr-creds', usernameVariable: 'REGISTRY_USER', passwordVariable: 'REGISTRY_TOKEN')]) {
          sh '''
            set -euo pipefail
            echo "$REGISTRY_TOKEN" | docker login ghcr.io -u "$REGISTRY_USER" --password-stdin
          '''
        }
      }
    }

    stage('Build And Push Image') {
      steps {
        sh """
          set -euo pipefail
          docker build -t ${env.REGISTRY}/${env.SERVICE_NAME}:${env.IMAGE_TAG} ${env.BUILD_CONTEXT}
          docker push ${env.REGISTRY}/${env.SERVICE_NAME}:${env.IMAGE_TAG}
        """
      }
    }

    stage('Update Kustomize Image') {
      steps {
        sh """
          set -euo pipefail
          chmod +x scripts/update_kustomize_image.sh
          ./scripts/update_kustomize_image.sh ${env.MANIFEST_FILE} ${env.SERVICE_NAME} ${env.REGISTRY}/${env.SERVICE_NAME} ${env.IMAGE_TAG}
        """
      }
    }

    stage('Commit And Push Manifest') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'github-creds', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_TOKEN')]) {
          sh '''
            set -euo pipefail

            git config user.name "jenkins"
            git config user.email "jenkins@local"
            git add "$MANIFEST_FILE"

            if git diff --cached --quiet; then
              echo "No manifest changes to commit"
              exit 0
            fi

            git commit -m "chore(deploy): bump ${SERVICE_NAME} image to ${IMAGE_TAG}"
            git remote set-url origin "https://${GIT_USER}:${GIT_TOKEN}@github.com/pony4021/msa-shop.git"
            git push origin HEAD:${MANIFEST_BRANCH}
          '''
        }
      }
    }
  }
}
