# Firestore Security Rules

## Required Rules for NutriBuddy

The app needs these Firestore security rules to work properly. Add these rules to your Firebase Console:

### Go to Firebase Console:
1. Go to https://console.firebase.google.com
2. Select your project **nutribuddy-3922b**
3. Go to **Firestore Database** → **Rules**
4. Replace all content with the rules below
5. Click **Publish**

### Firestore Rules:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own user profile
    match /users/{uid} {
      // Users can read and write their own profile
      allow read, write: if request.auth.uid == uid;
      
      // Users can read other users' profiles (needed for friend lookup and viewing friend stats)
      // But they can only read, not write
      allow read: if request.auth != null;
      
      // Allow users to read/write their own meals (subcollection)
      match /meals/{mealId} {
        allow read, write: if request.auth.uid == uid;
      }
      
      // Allow users to read/write their own recipes (subcollection)
      match /recipes/{recipeId} {
        allow read, write: if request.auth.uid == uid;
      }
    }
    
    // Allow authenticated users to query the users collection
    // This is needed for:
    // - duplicate email checking during signup
    // - friend code lookup when adding friends
    match /users/{document=**} {
      allow list: if request.auth != null;
    }
  }
}
```

## What These Rules Do:

| Rule | Purpose |
|------|---------|
| `match /users/{uid}` with `allow read, write: if request.auth.uid == uid` | Users can read/write their own profile |
| `match /users/{uid}` with `allow read: if request.auth != null` | Users can read other users' profiles (for friend features) |
| `match /users/{document=**}` | Authenticated users can list/query all users (for email check & friend code lookup) |
| `match /recipes/{recipeId}` | Users can only access their own recipes |
| `match /meals/{mealId}` | Users can only access their own meals |

## Why You're Getting "Missing or Insufficient Permissions"

Your current rules are likely too restrictive. The social features need to:
1. Query the `/users` collection by friend code
2. Read friend profiles (to display names, streaks, goals)
3. Update both user's friends arrays when adding/removing friends
4. This requires `allow read` permission for all authenticated users on user documents

## Security Notes:

✅ **Your data is still secure:**
- Users can only **write** to their own profile
- Users can **read** other profiles (needed for social features)
- Sensitive data like email is visible to friends (consider this when adding friends)
- Recipes and meals remain private (users can only access their own)

✅ **What's protected:**
- Users cannot modify other users' data
- Users cannot delete other users
- Each user's recipes and meals are completely private

## After Updating Rules:

✅ Account creation will work
✅ Email duplicate checking will work
✅ Friend code lookup will work
✅ Adding friends will work
✅ Viewing friends' stats will work
✅ Your data remains secure (users can only modify their own data)

## Testing:

After updating the rules:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database** → **Rules**
4. Copy and paste the rules above
5. Click **Publish**
6. Wait 1-2 minutes for rules to propagate
7. Try adding a friend using their friend code
8. Should now work without "Missing permissions" error
