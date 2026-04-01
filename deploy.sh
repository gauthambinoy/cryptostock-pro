#!/bin/bash
set -e

echo "🚀 AssetPulse AWS Deployment Script"
echo "===================================="

# 1. Clone repo
cd /tmp
rm -rf cryptostock-pro 2>/dev/null || true
git clone https://github.com/gautham-kalidas/cryptostock-pro.git
cd cryptostock-pro/terraform

# 2. Create terraform.tfvars with secure defaults
echo "📝 Creating Terraform configuration..."
cat > terraform.tfvars << 'TFVARS'
aws_region = "us-east-1"
db_password = "AssetPulse2024!Secure#Password"
newsapi_key = "test"
fred_api_key = "test"
jwt_secret_key = "assetpulse-super-secret-key-2024"
github_repo_url = "https://github.com/gautham-kalidas/cryptostock-pro.git"
TFVARS

# 3. Initialize Terraform
echo "⚙️  Initializing Terraform..."
terraform init

# 4. Plan deployment
echo "📋 Planning deployment..."
terraform plan -out=tfplan

# 5. Apply deployment
echo "🔨 Deploying to AWS (this takes ~10-15 minutes)..."
terraform apply tfplan

# 6. Get outputs
echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo "===================================="
terraform output -json > /tmp/deployment_outputs.json
cat /tmp/deployment_outputs.json | jq '.'

echo ""
echo "📊 Your AssetPulse is now LIVE:"
APP_URL=$(terraform output -raw live_app_url 2>/dev/null || echo "Check outputs above")
echo "🌐 App URL: $APP_URL"
echo "📚 API Docs: $(terraform output -raw api_docs_url 2>/dev/null || echo "Check outputs above")"
echo "🔑 SSH Key: $(terraform output -raw private_key_path 2>/dev/null || echo "Check outputs above")"

echo ""
echo "📌 Next Steps:"
echo "1. Wait 2-3 minutes for app to fully start"
echo "2. Visit the App URL above"
echo "3. Check health: curl $APP_URL/health"
echo "4. Monitor logs in CloudWatch"
