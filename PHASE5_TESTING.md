# Phase 5 Testing Guide: Transactions (Settle Up)

This guide covers testing the transaction/settlement functionality that allows users to record payments to settle balances.

## Prerequisites

- Server running on `http://localhost:5000`
- Phase 4 test data (Alice, Bob, Charlie) with existing expenses
- User tokens stored in environment variables

## Test Environment Variables

From Phase 4, you should have:
```bash
ALICE_TOKEN="your_alice_token"
BOB_TOKEN="your_bob_token"
CHARLIE_TOKEN="your_charlie_token"
ALICE_ID="your_alice_id"
BOB_ID="your_bob_id"
CHARLIE_ID="your_charlie_id"
```

---

## 1. Check Current Balances (Before Settlements)

### Alice's Overall Balance
```bash
curl -X GET http://localhost:5000/api/balances \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Expected Response:**
```json
{
  "totalOwed": 40000,
  "totalOwedInRupees": 400,
  "totalOwing": 0,
  "totalOwingInRupees": 0,
  "netBalance": 40000,
  "netBalanceInRupees": 400,
  "perUser": [
    {
      "user": {
        "id": "bob_id",
        "name": "Bob Balance",
        "email": "bob@balance.test"
      },
      "balance": 20000,
      "balanceInRupees": 200,
      "status": "owes_you"
    },
    {
      "user": {
        "id": "charlie_id",
        "name": "Charlie Balance",
        "email": "charlie@balance.test"
      },
      "balance": 20000,
      "balanceInRupees": 200,
      "status": "owes_you"
    }
  ]
}
```

**Analysis:** Alice is owed ₹200 by Bob and ₹200 by Charlie (from the expenses created in Phase 4).

### Bob's Overall Balance
```bash
curl -X GET http://localhost:5000/api/balances \
  -H "Authorization: Bearer $BOB_TOKEN"
```

**Expected Response:**
```json
{
  "totalOwed": 0,
  "totalOwing": 20000,
  "netBalance": -20000,
  "netBalanceInRupees": -200,
  "perUser": [
    {
      "user": { ... },
      "balance": -20000,
      "balanceInRupees": -200,
      "status": "you_owe"
    }
  ]
}
```

**Analysis:** Bob owes Alice ₹200.

---

## 2. Create a Transaction (Bob Pays Alice)

Bob will settle part of his debt by paying Alice ₹100.

```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$ALICE_ID\",
    \"amount\": 100,
    \"note\": \"Partial payment for dinner\"
  }"
