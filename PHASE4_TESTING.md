# Phase 4 API Testing Guide - Balance Calculation

## Prerequisites

1. Server running on `http://localhost:5000`
2. Have at least 3 registered users with tokens
3. Have created some expenses between users (from Phase 3)

---

## Setup Test Scenario

Let's create a specific scenario to test balances:

### Register Users

```bash
# User 1: Alice
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@balance.test","password":"password123"}'

# User 2: Bob
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Bob","email":"bob@balance.test","password":"password123"}'

# User 3: Charlie
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Charlie","email":"charlie@balance.test","password":"password123"}'
```

**Save the tokens and user IDs!**

### Set Environment Variables

```bash
export ALICE_TOKEN="alice-jwt-token"
export ALICE_ID="alice-user-id"
export BOB_TOKEN="bob-jwt-token"
export BOB_ID="bob-user-id"
export CHARLIE_TOKEN="charlie-jwt-token"
export CHARLIE_ID="charlie-user-id"
```

---

## Create Test Expenses

### Expense 1: Alice pays ₹300 for dinner (split 3 ways)

```bash
curl -X POST http://localhost:5000/api/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d "{
    \"title\": \"Dinner\",
    \"amount\": 300.00,
    \"payer\": \"$ALICE_ID\",
    \"participants\": [
      { \"user\": \"$ALICE_ID\", \"share\": 100.00 },
      { \"user\": \"$BOB_ID\", \"share\": 100.00 },
      { \"user\": \"$CHARLIE_ID\", \"share\": 100.00 }
    ],
    \"splitMethod\": \"equal\"
  }"
```

**Expected Balance After This:**

- Alice: +₹200 (Bob owes ₹100, Charlie owes ₹100)
- Bob: -₹100 (owes Alice ₹100)
- Charlie: -₹100 (owes Alice ₹100)

---

### Expense 2: Bob pays ₹600 for movie tickets (split 3 ways)

```bash
curl -X POST http://localhost:5000/api/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -d "{
    \"title\": \"Movie Tickets\",
    \"amount\": 600.00,
    \"payer\": \"$BOB_ID\",
    \"participants\": [
      { \"user\": \"$ALICE_ID\", \"share\": 200.00 },
      { \"user\": \"$BOB_ID\", \"share\": 200.00 },
      { \"user\": \"$CHARLIE_ID\", \"share\": 200.00 }
    ],
    \"splitMethod\": \"equal\"
  }"
```

**Expected Balance After This:**

- Alice: Net = +₹200 - ₹200 = ₹0 (settled with Bob, owes nothing)
- Bob: Net = -₹100 + ₹400 = +₹300 (Alice settled, Charlie owes ₹200)
- Charlie: Net = -₹100 - ₹200 = -₹300 (owes Alice ₹100, owes Bob ₹200)

---

### Expense 3: Charlie pays ₹150 for coffee (Bob and Charlie only)

```bash
curl -X POST http://localhost:5000/api/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CHARLIE_TOKEN" \
  -d "{
    \"title\": \"Coffee\",
    \"amount\": 150.00,
    \"payer\": \"$CHARLIE_ID\",
    \"participants\": [
      { \"user\": \"$BOB_ID\", \"share\": 75.00 },
      { \"user\": \"$CHARLIE_ID\", \"share\": 75.00 }
    ],
    \"splitMethod\": \"equal\"
  }"
```

**Expected Balance After This:**

- Alice: ₹0 (no change, not involved)
- Bob: Net = +₹300 - ₹75 = +₹225 (Charlie owes ₹125 total)
- Charlie: Net = -₹300 + ₹75 = -₹225 (owes Alice ₹100, owes Bob ₹125)

---

## Test Balance Endpoints

### 1. Get Alice's Overall Balance

```bash
curl -X GET http://localhost:5000/api/balances \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "user": {
    "id": "...",
    "name": "Alice",
    "email": "alice@balance.test"
  },
  "balance": {
    "totalOwed": 20000,
    "totalOwedInRupees": 200,
    "totalOwing": 20000,
    "totalOwingInRupees": 200,
    "netBalance": 0,
    "netBalanceInRupees": 0,
    "perUser": [
      {
        "user": {
          "id": "...",
          "name": "Charlie",
          "email": "charlie@balance.test"
        },
        "balance": 10000,
        "balanceInRupees": 100,
        "status": "owes_you"
      },
      {
        "user": {
          "id": "...",
          "name": "Bob",
          "email": "bob@balance.test"
        },
        "balance": -10000,
        "balanceInRupees": -100,
        "status": "you_owe"
      }
    ]
  }
}
```

