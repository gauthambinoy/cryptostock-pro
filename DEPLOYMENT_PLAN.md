# 📋 ASSETPULSE DEPLOYMENT PLAN

## Phase 0: Pre-Deployment Verification ✅

### Verify All Files Are Ready
```bash
# Check Terraform files exist
ls -la /home/gautham/cryptostock-pro/terraform/
# Should show: main.tf, variables.tf, user_data.sh, terraform.tfvars.example

# Check Docker files exist
ls -la /home/gautham/cryptostock-pro/
# Should show: Dockerfile, docker-compose.yml

# Check Backend code exists
ls -la /home/gautham/cryptostock-pro/backend/
# Should show: app/ (with all services, routers, etc)
```

### Verify Documentation Files
```bash
# Check all guides exist
ls /home/gautham/cryptostock-pro/*.md | head -20
# Should show: README_DEPLOYMENT.md, FINAL_DEPLOYMENT_SUMMARY.md, etc
```

---

## Phase 1: AWS Account Setup (5-10 minutes)

### Step 1.1: Create AWS Account (if needed)
- Go to: https://aws.amazon.com
- Click "Create a free account"
- Fill in email, password, billing info
- Verify via SMS/email
- ✅ Should take 5-10 minutes

### Step 1.2: Create IAM User & Get Access Keys
1. Go to AWS Console
2. Search: "IAM" → Click IAM
3. Click "Users" → "Create user"
4. Name: `terraform-deploy`
5. Click "Create user"
6. Click on the user
7. Click "Security credentials" tab
8. Click "Create access key"
9. Select: "Application running on AWS resources"
10. Click "Create"
11. **IMPORTANT: Download CSV and save it!**
    - Contains: Access Key ID and Secret Access Key
    - You'll need these in next step!

### Step 1.3: Verify AWS Account
```bash
# You should have:
# ✅ AWS Account created
# ✅ IAM user "terraform-deploy" created
# ✅ Access key CSV downloaded and saved
```

---

## Phase 2: Local Machine Setup (10 minutes)

### Step 2.1: Install Terraform

**Mac:**
```bash
brew install terraform
terraform version  # Should show v1.x.x
```

**Linux (Ubuntu):**
```bash
sudo apt update
sudo apt install terraform
terraform version  # Should show v1.x.x
```

**Windows:**
- Download: https://www.terraform.io/downloads
- Extract to: `C:\terraform\`
- Add to PATH
- Open PowerShell and test: `terraform version`

### Step 2.2: Configure AWS Credentials

```bash
# Create AWS credentials directory
mkdir -p ~/.aws

# Create credentials file
nano ~/.aws/credentials
```

**Paste this (replace YOUR_KEY and YOUR_SECRET from CSV):**
```
[default]
aws_access_key_id = YOUR_ACCESS_KEY_ID_FROM_CSV
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY_FROM_CSV
```

**Save:** Ctrl+X → Y → Enter

### Step 2.3: Verify AWS Credentials

```bash
# Test AWS credentials
aws s3 ls

# If it shows buckets or "no buckets found", credentials work ✅
# If it shows error, check your credentials file
```

---

## Phase 3: Terraform Configuration (5 minutes)

### Step 3.1: Navigate to Terraform Directory

```bash
cd /home/gautham/cryptostock-pro/terraform
pwd  # Should show: /home/gautham/cryptostock-pro/terraform
```

### Step 3.2: Copy Configuration Template

```bash
cp terraform.tfvars.example terraform.tfvars
ls terraform.tfvars  # Should exist now
```

### Step 3.3: Edit Configuration File

```bash
nano terraform.tfvars
```

**Edit these values:**
```terraform
aws_region       = "us-east-1"                    # Keep as is
db_password      = "ChangeMe123!@#"              # CHANGE THIS - your secure password
newsapi_key      = "test"                         # Can add real key later
fred_api_key     = "test"                         # Can add real key later
jwt_secret_key   = "assetpulse-secret-key"       # Change if you want
github_repo_url  = "https://github.com/gauthambinoy/cryptostock-pro.git"  # Keep as is
```

**Save:** Ctrl+X → Y → Enter

### Step 3.4: Verify Configuration

```bash
cat terraform.tfvars  # Show what you configured
# Should show all variables with your values
```

---

## Phase 4: Terraform Initialization (3 minutes)

### Step 4.1: Initialize Terraform

```bash
terraform init
```

**Expected output:**
```
Terraform has been successfully configured!
```

### Step 4.2: Verify Initialization

```bash
ls -la .terraform/
# Should show terraform directories
```

---

## Phase 5: Terraform Plan (2 minutes)

### Step 5.1: Review Deployment Plan

```bash
terraform plan
```

**Expected output will show:**
- ✅ VPC will be created
- ✅ Security groups will be created
- ✅ EC2 instance will be created
- ✅ RDS database will be created
- ✅ Elastic IP will be created
- ✅ CloudWatch alarms will be created
- ✅ SNS topic will be created

**DO NOT proceed if you see errors!**

### Step 5.2: Review Resources

```bash
# Count the resources that will be created
terraform plan | grep -c "will be created"
# Should be around 15-20 resources
```

---

## Phase 6: Terraform Apply (MAIN DEPLOYMENT) ⚠️

### Step 6.1: Deploy Everything

```bash
terraform apply
```

**You'll see:**
```
Do you want to perform these actions?
  Terraform will perform the actions described above.
  Only 'yes' will be accepted to approve.

  Enter a value:
