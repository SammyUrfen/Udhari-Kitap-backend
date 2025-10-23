# Udhari Kitap API Reference

Base URL: `http://localhost:5000/api`

All authenticated endpoints require the `Authorization` header with a Bearer token.

---

## Authentication

### Register User
**POST** `/auth/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "profilePicture": null,
    "createdAt": "2025-10-23T10:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login
**POST** `/auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "profilePicture": "https://res.cloudinary.com/..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## Users

### Search Users by Email
**GET** `/users?email=user@example.com`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "users": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "profilePicture": "https://res.cloudinary.com/..."
    }
  ]
}
```

### Upload Profile Picture
**POST** `/users/profile/picture`

**Headers:** 
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data:**
- `profilePicture`: Image file (JPEG, PNG, WebP)

**Response (200):**
```json
{
  "success": true,
  "message": "Profile picture uploaded successfully",
  "profilePicture": "https://res.cloudinary.com/udhari-kitap/profile-pictures/..."
}
```

**Notes:**
- Automatically compressed to <1MB
- Cropped to 400x400 with face detection
- Converted to WebP format

### Delete Profile Picture
**DELETE** `/users/profile/picture`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Profile picture deleted successfully"
}
```

---

## Friends

### Add Friend
**POST** `/friends`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "email": "friend@example.com",
  "nickname": "Best Friend"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Friend added successfully",
  "friend": {
    "id": "507f1f77bcf86cd799439012",
    "friend": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Jane Smith",
      "email": "jane@example.com"
    },
    "nickname": "Best Friend",
    "createdAt": "2025-10-23T10:00:00.000Z",
    "updatedAt": "2025-10-23T10:00:00.000Z"
  }
}
```

### Get Friends List
**GET** `/friends?page=1&limit=100`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "friends": [
    {
      "id": "507f1f77bcf86cd799439012",
      "friend": {
        "id": "507f1f77bcf86cd799439011",
        "name": "Jane Smith",
        "email": "jane@example.com"
      },
      "nickname": "Best Friend",
      "balance": {
        "amount": 10000,
        "amountInRupees": 100,
        "status": "owes_you",
        "message": "Owes you ₹100"
      },
      "createdAt": "2025-10-23T10:00:00.000Z",
      "updatedAt": "2025-10-23T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 1,
    "totalPages": 1
  }
}
```

**Balance Status Values:**
- `settled`: Balance is ₹0
- `owes_you`: Friend owes you money (positive balance)
- `you_owe`: You owe friend money (negative balance)

### Get Friend by ID
**GET** `/friends/:id`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "friend": {
    "id": "507f1f77bcf86cd799439012",
    "friend": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Jane Smith",
      "email": "jane@example.com"
    },
    "nickname": "Best Friend",
    "createdAt": "2025-10-23T10:00:00.000Z",
    "updatedAt": "2025-10-23T10:00:00.000Z"
  }
}
```

### Update Friend Nickname
**PATCH** `/friends/:id`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "nickname": "Bestie"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Nickname updated successfully",
  "friend": {
    "id": "507f1f77bcf86cd799439012",
    "friend": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Jane Smith",
      "email": "jane@example.com"
    },
    "nickname": "Bestie",
    "createdAt": "2025-10-23T10:00:00.000Z",
    "updatedAt": "2025-10-23T10:01:00.000Z"
  }
}
```

### Delete Friend
**DELETE** `/friends/:id`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Friend removed successfully"
}
```

**Error (400) - Unsettled Balance:**
```json
{
  "error": "Cannot remove friend. They owe you ₹150. Please settle up first."
}
```

---

## Expenses

### Create Expense
**POST** `/expenses`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Dinner at Restaurant",
  "amount": 300,
  "payer": "507f1f77bcf86cd799439011",
  "participants": [
    {
      "user": "507f1f77bcf86cd799439011",
      "share": 100
    },
    {
      "user": "507f1f77bcf86cd799439012",
      "share": 100
    },
    {
      "user": "507f1f77bcf86cd799439013",
      "share": 100
    }
  ],
  "splitMethod": "equal"
}
```

**Notes:**
- `amount`: In rupees (will be converted to paise internally)
- `share`: In rupees (will be converted to paise internally)
- `splitMethod`: "equal", "unequal", or "percent"

**Response (201):**
```json
{
  "success": true,
  "message": "Expense created successfully",
  "expense": {
    "id": "507f1f77bcf86cd799439014",
    "title": "Dinner at Restaurant",
    "amount": 30000,
    "amountInRupees": 300,
    "currency": "INR",
    "payer": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "participants": [
      {
        "user": {
          "_id": "507f1f77bcf86cd799439011",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "share": 10000,
        "shareInRupees": 100
      },
      {
        "user": {
          "_id": "507f1f77bcf86cd799439012",
          "name": "Jane Smith",
          "email": "jane@example.com"
        },
        "share": 10000,
        "shareInRupees": 100
      },
      {
        "user": {
          "_id": "507f1f77bcf86cd799439013",
          "name": "Bob Wilson",
          "email": "bob@example.com"
        },
        "share": 10000,
        "shareInRupees": 100
      }
    ],
    "splitMethod": "equal",
    "createdBy": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "createdAt": "2025-10-23T10:00:00.000Z"
  }
}
```