---

### 2. Get Bob's Overall Balance

```bash
curl -X GET http://localhost:5000/api/balances \
  -H "Authorization: Bearer $BOB_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "user": {
    "id": "...",
    "name": "Bob",
    "email": "bob@balance.test"
  },
  "balance": {
    "totalOwed": 40000,
    "totalOwedInRupees": 400,
    "totalOwing": 17500,
    "totalOwingInRupees": 175,
    "netBalance": 22500,
    "netBalanceInRupees": 225,
    "perUser": [
      {
        "user": {
          "id": "...",
          "name": "Charlie",
          "email": "charlie@balance.test"
        },
        "balance": 12500,
        "balanceInRupees": 125,
        "status": "owes_you"
      },
      {
        "user": {
          "id": "...",
          "name": "Alice",
          "email": "alice@balance.test"
        },
        "balance": 10000,
        "balanceInRupees": 100,
        "status": "owes_you"
      }
    ]
  }
}
```

---

### 3. Get Charlie's Overall Balance

```bash
curl -X GET http://localhost:5000/api/balances \
  -H "Authorization: Bearer $CHARLIE_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "user": {
    "id": "...",
    "name": "Charlie",
    "email": "charlie@balance.test"
  },
  "balance": {
    "totalOwed": 7500,
    "totalOwedInRupees": 75,
    "totalOwing": 30000,
    "totalOwingInRupees": 300,
    "netBalance": -22500,
    "netBalanceInRupees": -225,
    "perUser": [
      {
        "user": {
          "id": "...",
          "name": "Alice",
          "email": "alice@balance.test"
        },
        "balance": -10000,
        "balanceInRupees": -100,
        "status": "you_owe"
      },
      {
        "user": {
          "id": "...",
          "name": "Bob",
          "email": "bob@balance.test"
        },
        "balance": -12500,
        "balanceInRupees": -125,
        "status": "you_owe"
      }
    ]
  }
}
```

---

### 4. Get Pairwise Balance: Alice with Charlie

```bash
curl -X GET http://localhost:5000/api/balances/$CHARLIE_ID \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "you": {
    "id": "...",
    "name": "Alice",
    "email": "alice@balance.test"
  },
  "otherUser": {
    "id": "...",
    "name": "Charlie",
    "email": "charlie@balance.test"
  },
  "balance": {
    "balance": 10000,
    "balanceInRupees": 100,
    "status": "owes_you",
    "message": "They owe you ₹100",
    "expenses": [
      {
        "id": "...",
        "title": "Dinner",
        "amount": 30000,
        "amountInRupees": 300,
        "payer": {
          "_id": "...",
          "name": "Alice",
          "email": "alice@balance.test"
        },
        "yourShare": 0,
        "yourShareInRupees": 0,
        "theirShare": 10000,
        "theirShareInRupees": 100,
        "createdAt": "..."
      }
    ]
  }
}
```

---

### 5. Get Pairwise Balance: Bob with Charlie

```bash
curl -X GET http://localhost:5000/api/balances/$CHARLIE_ID \
  -H "Authorization: Bearer $BOB_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "you": {
    "id": "...",
    "name": "Bob",
    "email": "bob@balance.test"
  },
  "otherUser": {
    "id": "...",
    "name": "Charlie",
    "email": "charlie@balance.test"
  },
  "balance": {
    "balance": 12500,
    "balanceInRupees": 125,
    "status": "owes_you",
    "message": "They owe you ₹125",
    "expenses": [
      {
        "id": "...",
        "title": "Coffee",
        "amount": 15000,
        "amountInRupees": 150,
        "payer": {
          "_id": "...",
          "name": "Charlie",
          "email": "charlie@balance.test"
        },
        "yourShare": 7500,
        "yourShareInRupees": 75,
        "theirShare": 0,
        "theirShareInRupees": 0,
        "createdAt": "..."
      },
      {
        "id": "...",
        "title": "Movie Tickets",
        "amount": 60000,
        "amountInRupees": 600,
        "payer": {
          "_id": "...",
          "name": "Bob",
          "email": "bob@balance.test"
        },
        "yourShare": 0,
        "yourShareInRupees": 0,
        "theirShare": 20000,
        "theirShareInRupees": 200,
        "createdAt": "..."
      }
    ]
  }
}
```