```

**Expected Response:**
```json
{
  "message": "Transaction created successfully",
  "transaction": {
    "id": "transaction_id",
    "from": {
      "id": "bob_id",
      "name": "Bob Balance",
      "email": "bob@balance.test"
    },
    "to": {
      "id": "alice_id",
      "name": "Alice Balance",
      "email": "alice@balance.test"
    },
    "amount": 10000,
    "amountInRupees": 100,
    "note": "Partial payment for dinner",
    "createdBy": {
      "id": "bob_id",
      "name": "Bob Balance",
      "email": "bob@balance.test"
    },
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Save Transaction ID:**
```bash
TRANSACTION1_ID="paste_transaction_id_here"
```

---

## 3. Check Updated Balances (After Settlement)

### Bob's Balance After Payment
```bash
curl -X GET http://localhost:5000/api/balances \
  -H "Authorization: Bearer $BOB_TOKEN"
```

**Expected Response:**
```json
{
  "totalOwed": 0,
  "totalOwing": 10000,
  "netBalance": -10000,
  "netBalanceInRupees": -100,
  "perUser": [
    {
      "user": { ... },
      "balance": -10000,
      "balanceInRupees": -100,
      "status": "you_owe"
    }
  ]
}
```

**Analysis:** Bob's debt reduced from ₹200 to ₹100 after paying ₹100.

### Alice's Balance After Receiving Payment
```bash
curl -X GET http://localhost:5000/api/balances \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Expected Response:**
```json
{
  "totalOwed": 30000,
  "totalOwedInRupees": 300,
  "totalOwing": 0,
  "netBalance": 30000,
  "netBalanceInRupees": 300,
  "perUser": [
    {
      "user": { "id": "charlie_id", ... },
      "balance": 20000,
      "balanceInRupees": 200,
      "status": "owes_you"
    },
    {
      "user": { "id": "bob_id", ... },
      "balance": 10000,
      "balanceInRupees": 100,
      "status": "owes_you"
    }
  ]
}
```

**Analysis:** Alice is now owed ₹100 by Bob (down from ₹200) and still ₹200 by Charlie.

---

## 4. Create Full Settlement (Bob Pays Remaining)

Bob pays the remaining ₹100 to fully settle his debt.

```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$ALICE_ID\",
    \"amount\": 100,
    \"note\": \"Final payment - all settled!\"
  }"
```

**Expected Response:**
```json
{
  "message": "Transaction created successfully",
  "transaction": { ... }
}
```

### Verify Bob's Balance is Settled
```bash
curl -X GET http://localhost:5000/api/balances \
  -H "Authorization: Bearer $BOB_TOKEN"
```

**Expected Response:**
```json
{
  "totalOwed": 0,
  "totalOwing": 0,
  "netBalance": 0,
  "netBalanceInRupees": 0,
  "perUser": []
}
```

**Analysis:** Bob's balance with Alice is now zero (fully settled).

---

## 5. Get All Transactions

### Bob's Transactions
```bash
curl -X GET http://localhost:5000/api/transactions \
  -H "Authorization: Bearer $BOB_TOKEN"
```

**Expected Response:**
```json
{
  "transactions": [
    {
      "id": "transaction2_id",
      "from": { "id": "bob_id", ... },
      "to": { "id": "alice_id", ... },
      "amount": 10000,
      "amountInRupees": 100,
      "note": "Final payment - all settled!",
      "createdBy": { ... },
      "createdAt": "2024-01-15T10:45:00.000Z",
      "direction": "sent"
    },
    {
      "id": "transaction1_id",
      "from": { "id": "bob_id", ... },
      "to": { "id": "alice_id", ... },
      "amount": 10000,
      "amountInRupees": 100,
      "note": "Partial payment for dinner",
      "createdBy": { ... },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "direction": "sent"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1
  }
}
```

### Alice's Transactions
```bash
curl -X GET http://localhost:5000/api/transactions \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Expected Response:**
```json
{
  "transactions": [
    {
      "id": "transaction2_id",
      "from": { "id": "bob_id", ... },
      "to": { "id": "alice_id", ... },
      "amount": 10000,
      "amountInRupees": 100,
      "note": "Final payment - all settled!",
      "direction": "received"
    },
    {
      "id": "transaction1_id",
      "from": { "id": "bob_id", ... },
      "to": { "id": "alice_id", ... },
      "amount": 10000,
      "amountInRupees": 100,
      "note": "Partial payment for dinner",
      "direction": "received"
    }
  ],
  "pagination": { ... }
}
```

---

## 6. Get Transactions with Specific User

### Bob's Transactions with Alice Only
```bash
curl -X GET "http://localhost:5000/api/transactions?withUser=$ALICE_ID" \
  -H "Authorization: Bearer $BOB_TOKEN"
```

**Expected Response:** Same as above (Bob only has transactions with Alice).

---

## 7. Get Single Transaction by ID

```bash
curl -X GET "http://localhost:5000/api/transactions/$TRANSACTION1_ID" \
  -H "Authorization: Bearer $BOB_TOKEN"
```

**Expected Response:**
```json
{
  "transaction": {
    "id": "transaction1_id",
    "from": { "id": "bob_id", ... },
    "to": { "id": "alice_id", ... },
    "amount": 10000,
    "amountInRupees": 100,
    "note": "Partial payment for dinner",
    "createdBy": { ... },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "direction": "sent"
  }
}
```

---

## 8. Check Pairwise Balance (with Transaction History)

### Alice's Balance with Bob
```bash
curl -X GET "http://localhost:5000/api/balances/pairwise/$BOB_ID" \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Expected Response:**
```json
{
  "balance": 0,
  "balanceInRupees": 0,
  "status": "settled",
  "message": "All settled up",
  "expenses": [
    {
      "id": "expense_id",
      "title": "Lunch split",
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
      "id": "transaction2_id",
      "amount": 10000,
      "amountInRupees": 100,
      "from": { "id": "bob_id", ... },
      "to": { "id": "alice_id", ... },
      "note": "Final payment - all settled!",
      "direction": "they_paid",
      "balanceEffect": "Reduced their debt by ₹100",
      "createdAt": "..."
    },
    {
      "id": "transaction1_id",
      "amount": 10000,
      "amountInRupees": 100,
      "from": { "id": "bob_id", ... },
      "to": { "id": "alice_id", ... },
      "note": "Partial payment for dinner",
      "direction": "they_paid",
      "balanceEffect": "Reduced their debt by ₹100",
      "createdAt": "..."
    }
  ]
}
```

**Analysis:** Shows both the expense (where Bob owed ₹200) and the two transactions (where Bob paid ₹100 + ₹100), resulting in a settled balance.

---

## 9. Validation Tests

### Test 1: Try to Pay Yourself (Should Fail)
```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$BOB_ID\",
    \"amount\": 100,
    \"note\": \"Paying myself\"
  }"
```

**Expected Error Response:**
```json
{
  "error": "Validation failed",
  "details": "Cannot create transaction to yourself"
}
```

### Test 2: Negative Amount (Should Fail)
```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$ALICE_ID\",
    \"amount\": -50,
    \"note\": \"Negative amount\"
  }"