### Get All Expenses
**GET** `/expenses`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "count": 2,
  "expenses": [
    {
      "id": "507f1f77bcf86cd799439014",
      "title": "Dinner at Restaurant",
      "amount": 30000,
      "amountInRupees": 300,
      "currency": "INR",
      "payer": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "participants": [...],
      "splitMethod": "equal",
      "createdBy": {...},
      "createdAt": "2025-10-23T10:00:00.000Z",
      "updatedAt": "2025-10-23T10:00:00.000Z"
    }
  ]
}
```

### Get Expense by ID
**GET** `/expenses/:id`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "expense": {
    "id": "507f1f77bcf86cd799439014",
    "title": "Dinner at Restaurant",
    "amount": 30000,
    "amountInRupees": 300,
    "currency": "INR",
    "payer": {...},
    "participants": [...],
    "splitMethod": "equal",
    "comments": [],
    "createdBy": {...},
    "createdAt": "2025-10-23T10:00:00.000Z",
    "updatedAt": "2025-10-23T10:00:00.000Z"
  }
}
```

### Update Expense
**PATCH** `/expenses/:id`

**Headers:** `Authorization: Bearer <token>`

**Request Body (partial update):**
```json
{
  "amount": 450,
  "participants": [
    {
      "user": "507f1f77bcf86cd799439011",
      "share": 150
    },
    {
      "user": "507f1f77bcf86cd799439012",
      "share": 150
    },
    {
      "user": "507f1f77bcf86cd799439013",
      "share": 150
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Expense updated successfully",
  "expense": {
    "id": "507f1f77bcf86cd799439014",
    "title": "Dinner at Restaurant",
    "amount": 45000,
    "amountInRupees": 450,
    "currency": "INR",
    "payer": {...},
    "participants": [...],
    "splitMethod": "equal",
    "createdBy": {...},
    "createdAt": "2025-10-23T10:00:00.000Z",
    "updatedAt": "2025-10-23T10:05:00.000Z"
  }
}
```

**Notes:**
- Only the expense creator can edit
- All participants receive EXPENSE_UPDATED notification
- Balances are automatically recalculated

### Delete Expense (Soft Delete)
**DELETE** `/expenses/:id`

**Headers:** `Authorization: Bearer <token>`

**Request Body (optional):**
```json
{
  "reason": "Cancelled plans"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Expense deleted successfully",
  "expense": {
    "id": "507f1f77bcf86cd799439014",
    "title": "Dinner at Restaurant",
    "isDeleted": true,
    "deletedAt": "2025-10-23T10:10:00.000Z",
    "deletedReason": "Cancelled plans"
  }
}
```

### Restore Deleted Expense
**POST** `/expenses/:id/restore`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Expense restored successfully",
  "expense": {
    "id": "507f1f77bcf86cd799439014",
    "title": "Dinner at Restaurant",
    "isDeleted": null,
    "deletedAt": null,
    "deletedReason": null,
    "restoredAt": "2025-10-23T10:15:00.000Z"
  }
}
```

---

## Balances

### Get All Balances
**GET** `/balances`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "balances": [
    {
      "user": {
        "id": "507f1f77bcf86cd799439012",
        "name": "Jane Smith",
        "email": "jane@example.com"
      },
      "balance": 15000,
      "balanceInRupees": 150,
      "status": "owes_you",
      "formattedBalance": "₹150"
    },
    {
      "user": {
        "id": "507f1f77bcf86cd799439013",
        "name": "Bob Wilson",
        "email": "bob@example.com"
      },
      "balance": -5000,
      "balanceInRupees": -50,
      "status": "you_owe",
      "formattedBalance": "₹50"
    }
  ]
}
```

### Get Balance with Specific User
**GET** `/balances/with/:userId`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "balance": {
    "user": {
      "id": "507f1f77bcf86cd799439012",
      "name": "Jane Smith",
      "email": "jane@example.com"
    },
    "balance": 15000,
    "balanceInRupees": 150,
    "status": "owes_you",
    "formattedBalance": "₹150"
  }
}
```

---

## Transactions

### Create Transaction (Settlement)
**POST** `/transactions`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "to": "507f1f77bcf86cd799439012",
  "amount": 150,
  "note": "Settling dinner expense"
}
```

**Response (201):**
```json
{
  "message": "Transaction created successfully",
  "transaction": {
    "id": "507f1f77bcf86cd799439015",
    "from": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "to": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Jane Smith",
      "email": "jane@example.com"
    },
    "amount": 15000,
    "amountInRupees": 150,
    "note": "Settling dinner expense",
    "createdBy": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "createdAt": "2025-10-23T10:00:00.000Z"
  }
}
```

