# Phase 6 Testing Guide: Activity Feed / Notifications

This guide covers testing the activity feed and notification system that tracks all user actions (expenses created, payments made, etc.).

## Prerequisites

- Server running on `http://localhost:5000`
- User tokens and IDs from Phase 2-5
- Some existing expenses and transactions in the database

## Test Environment Variables

```bash
export ALICE_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4Zjg5YzEzMTUyN2FlYTgwOGU0NDczNSIsImVtYWlsIjoiYWxpY2VAYmFsYW5jZS50ZXN0IiwiaWF0IjoxNzYxMTIzMzQ3LCJleHAiOjE3NjE3MjgxNDd9.g5V9748uO6yR4aHhu0_BUszFyxJNJZXNvMMstpr_41k"
export ALICE_ID="68f89c131527aea808e44735"
export BOB_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4Zjg5YzFjMTUyN2FlYTgwOGU0NDczOCIsImVtYWlsIjoiYm9iQGJhbGFuY2UudGVzdCIsImlhdCI6MTc2MTEyMzM1NiwiZXhwIjoxNzYxNzI4MTU2fQ.1l20E2_rua4SV7M_FdHWwBfaZSbfemDcTnVY0zSMfa4"
export BOB_ID="68f89c1c1527aea808e44738"
export CHARLIE_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4Zjg5YzIzMTUyN2FlYTgwOGU0NDczYiIsImVtYWlsIjoiY2hhcmxpZUBiYWxhbmNlLnRlc3QiLCJpYXQiOjE3NjExMjMzNjMsImV4cCI6MTc2MTcyODE2M30.F0s-gLHxcF2UUaSdkT4KZ1_losy-cOHKAeXEIJ_7ei4"
export CHARLIE_ID="68f89c231527aea808e4473b"
```

---

## 1. Create Activities by Performing Actions

Activities are automatically created when users perform actions. Let's create some:

### Create an Expense (Generates Activity)
```bash
curl -X POST http://localhost:5000/api/expenses \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Coffee Shop",
    "amount": 150,
    "payer": "'$ALICE_ID'",
    "participants": [
      {"user": "'$ALICE_ID'", "share": 50},
      {"user": "'$BOB_ID'", "share": 50},
      {"user": "'$CHARLIE_ID'", "share": 50}
    ],
    "splitMethod": "equal"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Expense created successfully",
  "expense": { ... }
}
```

