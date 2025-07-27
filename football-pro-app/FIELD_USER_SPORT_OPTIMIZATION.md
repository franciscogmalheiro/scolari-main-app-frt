# FIELD User Sport Optimization

## Overview
This feature optimizes the user experience for users with "FIELD" role by automatically detecting available sports for their assigned field and skipping the game setup screen when only one sport is available. Sports data is loaded once during login and stored in the AuthService, similar to how JWT tokens are handled.

## How It Works

### For FIELD Users
1. **During Login**: When a FIELD user logs in, the system automatically fetches their field's sports data
2. **Data Storage**: Sports data is stored in the user object within the AuthService (similar to JWT token storage)
3. **Game Navigation**: When clicking "Score Game" or "Record Game":
   - If only one sport is available, the user is taken directly to the game screen (skipping game setup)
   - If multiple sports are available, the user goes through the normal game setup flow
4. **Persistence**: Sports data persists across page refreshes and navigation

### For Other Users
- Regular users (USER, CLUB, ADMIN roles) continue to use the normal game setup flow
- Users without a `fieldId` also use the normal game setup flow

## Implementation Details

### Modified Services
- **AuthService** - Added sports data loading during login and storage in user object
- **HomeComponent** - Uses sports data from AuthService for navigation decisions

### New Interfaces
- `Sport` - Interface for sport data with id, code, and name
- `User` - Extended with optional `fieldSports` property

### New Methods in AuthService
- `loadFieldSports(fieldId: number)` - Private method to fetch sports from API
- `getFieldSports()` - Public method to get current user's field sports
- `refreshFieldSports()` - Public method to manually refresh sports data

### API Endpoints
- `GET /api/field-sports/field/{fieldId}/sports` - Returns available sports for a specific field

## Benefits

1. **Single API Call**: Sports data is fetched only once during login
2. **Persistent Storage**: Data persists across page refreshes and navigation
3. **Fast Navigation**: No API calls when clicking game cards
4. **Clean Architecture**: Sports data is managed at the authentication level
5. **Reduced Server Load**: Eliminates repeated API calls for the same data
6. **Maintained Flexibility**: Users with multiple sports still get the choice they need
7. **Backward Compatibility**: All existing functionality remains unchanged

## Error Handling

- If sports loading fails during login, the user can still use the app normally
- Falls back to game setup screen if no sports data is available
- Console logging for debugging purposes
- Users are not blocked if there are network issues during login

## Data Flow

1. **Login**: User logs in → AuthService fetches sports data → Stores in user object
2. **Navigation**: User clicks game card → HomeComponent checks sports from AuthService → Direct navigation or game setup
3. **Persistence**: Sports data survives page refreshes via localStorage (same as JWT token)

## Testing

To test this feature:

1. **Single Sport Field**: Create a FIELD user with a field that has only one sport
2. **Multiple Sports Field**: Create a FIELD user with a field that has multiple sports
3. **Non-FIELD User**: Test with regular users to ensure they still use game setup
4. **Login Flow**: Verify sports data is loaded during login
5. **Persistence**: Test that sports data persists after page refresh
6. **API Error**: Test with network issues during login to ensure graceful fallback

## Console Logging

The feature includes detailed console logging for debugging:
- Sports data loading during login
- Field sports retrieval from AuthService
- Navigation decisions (skip setup vs go to setup)
- Query parameters being passed to game screens

## Manual Refresh

If needed, sports data can be manually refreshed using:
```typescript
this.authService.refreshFieldSports();
```

This is useful for cases where field sports might change during a session. 