```

**Expected Error Response:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "msg": "Amount must be at least ₹0.01",
      "param": "amount"
    }
  ]
}
```

### Test 3: Invalid User ID (Should Fail)
```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"invalid_user_id\",
    \"amount\": 100,
    \"note\": \"To non-existent user\"
  }"
```

**Expected Error Response:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "msg": "Invalid recipient user ID format",
      "param": "to"
    }
  ]
}
```

### Test 4: Non-existent User (Should Fail)
```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"507f1f77bcf86cd799439011\",
    \"amount\": 100,
    \"note\": \"To non-existent user\"
  }"
```

**Expected Error Response:**
```json
{
  "error": "Validation failed",
  "details": "Recipient user not found"
}
```

### Test 5: Missing Required Fields (Should Fail)
```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"note\": \"Missing to and amount\"
  }"
```

**Expected Error Response:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "msg": "Recipient (to) is required",
      "param": "to"
    },
    {
      "msg": "Amount is required",
      "param": "amount"
    }
  ]
}
```

---

## 10. Complex Scenario: Multi-User Settlements

### Charlie Pays Alice ₹150
```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Authorization: Bearer $CHARLIE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$ALICE_ID\",
    \"amount\": 150,
    \"note\": \"Movie tickets settlement\"
  }"
```

### Check Alice's Updated Balance
```bash
curl -X GET http://localhost:5000/api/balances \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Expected Response:**
```json
{
  "totalOwed": 5000,
  "totalOwedInRupees": 50,
  "totalOwing": 0,
  "netBalance": 5000,
  "netBalanceInRupees": 50,
  "perUser": [
    {
      "user": { "id": "charlie_id", ... },
      "balance": 5000,
      "balanceInRupees": 50,
      "status": "owes_you"
    }
  ]
}
```

**Analysis:** 
- Bob is settled (₹0)
- Charlie now owes ₹50 (was ₹200, paid ₹150)
- Total owed to Alice: ₹50

---

## 11. Pagination Test

If you have many transactions, test pagination:

```bash
curl -X GET "http://localhost:5000/api/transactions?page=1&limit=2" \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Expected Response:**
```json
{
  "transactions": [ ... ], // Max 2 transactions
  "pagination": {
    "page": 1,
    "limit": 2,
    "total": 3,
    "totalPages": 2
  }
}
```

---

## Summary of Phase 5 Features

✅ **Transaction Creation**
- Record payments between users
- Automatic balance updates
- Optional notes for context

✅ **Balance Integration**
- Transactions reduce what you owe (when you pay)
- Transactions reduce what others owe you (when you receive)
- Real-time balance calculations including both expenses and settlements

✅ **Transaction History**
- List all transactions for a user
- Filter transactions by specific user
- Direction indicator (sent/received)
- Pagination support

✅ **Pairwise Balance Details**
- Combined view of expenses and transactions
- Shows transaction history between two users
- Clear balance effect descriptions

✅ **Validation**
- Cannot pay yourself
- Positive amounts only
- Valid user IDs required
- User existence checks

---

## Phase 5 Complete! 🎉

Your transaction/settlement system is now fully functional. Users can:
1. Create expenses (Phase 3)
2. View balances (Phase 4)
3. **Record settlements/payments (Phase 5) ✅**
4. See updated balances reflecting both expenses and transactions

Next Steps: Phase 6 - Activity Feed and Notifications