### Get All Transactions
**GET** `/transactions?page=1&limit=20`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "transactions": [
    {
      "id": "507f1f77bcf86cd799439015",
      "from": {...},
      "to": {...},
      "amount": 15000,
      "amountInRupees": 150,
      "note": "Settling dinner expense",
      "createdBy": {...},
      "createdAt": "2025-10-23T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

### Get Transaction by ID
**GET** `/transactions/:id`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "transaction": {
    "id": "507f1f77bcf86cd799439015",
    "from": {...},
    "to": {...},
    "amount": 15000,
    "amountInRupees": 150,
    "note": "Settling dinner expense",
    "createdBy": {...},
    "createdAt": "2025-10-23T10:00:00.000Z"
  }
}
```

---

## Activities (Notifications)

### Get Activity Feed
**GET** `/activities?page=1&limit=20&type=EXPENSE_CREATED&unreadOnly=false`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `type`: Filter by type (optional)
- `unreadOnly`: Show only unread (true/false)

**Response (200):**
```json
{
  "success": true,
  "activities": [
    {
      "id": "507f1f77bcf86cd799439016",
      "type": "EXPENSE_UPDATED",
      "actor": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "payload": {
        "title": "Updated expense: Dinner at Restaurant",
        "description": "Expense \"Dinner at Restaurant\" was updated",
        "amount": 45000,
        "expenseId": {
          "_id": "507f1f77bcf86cd799439014",
          "title": "Dinner at Restaurant",
          "amount": 45000
        }
      },
      "isRead": false,
      "createdAt": "2025-10-23T10:05:00.000Z"
    },
    {
      "id": "507f1f77bcf86cd799439017",
      "type": "EXPENSE_CREATED",
      "actor": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "payload": {
        "title": "New expense: Dinner at Restaurant",
        "description": "John Doe paid ₹300 for \"Dinner at Restaurant\"",
        "amount": 30000,
        "expenseId": {...}
      },
      "isRead": true,
      "createdAt": "2025-10-23T10:00:00.000Z"
    },
    {
      "id": "507f1f77bcf86cd799439018",
      "type": "TRANSACTION_CREATED",
      "actor": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Jane Smith",
        "email": "jane@example.com"
      },
      "payload": {
        "title": "Payment received",
        "description": "Jane Smith paid ₹150 to John Doe - Settling dinner expense",
        "amount": 15000,
        "transactionId": "507f1f77bcf86cd799439015"
      },
      "isRead": false,
      "createdAt": "2025-10-23T10:20:00.000Z"
    }
  ],
  "unreadCount": 2,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

**Activity Types:**
- `EXPENSE_CREATED`: New expense added
- `EXPENSE_UPDATED`: Expense edited
- `TRANSACTION_CREATED`: Settlement payment made

### Get Unread Count
**GET** `/activities/unread-count`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "unreadCount": 5
}
```

### Mark Activity as Read
**PATCH** `/activities/:id/read`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Activity marked as read"
}
```

### Mark All Activities as Read
**PATCH** `/activities/read-all`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "6 activities marked as read",
  "count": 6
}
```

---

## Health

### Server Health Check
**GET** `/health`

**Response (200):**
```json
{
  "status": "OK",
  "timestamp": "2025-10-23T10:00:00.000Z",
  "uptime": 3600.5
}
```

### Database Health Check
**GET** `/health/db`

**Response (200):**
```json
{
  "status": "OK",
  "database": "connected",
  "timestamp": "2025-10-23T10:00:00.000Z"
}
```

---

## Common Error Responses

### Validation Error (400)
```json
{
  "error": "Validation failed",
  "details": [
    {
      "type": "field",
      "msg": "Email is required",
      "path": "email",
      "location": "body"
    }
  ]
}
```

### Unauthorized (401)
```json
{
  "error": "Authentication required",
  "message": "Please log in to access this resource"
}
```

### Forbidden (403)
```json
{
  "error": "Permission denied",
  "message": "Only the creator can edit this expense"
}
```

### Not Found (404)
```json
{
  "error": "Expense not found",
  "message": "No expense found with ID 507f1f77bcf86cd799439014"
}
```

### Server Error (500)
```json
{
  "error": "Internal server error",
  "message": "Something went wrong on the server"
}
```

---

## Notes

### Currency Handling
- All amounts are stored in **paise** (1 rupee = 100 paise)
- API accepts amounts in **rupees** for convenience
- Responses include both paise (`amount`) and rupees (`amountInRupees`)

### Authentication
- JWT tokens expire after **7 days**
- Include token in Authorization header: `Bearer <token>`
- Tokens are returned on registration and login

### Pagination
- Default page size varies by endpoint
- Use `page` and `limit` query parameters
- Response includes pagination metadata

### Soft Delete
- Deleted expenses are not permanently removed
- Deleted expenses don't appear in expense lists
- Can be restored by the creator
- Balances are recalculated on delete and restore
