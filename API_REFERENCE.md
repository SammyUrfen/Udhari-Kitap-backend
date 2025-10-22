# Complete API Reference (Phases 2-5)

Base URL: `http://localhost:5000/api`

---

## Authentication Endpoints

### Register
```json
POST /api/auth/register
Content-Type: application/json

Body:
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}

Response (201):
{
  "message": "User registered successfully",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Login
```json
POST /api/auth/login
Content-Type: application/json

Body:
{
  "email": "john@example.com",
  "password": "password123"
}

Response (200):
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Get Current User
```json
GET /api/auth/me
Authorization: Bearer <token>

Response (200):
{
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

---

## User Endpoints

### Get My Profile
```json
GET /api/users/me
Authorization: Bearer <token>

Response (200):
{
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Search User by Email
```json
GET /api/users/search?email=jane@example.com
Authorization: Bearer <token>

Response (200):
{
  "user": {
    "id": "user_id",
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
}

Response (404):
{
  "error": "User not found"
}
```

---

## Expense Endpoints

### Create Expense
```json
POST /api/expenses
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "title": "Dinner at restaurant",
  "amount": 600,
  "payer": "user_id_who_paid",
  "participants": [
    { "user": "user1_id", "share": 200 },
    { "user": "user2_id", "share": 200 },
    { "user": "user3_id", "share": 200 }
  ],
  "splitMethod": "equal"
}

Response (201):
{
  "message": "Expense created successfully",
  "expense": {
    "id": "expense_id",
    "title": "Dinner at restaurant",
    "amount": 60000,
    "amountInRupees": 600,
    "payer": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "participants": [
      {
        "user": { "id": "...", "name": "...", "email": "..." },
        "share": 20000,
        "shareInRupees": 200
      }
    ],
    "splitMethod": "equal",
    "createdBy": { ... },
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

### Get All Expenses
```json
GET /api/expenses
Authorization: Bearer <token>

Response (200):
{
  "expenses": [
    {
      "id": "expense_id",
      "title": "Dinner at restaurant",
      "amount": 60000,
      "amountInRupees": 600,
      "payer": { ... },
      "participants": [ ... ],
      "splitMethod": "equal",
      "createdBy": { ... },
      "createdAt": "..."
    }
  ]
}
```

### Get Expense by ID
```json
GET /api/expenses/:id
Authorization: Bearer <token>

Response (200):
{
  "expense": { ... }
}

Response (404):
{
  "error": "Expense not found"
}
```

---

## Balance Endpoints

### Get Overall Balance
```json
GET /api/balances
Authorization: Bearer <token>

Response (200):
{
  "totalOwed": 40000,
  "totalOwedInRupees": 400,
  "totalOwing": 15000,
  "totalOwingInRupees": 150,
  "netBalance": 25000,
  "netBalanceInRupees": 250,
  "perUser": [
    {
      "user": {
        "id": "user_id",
        "name": "Jane Doe",
        "email": "jane@example.com"
      },
      "balance": 20000,
      "balanceInRupees": 200,
      "status": "owes_you"
    },
    {
      "user": { ... },
      "balance": -15000,
      "balanceInRupees": -150,
      "status": "you_owe"
    }
  ]
}
```

**Balance Interpretation:**
- `totalOwed`: Total amount others owe you
- `totalOwing`: Total amount you owe others
- `netBalance`: `totalOwed - totalOwing` (positive = you're owed money)
- `status`: 
  - `owes_you`: They owe you money (positive balance)
  - `you_owe`: You owe them money (negative balance)
  - `settled`: Balance is zero

### Get Pairwise Balance
```json
GET /api/balances/pairwise/:userId
Authorization: Bearer <token>

Response (200):
{
  "balance": 10000,
  "balanceInRupees": 100,
  "status": "owes_you",
  "message": "They owe you ₹100",
  "expenses": [
    {
      "id": "expense_id",
      "title": "Dinner",
      "amount": 60000,
      "amountInRupees": 600,
      "payer": { ... },
      "yourShare": 0,
      "theirShare": 20000,
      "theirShareInRupees": 200,
      "createdAt": "..."
    }
  ],
  "transactions": [
    {
      "id": "transaction_id",
      "amount": 10000,
      "amountInRupees": 100,
      "from": { ... },
      "to": { ... },
      "note": "Partial payment",
      "direction": "they_paid",
      "balanceEffect": "Reduced their debt by ₹100",
      "createdAt": "..."
    }
  ]
}
```

**Status Values:**
- `owes_you`: Positive balance (they owe you)
- `you_owe`: Negative balance (you owe them)
- `settled`: Zero balance

---

## Transaction Endpoints

### Create Transaction (Settlement)
```json
POST /api/transactions
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "to": "user_id_receiving_payment",
  "amount": 100,
  "note": "Settling dinner expense"
}

