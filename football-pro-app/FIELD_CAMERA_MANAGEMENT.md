# Field Camera Management Feature

## Overview
The Field Camera Management feature allows administrators to manage cameras for each field in the Football Pro application. This feature provides full CRUD (Create, Read, Update, Delete) operations for field cameras through the admin dashboard.

## Features

### Camera Management
- **Add Cameras**: Add new cameras to any field with detailed configuration
- **Edit Cameras**: Modify existing camera settings and credentials
- **Delete Cameras**: Remove cameras from fields with confirmation
- **View Cameras**: Display all cameras for a specific field in a table format

### Camera Configuration
Each camera can be configured with the following properties:
- **Camera Name**: A descriptive name for the camera (max 100 characters)
- **Camera Model**: The model/manufacturer of the camera (max 100 characters)
- **IP Address**: IPv4 or IPv6 address, or hostname of the camera
- **Port**: Network port for camera communication (default: 8000)
- **Username**: Authentication username (max 50 characters)
- **Password**: Authentication password (max 255 characters)

## How to Use

### Accessing Camera Management
1. Navigate to the Admin Dashboard
2. Click on the "Clubs" tab
3. Expand any club to view its fields
4. Click the camera icon (📹) next to any field to open camera management

### Adding a New Camera
1. Open camera management for a field
2. Click "Add Camera" button
3. Fill in the camera details:
   - Camera Name (required)
   - Camera Model (required)
   - IP Address (required, must be valid IPv4, IPv6, or hostname)
   - Username (required)
   - Password (required)
   - Port (optional, defaults to 8000)
4. Click "Create Camera"

### Editing a Camera
1. In the camera management view, click the edit icon (✏️) next to any camera
2. Modify the desired fields
3. Click "Update Camera"

### Deleting a Camera
1. In the camera management view, click the delete icon (🗑️) next to any camera
2. Confirm the deletion in the confirmation dialog
3. Click "Delete Camera"

## Technical Implementation

### Backend API
The feature integrates with the backend API endpoint: `/api/field-cameras`

#### API Endpoints:
- `GET /api/field-cameras/field/{fieldId}` - Get all cameras for a field
- `GET /api/field-cameras/{id}` - Get a specific camera
- `POST /api/field-cameras` - Create a new camera
- `PUT /api/field-cameras/{id}` - Update an existing camera
- `DELETE /api/field-cameras/{id}` - Delete a camera

### Frontend Components
- **FieldCameraService**: Service for API communication
- **FieldCameraManagementComponent**: Main component for camera management
- **ClubManagementComponent**: Updated to include camera management integration

### Data Models
```typescript
interface FieldCameraDto {
  fieldId: number;
  cameraName: string;
  cameraModel: string;
  ipAddress: string;
  username: string;
  password: string;
  port?: number;
}

interface FieldCameraResponseDto {
  id: number;
  fieldId: number;
  cameraName: string;
  cameraModel: string;
  ipAddress: string;
  username: string;
  password: string;
  port: number;
  createdAt: string;
  updatedAt: string;
}
```

## Validation Rules
- **Camera Name**: Required, max 100 characters
- **Camera Model**: Required, max 100 characters
- **IP Address**: Required, must be valid IPv4, IPv6, or hostname format
- **Username**: Required, max 50 characters
- **Password**: Required, max 255 characters
- **Port**: Required, must be between 1 and 65535

## UI/UX Features
- Modern, responsive design matching the application theme
- Real-time form validation with error messages
- Loading states and success/error notifications
- Confirmation dialogs for destructive actions
- Empty state handling when no cameras exist
- Mobile-responsive layout

## Security Considerations
- Passwords are masked in the UI but stored as plain text (backend should handle encryption)
- IP address validation prevents invalid network configurations
- Port validation ensures valid network port numbers
- All API calls are authenticated through the existing auth interceptor

## Future Enhancements
- Camera status monitoring (online/offline)
- Camera preview/stream integration
- Bulk camera operations
- Camera configuration templates
- Advanced network configuration options 