# ⚡ AWS SETUP - 5 MINUTES TOTAL

## Step 1: Get AWS Access Key (2 minutes)

1. Go to: https://aws.amazon.com
2. Sign in / Create account (free tier eligible)
3. Go to: **IAM** (Identity & Access Management)
4. Click **"Users"** → **"Create user"**
5. Name: `terraform-deploy`
6. Click **"Create user"**
7. Click on user → **"Security credentials"**
8. Click **"Create access key"**
9. Select: **"Application running on AWS resources"**
10. Create → **Download CSV file** (SAVE THIS!)

Your CSV has:
- Access Key ID
- Secret Access Key

---

## Step 2: Install Terraform (2 minutes)

### Mac
```bash
brew install terraform
```

### Linux (Ubuntu)
```bash
sudo apt update
sudo apt install terraform
```

### Verify
```bash
terraform version
```

---

## Step 3: Configure AWS Credentials (1 minute)

```bash
# Create AWS credentials file
mkdir -p ~/.aws

# Open editor
nano ~/.aws/credentials
```

Paste (replace with your keys from CSV):
```
[default]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
```

Save: Ctrl+X, Y, Enter

---

## Step 4: Deploy!

Go to terraform folder:
```bash
cd /home/gautham/cryptostock-pro/terraform
```

Copy variables:
```bash
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars
```

Edit and save with your passwords.

Deploy:
```bash
terraform init
terraform plan
terraform apply
```

Type `yes` when asked.

**Wait 5-10 minutes...**

---

## Step 5: Get Live URL

When done, you'll see:

```
live_app_url = "http://YOUR-IP:8000"
```

**That's your live app!** 🎉

---

## Test It

```bash
curl http://YOUR-IP:8000/health
```

Should see: `"status": "healthy"`

---

Done! AWS is deployed! 🚀
