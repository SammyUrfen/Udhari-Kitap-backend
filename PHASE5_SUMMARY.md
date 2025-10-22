# Phase 5: Transactions (Settle Up) - Implementation Summary

## What Was Built

Phase 5 adds the ability for users to record settlements/payments to reduce their balances with other users.

### Key Concept
When expenses are created, balances are tracked (Alice owes Bob ₹100). Transactions allow users to record when they actually pay these debts, which updates the balances accordingly.

---

## Files Created/Modified

### 1. **Transaction Model** (`src/models/transaction.js`)
- Schema with `from`, `to`, `amount`, `note`, `createdBy`
- Pre-save validation (cannot pay yourself)
- Indexes on `from` and `to` for efficient queries
- Helper methods: `getAmountInRupees()`, `toSafeObject()`
- Static query methods: `findByUser()`, `findBetweenUsers()`

### 2. **Transaction Validation Service** (`src/services/transactionValidation.js`)
- `validateUsersExist()` - Check both users exist in database
- `validateDifferentUsers()` - Ensure from ≠ to
- `validatePositiveAmount()` - Amount must be > 0
- `validateTransactionCreation()` - Comprehensive validation wrapper

### 3. **Updated Balance Calculation** (`src/services/balanceCalculation.js`)
- **Modified `calculateOverallBalance()`:**
  - Step 1: Calculate balances from expenses (existing logic)
  - Step 2: Query transactions involving the user
  - Step 3: Adjust balances based on transactions
    - If user paid: `totalOwing -= amount` (debt reduced)
    - If user received: `totalOwed -= amount` (owed reduced)
  
- **Modified `calculatePairwiseBalance()`:**
  - Returns both expenses and transactions between two users
  - Shows transaction history with direction and balance effect
  - Combined balance accounts for both expenses and settlements

### 4. **Transaction Controller** (`src/controllers/transactionController.js`)
- **`createTransaction()`** - POST /api/transactions
  - Validates transaction data
  - Converts rupees to paise
  - Creates transaction record
  - Returns populated transaction with user details

- **`getTransactions()`** - GET /api/transactions
  - Lists all transactions for authenticated user
  - Optional `withUser` query param to filter by specific user
  - Pagination support (page, limit)
  - Direction indicator (sent/received)

- **`getTransactionById()`** - GET /api/transactions/:id
  - Fetch single transaction
  - Authorization check (only involved users can view)
  - Direction based on user's role

### 5. **Transaction Routes** (`src/routes/transactions.js`)
- All routes require authentication
- POST / - Create transaction with validation
- GET / - List transactions with pagination
- GET /:id - Get specific transaction

### 6. **Updated Validation Middleware** (`src/middleware/validation.js`)
- `validateCreateTransaction` - Express-validator rules for POST
- `validateGetTransactionById` - Express-validator rules for GET /:id

### 7. **Updated Main Router** (`src/routes/index.js`)
- Added `/api/transactions` route

### 8. **Testing Documentation** (`PHASE5_TESTING.md`)
- Complete testing scenarios with curl commands
- Balance verification before/after transactions
- Validation error testing
- Complex multi-user settlement scenarios
- Pagination testing

---

## How Transactions Affect Balances

### Example Scenario:

**Initial State (from expenses):**
- Alice paid ₹600 for lunch
- Split 3 ways: Alice, Bob, Charlie each owe ₹200
- Bob owes Alice ₹200
- Charlie owes Alice ₹200

**After Bob Pays Alice ₹100:**
```
Transaction: Bob → Alice (₹100)
Result: Bob now owes Alice ₹100 (reduced from ₹200)
```

**Balance Calculation Logic:**
1. From expenses: Bob owes Alice ₹200
2. From transaction: Bob paid Alice ₹100
3. Final balance: Bob owes Alice ₹100

### Technical Implementation:
```javascript
// In calculateOverallBalance():
if (transaction.from === currentUser) {
  totalOwing -= transaction.amount; // You paid, your debt reduces
}
if (transaction.to === currentUser) {
  totalOwed -= transaction.amount; // You received, what's owed to you reduces
}
```

---

## API Endpoints

