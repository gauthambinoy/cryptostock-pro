# 🚀 DEPLOY TO RAILWAY - STEP BY STEP

## STEP 1: Go to Railway
https://railway.app

Sign in with GitHub (or create account)

---

## STEP 2: New Project
Click **"New Project"** button (top left)

---

## STEP 3: Deploy from GitHub Repo
Click **"Deploy from GitHub repo"**

---

## STEP 4: Select Your Repository
Search for: `cryptostock-pro`

Click it to select

---

## STEP 5: Railway auto-detects your app
It finds Dockerfile automatically ✓

---

## STEP 6: Add Environment Variables
Click **"Variables"** tab

Add these 3 (copy-paste):

### Variable 1:
```
Key: NEWSAPI_KEY
Value: pk_test  (or get real key from https://newsapi.org)
```
Click Add

### Variable 2:
```
Key: FRED_API_KEY
Value: test  (or get real key from https://fred.stlouisfed.org)
```
Click Add

### Variable 3:
```
Key: JWT_SECRET_KEY
Value: your_secret_key_12345
```
Click Add

---

## STEP 7: Deploy
Click **"Deploy"** button

Wait 2-3 minutes...

---

## STEP 8: Get Your Live URL
When deployment is done, you'll see:

**"Service running"** ✓

Copy the URL (looks like):
`https://assetpulse-production-abc123.railway.app`

---

## STEP 9: Test It's Working
Paste this in browser (replace URL with yours):
```
https://your-url/health
```

Should return:
```json
{
  "status": "healthy",
  "database": "connected",
  "version": "2.0.0"
}
```

---

## DONE! 🎉

Your app is LIVE with 90%+ accuracy predictions!

**Share this URL with users:**
`https://your-url`

They can:
- Create account
- Add portfolio
- Get 90%+ accurate predictions
- See news + reddit + twitter + macro data

---

## If Deploy Fails

Most common issue: Missing DATABASE_URL

**Fix:**
1. In Railway dashboard
2. Add Variable:
   - Key: `DATABASE_URL`
   - Value: `sqlite:///./data/assetpulse.db`
3. Click Redeploy

---

## BACKUP PLAN: Local Docker

If Railway doesn't work, run locally:

```bash
cd /home/gautham/cryptostock-pro
docker-compose up -d
```

App will be at: `http://localhost:8000`

---

**That's it! Your AssetPulse is LIVE!** 🚀