**What Happens Behind the Scenes:**
- An activity is created with type `EXPENSE_CREATED`
- Alice, Bob, and Charlie are all added as `targets` (they'll see this in their feeds)
- Alice is the `actor` (person who performed the action)

### Create a Transaction (Generates Activity)
```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "'$ALICE_ID'",
    "amount": 50,
    "note": "Coffee payment"
  }'
```

**Expected Response:**
```json
{
  "message": "Transaction created successfully",
  "transaction": { ... }
}
```

**What Happens Behind the Scenes:**
- An activity is created with type `TRANSACTION_CREATED`
- Both Bob and Alice are targets
- Bob is the actor

---

## 2. Get Activity Feed

### Alice's Activity Feed
```bash
curl -X GET http://localhost:5000/api/activities \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "activities": [
    {
      "id": "activity_id_2",
      "type": "TRANSACTION_CREATED",
      "actor": {
        "_id": "bob_id",
        "name": "Bob",
        "email": "bob@balance.test"
      },
      "payload": {
        "title": "Payment: ₹50",
        "description": "Bob paid ₹50 to Alice - Coffee payment",
        "amount": 5000,
        "transactionId": "transaction_id",
        "metadata": {
          "note": "Coffee payment"
        }
      },
      "isRead": false,
      "createdAt": "2025-10-22T09:00:00.000Z"
    },
    {
      "id": "activity_id_1",
      "type": "EXPENSE_CREATED",
      "actor": {
        "_id": "alice_id",
        "name": "Alice",
        "email": "alice@balance.test"
      },
      "payload": {
        "title": "New expense: Coffee Shop",
        "description": "Alice paid ₹150 for \"Coffee Shop\"",
        "amount": 15000,
        "expenseId": "expense_id",
        "metadata": {
          "participantCount": 3,
          "splitMethod": "equal"
        }
      },
      "isRead": false,
      "createdAt": "2025-10-22T08:55:00.000Z"
    }
  ],
  "unreadCount": 2,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1
  }
}
```

### Bob's Activity Feed
```bash
curl -X GET http://localhost:5000/api/activities \
  -H "Authorization: Bearer $BOB_TOKEN"
```

**Expected Response:**
Similar structure, showing the same activities since Bob is a target of both.

### Charlie's Activity Feed
```bash
curl -X GET http://localhost:5000/api/activities \
  -H "Authorization: Bearer $CHARLIE_TOKEN"
```

**Expected Response:**
Charlie should see the expense activity but NOT the transaction (since he wasn't involved in the payment).

---

## 3. Get Unread Count

### Check Alice's Unread Count
```bash
curl -X GET http://localhost:5000/api/activities/unread-count \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "unreadCount": 2
}
```

---

## 4. Mark Activity as Read

First, save an activity ID from the feed:
```bash
# Get activities and extract an ID
ACTIVITY_ID=$(curl -s http://localhost:5000/api/activities \
  -H "Authorization: Bearer $ALICE_TOKEN" | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['activities'][0]['id'])")

echo $ACTIVITY_ID
```

### Mark Specific Activity as Read
```bash
curl -X PATCH "http://localhost:5000/api/activities/$ACTIVITY_ID/read" \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Activity marked as read",
  "activity": {
    "id": "activity_id",
    "type": "TRANSACTION_CREATED",
    "actor": { ... },
    "payload": { ... },
    "isRead": true,
    "createdAt": "..."
  }
}
```

### Verify Unread Count Decreased
```bash
curl -X GET http://localhost:5000/api/activities/unread-count \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "unreadCount": 1
}
```

---

## 5. Mark All Activities as Read

```bash
curl -X PATCH http://localhost:5000/api/activities/read-all \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "1 activity marked as read",
  "count": 1
}
```

### Verify All Are Now Read
```bash
curl -X GET http://localhost:5000/api/activities/unread-count \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "unreadCount": 0
}
```

### Check Activity Feed (All Should Show isRead: true)
```bash
curl -X GET http://localhost:5000/api/activities \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Expected Response:**
All activities should have `"isRead": true`

---

## 6. Filter Activities

### Get Only Unread Activities
```bash
curl -X GET "http://localhost:5000/api/activities?unreadOnly=true" \
  -H "Authorization: Bearer $BOB_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "activities": [
    // Only activities where isRead: false
  ],
  "unreadCount": 2,
  "pagination": { ... }
}
```

### Filter by Activity Type
```bash
# Get only expense activities
curl -X GET "http://localhost:5000/api/activities?type=EXPENSE_CREATED" \
  -H "Authorization: Bearer $BOB_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "activities": [
    // Only EXPENSE_CREATED activities
  ],
  "unreadCount": 2,
  "pagination": { ... }
}
```

### Get Only Transaction Activities
```bash
curl -X GET "http://localhost:5000/api/activities?type=TRANSACTION_CREATED" \
  -H "Authorization: Bearer $BOB_TOKEN"
```

---

## 7. Pagination

### Get First Page (2 items per page)
```bash
curl -X GET "http://localhost:5000/api/activities?page=1&limit=2" \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "activities": [
    // 2 most recent activities
  ],
  "unreadCount": 0,
  "pagination": {
    "page": 1,
    "limit": 2,
    "total": 5,
    "totalPages": 3
  }
}
```

### Get Second Page
```bash
curl -X GET "http://localhost:5000/api/activities?page=2&limit=2" \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

---

## 8. Validation Tests

