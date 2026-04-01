#!/bin/bash
set -e

echo "🚀 AssetPulse Phase 1 - Deploying to AWS"
echo "=========================================="
echo ""
echo "This script will:"
echo "1. Clone repo with all Phase 1 features"
echo "2. Initialize Terraform"
echo "3. Deploy to AWS (EC2 + RDS + VPC)"
echo "4. Print your live app URL"
echo ""
echo "⏱️  Takes ~15 minutes"
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured"
    echo "Run: aws configure"
    echo "Then run this script again"
    exit 1
fi

echo "✅ AWS credentials found"
echo ""

# Create temp directory
cd /tmp
rm -rf cryptostock-pro-phase1 2>/dev/null || true
mkdir cryptostock-pro-phase1
cd cryptostock-pro-phase1

# Clone repo
echo "📥 Cloning repository..."
git clone https://github.com/gauthambinoy/cryptostock-pro.git
cd cryptostock-pro/terraform

# Create terraform.tfvars with secure defaults
echo "⚙️  Creating Terraform configuration..."
cat > terraform.tfvars << 'TFVARS'
aws_region = "us-east-1"
db_password = "AssetPulse2024!SecurePass123"
newsapi_key = "test"
fred_api_key = "test"
jwt_secret_key = "assetpulse-jwt-secret-key-2024"
github_repo_url = "https://github.com/gauthambinoy/cryptostock-pro.git"
TFVARS

# Initialize Terraform
echo ""
echo "🔧 Initializing Terraform..."
terraform init

# Plan deployment
echo ""
echo "📋 Planning deployment..."
terraform plan -out=tfplan

# Ask for confirmation
echo ""
echo "=========================================="
echo "Ready to deploy to AWS?"
echo "=========================================="
echo "This will create:"
echo "  ✅ VPC with public/private subnets"
echo "  ✅ EC2 t2.micro instance (FREE)"
echo "  ✅ RDS PostgreSQL db.t3.micro (FREE)"
echo "  ✅ Security groups + auto-recovery"
echo "  ✅ CloudWatch monitoring + SNS alerts"
echo ""
echo "Cost: $0/month for 12 months (AWS free tier)"
echo "After 12 months: ~$17/month"
echo ""
read -p "Type 'yes' to deploy: " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

# Deploy
echo ""
echo "🚀 Deploying to AWS... (takes ~10-15 minutes)"
echo ""
terraform apply tfplan

# Get outputs
echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""

APP_URL=$(terraform output -raw live_app_url)
API_DOCS=$(terraform output -raw api_docs_url)
PRIVATE_KEY=$(terraform output -raw private_key_path)
PUBLIC_IP=$(terraform output -raw instance_public_ip)

echo "🌐 Your AssetPulse App is LIVE:"
echo ""
echo "   App URL:  $APP_URL"
echo "   API Docs: $API_DOCS"
echo ""
echo "📊 Phase 1 Features Now Available:"
echo "   ✅ Dark Mode Toggle"
echo "   ✅ Email/SMS Alerts"
echo "   ✅ AI Chatbot (Claude)"
echo "   ✅ Community Leaderboard"
echo "   ✅ Backtesting Engine"
echo ""
echo "🔑 SSH Access:"
echo "   ssh -i $PRIVATE_KEY ubuntu@$PUBLIC_IP"
echo ""
echo "⏳ Wait 2-3 minutes for app to fully start"
echo "   Then open: $APP_URL"
echo ""
echo "📞 For support:"
echo "   Logs: docker-compose logs -f"
echo "   Health check: curl $APP_URL/health"
echo ""
echo "=========================================="
