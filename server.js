const express = require("express");
const { sign } = require("jsonwebtoken");
const mysql = require("mysql2/promise");
const { Telegraf } = require("telegraf");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);
const jwt_secret = process.env.JWT_SECRET_KEY;

app.use(cors());
app.use(express.json()); // Add this line to parse JSON request bodies

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: 22394,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 60000,
  acquireTimeout: 60000,
});
/****************************************USER API*************************************************************/
// API endpoint to get user data
app.get("/user/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      "SELECT id, username, level, gold FROM user WHERE id = ?",
      [userId]
    );
    connection.release();

    if (rows.length > 0) {
      const token = jwt.sign(rows[0], jwt_secret);
      res.json(token);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// New POST endpoint to save or update user data
app.post("/user/:userId", async (req, res) => {
  const userId = req.params.userId;
  const { username, level, gold } = req.body;

  if (!username || level === undefined || gold === undefined) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const connection = await pool.getConnection();

    // Check if user exists
    const [existingUser] = await connection.execute(
      "SELECT id FROM user WHERE id = ?",
      [userId]
    );

    let result;
    if (existingUser.length > 0) {
      // Update existing user
      [result] = await connection.execute(
        "UPDATE user SET username = ?, level = ?, gold = ? WHERE id = ?",
        [username, level, gold, userId]
      );
    } else {
      // Insert new user
      [result] = await connection.execute(
        "INSERT INTO user (id, username, level, gold) VALUES (?, ?, ?, ?)",
        [userId, username, level, gold]
      );
    }

    connection.release();

    if (result.affectedRows > 0) {
      const userData = { id: userId, username, level, gold };
      const token = jwt.sign(userData, jwt_secret);
      res.status(200).json({ message: "User data saved successfully", token });
    } else {
      res.status(500).json({ message: "Failed to save user data" });
    }
  } catch (error) {
    console.error("Error saving user data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/************************************GOLD API*********************************************************** */
// 1. GET Endpoint to Fetch User's Gold
app.get("/user/:userId/gold", async (req, res) => {
  const userId = req.params.userId;

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      "SELECT gold FROM user WHERE id = ?",
      [userId]
    );
    connection.release();

    if (rows.length > 0) {
      res.status(200).json( rows[0].gold );
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Error fetching user gold:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// 2. POST Endpoint to Update User's Gold
app.post("/user/:userId/gold", async (req, res) => {
  const userId = req.params.userId;
  const { gold } = req.body;

  if (gold === undefined) {
    return res.status(400).json({ message: "Missing 'gold' in request body" });
  }

  try {
    const connection = await pool.getConnection();

    // Check if user exists
    const [existingUser] = await connection.execute(
      "SELECT id FROM user WHERE id = ?",
      [userId]
    );

    if (existingUser.length === 0) {
      connection.release();
      return res.status(404).json({ message: "User not found" });
    }

    // Update user's gold
    const [result] = await connection.execute(
      "UPDATE user SET gold = ? WHERE id = ?",
      [gold, userId]
    );

    connection.release();

    if (result.affectedRows > 0) {
      res
        .status(200)
        .json({ message: "User gold updated successfully"});
    } else {
      res.status(500).json({ message: "Failed to update user gold" });
    }
  } catch (error) {
    console.error("Error updating user gold:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/************************************LEVEL API*********************************************************** */
// 1. GET Endpoint to Fetch User's Level
app.get("/user/:userId/level", async (req, res) => {
  const userId = req.params.userId;

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      "SELECT level FROM user WHERE id = ?",
      [userId]
    );
    connection.release();

    if (rows.length > 0) {
      res.status(200).json( rows[0].level );
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Error fetching user level:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// 2. POST Endpoint to Update User's Gold
app.post("/user/:userId/level", async (req, res) => {
  const userId = req.params.userId;
  const { level } = req.body;

  if (level === undefined) {
    return res.status(400).json({ message: "Missing 'level' in request body" });
  }

  try {
    const connection = await pool.getConnection();

    // Check if user exists
    const [existingUser] = await connection.execute(
      "SELECT id FROM user WHERE id = ?",
      [userId]
    );

    if (existingUser.length === 0) {
      connection.release();
      return res.status(404).json({ message: "User not found" });
    }

    // Update user's gold
    const [result] = await connection.execute(
      "UPDATE user SET level = ? WHERE id = ?",
      [level, userId]
    );

    connection.release();

    if (result.affectedRows > 0) {
      res
        .status(200)
        .json({ message: "User level updated successfully"});
    } else {
      res.status(500).json({ message: "Failed to update user level" });
    }
  } catch (error) {
    console.error("Error updating user level:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// Start the bot
bot.launch();
console.log("Bot is running...");

// Start the Express server
const port = process.env.PORT || 9995;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
