// import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";
// import connection from "../config/db.js"; // Assuming a MySQL DB connection is set up



// // Register User (Staff or Client)
// export const createUserss = async (req, res) => {
//     try {
//         const { username, email, password, role } = req.body;

//         if (!username || !email || !password || !role) {
//             return res.status(400).json({ message: "All fields are required" });
//         }

//         // Check if user already exists
//         const [existingUser] = await connection.query("SELECT * FROM users WHERE email=?", [email]);
//         if (existingUser.length > 0) {
//             return res.status(409).json({ message: "User already exists" });
//         }

//         // Hash password
//         const hashedPassword = await bcrypt.hash(password, 10);

//         // Insert user into the users table
//         const [result] = await connection.query(
//             "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
//             [username, email, hashedPassword, role]
//         );

//         const userId = result.insertId;

//         // If role is 'staff' or 'user', insert extra data in their respective tables
//         if (role === "staff") {
//             await connection.query("INSERT INTO staff (user_id, department) VALUES (?, ?)", [userId, req.body.department]);
//         } else if (role === "user") {
//             await connection.query("INSERT INTO clients (user_id, subscription_type) VALUES (?, ?)", [userId, req.body.subscription_type]);
//         }

//         return res.status(201).json({ message: `${role} registered successfully`, userId });
//     } catch (error) {
//         return res.status(500).json({ message: "Error registering user", error: error.message });
//     }
// };

// // User Login
// export const userLogin = async (req, res) => {
//     try {
//         const { email, password } = req.body;

//         const [users] = await connection.query("SELECT * FROM users WHERE email=?", [email]);
//         if (users.length === 0) {
//             return res.status(404).json({ message: "User not found" });
//         }

//         const user = users[0];

//         // Compare passwords
//         const isMatch = await bcrypt.compare(password, user.password);
//         if (!isMatch) {
//             return res.status(401).json({ message: "Invalid credentials" });
//         }

//         // Generate Token
//         const token = generateToken(user.id, user.role);

//         // Update last login time
//         await connection.query("UPDATE users SET last_login = NOW() WHERE id = ?", [user.id]);

//         return res.status(200).json({
//             message: "Login successful",
//             data: {
//                 username: user.username,
//                 email: user.email,
//                 role: user.role,
//                 token,
//             },
//         });
//     } catch (error) {
//         return res.status(500).json({ message: "Login error", error: error.message });
//     }
// };

// // Fetch Single User
// export const getUser = async (req, res) => {
//     try {
//         const { id } = req.params;

//         const [users] = await connection.query("SELECT * FROM users WHERE id=?", [id]);
//         if (users.length === 0) {
//             return res.status(404).json({ message: "User not found" });
//         }

//         return res.status(200).json({ message: "User fetched successfully", data: users[0] });
//     } catch (error) {
//         return res.status(500).json({ message: "Error fetching user", error: error.message });
//     }
// };

// // Fetch All Users with Filtering by Role
// export const getAllUsers = async (req, res) => {
//     try {
//         const { role } = req.query;
//         let query = "SELECT * FROM users";
//         let params = [];

//         if (role) {
//             query += " WHERE role = ?";
//             params.push(role);
//         }

//         const [users] = await connection.query(query, params);
//         return res.status(200).json({ message: "Users fetched successfully", data: users });
//     } catch (error) {
//         return res.status(500).json({ message: "Error fetching users", error: error.message });
//     }
// };

// // Update User
// export const updateUser = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { username, email, password } = req.body;

//         let hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

//         const query = "UPDATE users SET username = ?, email = ?" + (hashedPassword ? ", password = ?" : "") + " WHERE id = ?";
//         const params = hashedPassword ? [username, email, hashedPassword, id] : [username, email, id];

//         const [result] = await connection.query(query, params);

//         if (result.affectedRows === 0) {
//             return res.status(404).json({ message: "User not found or no changes made" });
//         }

//         return res.status(200).json({ message: "User updated successfully" });
//     } catch (error) {
//         return res.status(500).json({ message: "Error updating user", error: error.message });
//     }
// };

// // Soft Delete User
// export const deleteUser = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const [result] = await connection.query("UPDATE users SET is_active = 0 WHERE id = ?", [id]);

//         if (result.affectedRows === 0) {
//             return res.status(404).json({ message: "User not found" });
//         }

//         return res.status(200).json({ message: "User deactivated successfully" });
//     } catch (error) {
//         return res.status(500).json({ message: "Error deleting user", error: error.message });
//     }
// };
