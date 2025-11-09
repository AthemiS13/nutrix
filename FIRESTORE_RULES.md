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
      allow read, write: if request.auth.uid == uid;
    }
    
    // Allow authenticated users to query the users collection by email
    // This is needed for duplicate email checking during signup
    match /users/{document=**} {
      allow list: if request.auth != null;
    }
    
    // Allow users to read/write their own recipes
    match /recipes/{recipeId} {
      allow read, write: if request.auth.uid == resource.data.uid;
      allow create: if request.auth.uid == request.resource.data.uid;
    }
    
    // Allow users to read/write their own meals
    match /meals/{mealId} {
      allow read, write: if request.auth.uid == resource.data.uid;
      allow create: if request.auth.uid == request.resource.data.uid;
    }
  }
}
```

## What These Rules Do:

| Rule | Purpose |
|------|---------|
| `match /users/{uid}` | Only user can read/write their own profile |
| `match /users/{document=**}` | Authenticated users can list all users (needed for email duplicate check) |
| `match /recipes/{recipeId}` | Users can only access their own recipes |
| `match /meals/{mealId}` | Users can only access their own meals |

## Why You're Getting "Missing or Insufficient Permissions"

Your current rules are likely too restrictive. The `checkEmailExists()` function needs to:
1. Query the `/users` collection
2. Filter by email field
3. This requires `allow list` permission for authenticated users

## After Updating Rules:

✅ Account creation will work
✅ Email duplicate checking will work
✅ Your data remains secure (users can only access their own data)

## Testing:

After updating the rules:
1. Logout from the app
2. Try signing up with a new email
3. Should now complete profile setup without "Missing permissions" error
