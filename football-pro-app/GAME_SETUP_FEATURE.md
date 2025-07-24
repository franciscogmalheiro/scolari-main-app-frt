# Game Setup Feature

## Overview
The Game Setup feature introduces a new screen that allows users to select a field and sport before starting a game. This screen appears when users click on "Score Game" or "Record Game" buttons from the home page.

## Features

### Field Selection
- Displays a list of available fields from the backend API endpoint `/api/fields`
- Each field shows:
  - Field name
  - Field address
  - Visual selection indicator
- Fields are displayed in a responsive grid layout
- Loading states are handled with spinners

### Sport Selection
- After selecting a field, users can choose from available sports
- Sports are fetched from `/api/field/{fieldId}/sports`
- Each sport shows:
  - Sport name
  - Sport code
  - Appropriate icon (⚽ for football/futsal, 🏃 for other sports)
- Sports are displayed in a responsive grid layout
- Loading states are handled with spinners

### Navigation Flow
1. User clicks "Score Game" or "Record Game" on home page
2. User is redirected to `/game-setup` with mode parameter
3. User selects a field (Step 1)
4. User selects a sport (Step 2)
5. User clicks "Continue" to proceed to the actual game screen
6. Selected field and sport data is passed as query parameters

## API Endpoints

### GET /api/fields
Returns a list of available fields:
```json
[
  {
    "id": 1,
    "name": "Arneiros",
    "address": "Campo Luis Batista. 2640-200",
    "matches": []
  }
]
```

### GET /api/field/{fieldId}/sports
Returns available sports for a specific field:
```json
[
  {
    "id": 1,
    "code": "FUTSAL",
    "name": "Futsal"
  },
  {
    "id": 2,
    "code": "FOOTBALL",
    "name": "Football"
  }
]
```

## Components

### GameSetupComponent
- Main component for the game setup screen
- Handles field and sport selection
- Manages loading states
- Handles navigation to game screens

### GameSetupService
- Service for API calls to fetch fields and sports
- Provides type-safe interfaces for Field and Sport
- Handles HTTP requests with proper error handling

## Styling
- Modern, responsive design with glassmorphism effects
- Gradient backgrounds and smooth animations
- Mobile-friendly layout
- Consistent with the existing app design

## Usage
The component automatically receives the game mode as a query parameter and passes the selected field and sport data to the next screen in the flow.

## Development Setup

### Proxy Configuration
The application uses a proxy configuration to redirect API calls from the Angular dev server (port 4200) to the backend server (port 8080).

- **Proxy File**: `proxy.conf.json`
- **Frontend**: Runs on `http://localhost:4200`
- **Backend**: Runs on `http://localhost:8080`
- **API Calls**: All `/api/*` requests are automatically proxied to the backend

### Running the Application
1. Start the backend server on port 8080
2. Run `ng serve` to start the Angular development server
3. The proxy will automatically redirect API calls to the backend

### Production Deployment
For production, ensure the backend API is accessible at the same domain as the frontend, or update the API base URLs accordingly. 