### Test 1: Mark Non-Existent Activity as Read (Should Fail)
```bash
curl -X PATCH "http://localhost:5000/api/activities/507f1f77bcf86cd799439011/read" \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Expected Error Response:**
```json
{
  "error": "Activity not found"
}
```

### Test 2: Invalid Activity ID Format (Should Fail)
```bash
curl -X PATCH "http://localhost:5000/api/activities/invalid_id/read" \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Expected Error Response:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "msg": "Invalid activity ID format",
      "param": "id"
    }
  ]
}
```

### Test 3: Try to Mark Someone Else's Activity as Read (Should Fail)
This test requires an activity where the user is NOT a target. This is tricky to test directly, but the system prevents it.

---

## 9. Complete Workflow Test

Let's test the full activity lifecycle:

### Step 1: Check Initial State
```bash
echo "=== Bob's Initial Unread Count ==="
curl -s http://localhost:5000/api/activities/unread-count \
  -H "Authorization: Bearer $BOB_TOKEN" | python3 -m json.tool
```

### Step 2: Alice Creates New Expense
```bash
echo "=== Alice Creates Expense ==="
curl -s -X POST http://localhost:5000/api/expenses \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Lunch Together",
    "amount": 300,
    "payer": "'$ALICE_ID'",
    "participants": [
      {"user": "'$ALICE_ID'", "share": 100},
      {"user": "'$BOB_ID'", "share": 100},
      {"user": "'$CHARLIE_ID'", "share": 100}
    ],
    "splitMethod": "equal"
  }' | python3 -m json.tool
```

### Step 3: Bob Checks His Feed (Should See New Activity)
```bash
echo "=== Bob's Activity Feed ==="
curl -s http://localhost:5000/api/activities \
  -H "Authorization: Bearer $BOB_TOKEN" | python3 -m json.tool
```

### Step 4: Bob's Unread Count Increased
```bash
echo "=== Bob's Updated Unread Count ==="
curl -s http://localhost:5000/api/activities/unread-count \
  -H "Authorization: Bearer $BOB_TOKEN" | python3 -m json.tool
```

### Step 5: Bob Marks All as Read
```bash
echo "=== Mark All as Read ==="
curl -s -X PATCH http://localhost:5000/api/activities/read-all \
  -H "Authorization: Bearer $BOB_TOKEN" | python3 -m json.tool
```

### Step 6: Verify Unread Count is Zero
```bash
echo "=== Bob's Final Unread Count ==="
curl -s http://localhost:5000/api/activities/unread-count \
  -H "Authorization: Bearer $BOB_TOKEN" | python3 -m json.tool
```

---

## 10. Activity Types Reference

### EXPENSE_CREATED
- **Triggered When:** A new expense is created
- **Actor:** User who created the expense
- **Targets:** Payer + all participants
- **Payload:** Expense title, description, amount, participant count, split method

### TRANSACTION_CREATED
- **Triggered When:** A payment/settlement is made
- **Actor:** User who made the payment
- **Targets:** Sender and receiver of the payment
- **Payload:** Transaction amount, note, from/to users

### Future Activity Types (Not Yet Implemented)
- `EXPENSE_UPDATED`: When an expense is modified
- `EXPENSE_DELETED`: When an expense is deleted
- `USER_ADDED`: When a user is added to an expense

---

## Summary of Phase 6 Features

✅ **Activity Model**
- Tracks all user actions
- Supports multiple activity types
- Read/unread status per user
- Efficient querying with indexes

✅ **Activity Feed**
- Get activities for authenticated user
- Pagination support
- Filter by type
- Filter by read/unread status
- Shows unread count

✅ **Mark as Read**
- Mark individual activities as read
- Mark all activities as read at once
- Authorization checks (only targets can mark as read)

✅ **Automatic Activity Creation**
- Activities automatically created when:
  - Expenses are created
  - Transactions are made
- Non-blocking (doesn't slow down main operations)
- Error handling (failures don't break main flow)

✅ **Validation**
- Activity ID validation
- Authorization checks
- Proper error responses

---

## Phase 6 Complete! 🎉

Your activity feed and notification system is fully functional. Users can:
1. See all activities related to them
2. Track expenses and payments in real-time
3. Mark activities as read/unread
4. Filter and paginate activity feeds
5. Check unread notification counts

**Next Steps:** Phase 7 - Edit/Delete/Restore Expenses (optional features from roadmap)