Response (201):
{
  "message": "Transaction created successfully",
  "transaction": {
    "id": "transaction_id",
    "from": {
      "id": "your_user_id",
      "name": "Your Name",
      "email": "your@email.com"
    },
    "to": {
      "id": "recipient_user_id",
      "name": "Recipient Name",
      "email": "recipient@email.com"
    },
    "amount": 10000,
    "amountInRupees": 100,
    "note": "Settling dinner expense",
    "createdBy": { ... },
    "createdAt": "2024-01-15T11:00:00.000Z"
  }
}
```

### Get All Transactions
```json
GET /api/transactions?withUser=<userId>&page=1&limit=20
Authorization: Bearer <token>

Query Parameters:
- withUser (optional): Filter transactions with specific user
- page (optional): Page number (default: 1)
- limit (optional): Items per page (default: 20)

Response (200):
{
  "transactions": [
    {
      "id": "transaction_id",
      "from": { ... },
      "to": { ... },
      "amount": 10000,
      "amountInRupees": 100,
      "note": "Settling up",
      "createdBy": { ... },
      "createdAt": "...",
      "direction": "sent"
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

**Direction Values:**
- `sent`: You paid this transaction
- `received`: You received this transaction

### Get Transaction by ID
```json
GET /api/transactions/:id
Authorization: Bearer <token>

Response (200):
{
  "transaction": {
    "id": "transaction_id",
    "from": { ... },
    "to": { ... },
    "amount": 10000,
    "amountInRupees": 100,
    "note": "Settling up",
    "createdBy": { ... },
    "createdAt": "...",
    "direction": "sent"
  }
}

Response (403):
{
  "error": "You are not authorized to view this transaction"
}

Response (404):
{
  "error": "Transaction not found"
}
```

---

## Error Responses

### Validation Errors (400)
```json
{
  "error": "Validation failed",
  "details": [
    {
      "msg": "Email is required",
      "param": "email",
      "location": "body"
    }
  ]
}
```

### Authentication Errors (401)
```json
{
  "error": "No token provided, authorization denied"
}

{
  "error": "Token is not valid"
}
```

### Authorization Errors (403)
```json
{
  "error": "You are not authorized to view this resource"
}
```

### Not Found Errors (404)
```json
{
  "error": "Resource not found"
}
```

### Server Errors (500)
```json
{
  "error": "Server error",
  "message": "Detailed error message"
}
```

---

## Important Notes

### Currency Handling
- All amounts in requests should be in **rupees** (e.g., 100 for ₹100)
- All amounts in responses are provided in both formats:
  - `amount`: Integer in **paise** (e.g., 10000 for ₹100)
  - `amountInRupees`: Float in **rupees** (e.g., 100 for ₹100)
- Database stores everything in paise for precision

### Authentication
- All endpoints except `/auth/register` and `/auth/login` require authentication
- Include JWT token in Authorization header: `Bearer <token>`
- Token expires after 7 days

### Balance Calculation
- Balances are calculated from both **expenses** and **transactions**
- When you create an expense as payer, others owe you their share
- When you're a participant in someone else's expense, you owe them your share
- When you create a transaction (payment), it reduces your debt
- Balances are recalculated in real-time on every request

### Pagination
- Default page size: 20 items
- Use `page` and `limit` query parameters to customize
- Response includes pagination metadata

### Timestamps
- All timestamps are in ISO 8601 format (UTC)
- Example: `2024-01-15T10:00:00.000Z`

---

## Complete Workflow Example

### 1. Register Users
```bash
# Register Alice
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@test.com", "password": "pass123"}'

# Register Bob
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Bob", "email": "bob@test.com", "password": "pass123"}'
```

### 2. Alice Creates Expense
```bash
# Alice paid ₹600 for dinner, split equally with Bob
curl -X POST http://localhost:5000/api/expenses \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Dinner",
    "amount": 600,
    "payer": "'$ALICE_ID'",
    "participants": [
      {"user": "'$ALICE_ID'", "share": 300},
      {"user": "'$BOB_ID'", "share": 300}
    ],
    "splitMethod": "equal"
  }'
```

### 3. Check Balances
```bash
# Alice checks balance (Bob owes her ₹300)
curl -X GET http://localhost:5000/api/balances \
  -H "Authorization: Bearer $ALICE_TOKEN"

# Bob checks balance (He owes Alice ₹300)
curl -X GET http://localhost:5000/api/balances \
  -H "Authorization: Bearer $BOB_TOKEN"
```

### 4. Bob Settles Up
```bash
# Bob pays Alice ₹300
curl -X POST http://localhost:5000/api/transactions \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "'$ALICE_ID'",
    "amount": 300,
    "note": "Dinner settlement"
  }'
```

### 5. Verify Settlement
```bash
# Both users check balance (should be zero)
curl -X GET http://localhost:5000/api/balances \
  -H "Authorization: Bearer $BOB_TOKEN"
```

---

## Testing Files

- `PHASE2_TESTING.md` - Auth and User Management tests
- `PHASE3_TESTING.md` - Expense Management tests
- `PHASE4_TESTING.md` - Balance Calculation tests
- `PHASE5_TESTING.md` - Transaction/Settlement tests

Each file contains detailed curl commands and expected responses for comprehensive testing.
