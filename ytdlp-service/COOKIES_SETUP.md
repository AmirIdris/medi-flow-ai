# YouTube Cookies Setup (Required for YouTube)

⚠️ **IMPORTANT**: YouTube now requires browser cookies for most video extractions. If you're seeing "Sign in to confirm you're not a bot" errors, cookies are **required**, not optional.

This guide will help you set up cookies to make YouTube extraction work reliably.

## Quick Setup

### Step 1: Export Cookies from Browser

**Chrome/Edge:**
1. Install the [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc) extension
2. Visit [youtube.com](https://youtube.com) and sign in
3. Click the extension icon
4. Click "Export" → Save as `cookies.txt`

**Firefox:**
1. Install the [cookies.txt](https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/) extension
2. Visit [youtube.com](https://youtube.com) and sign in
3. Click the extension icon → "Export" → Save as `cookies.txt`

### Step 2: Upload Cookies to Your Deployment

**Railway:**
1. Go to your Railway project
2. Click on your service → "Variables" tab
3. Add a new variable:
   - Key: `YTDLP_COOKIES_FILE`
   - Value: `/app/cookies.txt`
4. Go to "Settings" → "Source" → Upload `cookies.txt` file
5. Or use Railway CLI to upload the file

**Render:**
1. Go to your Render service
2. Add environment variable:
   - Key: `YTDLP_COOKIES_FILE`
   - Value: `/app/cookies.txt`
3. Upload `cookies.txt` via Render dashboard or include it in your repo (not recommended for security)

**Fly.io:**
1. Create a `cookies.txt` file in your `ytdlp-service` directory
2. Add to `.gitignore` (important for security!)
3. Update your `Dockerfile` to copy the file:
   ```dockerfile
   COPY cookies.txt /app/cookies.txt
   ```
4. Set environment variable: `YTDLP_COOKIES_FILE=/app/cookies.txt`

### Step 3: Restart Service

After uploading cookies, restart your service:
- Railway: Service will auto-restart
- Render: Click "Manual Deploy" → "Clear build cache & deploy"
- Fly.io: `fly deploy`

## Security Risks & Best Practices

### ⚠️ Security Risks

**1. Account Access**
- Cookies contain session tokens that can be used to access your YouTube/Google account
- If someone gets your cookies.txt, they could:
  - Access your YouTube account
  - View your watch history
  - Access your Google account (if cookies include Google-wide sessions)
  - Potentially change account settings

**2. Privacy Exposure**
- Cookies may contain personal information
- They can reveal your browsing patterns and preferences
- Session tokens can be used to impersonate you

**3. Data Breach Risk**
- If your deployment platform is compromised, cookies could be stolen
- If cookies are committed to Git, they're in your repository history forever

### ✅ Security Best Practices

**1. Never Commit to Git**
- ✅ Add `cookies.txt` to `.gitignore` (already done)
- ✅ Never commit cookies to version control
- ✅ If accidentally committed, immediately:
  - Rotate your Google account password
  - Revoke all sessions in Google Account settings
  - Remove cookies from Git history (requires force push)

**2. Use Separate Account (Recommended)**
- Create a dedicated Google account for the service
- Don't use your personal/main account
- This limits damage if cookies are compromised

**3. Restrict File Permissions**
- Set proper file permissions (read-only for the service)
- Don't share cookies.txt files via insecure channels

**4. Regular Rotation**
- Cookies expire after ~30 days
- Regularly export new cookies
- Consider rotating more frequently for high-security use cases

**5. Platform Security**
- Use trusted deployment platforms (Railway, Render, etc.)
- Enable 2FA on your deployment platform account
- Use environment variables for file paths, not hardcoded paths

**6. Monitor Account Activity**
- Regularly check Google Account activity
- Enable security alerts
- Review active sessions periodically

### 🔒 What Cookies Contain

Cookies.txt typically includes:
- `__Secure-3PSID` - Session identifier
- `__Secure-3PAPISID` - API session identifier  
- `LOGIN_INFO` - Login state information
- Other YouTube-specific session tokens

These are **session tokens**, not passwords, but they can still be used to access your account.

### 🛡️ Mitigation Strategies

1. **Use a dedicated account** - Limits exposure
2. **Regular rotation** - Reduces window of vulnerability
3. **Secure storage** - Only on deployment platform, never in Git
4. **Monitor access** - Check account activity regularly
5. **Platform security** - Use reputable hosting services with good security

## Testing

After setup, test the service:

```bash
curl -X POST https://your-service-url/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

If cookies are working, you should no longer see bot detection errors.

## Alternative: Without Cookies

The service will automatically try multiple YouTube player clients (web, ios, android) which often works without cookies. Cookies are only needed if you consistently get bot detection errors.