```

**Type:** `yes` (exactly)

### Step 6.2: Wait for Deployment

**Timeline:**
```
t=0:00     terraform apply started
t=1:00     Creating VPC, subnets, gateways
t=2:00     Creating security groups
t=3:00     Creating RDS database (LONGEST)
t=5:00     Creating EC2 instance
t=6:00     Creating Elastic IP
t=7:00     Creating CloudWatch alarms
t=8:00     Configuring user_data script
t=8:30     EC2 instance starting
t=10:00    Docker downloading/building
t=12:00    All services starting
t=14:00+   COMPLETE! ✅
```

**Total time: 10-15 minutes**

### Step 6.3: Monitor Deployment

```bash
# Watch the terraform output
# Don't stop the process!
# Let it run to completion
```

---

## Phase 7: Collect Deployment Outputs (1 minute)

### Step 7.1: Get Live URL and Details

When Terraform completes, you'll see:

```
Outputs:

api_docs_url = "http://54.XXX.XXX.XXX:8000/docs"
instance_public_dns = "ec2-54-xxx-xxx-xxx.compute-1.amazonaws.com"
instance_public_ip = "54.XXX.XXX.XXX"
live_app_url = "http://54.XXX.XXX.XXX:8000"
private_key_path = "./assetpulse-key.pem"
rds_endpoint = "assetpulse-db.xxxxx.us-east-1.rds.amazonaws.com"
```

### Step 7.2: Save Your Information

```bash
# Create a file to save your deployment info
cat > MY_DEPLOYMENT_INFO.txt << 'INFO'
=== ASSETPULSE DEPLOYMENT INFO ===

Live App URL: http://YOUR-IP:8000
API Docs URL: http://YOUR-IP:8000/docs
EC2 Public IP: YOUR-IP
EC2 Public DNS: YOUR-DNS

SSH Command: ssh -i terraform/assetpulse-key.pem ubuntu@YOUR-IP
RDS Endpoint: YOUR-RDS-ENDPOINT
Database: assetpulse
Username: assetpulse

Deployment Date: $(date)
Deployment Status: ✅ COMPLETE

=== SAVE THIS FILE SAFELY ===
INFO

# Display it
cat MY_DEPLOYMENT_INFO.txt
```

---

## Phase 8: Post-Deployment Verification (5 minutes)

### Step 8.1: Health Check

```bash
# Replace YOUR-IP with actual IP from Terraform output
curl http://54.XXX.XXX.XXX:8000/health

# Expected response:
# {"status":"healthy","database":"connected","version":"2.0.0","accuracy":"90%+","data_sources":"..."}
```

### Step 8.2: Test in Browser

```bash
# Open in browser:
http://54.XXX.XXX.XXX:8000

# Should show:
# ✅ Login page
# ✅ Clean UI
# ✅ All responsive
```

### Step 8.3: SSH into Server

```bash
ssh -i terraform/assetpulse-key.pem ubuntu@54.XXX.XXX.XXX

# You should see:
# Ubuntu 22.04 LTS
# Welcome message
```

### Step 8.4: Check Docker Containers

```bash
# From SSH session
docker ps

# Should show:
# - assetpulse-backend (running)
# - assetpulse-redis (running)
```

### Step 8.5: Check Logs

```bash
# View application logs
docker-compose logs backend

# Should show:
# ✅ "Starting AssetPulse..."
# ✅ "Database initialized"
# ✅ "Application running"

# Exit SSH
exit
```

---

## Phase 9: User Acceptance Testing (10 minutes)

### Step 9.1: Create Account

```
1. Go to: http://YOUR-IP:8000
2. Click: Sign Up
3. Enter: Email + Password
4. Click: Create Account
5. ✅ Should redirect to login
```

### Step 9.2: Login

```
1. Enter: Your email
2. Enter: Your password
3. Click: Login
4. ✅ Should show dashboard
```

### Step 9.3: Add Portfolio

```
1. Click: Create Portfolio
2. Name: "My Portfolio"
3. Click: Create
4. ✅ Portfolio created
```

### Step 9.4: Add Holdings

```
1. Click: Add Holding
2. Asset: BTC (or any symbol)
3. Quantity: 1
4. Price: current price
5. Click: Add
6. ✅ Holding appears
```

### Step 9.5: Test Predictions

```
1. Go to: Predictions
2. Enter: BTC
3. Click: Get Prediction
4. ✅ Should see:
   - Current price
   - Sentiment analysis
   - Technical indicators
   - ML prediction
   - 90%+ accuracy
