# Adding Display Names and Friend Codes to Existing Users

## Overview
If you have existing users in your Firebase database who registered before the social features were added, they will be missing:
- Display name (`displayName`)
- Friend code (`friendCode`)
- Friends array (`friends`)

This guide shows you how to manually add these fields to existing users.

---

## Method 1: Using Firebase Console (Recommended for Small Number of Users)

### Step 1: Open Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** in the left sidebar
4. Click on the **users** collection

### Step 2: Edit Each User Document
For each user document:

1. Click on the user's document (identified by their UID)
2. Click **"Add field"** or edit existing fields
3. Add/update the following fields:

#### Required Fields to Add:

| Field Name | Type | Value | Example |
|------------|------|-------|---------|
| `displayName` | string | User's preferred name | "John Doe" |
| `friendCode` | string | 6-character unique code (uppercase alphanumeric) | "ABC123" |
| `friends` | array | Empty array initially | [] |

#### Important Notes:
- **Friend Code Rules:**
  - Must be exactly 6 characters
  - Use only A-Z and 0-9 (uppercase letters and numbers)
  - Must be unique across all users
  - Examples: `ABC123`, `XYZ789`, `QWE456`
  
- **Display Name:**
  - Any name the user prefers
  - Will be visible to their friends
  - Can contain spaces and special characters

### Step 3: Verify Changes
1. Check that all three fields are present
2. Verify friend codes are unique (no duplicates)
3. Test login to ensure the app loads correctly

---

## Method 2: Using Firebase Admin SDK (For Multiple Users)

If you have many users, you can use a script to update them all at once.

### Step 1: Create an Admin Script

Create a file called `update-existing-users.js` in your project root:

```javascript
// update-existing-users.js
const admin = require('firebase-admin');
const serviceAccount = require('./path-to-your-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Generate unique friend code
function generateFriendCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Check if friend code exists
async function checkFriendCodeExists(code) {
  const snapshot = await db.collection('users')
    .where('friendCode', '==', code)
    .get();
  return !snapshot.empty;
}

// Generate unique friend code
async function generateUniqueFriendCode() {
  let code = generateFriendCode();
  let attempts = 0;
  
  while (await checkFriendCodeExists(code) && attempts < 10) {
    code = generateFriendCode();
    attempts++;
  }
  
  return code;
}

// Update all users
async function updateExistingUsers() {
  try {
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} users to update`);
    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const updates = {};
      
      // Add displayName if missing (use email prefix as default)
      if (!userData.displayName) {
        const emailPrefix = userData.email.split('@')[0];
        updates.displayName = emailPrefix;
        console.log(`Setting displayName for ${userData.email}: ${emailPrefix}`);
      }
      
      // Add friendCode if missing
      if (!userData.friendCode) {
        const friendCode = await generateUniqueFriendCode();
        updates.friendCode = friendCode;
        console.log(`Setting friendCode for ${userData.email}: ${friendCode}`);
      }
      
      // Add friends array if missing
      if (!userData.friends) {
        updates.friends = [];
        console.log(`Adding friends array for ${userData.email}`);
      }
      
      // Update the document if there are changes
      if (Object.keys(updates).length > 0) {
        await db.collection('users').doc(doc.id).update({
          ...updates,
          updatedAt: new Date().toISOString()
        });
        console.log(`✓ Updated user: ${userData.email}`);
      } else {
        console.log(`- User already has all fields: ${userData.email}`);
      }
    }
    
    console.log('\n✓ All users updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating users:', error);
    process.exit(1);
  }
}

// Run the update
updateExistingUsers();
```

### Step 2: Get Firebase Admin SDK Key

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click **"Generate New Private Key"**
3. Save the JSON file in your project (e.g., `service-account-key.json`)
4. **IMPORTANT:** Add this file to `.gitignore` to keep it secure!

### Step 3: Install Firebase Admin SDK

```bash
npm install firebase-admin
```

### Step 4: Run the Script

```bash
node update-existing-users.js
```

### Step 5: Verify Updates
- Check Firebase Console to confirm all users now have the new fields
- Test the app with an existing user account

---

## Method 3: Using Firestore Import/Export (For Advanced Users)

1. Export your Firestore data
2. Modify the JSON to add the required fields
3. Import back to Firestore

This method is more complex but useful for very large datasets.

---

## Verification Checklist

After updating users, verify:
- [ ] All users have `displayName` field
- [ ] All users have `friendCode` field (6 characters, uppercase alphanumeric)
- [ ] All users have `friends` array (can be empty: `[]`)
- [ ] All friend codes are unique (no duplicates)
- [ ] Existing users can log in successfully
- [ ] Existing users can see their friend code in Settings
- [ ] Existing users can add new friends using friend codes

---

## Example Firebase Document Structure

After update, each user document should look like this:

```json
{
  "uid": "user123abc",
  "email": "user@example.com",
  "displayName": "John Doe",
  "friendCode": "ABC123",
  "friends": [],
  "bodyWeight": 75,
  "dailyCalorieGoal": 2000,
  "dailyProteinGoal": 150,
  "preferredUnit": "grams",
  "currentStreak": 5,
  "longestStreak": 10,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T12:30:00.000Z"
}
```

---

## Troubleshooting

### Users can't see their friend code
- Check that `friendCode` field exists in Firestore
- Verify the code is a string (not a number)
- Ensure it's exactly 6 characters

### Friend code collision errors
- Regenerate the conflicting code to be unique
- Use the script method to ensure uniqueness

### Display name not showing
- Verify `displayName` field exists
- Check it's not an empty string
- Users can update it in Settings if needed

---

## Important Security Notes

1. **Service Account Key:** Never commit your service account key to git
2. **Backups:** Always backup your Firestore data before bulk updates
3. **Testing:** Test the script on a development/staging database first
4. **Friend Codes:** Make sure they're truly unique to avoid conflicts

---

## Support

If users report issues after the update:
1. Verify all three fields exist in their Firestore document
2. Check the friend code format (6 chars, alphanumeric, uppercase)
3. Users can update their display name in Settings anytime
4. Friend codes are permanent and cannot be changed by users
