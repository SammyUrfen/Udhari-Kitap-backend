# 🧾 Udhari-Kitap Backend

A backend server for **Udhari Kitap**, a simple and reliable web app to track shared expenses and settlements between friends — inspired by Splitwise.

---

## 🚀 Overview

Udhari-Kitap helps users keep track of how much they owe or are owed in everyday shared expenses.  
It allows users to add friends, record expenses, split payments equally or unequally, and settle balances when payments are made.

All transactions are handled in **Indian Rupees (₹)**, with exact precision using **paise** for internal calculations.

---

## ✨ Features

- 🔐 **User Accounts** – Register and log in securely  
- 👥 **Add Friends** – Search users by their email and connect  
- 💸 **Add Expenses** – Record shared expenses and splits  
- 📊 **Balance Summary** – View how much you owe or are owed  
- 🤝 **Settle Up** – Record payments between users  
- 🕓 **Activity Feed** – See updates when expenses are added or edited  
- 🗑️ **Undo Actions** – Restore deleted expenses if needed  

*(Optional)*  
- 🖼️ **Profile Pictures** – Users can upload profile photos using Cloudinary  

---

## 🧱 Tech Stack

| Layer | Technology |
|:--|:--|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB (via Mongoose) |
| Authentication | JWT |
| Environment Config | dotenv |
| Validation | express-validator |
| Logging | morgan |

---

## ⚙️ Setup & Installation

### 1️⃣ Clone the repository
```bash
git clone https://github.com/SammyUrfen/Udhari-Kitap-backend.git
cd Udhari-Kitap-backend
```

### 2️⃣ Install dependencies

```bash
npm install
```

### 3️⃣ Create a `.env` file

Example configuration:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/udhari-kitap
JWT_SECRET=your_jwt_secret_here
```

*(If you enable profile pictures, also include your Cloudinary credentials.)*

### 4️⃣ Start the development server

```bash
npm run dev
```

### 5️⃣ Visit

```
http://localhost:5000
```

You should see a message confirming that the server is running.

---

## 💰 Currency Handling

All monetary values are stored internally in **paise** (1 Rupee = 100 Paise).
This ensures accurate financial calculations and avoids rounding errors.
The API automatically converts between rupees and paise as needed.

---

## 🧠 How It Works (High-Level)

1. Users register and log in using their email.
2. Expenses are added with participants and split methods.
3. The system calculates how much each user owes or is owed.
4. Balances are updated when users settle their payments.
5. Activities keep everyone informed of changes.

---

## 🧰 Development Notes

* Use **Postman** or **Thunder Client** to test API routes.
* Always start the backend before the frontend.
* Keep sensitive information (like JWT secrets) only in your `.env` file.
* For production deployment, ensure CORS and environment variables are configured correctly.

---

## 📦 Deployment

You can deploy the backend using services like **Render**, **Railway**, or **Heroku**, and host your MongoDB on **MongoDB Atlas**.
For best performance and safety:

* Use a strong `JWT_SECRET`
* Enable HTTPS (SSL)
* Restrict database access to trusted IPs

---

## ⚖️ License

This project is licensed under the **MIT License**.
Feel free to modify and use it for learning or personal projects.

---

Built with ❤️ to make sharing expenses easy and fair.

