# LUHEGA Mobile App

A comprehensive inventory and sales management mobile application built with React Native and Expo.

## Features

- **Inventory Management**: Track spare parts, products, and stock levels
- **Sales Processing**: Handle cash and debit sales with real-time updates
- **Customer Management**: Manage customer information and track debts
- **Reports & Analytics**: View sales reports, debt tracking, and low stock alerts
- **Role-Based Access**: Admin and Staff roles with different permissions
- **Offline Support**: Works offline with automatic sync when online
- **Barcode Scanning**: Quick product lookup using barcode scanning

## Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router
- **Backend**: Supabase (PostgreSQL database)
- **State Management**: React Context API
- **Offline Storage**: SQLite (via expo-sqlite)
- **UI Components**: React Native with Material Icons

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo Go app on your mobile device

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (optional):
   - Create a `.env` file in the root directory
   - Add your Supabase credentials (see `ENV_SETUP.md` for details)

4. Start the development server:
   ```bash
   npm start
   ```

5. Scan the QR code with Expo Go app on your device

## Project Structure

```
├── app/                    # Expo Router screens
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Main tab navigation screens
│   ├── admin/             # Admin-only screens
│   └── ...
├── src/
│   ├── context/           # React Context providers
│   ├── services/          # API and business logic
│   ├── utils/             # Utility functions
│   └── lib/               # Database and Supabase setup
└── ...
```

## Environment Variables

The app uses environment variables for Supabase configuration. See `ENV_SETUP.md` for detailed setup instructions.

## License

Private - All rights reserved

