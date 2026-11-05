
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

## Private and Group Conversations

The application supports private and group conversations.

### Private Conversations

- Create one-to-one conversations.
- Prevent duplicate private conversations.
- Retrieve previous conversations.
- Display participant information.
- Maintain conversation timestamps.

### Group Conversations

- Create groups with multiple members.
- Automatically assign the creator as group admin.
- Add new members.
- Remove members.
- Retrieve group details.
- Display group participants and administrators.

### Group Authorization

- Only authenticated users can access group APIs.
- Only group members can view group details.
- Only group administrators can add members.
- Only administrators can remove other members.
- Members can leave groups themselves.
- Group creators cannot be removed.

### Conversation APIs

| Method | Endpoint | Description |
|---|---|---|
| POST | /conversations/create | Create private chat |
| GET | /conversations | List conversations |
| POST | /groups/create | Create group |
| GET | /groups | List groups |
| GET | /groups/:groupId | Group details |
| POST | /groups/:groupId/members | Add member |
| DELETE | /groups/:groupId/members/:memberId | Remove member |

## Real-Time Messaging APIs

### Messaging Features

- Send private and group messages.
- Store messages in MongoDB.
- Prevent duplicate messages using clientMessageId.
- Fetch message history with pagination.
- Edit sent messages.
- Delete messages.
- Add emoji reactions.
- Track message delivery and read status.
- Maintain last message information.
- Update unread message counts.

### Message Pagination

Messages are fetched using page and limit query parameters.

Example:

GET /chats/conversations/CONVERSATION_ID/messages?page=1&limit=30

Maximum page size: 50 messages.

### Message Status

Private messages support:
- Sent
- Delivered
- Read

Group messages maintain individual read receipts using readBy.

### Duplicate Message Prevention

Each message can contain a unique clientMessageId.

A MongoDB unique compound index prevents the same sender from storing duplicate messages with the same clientMessageId.

### Message Authorization

- Only conversation members can fetch messages.
- Only the original sender can edit a message.
- Only the original sender can delete a message.
- Only conversation members can add reactions.
- Message history is loaded in paginated batches.

## Real-Time Communication

Socket.IO is used for real-time messaging and user presence.

### Socket Features

- JWT-based socket authentication.
- Authorized conversation room joining.
- Real-time private and group message delivery.
- Online/offline presence tracking.
- Last-seen updates.
- Typing indicators.
- Message delivery receipts.
- Message read receipts.
- Offline message synchronization.
- Automatic conversation room joining after reconnection.

### Socket Security

Every socket connection is authenticated using JWT.

Users can only join conversations in which they are registered participants.

### Offline Message Handling

Messages are stored in MongoDB even when recipients are offline.

When a user reconnects, pending private messages are marked as delivered.

### Socket Events

| Event | Description |
|---|---|
| connected | Connection established |
| receive_message | New message received |
| user_online | User online |
| user_offline | User offline |
| typing | Typing started |
| stop_typing | Typing stopped |
| message_status_update | Delivery/read status updated |
| conversation_read | Mark messages as read |
| join_conversation | Join conversation room |
