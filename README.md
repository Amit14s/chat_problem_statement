
# Real-Time Communication Platform

A full-stack real-time communication platform built using the MERN stack and Socket.IO.

## Tech Stack

- Frontend: React.js
- Backend: Node.js, Express.js
- Database: MongoDB, Mongoose
- Real-time Communication: Socket.IO
- Authentication: JWT
- Password Security: bcryptjs

## Backend Setup
  as this has many feature as my previous backend project i just used that code 
```bash
git clone YOUR_REPOSITORY_URL
cd backend
npm install
```

Create a `.env` file using `.env.example`.

Start the development server:

```bash
npm run dev
```

Backend runs at http://localhost:5000.

## Environment Variables

- PORT: Backend port
- MONGO_URI: MongoDB connection string
- SECRET: JWT secret key
- FRONTEND_URL: Frontend URL


## Authentication & User Management

Authentication is implemented using JWT and bcryptjs.

### Features

- User registration using username, email and password.
- Secure password hashing using bcryptjs.
- User login with JWT authentication.
- HTTP-only cookie-based sessions.
- Bearer token authentication.
- Protected REST APIs.
- User search and profile retrieval.
- Profile updates.
- Logout functionality.
- Existing OTP authentication support.

### Authentication APIs

| Method | Endpoint | Description |
|---|---|---|
| POST | /auth/register | Register user |
| POST | /auth/login | Login user |
| POST | /auth/logout | Logout user |
| GET | /auth/check-auth | Verify session |
| GET | /auth/users | Get users |
| GET | /auth/search-user | Search users |
| PUT | /auth/update-profile | Update profile |

### Password Security

Passwords are hashed using bcryptjs with 10 salt rounds.

JWT tokens are signed using the SECRET environment variable and expire after 7 days.

## Database Design

MongoDB is used for persistent storage with Mongoose schemas.

### User Collection

Stores user information including:
- Username and email
- Hashed password
- Profile picture and about
- Online/offline status
- Last seen timestamp

### Conversation Collection

Supports private and group conversations.

Fields:
- participants
- type (private/group)
- groupName
- groupImage
- admins
- createdBy
- lastMessage
- unreadCount
- unreadCounts

### Message Collection

Stores individual messages.

Fields:
- sender
- receiver
- conversation
- clientMessageId
- content
- imageOrVideoUrl
- contentType
- messageStatus
- reactions
- isEdited
- isDeleted
- createdAt
- updatedAt

### Database Optimization

- Indexed conversation participants.
- Indexed conversation message history.
- Unique sender/clientMessageId index for duplicate prevention.
- Mongoose references for related documents.
- Timestamps enabled for conversations and messages.

### Message Status

Messages support:
- send
- sent
- delivered
- read

### Message Reactions

Reactions are embedded inside the message document and contain the reacting user's ID and emoji.
