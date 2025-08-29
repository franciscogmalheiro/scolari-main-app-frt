# Football Pro - Angular Application

A modern, football-themed Angular application with JWT authentication and a beautiful dark UI design inspired by gaming platforms.

## Features

- **Modern UI Design**: Dark theme with gradient backgrounds and glassmorphism effects
- **JWT Authentication**: Secure login/register system with token management
- **Responsive Design**: Mobile-first approach with responsive layouts
- **Guest Mode**: Users can explore the app without logging in (with limited features)
- **Three Game Modes**:
  - **Score Game**: Track live scores and manage team statistics (available to all users)
  - **Record Game**: Capture gameplay highlights (requires authentication)
  - **Download Video**: Access recorded matches and download videos (requires authentication)

## Technology Stack

- **Angular 16**: Frontend framework
- **TypeScript**: Programming language
- **SCSS**: Styling with advanced CSS features
- **JWT**: Authentication tokens
- **Responsive Design**: Mobile-first approach
- **Modern CSS**: Grid, Flexbox, CSS Variables, and animations

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── login/          # Login/Register component
│   │   ├── home/           # Main dashboard
│   │   ├── header/         # Navigation header
│   │   └── game-card/      # Reusable game mode cards
│   ├── services/
│   │   └── auth.service.ts # Authentication service
│   ├── guards/
│   │   └── auth.guard.ts   # Route protection
│   └── app-routing.module.ts
├── assets/
└── styles.scss            # Global styles
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v8 or higher)
- Angular CLI (v16)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd football-pro-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
ng serve
```

4. Open your browser and navigate to `http://localhost:4200`

### Build for Production

```bash
ng build --configuration production
```

## Usage

### Authentication

- **Login**: Use any email and password (minimum 6 characters) for demo purposes
- **Register**: Create a new account with name, email, and password
- **Guest Mode**: Click "Continue as Guest" to explore without authentication

### Game Modes

1. **Score Game**: Available to all users, no authentication required
2. **Record Game**: Requires login, shows lock overlay for guests
3. **Download Video**: Requires login, shows lock overlay for guests

## Design Features

- **Dark Theme**: Modern dark color scheme with purple/blue gradients
- **Glassmorphism**: Translucent elements with backdrop blur effects
- **Animations**: Smooth hover effects and transitions
- **Responsive**: Works on desktop, tablet, and mobile devices
- **Accessibility**: Proper focus states and keyboard navigation

## Customization

### Colors
The app uses CSS custom properties for easy color customization. Main colors:
- Primary: `#00ff88` (Green)
- Secondary: `#00ccff` (Blue)
- Background: Dark gradients
- Text: White and gray variations

### Styling
- Global styles in `src/styles.scss`
- Component-specific styles in respective `.scss` files
- Responsive breakpoints: 768px, 480px

## Development

### Adding New Components

```bash
ng generate component components/new-component
```

### Adding New Services

```bash
ng generate service services/new-service
```

### Code Style

- Follow Angular style guide
- Use TypeScript strict mode
- Implement proper error handling
- Add comments for complex logic

## Security Notes

- This is a demo application with mock authentication
- In production, implement proper backend authentication
- JWT tokens are stored in localStorage (consider httpOnly cookies for production)
- Add proper input validation and sanitization

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.
