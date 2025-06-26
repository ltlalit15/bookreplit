import { pool } from "../Config/dbConnect.js";
import bcrypt from 'bcrypt'
import { generatetoken } from "../Config/jwt.js";

export const getallstaffs = async (req, res) => {
    try {
        const mysqlQuery = "SELECT * FROM staff";
        const [result] = await pool.query(mysqlQuery);
        if (result) {
            return res.status(200).json(
                {
                    message: 'Users fetched successfully',
                    data: result
                }
            );
        }
        else {
            return res.result.status(404).json(
                {
                    message: 'No data found'
                }

            );
        }
    }
    catch (error) {
        return res.result.status(500).json(
            {
                message: "Internal server error",
                error: error.message
            }
        );
    }
};

export const getstaff = async (req, res) => {
    try {
        const { id } = req.params
        const [result] = await pool.query(
            "SELECT * FROM staff WHERE id=?", id
        )
        if (result) {
            return res.status(200).json(
                {
                    message: "single Users fetched successfully",
                    data: result
                }
            )
        }
        else {
            return res.result.status(404).json(
                {
                    message: "user not found"
                }
            )
        }
    }
    catch (error) {
        return res.result.status(500).json({
            message: "Internal server error", error: error.message
        });
    }
}
// export const createstaff = async (req, res) => {
//     try {
//         const { username, email, password, role } = req.body
//         const staffdata = {
//             username, email, password, role
//         }
//         const [result] = await pool.query("INSERT INTO staff SET ?", staffdata)
//         if (result) {
//             return res.status(200).json(
//                 { 
//                     message: `${username} created sucessfully`, 
//                     data: staffdata,
//                 }
//                 );
//         }
//         else {
//             return res.status(404).json({ message: "staff not created" });
//         }
//     }
//     catch (error) {
//         return res.result.status(500).json({ message: "internal server error", error: error.message });

//     }
// }








// export const staffLogin = async (req, res) => {
//     try {
//         const { email, password } = req.body;

//         // Check if staff exists in the database
//         const [rows] = await pool.query("SELECT * FROM staff WHERE email = ?", [email]);

//         if (rows.length === 0) {
//             return res.status(401).json({ message: "Invalid email or password" });
//         }

//         const staff = rows[0];

//         // Compare input password with the stored hashed password
//         const isPasswordValid = await bcrypt.compare(password, staff.password);

//         if (!isPasswordValid) {
//             return res.status(401).json({ message: "Invalid email or password" });
//         }

//         // Generate JWT token for authentication
//         const token = jwt.sign(
//             { id: staff.id, email: staff.email, role: staff.role },
//             "your_secret_key", // Replace with a secure key (use .env file in production)
//             { expiresIn: "1h" }
//         );

//         return res.status(200).json({
//             message: "Login successful",
//             token,
//             staff: {
//                 id: staff.id,
//                 username: staff.username,
//                 email: staff.email,
//                 role: staff.role,
//             },
//         });
//     } catch (error) {
//         console.error("Error during login:", error);
//         return res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// };



// export const staffLogin = async (req, res) => {
//     try {
//         const { email, password } = req.body;
//         const [existinguser] = await pool.query("SELECT * FROM staff WHERE email= ?", [email]);

//         if (existinguser.length === 0) {
//             // await logLoginAttempt(null, 0); 
//             return res.status(403).json("User not found");
//         }

//         const user = existinguser[0];
//         const comparePassword = await bcrypt.compare(password, user.password);
//         if (!comparePassword) {
//             // Log failed login attempt (wrong password)
//             // await logLoginAttempt(user.id, 0);
//             return res.status(403).json("Password is incorrect");
//         }

//         // if (!user.role) {
//         //     return res.status(500).json({ message: "User role is missing in the database" });
//         // }
//         // last_login
//         // await pool.query("UPDATE users SET last_login = NOW() WHERE id = ?", [user.id]);

//         const token = await generatetoken(user.id);
//         // Log successful login attempt
//         // await logLoginAttempt(user.id, 1);

//            // User logged activty
//         // await logUserActivity(user.id, "User logged in successfully");

//         return res.status(201).json({
//             message: "Login Successfully",
//             data: {
//                 username: user.username,
//                 email: user.email,
//                 role: user.role,
//                 token
//             },

//         });
//     } catch (error) {
//         return res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// };

export const staffLogin = async (req, res) => {
    const { email, password } = req.body;
    const sql = "SELECT * FROM staff WHERE email= ?"
    const [existinguser] = await pool.query(sql, [email]);
    if (existinguser.length === 0) {
        return res.status(404).json("User not found");
    }
    const user = existinguser[0];
    const comparePassword = await bcrypt.compare(password, user.password);
    if (!comparePassword) {
        // Log failed login attempt (wrong password)
        // await logLoginAttempt(user.id, 0);
        return res.status(403).json("Password is incorrect");
    }
    return res.status(201).json({
        message: "Login Successfully",
        data: {
            username: user.username,
            email: user.email,
            role: user.role,
            token
        },
    })

}

// export const createstaff = async (req, res) => {
//     try {
//         const { username, email, password } = req.body
//         const existingstaff = await pool.query("SELECT email FROM staff WHERE email=?", email)
//         if (!existingstaff) {
//             return res.status(403).json("staff already exist")
//         }
//         else {
//             const hashpassword = await bcrypt.hash(password, 10)
//             const staffdata = {
//                 username,
//                 email,
//                 password: hashpassword,
//             }
//             const [result] = await pool.query("INSERT INTO staff SET ?", staffdata)
//             if (result) {
//                 return res.status(200).json({ message: `${username} created sucessfully`, data: staffdata });
//             }
//             else {
//                 return res.status(404).json({ message: "staff not created" });
//             }
//         }
//     }
//     catch (error) {
//         return res.result.status(500).json({ message: "internal server error", error: error.message });

//     }
// }

export const updatestaff = async (req, res) => {
    try {
        const { username, email, password } = req.body
        const { id } = req.params
        const staffdata = {
            username, email, password
        }
        const [result] = await pool.query("UPDATE staff SET username=?, email=?, password=? WHERE id =?", [staffdata.username, staffdata.email, staffdata.password, id])
        const [getstaff] = await pool.query("SELECT * FROM staff WHERE id = ?", id)
        if (result) {
            return res.status(200).json({ message: `${username} Updated sucessfully`, data: getstaff })
        }
        else {
            return res.status(404).json({ message: "Staff not Updated" })
        }
    }
    catch (error) {
        return res.status(500).json({ error: error.message })
    }
}


export const deletestaff = async (req, res) => {
    try {
        const { id } = req.params
        const [result] = await pool.query("DELETE FROM staff WHERE id = ?", id)
        if (result) {
            return res.status(200).json({ message: `user deleted sucessfully` })
        }
        else {
            res.status(404).json({ message: "staff not found" })
        }
    }
    catch (error) {
        return res.status(500).json({ message: "internal server error", error: error.message });
    }
}