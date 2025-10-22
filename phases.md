Here’s a step-by-step breakdown of what to focus on, in order, based on the roadmap:

---

### **Phase 1 – Setup**
1. Initialize the backend project:
   - Ensure package.json is set up with dependencies (`express`, `mongoose`, `dotenv`, etc.).
   - Add ESLint and Prettier for consistent code formatting.
   - Create a `.env` file with placeholders for `MONGO_URI`, `JWT_SECRET`, and `PORT`.

2. Set up the basic server:
   - Create an Express app with middleware (`morgan`, `cors`, JSON parsing).
   - Add a `/health` route to verify the server is running.
   - Load environment variables from `.env`.

---

### **Phase 2 – Auth and Users**
3. Implement user authentication:
   - Create a `User` model with fields: `name`, `email`, `passwordHash`.
   - Add endpoints:
     - `POST /api/auth/register` for user signup.
     - `POST /api/auth/login` for user login.
     - `GET /api/auth/me` to fetch the current user (protected route).
   - Use `bcrypt` for password hashing and `jsonwebtoken` for JWT issuance.

4. Add a contact search endpoint:
   - `GET /api/users?email=` to check if a user exists by exact email match.

---

### **Phase 3 – Expense Management**
5. Design the `Expense` model:
   - Fields: `title`, `amount` (in paise), `payer`, `participants` (array of user shares), `splitMethod`, `isDeleted`, `createdBy`.

6. Implement expense creation:
   - Add `POST /api/expenses` to create an expense.
   - Validate:
     - Sum of participant shares equals the total amount.
     - All participant IDs are valid users.
   - Store the expense in the database.

---

### **Phase 4 – Balance Calculation**
7. Add balance calculation logic:
   - `GET /api/balances` to compute net balances for the current user.
   - `GET /api/balances/:userId` to compute pairwise balances with another user.
   - Use server-side aggregation or in-memory computation for MVP.

---

### **Phase 5 – Transactions (Settle Up)**
8. Implement the `Transaction` model:
   - Fields: `from`, `to`, `amount` (in paise), `note`, `createdBy`.

9. Add transaction endpoints:
   - `POST /api/transactions` to record a settlement between two users.
   - Update balances accordingly.

---

### **Phase 6 – Activity / Notifications**
10. Create the `Activity` model:
    - Fields: `type`, `actor`, `targets`, `payload`, `isReadBy`.

11. Add activity endpoints:
    - `GET /api/activities` to fetch activity logs.
    - `PATCH /api/activities/:id/read` to mark activities as read.

---

### **Phase 7 – Edit/Delete/Restore Expenses**
12. Add soft-delete functionality:
    - Mark expenses as `isDeleted: true` instead of removing them.
    - Add `POST /api/expenses/:id/restore` to restore deleted expenses.

13. Implement edit functionality:
    - Add `PATCH /api/expenses/:id` to edit an expense.
    - Validate edits (e.g., sum of shares, valid participants).

---

### **Phase 8 – Testing & Documentation**
14. Write tests:
    - Use Jest + Supertest for API testing.
    - Cover critical endpoints: auth, expense creation, balances, transactions.

15. Document the API:
    - Create a Postman collection or OpenAPI spec for all endpoints.

---

### **Phase 9 – Deployment**
16. Deploy the backend:
    - Use Render, Heroku, or Railway for hosting.
    - Set environment variables (`MONGO_URI`, `JWT_SECRET`, etc.) in the deployment platform.

---

### **Phase 10 – Frontend Integration**
17. Build the frontend:
    - Start with basic pages: login, home (balances), expense creation.
    - Connect to backend APIs for data.

---

Let me know which phase you’d like to start with, and I can guide you further!