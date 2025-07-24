# Spring Boot Authentication Integration

This document describes the integration of the Angular Football Pro app with a Spring Boot authentication service.

## Changes Made

### 1. Updated AuthService (`src/app/services/auth.service.ts`)

- **New Interfaces**: Added `LoginRequest`, `RegisterRequest`, and `AuthResponse` interfaces to match Spring Boot API
- **Updated User Interface**: Changed from simple `{id, email, name}` to `{id, username, email, firstName, lastName, role}`
- **Real HTTP Calls**: Replaced mock login/register methods with actual HTTP requests to Spring Boot endpoints
- **JWT Token Handling**: Added proper JWT token decoding and validation
- **Error Handling**: Added try-catch blocks for HTTP request error handling

### 2. Updated LoginComponent (`src/app/components/login/login.component.ts`)

- **Form Fields**: Changed login form to use `username` instead of `email`
- **Registration Form**: Added `firstName` and `lastName` fields to match Spring Boot API
- **Method Calls**: Updated to pass correct parameters to auth service methods

### 3. Updated Login Template (`src/app/components/login/login.component.html`)

- **Login Form**: Changed email field to username field
- **Registration Form**: Added separate firstName and lastName input fields
- **Validation Messages**: Updated error messages to match new field requirements

### 4. Updated Header Component (`src/app/components/header/header.component.html`)

- **User Display**: Changed from `currentUser?.name` to `currentUser?.firstName` to match new User interface

### 5. Added HTTP Interceptor (`src/app/services/auth.interceptor.ts`)

- **Automatic Auth Headers**: Automatically adds Bearer token to HTTP requests when user is authenticated
- **Token Management**: Uses the stored JWT token from localStorage

### 6. Updated App Module (`src/app/app.module.ts`)

- **HttpClientModule**: Added for HTTP requests
- **AuthInterceptor**: Registered the interceptor to automatically handle authentication headers

## Spring Boot API Endpoints

### Login (POST /auth/signin)
```json
{
  "username": "testuser",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "type": "Bearer",
  "id": 3,
  "username": "testuser",
  "email": "test@example.com",
  "firstName": "Test",
  "lastName": "User",
  "role": "USER"
}
```

### Registration (POST /auth/signup)
```json
{
  "username": "john_doe",
  "email": "john.doe@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:** 200 OK with text message

## Configuration

- **API Base URL**: Set to `http://localhost:8080` in AuthService
- **CORS**: Ensure your Spring Boot service allows requests from `http://localhost:4200` (Angular dev server)
- **Token Storage**: JWT tokens are stored in localStorage with key `football_pro_token`

## Usage

1. Start your Spring Boot service on port 8080
2. Start the Angular app with `ng serve`
3. Navigate to the login page
4. Use the new username-based login or registration forms
5. The app will automatically handle JWT tokens and authentication headers

## Security Notes

- JWT tokens are validated for expiration on each authentication check
- Tokens are automatically included in HTTP requests via the interceptor
- The app handles token expiration gracefully by redirecting to login 