# Admin Features Documentation

## Overview

The Football Pro application now includes a comprehensive admin panel that allows administrators to manage various aspects of the system. This document outlines the implemented admin features and how to use them.

## Access Control

### Admin Authentication
- Only users with `ADMIN` role can access the admin panel
- Admin users are automatically redirected to `/admin` after login
- Non-admin users are redirected to the regular home page
- Admin routes are protected by `AdminGuard`

### Admin Navigation
- Admin users see an "Admin Panel" button in the header
- The button is only visible to authenticated users with ADMIN role
- Clicking the button navigates to `/admin`

## Admin Dashboard

### Features
- **Modern Dark Theme**: Consistent with the main application design
- **Tabbed Navigation**: Easy switching between different management sections
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **User Information Display**: Shows current admin user details
- **Logout Functionality**: Secure logout with redirect to login page

### Navigation Tabs
1. **Clubs Management** - Full CRUD operations for football clubs with expandable fields view
2. **Users Management** - Full CRUD operations for user accounts



## Clubs Management

### Features
- **List View**: Display all clubs in a responsive data table
- **Create Club**: Add new clubs with comprehensive information
- **Edit Club**: Modify existing club information
- **Delete Club**: Remove clubs with confirmation
- **Real-time Updates**: Changes reflect immediately in the UI
- **Error Handling**: User-friendly error messages
- **Loading States**: Visual feedback during operations

### Club Properties
- **Name**: Club name (required, min 2 characters)
- **Description**: Club description (optional)
- **Founded Year**: Year the club was founded (optional, 1800-current year)
- **Address**: Club's address (optional, min 5 characters)
- **City**: Club's city (optional, min 2 characters)
- **Country**: Club's country (optional, min 2 characters)
- **Created/Updated Timestamps**: Automatic tracking

### Club Fields Management
- **Expandable View**: Click on any club name to expand and view its fields
- **Field Properties**:
  - **Name**: Field name (required, min 2 characters)
  - **Sports**: Multiple sports selection (required, at least 1 sport)
  - **Created/Updated Timestamps**: Automatic tracking
- **CRUD Operations**: Full Create, Read, Update, Delete functionality for fields
- **Real-time Updates**: Fields list updates immediately after operations

### API Integration
The clubs management integrates with the following Spring Boot endpoints:

- `GET /api/clubs` - Retrieve all clubs
- `GET /api/clubs/{id}` - Get specific club
- `POST /api/clubs` - Create new club (ADMIN only)
- `PUT /api/clubs/{id}` - Update club (ADMIN only)
- `DELETE /api/clubs/{id}` - Delete club (ADMIN only)

**Club Fields Integration:**
- `GET /api/club-fields/{clubId}` - Retrieve all fields for a specific club
- `POST /api/club-fields/create-with-field` - Create new field for a club (ADMIN only)
- `PUT /api/club-fields/{clubId}/{fieldId}` - Update field for a club (ADMIN only)
- `DELETE /api/club-fields/{clubId}/{fieldId}` - Delete field from a club (ADMIN only)

## Users Management

### Features
- **List View**: Display all users in a responsive data table
- **Create User**: Add new users with comprehensive information
- **Edit User**: Modify existing user information
- **Delete User**: Remove users with confirmation
- **Real-time Updates**: Changes reflect immediately in the UI
- **Error Handling**: User-friendly error messages
- **Loading States**: Visual feedback during operations

### User Properties
- **Username**: Unique username (required, min 3 characters, max 50)
- **Password**: Secure password (required, min 6 characters, max 120)
- **Email**: Valid email address (required, max 50 characters)
- **First Name**: User's first name (required, max 100 characters)
- **Last Name**: User's last name (required, max 100 characters)
- **Role**: User role (USER or ADMIN)
- **Created/Updated Timestamps**: Automatic tracking

### API Integration
The users management integrates with the following Spring Boot endpoints:

- `GET /api/users` - Retrieve all users
- `GET /api/users/{id}` - Get specific user
- `POST /api/users` - Create new user (ADMIN only)
- `PUT /api/users/{id}` - Update user (ADMIN only)
- `DELETE /api/users/{id}` - Delete user (ADMIN only)

## Technical Implementation

### Components
- `AdminDashboardComponent` - Main admin interface
- `ClubManagementComponent` - Clubs CRUD operations
- `UserManagementComponent` - Users CRUD operations
- `AdminGuard` - Route protection for admin routes

### Services
- `ClubService` - API communication for clubs
- `ClubFieldService` - API communication for club fields
- `UserService` - API communication for users
- `SportService` - API communication for sports
- `AuthService` - User authentication and role checking

### Guards
- `AdminGuard` - Protects admin routes by checking user role

### Routing
- `/admin` - Admin dashboard (protected by AdminGuard)

## Security Features

### Role-Based Access Control
- Admin routes are protected by `AdminGuard`
- Only users with `ADMIN` role can access admin features
- Automatic redirect for unauthorized users

### API Security
- All admin API calls require authentication
- JWT tokens are automatically included in requests
- Server-side role validation on protected endpoints

## User Experience

### Design Principles
- **Consistency**: Matches the main application's dark theme
- **Accessibility**: Proper focus states and keyboard navigation
- **Responsiveness**: Works on all device sizes
- **Feedback**: Clear loading states and success/error messages

### Modal Forms
- **Create/Edit Modals**: Clean, validated forms for field management
- **Delete Confirmation**: Clear warning before deletion
- **Form Validation**: Real-time validation with helpful error messages

### Data Table
- **Sortable Columns**: Easy data organization
- **Status Indicators**: Visual availability status
- **Action Buttons**: Quick edit/delete operations
- **Empty States**: Helpful guidance when no data exists

## Future Enhancements

### Planned Features
1. **Users Management**
   - User account administration
   - Role management
   - User statistics

2. **Sports Management**
   - Sport category management
   - Sport-specific field requirements
   - Sport statistics

3. **Advanced Features**
   - Bulk operations
   - Data export/import
   - Advanced filtering and search
   - Audit logs

## Usage Instructions

### For Administrators
1. **Login**: Use admin credentials to log in
2. **Access Admin Panel**: Click "Admin Panel" in header or navigate to `/admin`
3. **Manage Fields**: Use the Fields tab to perform CRUD operations
4. **Navigation**: Switch between tabs for different management areas

### For Developers
1. **Add New Admin Features**: Create new components and add to admin dashboard
2. **Extend API**: Add new endpoints and corresponding services
3. **Update Guards**: Modify AdminGuard for new role requirements
4. **Styling**: Follow the established dark theme patterns

## Troubleshooting

### Common Issues
1. **Access Denied**: Ensure user has ADMIN role
2. **API Errors**: Check network connectivity and server status
3. **Form Validation**: Ensure all required fields are completed
4. **Loading Issues**: Check browser console for JavaScript errors

### Debug Information
- Check browser developer tools for network requests
- Verify JWT token is valid and not expired
- Confirm user role is correctly set in localStorage
- Review server logs for API errors 