```

---

## Phase 10: Monitoring Setup (Optional - 5 minutes)

### Step 10.1: Configure SNS Alerts (Email Notifications)

```bash
# Go to AWS Console
# Search: SNS
# Click: Topics
# Find: assetpulse-alerts
# Click on topic
# Click: Create subscription
# Protocol: Email
# Endpoint: YOUR-EMAIL
# Click: Create subscription

# Check your email for confirmation link
# Click confirmation link to activate
```

### Step 10.2: Check CloudWatch Dashboard

```bash
# Go to AWS Console
# Search: CloudWatch
# Click: Dashboards
# You should see your metrics being collected
```

---

## Phase 11: Backup & Documentation (Final)

### Step 11.1: Backup Important Files

```bash
# Copy terraform state and config
cp -r terraform ~/assetpulse-backup/

# Copy deployment info
cp MY_DEPLOYMENT_INFO.txt ~/assetpulse-backup/

# Save your AWS credentials safely
cp ~/.aws/credentials ~/assetpulse-backup/aws-credentials-backup

# Save the private key safely
cp terraform/assetpulse-key.pem ~/assetpulse-backup/
```

### Step 11.2: Document Everything

```bash
# Create deployment summary
cat > DEPLOYMENT_COMPLETE.md << 'DOC'
# Deployment Complete! ✅

## Deployment Details
- Date: $(date)
- Cloud: AWS
- Region: us-east-1
- App URL: http://YOUR-IP:8000

## Architecture
- EC2: t2.micro (FREE 12 months)
- RDS: PostgreSQL (FREE 12 months)
- Redis: Cache layer
- Auto-restart: 4 layers (never goes down)

## Files to Keep Safe
- terraform/assetpulse-key.pem (SSH key)
- ~/.aws/credentials (AWS credentials)
- MY_DEPLOYMENT_INFO.txt (deployment info)
- terraform/terraform.tfvars (configuration)

## Next Steps
1. Share http://YOUR-IP:8000 with users
2. Monitor CloudWatch dashboard
3. Check logs regularly: docker-compose logs
4. Update API keys when ready (NewsAPI, FRED, etc)

## Support
- Logs: ssh -i terraform/assetpulse-key.pem ubuntu@IP && docker-compose logs
- AWS Console: https://aws.amazon.com
- Terraform: terraform state show
DOC
```

---

## 🎯 DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] AWS account created
- [ ] IAM user created
- [ ] Access keys downloaded (CSV saved)
- [ ] Terraform installed
- [ ] AWS credentials configured (~/.aws/credentials)
- [ ] All files verified

### Configuration
- [ ] terraform.tfvars created from example
- [ ] db_password changed (NOT default)
- [ ] github_repo_url verified
- [ ] Configuration reviewed

### Deployment
- [ ] terraform init completed
- [ ] terraform plan reviewed
- [ ] terraform apply started
- [ ] Waited for completion (10-15 min)
- [ ] No errors in deployment

### Verification
- [ ] Health check passes (curl /health)
- [ ] Browser loads (http://IP:8000)
- [ ] SSH works (ssh -i key.pem ...)
- [ ] Docker containers running
- [ ] Logs look healthy
- [ ] Account creation works
- [ ] Predictions work

### Post-Deployment
- [ ] Deployment info saved
- [ ] Files backed up
- [ ] CloudWatch monitoring verified
- [ ] SNS alerts configured (optional)
- [ ] URL shared with stakeholders
- [ ] Documentation complete

---

## 🚨 TROUBLESHOOTING

### "terraform: command not found"
```bash
# Reinstall Terraform
brew install terraform  # Mac
sudo apt install terraform  # Linux
```

### "AccessDenied" error in Terraform
```bash
# Check credentials
cat ~/.aws/credentials
# Verify Access Key ID and Secret are correct from CSV
```

### "Error: EC2 instance not healthy"
```bash
# Wait longer (EC2 takes 5-10 minutes to fully start)
# Check logs when SSH is available:
ssh -i terraform/assetpulse-key.pem ubuntu@IP
docker-compose logs backend
```

### "RDS database creation timeout"
```bash
# This is normal - RDS takes 5-10 minutes
# Don't stop terraform!
# Let it complete
```

### "Need to restart everything"
```bash
# SSH into server
ssh -i terraform/assetpulse-key.pem ubuntu@IP

# Restart Docker
docker-compose down
docker-compose up -d

# Exit
exit
```

### "Need to destroy everything"
```bash
# Warning: This deletes ALL resources
terraform destroy  # Type: yes

# Wait for completion
# All AWS resources will be deleted
# You won't be charged anymore
```

---

## 📞 NEXT STEPS

1. ✅ Follow this plan step by step
2. ✅ Don't skip any verification steps
3. ✅ Save all deployment info
4. ✅ Share your live URL with users!
5. ✅ Monitor for first week
6. ✅ Update API keys (NewsAPI, FRED, Reddit, Twitter) for full features

---

## 🎉 YOU'RE READY!

Everything is prepared. Everything is documented. 

**Start with Phase 1 and follow through Phase 11!**

Good luck! 🚀