### Create Transaction
```json
POST /api/transactions
Authorization: Bearer <token>

Body:
{
  "to": "userId",
  "amount": 100.50,  // In rupees
  "note": "Optional note"
}

Response:
{
  "message": "Transaction created successfully",
  "transaction": {
    "id": "...",
    "from": { user details },
    "to": { user details },
    "amount": 10050,  // In paise
    "amountInRupees": 100.50,
    "note": "...",
    "createdBy": { user details },
    "createdAt": "..."
  }
}
```

### List Transactions
```json
GET /api/transactions?withUser=<userId>&page=1&limit=20
Authorization: Bearer <token>

Response:
{
  "transactions": [
    {
      "id": "...",
      "from": { user details },
      "to": { user details },
      "amount": 10050,
      "amountInRupees": 100.50,
      "note": "...",
      "direction": "sent" | "received",
      "createdAt": "..."
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
```json
GET /api/transactions/:id
Authorization: Bearer <token>

Response:
{
  "transaction": { ... }
}
```

### Get Balances (Updated to Include Transactions)
```
GET /api/balances
Authorization: Bearer <token>

Response includes perUser balances adjusted for transactions
```

```json
GET /api/balances/pairwise/:userId
Authorization: Bearer <token>

Response now includes:
- expenses: [ ... ]
- transactions: [
    {
      "id": "...",
      "amount": 10000,
      "direction": "you_paid" | "they_paid",
      "balanceEffect": "Reduced your debt by ₹100",
      "createdAt": "..."
    }
  ]
```

---

## Validation Rules

### Transaction Creation
1. ✅ `to` field is required and must be valid MongoDB ObjectId
2. ✅ `amount` must be ≥ ₹0.01
3. ✅ `note` is optional, max 200 characters
4. ✅ Recipient user must exist in database
5. ✅ Cannot create transaction to yourself (from ≠ to)
6. ✅ Must be authenticated

### Transaction Viewing
1. ✅ Must be authenticated
2. ✅ Can only view transactions where you're sender or receiver
3. ✅ Transaction ID must be valid

---

## Testing Checklist

✅ Create transaction with valid data
✅ Verify balance updates correctly after transaction
✅ List all transactions for user
✅ Filter transactions by specific user
✅ Get single transaction by ID
✅ Pagination works correctly
✅ Pairwise balance shows transaction history
✅ Cannot pay yourself (validation error)
✅ Cannot use negative amount (validation error)
✅ Cannot pay non-existent user (validation error)
✅ Cannot view other users' private transactions (authorization error)
✅ Missing required fields returns validation error

---

## Code Quality Highlights

### Maintainability
- Clear separation of concerns (model, validation service, controller, routes)
- Comprehensive JSDoc comments
- Consistent error handling
- Reusable validation functions

### Readability
- Descriptive variable names (`totalOwed`, `totalOwing`, `netBalance`)
- Helper methods for common operations (`getAmountInRupees()`)
- Clear balance calculation logic with comments
- Well-structured controller functions

### Future-Proof
- Transaction model can be extended (add `transactionType`, `currency`, etc.)
- Validation service can add more rules without changing controller
- Balance calculation is modular - easy to add new balance types
- Pagination built-in for scalability

---

## What's Next?

Phase 5 is complete! Users can now:
1. ✅ Register and login (Phase 2)
2. ✅ Create and view expenses (Phase 3)
3. ✅ Check balances (Phase 4)
4. ✅ Record settlements/payments (Phase 5)

**Ready for Phase 6:** Activity Feed and Notifications
- Track all activities (expenses created, settlements made)
- Real-time notifications for users
- Activity history

---

## Quick Test Command

After starting your server, you can quickly test with your existing Phase 4 data:

```bash
# Bob pays Alice ₹50
curl -X POST http://localhost:5000/api/transactions \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to": "'$ALICE_ID'", "amount": 50, "note": "Settling up"}'

# Check Bob's updated balance
curl -X GET http://localhost:5000/api/balances \
  -H "Authorization: Bearer $BOB_TOKEN"
```

You should see Bob's `totalOwing` decreased by ₹50!