---

### 6. Get Pairwise Balance: Alice with Bob

```bash
curl -X GET http://localhost:5000/api/balances/$BOB_ID \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "you": {
    "id": "...",
    "name": "Alice",
    "email": "alice@balance.test"
  },
  "otherUser": {
    "id": "...",
    "name": "Bob",
    "email": "bob@balance.test"
  },
  "balance": {
    "balance": -10000,
    "balanceInRupees": -100,
    "status": "you_owe",
    "message": "You owe them ₹100",
    "expenses": [
      {
        "id": "...",
        "title": "Movie Tickets",
        "amount": 60000,
        "amountInRupees": 600,
        "payer": {
          "_id": "...",
          "name": "Bob",
          "email": "bob@balance.test"
        },
        "yourShare": 20000,
        "yourShareInRupees": 200,
        "theirShare": 0,
        "theirShareInRupees": 0,
        "createdAt": "..."
      },
      {
        "id": "...",
        "title": "Dinner",
        "amount": 30000,
        "amountInRupees": 300,
        "payer": {
          "_id": "...",
          "name": "Alice",
          "email": "alice@balance.test"
        },
        "yourShare": 0,
        "yourShareInRupees": 0,
        "theirShare": 10000,
        "theirShareInRupees": 100,
        "createdAt": "..."
      }
    ]
  }
}
```

---

## Validation Tests

### Test 1: Get Balance with Invalid User ID

```bash
curl -X GET http://localhost:5000/api/balances/000000000000000000000000 \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Expected:** 404 error - "User not found"

---

### Test 2: Get Balance with Self

```bash
curl -X GET http://localhost:5000/api/balances/$ALICE_ID \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Expected:** 400 error - "Cannot check balance with yourself"

---

### Test 3: Without Authentication

```bash
curl -X GET http://localhost:5000/api/balances
```

**Expected:** 401 error - "Authorization required"

---

## Test Checklist

- [ ] Overall balance shows correct totalOwed
- [ ] Overall balance shows correct totalOwing
- [ ] Overall balance shows correct netBalance
- [ ] Per-user breakdown shows all people you have balances with
- [ ] Per-user breakdown shows correct status (owes_you/you_owe/settled)
- [ ] Settled balances (₹0) are not shown in per-user list
- [ ] Pairwise balance shows correct amount
- [ ] Pairwise balance shows all shared expenses
- [ ] Pairwise balance shows correct "yourShare" and "theirShare" per expense
- [ ] Pairwise balance shows correct status message
- [ ] All amounts shown in both paise and rupees
- [ ] Validation rejects invalid user IDs
- [ ] Validation rejects checking balance with self
- [ ] Authentication required for all endpoints
- [ ] Balances update correctly when new expenses added
- [ ] Deleted expenses are not included in calculations

---

## Understanding the Balance Logic

### Key Concepts:

1. **When you PAY:**

   - Others owe you (their share amounts)
   - You paid the full amount
   - Your own share doesn't count as "owed to you"

2. **When you're a PARTICIPANT:**

   - You owe the payer (your share amount)
   - If you're both payer and participant, you only owe for others' shares

3. **Net Balance:**

   ```
   Net = (What others owe you) - (What you owe others)
   Positive = You are owed money
   Negative = You owe money
   Zero = All settled
   ```

4. **Pairwise Balance:**
   ```
   Balance with Person X = (What X owes you) - (What you owe X)
   Positive = They owe you
   Negative = You owe them
   Zero = Settled
   ```

---

## Success Criteria

✅ Overall balance calculations are accurate  
✅ Per-user breakdown is correct  
✅ Pairwise balances match expectations  
✅ All expenses are included in calculations  
✅ Deleted expenses are excluded  
✅ Both paise and rupee amounts returned  
✅ Clear status messages (owes_you/you_owe/settled)  
✅ Validation works correctly  
✅ Authentication required

**Phase 4 Complete!** Ready for Phase 5 (Transactions/Settle Up) 🎉
