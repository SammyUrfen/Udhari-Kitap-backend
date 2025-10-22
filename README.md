
# 🧾 Udhari-Kitap Backend

Backend server for **Udhari Kitap**, a web-based expense-sharing and lending tracker inspired by Splitwise.
Built with **Node.js**, **Express**, and **MongoDB (Mongoose)**.

---

## 🚀 Overview

Udhari Kitap helps users manage shared expenses, track how much they owe or are owed, and settle balances easily.
Users can add friends via email, log shared expenses, view balances per person, and record settlements — all in **rupees (₹)**.

The backend provides secure REST APIs for authentication, expenses, balances, activities, and settlements.

---

## 🧱 Tech Stack

| Layer            | Technology                          |
| :--------------- | :---------------------------------- |
| Runtime          | Node.js (v16+)                      |
| Framework        | Express.js                          |
| Database         | MongoDB (via Mongoose)              |
| Auth             | JWT (JSON Web Token)                |
| Validation       | express-validator / Joi             |
| Logging          | morgan                              |
| Environment      | dotenv                              |
| Optional (later) | Socket.IO (real-time notifications) |

---

## 📁 Project Structure

```
Udhari-Kitap-backend/
│
├── src/
│   ├── config/          # DB, JWT, environment configs
│   ├── controllers/     # Request handlers
│   ├── models/          # Mongoose models (User, Expense, Transaction, Activity)
│   ├── routes/          # Route definitions
│   ├── middleware/      # Auth & error handling
│   ├── services/        # Business logic (split calc, balances)
│   ├── utils/           # Helpers and constants
│   ├── app.js           # Express app setup
│   └── server.js        # Server start file
│
├── .env.example
├── package.json
└── README.md
```

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the repo

```bash
git clone https://github.com/<your-username>/Udhari-Kitap-backend.git
cd Udhari-Kitap-backend
```

### 2️⃣ Install dependencies

```bash
npm install
```

### 3️⃣ Setup environment variables

Create a `.env` file in the root with:

```
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/udhari-kitap
JWT_SECRET=your_jwt_secret_here
```

### 4️⃣ Run the server

```bash
npm run dev     # for development (nodemon)
# or
npm start
```

Server runs at: `http://localhost:5000`

---

## 🧾 Core Concepts

### 💰 All amounts stored in rupees

* Currency is fixed to **INR (₹)**.
* Amounts are stored as **integers** in paise (to avoid float issues).

  * Example: ₹50.25 → stored as `5025`.

### 👥 Contact & User flow

* When adding a participant to an expense, users must enter their **email**.
* Backend only accepts users whose **email exactly matches** a registered account.
* The **contact name** shown in the UI is chosen by the user locally (not stored globally).

### 🔢 Expense splitting logic

* Split method (`equal`, `unequal`, `percent`) is stored in DB for editing/reference.
* **Frontend handles the actual split calculation** before sending data to backend.
* Backend only validates:

  * Sum of participant shares = total amount
  * Participants exist and are registered users
  * Valid split method and payer

---

## 🗃️ Database Models (simplified)

### User

```js
{
  name: String,
  email: String, // unique
  passwordHash: String,
  avatarUrl?: String,
  createdAt: Date
}
```

### Expense

```js
{
  title: String,
  amount: Number, // stored in paise
  currency: "INR",
  payer: ObjectId<User>,
  participants: [
    {
      user: ObjectId<User>,
      share: Number, // in paise
    }
  ],
  splitMethod: "equal" | "unequal" | "percent",
  comments: [
    { user: ObjectId<User>, text: String, createdAt: Date }
  ],
  isDeleted: Boolean,
  createdBy: ObjectId<User>,
  createdAt: Date,
  updatedAt: Date
}
```

### Transaction (Settle Up)

```js
{
  from: ObjectId<User>,
  to: ObjectId<User>,
  amount: Number, // in paise
  currency: "INR",
  note: String,
  createdAt: Date
}
```

### Activity

```js
{
  type: "expense_added" | "expense_edited" | "expense_deleted" | "expense_restored" | "transaction",
  actor: ObjectId<User>,
  targets: [ObjectId<User>],
  payload: { expenseId, message },
  isReadBy: [ObjectId<User>],
  createdAt: Date
}
```

---

## 🧩 API Overview

| Endpoint                    | Method | Description                      |
| --------------------------- | ------ | -------------------------------- |
| `/api/auth/register`        | POST   | Register a new user              |
| `/api/auth/login`           | POST   | Login & receive JWT              |
| `/api/auth/me`              | GET    | Get current user                 |
| `/api/users?search=email`   | GET    | Search user by exact email       |
| `/api/expenses`             | POST   | Add new expense                  |
| `/api/expenses`             | GET    | List expenses                    |
| `/api/expenses/:id`         | GET    | Get single expense               |
| `/api/expenses/:id`         | PATCH  | Edit expense (if participant)    |
| `/api/expenses/:id`         | DELETE | Soft-delete expense              |
| `/api/expenses/:id/restore` | POST   | Restore deleted expense          |
| `/api/transactions`         | POST   | Record settlement                |
| `/api/balances`             | GET    | Get overall balances             |
| `/api/balances/:userId`     | GET    | Get personal balance with a user |
| `/api/activities`           | GET    | Get activity/notifications list  |

All protected endpoints require the `Authorization: Bearer <token>` header.

---

## 🧮 Balance Calculation

Balances are computed **on demand** (not stored permanently):

1. Sum up each user’s owed and paid shares from all non-deleted expenses.
2. Adjust with transactions (settle-ups).
3. Return net balances per person and total owed/owing.

This ensures perfect accuracy even if past expenses are edited or restored.

---

## 🧠 Planned Enhancements

* Real-time notifications via Socket.IO
* Group-based splitting (events/trips)
* Expense comments editing & deletion
* CSV export of expense history
* Email verification & password reset

---

## 🧰 Development Tips

* Use **Postman** for testing APIs.
* Maintain separate `.env.development` and `.env.production` files.
* Use **Prettier + ESLint** to keep code consistent.
* Store sensitive data only in `.env`.
* Branch naming convention: `feature/<feature-name>`, `fix/<issue>`.

---

## 🧪 Example .env

```
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/udhari-kitap
JWT_SECRET=mySecretKey
```

---

## 🧤 License

MIT License © 2025 Bibek Jyoti Charah

---

Would you like me to **generate the initial project boilerplate** (folder structure, app.js, models, routes, auth controller, MongoDB connection, etc.) in **JavaScript** so you can directly start coding?
I can make it ready-to-run with placeholder endpoints (`/api/auth/register`, `/api/expenses`) and clean structure in one go.
