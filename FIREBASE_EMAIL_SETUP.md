# Firebase Email Setup Guide

## Problem: Password Reset Emails Not Arriving

If users are not receiving password reset emails, follow these steps to configure Firebase properly.

## Solution Steps

### Step 1: Enable Email/Password Authentication

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Authentication** > **Sign-in method** (left sidebar)
4. Click on **Email/Password**
5. Enable both:
   - ✅ **Email/Password** (toggle ON)
   - ✅ **Email link (passwordless sign-in)** (toggle ON)
6. Click **Save**

### Step 2: Configure Email Templates

1. In Firebase Console, go to **Authentication** > **Templates** (left sidebar)
2. Look for **Password reset** template
3. Make sure it's configured:
   - **Subject**: Should have a subject line
   - **From name**: Should show your app name
   - **Reply-to address**: Configure if needed
4. If templates look incomplete, Firebase might be using defaults - this is OK

### Step 3: Set Custom Domain (Important for Production)

For emails to arrive reliably:

1. Go to **Authentication** > **Templates**
2. Look for the **Sender email address** at the top
3. It should show: `noreply@[YOUR-PROJECT-ID].firebaseapp.com`
4. For production, consider setting up a custom email domain:
   - Go to **Settings** > **Authentication** (gear icon at top)
   - Under **Authorized domains**, add your domain
   - Follow Firebase's guide to add DNS records

### Step 4: Check Email Verification Settings

1. Go to **Authentication** > **Settings**
2. Under **User account linking**, ensure settings are correct
3. No special config needed for password reset to work

### Step 5: Test Password Reset

1. **Locally (Development)**:
   - Create a test account with your own email
   - Click "Forgot password?"
   - Check:
     - Gmail: Check Spam/Promotions folder
     - Other: Check Spam folder first
   - Wait 2-3 minutes for email to arrive

2. **Production**:
   - Same process but on your deployed site
   - Emails should arrive faster from production domain

## Troubleshooting

### Email Still Not Arriving?

**Check 1: Verify Email Configuration**
- Open Firebase Console
- Authentication > Templates
- Confirm password reset template exists

**Check 2: Check Email Limits**
- Firebase has rate limits (100 emails per hour per user)
- If you've tested many times, wait before retrying

**Check 3: Verify Account Exists**
- The error message in the app should say if email not found
- Make sure you're using the exact email the account was created with

**Check 4: Check Spam/Promotions**
- Gmail: Check all tabs (Primary, Social, Promotions, Updates)
- Other email providers: Check spam/junk folders
- The sender will be: `noreply@[PROJECT-ID].firebaseapp.com`

**Check 5: Check Firebase Quotas**
- Go to Firebase Console > Settings > Usage & quotas
- Verify you haven't hit any limits

### Still Not Working?

**Option 1: Use Firebase Test Email**
```typescript
// In Firebase Console, go to Authentication > Settings
// Copy the test email address shown there
// Firebase sends test emails to verify configuration
```

**Option 2: Enable Email Provider in Firebase**
- Go to Authentication > Sign-in method
- Under "Additional providers", check if any email providers are disabled
- Make sure Email/Password is fully enabled

**Option 3: Check Code Configuration**
- Verify `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` environment variable is set correctly
- It should match your Firebase auth domain exactly

## Common Firebase Auth Domains

Your auth domain should look like one of these:
- `yourproject.firebaseapp.com`
- `yourproject.auth0.com` (if using Auth0)
- Your custom domain (if configured)

## Email Content Customization

To customize the password reset email:

1. Firebase Console > Authentication > Templates
2. Click on **Password reset** template
3. Customize:
   - Subject line
   - Email body (use `%LINK%` placeholder for reset link)
   - From name
4. Click **Save**

## Security Notes

- ✅ Password reset links expire after 1 hour
- ✅ Links are one-time use
- ✅ Users can only reset their own password
- ✅ Email verification prevents unauthorized password resets

## Production Deployment Checklist

Before going live:

- [ ] Firebase Email/Password auth enabled
- [ ] Email templates reviewed and customized
- [ ] Sender email address configured
- [ ] Custom domain (optional but recommended)
- [ ] DNS records added for custom domain
- [ ] Test password reset on production domain
- [ ] Monitor email delivery in Firebase Analytics

## Support

If emails still don't arrive after following all steps:

1. Check [Firebase Status](https://status.firebase.google.com)
2. Check [Firebase Pricing & Quotas](https://firebase.google.com/quotas)
3. Review app logs for any error codes
4. Consider implementing alternative: email backup (Resend, SendGrid, etc.)

