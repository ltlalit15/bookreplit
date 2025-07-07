import { pool } from "../Config/dbConnect.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { generatetoken } from "../Config/jwt.js";
import { v4 as uuidv4 } from "uuid";
import { config } from "dotenv";
import multer from "multer";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import nodemailer from 'nodemailer';
//import imagekit from "../imagekit.js";
//import upload from "../Middlewares/upload.js";

import { uploadToB2 } from "../utils/uploadToB2.js";

const upload = multer();

// 1. Get All Users
// export const getAllUsers = async (req, res) => {
//     try {
//         const mysqlQuery = "SELECT * FROM users";
//         const [result] = await pool.query(mysqlQuery);
//         if (result.length > 0) {
//             return res.status(200).json({ message: "Users fetched successfully", data: result });
//         } else {
//             return res.status(404).json({ message: "No data found" });
//         }
//     } catch (error) {
//         return res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// };



// export const getAllUsers = async (req, res) => {
//     try {
//         const mysqlQuery = "SELECT * FROM users";
//         const [users] = await pool.query(mysqlQuery);

//         if (users.length === 0) {
//             return res.status(404).json({ message: "No data found" });
//         }

//         // ✅ Loop through all users and attach remaining_days
//         for (let user of users) {
//             const subscriptionQuery = `
//                 SELECT end_date FROM subscriptions 
//                 WHERE user_id = ? 
//                 ORDER BY end_date DESC LIMIT 1
//             `;
//             const [subscriptionResult] = await pool.query(subscriptionQuery, [user.id]);

//             if (subscriptionResult.length > 0) {
//                 const endDate = new Date(subscriptionResult[0].end_date);
//                 const today = new Date();
//                 const timeDiff = endDate.getTime() - today.getTime();
//                 let remainingDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
//                 user.remainingDays = remainingDays < 0 ? 0 : remainingDays;

//                 user.plan_name = subscriptionResult[0].plan_name;
//                 user.remaining_days = remainingDays;
//                 user.subscription_status = endDate >= today ? "Active" : "Inactive";

//             } else {
//                 // user.remaining_days = 0; // If no subscription
//                 user.plan_name = null;
//                 user.remaining_days = 0;
//                 user.subscription_status = "Inactive";
//             }
//         }

//         return res.status(200).json({
//             message: "Users fetched successfully",
//             data: users
//         });

//     } catch (error) {
//         return res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// };


export const getAllUsers = async (req, res) => {
    try {
        const mysqlQuery = "SELECT * FROM users";
        const [users] = await pool.query(mysqlQuery);

        if (users.length === 0) {
            return res.status(404).json({ message: "No data found" });
        }

        for (let user of users) {
            // ✅ Include plan_name in your SELECT query
            const subscriptionQuery = `
                SELECT end_date, plan_name FROM subscriptions 
                WHERE user_id = ? 
                ORDER BY end_date DESC 
                LIMIT 1
            `;
            const [subscriptionResult] = await pool.query(subscriptionQuery, [user.id]);

            if (subscriptionResult.length > 0) {
                const { end_date, plan_name } = subscriptionResult[0];
                const endDate = new Date(end_date);
                const today = new Date();
                const timeDiff = endDate.getTime() - today.getTime();
                let remainingDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                remainingDays = remainingDays < 0 ? 0 : remainingDays;

                user.plan_name = plan_name;
                user.remaining_days = remainingDays;
                user.subscription_status = endDate >= today ? "Active" : "Inactive";
            } else {
                user.plan_name = null;
                user.remaining_days = 0;
                user.subscription_status = "Inactive";
            }
        }

        return res.status(200).json({
            message: "Users fetched successfully",
            data: users
        });

    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};



export const getPromoCodeUsage = async (req, res) => {
    try {
        const mysqlQuery = `
            SELECT 
                u.id AS user_id,
                CONCAT(u.firstname, ' ', u.lastname) AS username,
                u.promocode,
                CONCAT(u2.firstname, ' ', u2.lastname) AS referred_by,
                s.plan_name
            FROM users u
            LEFT JOIN subscriptions s ON u.promocode = s.promocode
            LEFT JOIN users u2 ON u.referred_by = u2.id
            GROUP BY u.id, u.promocode, u2.firstname, u2.lastname;
        `;

        const [result] = await pool.query(mysqlQuery);

        if (result.length > 0) {
            return res.status(200).json({ message: "Promo code usage details fetched successfully", data: result });
        } else {
            return res.status(404).json({ message: "No data found" });
        }
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};



export const getUserbyID = async (req, res) => {
    try {
        const { id } = req.params;
        const mysqlQuery = "SELECT * FROM users WHERE id = ?";
        const [result] = await pool.query(mysqlQuery, [id]);
        if (result.length > 0) {
            return res.status(200).json({ message: "Single Users fetched successfully", data: result });
        } else {
            return res.status(404).json({ message: "No data found" });
        }
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};






// export const signUp = async (req, res) => {
//     try {
//         const { firstname, email, lastname = "0", password, confirmpassword = "0", selectedPlan } = req.body;
//         console.log("req.body", req.body);

//         // Check if the email already exists
//         const [existingUser] = await pool.query("SELECT id FROM users WHERE email=?", [email]);
//         if (existingUser.length > 0) {
//             return res.status(403).json({ message: "User already exists" });
//         }

//         // Fetch the selected subscription plan
//         const [subscription] = await pool.query("SELECT * FROM subscriptions WHERE plan_name = ?", [selectedPlan]);
//         if (subscription.length === 0) {
//             return res.status(400).json({ message: "Selected subscription plan does not exist" });
//         }

//         let finalAmount = parseFloat(subscription[0].amount);
//         let discountApplied = 0;

//         // Generate the short promo code with 6 alphanumeric characters
//         const generatedPromoCode = generatePromoCode(); // Custom promo code

//         // Hash the password
//         const hashPassword = await bcrypt.hash(password, 10);

//         // Insert user data into the database, including the promo code
//         const [userResult] = await pool.query(
//             "INSERT INTO users (firstname, lastname, email, password, is_active, confirmpassword, promocode) VALUES (?, ?, ?, ?, ?, ?, ?)",
//             [firstname, lastname, email, hashPassword, 1, confirmpassword, generatedPromoCode]
//         );
//         const userId = userResult.insertId;

//         // Set subscription start and end dates
//         const startDate = new Date();
//         let endDate = new Date();
//         if (selectedPlan.toLowerCase() === "monthly") endDate.setMonth(endDate.getMonth() + 1);
//         else if (selectedPlan.toLowerCase() === "6 months") endDate.setMonth(endDate.getMonth() + 6);
//         else if (selectedPlan.toLowerCase() === "1 year") endDate.setFullYear(endDate.getFullYear() + 1);

//         // Insert Subscription Data into Database
//         await pool.query(
//             "INSERT INTO subscriptions (user_id, plan_name, amount, original_price, discount_applied, promocode, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
//             [userId, selectedPlan, finalAmount, parseFloat(subscription[0].amount), discountApplied, generatedPromoCode, startDate, endDate, 1]
//         );

//         // **Send Email with the Generated Promo Code**
//         let transporter = nodemailer.createTransport({
//             service: 'gmail', 
//             auth: {
//                 user: 'packageitappofficially@gmail.com',  // Sender email
//                 pass: 'epvuqqesdioohjvi',  // Email password (replace with actual credentials)
//             },
//         });

//         let mailOptions = {
//             from: 'gautambairagi221999@gmail.com',  // Sender email
//             to: email,
//             subject: 'Welcome to our Service!',
//             text: `Hello ${firstname},\n\nYou have successfully signed up!\n\nYour selected plan: ${selectedPlan}\nTotal amount: ${finalAmount}\nPromo Code: ${generatedPromoCode}\n\nThank you for choosing us!`,

//         };

//         // Send the email
//         transporter.sendMail(mailOptions, (error, info) => {
//             if (error) {
//                 console.log('Error sending email:', error);
//             } else {
//                 console.log('Email sent:', info.response);
//             }
//         });

//         return res.status(200).json({
//             message: `User registered successfully and promo code sent to ${email}`,
//             data: {
//                 id: userId,
//                 subscription: {
//                     user_id: userId,
//                     plan_name: selectedPlan,
//                     amount: finalAmount,
//                     original_price: parseFloat(subscription[0].amount),
//                     discount_applied: discountApplied,
//                     start_date: startDate.toISOString(),
//                     end_date: endDate.toISOString(),
//                     is_active: 1
//                 }
//             }
//         });
//     } catch (error) {
//         console.error("Signup Error:", error);
//         return res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// };


export const signUp = async (req, res) => {
    try {
        const { firstname, email, lastname = "0", password, confirmpassword = "0", selectedPlan, promocode = null } = req.body;
        console.log("req.body", req.body);

        // Check if the email already exists
        const [existingUser] = await pool.query("SELECT id FROM users WHERE email=?", [email]);
        if (existingUser.length > 0) {
            return res.status(403).json({ message: "User already exists" });
        }

        // Fetch the selected subscription plan
        const [subscription] = await pool.query("SELECT * FROM subscriptions WHERE plan_name = ?", [selectedPlan]);
        if (subscription.length === 0) {
            return res.status(400).json({ message: "Selected subscription plan does not exist" });
        }

        let originalAmount = parseFloat(subscription[0].amount);
        let finalAmount = originalAmount;
        let discountApplied = 0;
        let referredBy = null;
        let commissionEarned = 0;

        // ✅ If promocode is provided, validate and apply discount
        if (promocode) {
            const [promoDetails] = await pool.query("SELECT user_id FROM promocode WHERE promocode = ? AND status = 'active'", [promocode]);
            if (promoDetails.length > 0) {
                referredBy = promoDetails[0].user_id;

                // ✅ Always apply 20% discount
                discountApplied = (originalAmount * 20) / 100;
                finalAmount = originalAmount - discountApplied;

                // ✅ Commission for referrer (20%)
                commissionEarned = discountApplied;

                // ✅ Don't change promocode status so it remains active for future users
                await pool.query(
                    "INSERT INTO commission (user_id, earned_by, amount, status) VALUES (?, ?, ?, ?)",
                    [referredBy, email, commissionEarned, 'pending']
                );
            }
        }

        // ✅ Generate a unique promo code for the new user
        const generatedPromoCode = firstname.substring(0, 3).toUpperCase() + Math.floor(1000 + Math.random() * 9000);

        // ✅ Hash the password
        const hashPassword = await bcrypt.hash(password, 10);

        // ✅ Insert user data into the database
        const [userResult] = await pool.query(
            "INSERT INTO users (firstname, lastname, email, password, is_active, confirmpassword, promocode, referred_by,is_logged_in) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [firstname, lastname, email, hashPassword, 1, confirmpassword, generatedPromoCode, referredBy, false]
        );
        const userId = userResult.insertId;
        console.log("userId", userId);




        const startDate = new Date();
        let endDate = new Date();

        if (selectedPlan.toLowerCase() === "monthly" || selectedPlan.toLowerCase() === "1 month") {


            endDate.setMonth(endDate.getMonth() + 1);
        } else if (selectedPlan.toLowerCase() === "6 months") {
            endDate.setMonth(endDate.getMonth() + 6);
        } else if (selectedPlan.toLowerCase() === "1 year") {
            endDate.setFullYear(endDate.getFullYear() + 1);
        }

        // ✅ Calculate remaining_days
        const oneDay = 24 * 60 * 60 * 1000;
        const remaining_days = Math.ceil((endDate - startDate) / oneDay);



        // ✅ Insert Subscription Data
        await pool.query(
            "INSERT INTO subscriptions (user_id, plan_name, amount, original_price, discount_applied, promocode, start_date, end_date, is_active, referred_by, remaining_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)",
            [userId, selectedPlan, finalAmount, originalAmount, discountApplied, generatedPromoCode, startDate, endDate, 1, referredBy, remaining_days]
        );

        // ✅ Insert New Promo Code in promocode table
        await pool.query(
            "INSERT INTO promocode (admin_id, promocode, user_id, status) VALUES (?, ?, ?, ?)",
            [1, generatedPromoCode, userId, 'active']
        );

        const responseMessage = discountApplied > 0
            ? "User registered successfully. Promo code applied (20% discount)."
            : "User registered successfully.";


        if (selectedPlan.toLowerCase() === "1 month") {
            const newdatasss = await pool.query(
                "INSERT INTO progress_tracking (user_id, books_completed) VALUES (?, 0) ON DUPLICATE KEY UPDATE books_completed = books_completed",
                [userId]
            );

            console.log("newdatasss", newdatasss);
        }


        let challengeMessage = "";
        if (selectedPlan.toLowerCase() === "1 month") {
            challengeMessage = "Complete the 30 Days Challenge and get 11 Months free!";
        } else if (selectedPlan.toLowerCase() === "6 months" || selectedPlan.toLowerCase() === "1 year") {
            challengeMessage = "";
        }


        // **Send Email with the Generated Promo Code**
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'packageitappofficially@gmail.com',  // Sender email
                pass: 'epvuqqesdioohjvi',  // Email password (replace with actual credentials)
            },
        });

        let mailOptions = {
            from: 'gautambairagi221999@gmail.com',  // Sender email
            to: email,
            subject: 'Welcome to our Service!',
            text: `Hello ${firstname},\n\nYou have successfully signed up!\n\nYour selected plan: ${selectedPlan}\nTotal amount: ${finalAmount}\nPromo Code: ${generatedPromoCode}\n\nThank you for choosing us!`,

        };

        // Send the email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error sending email:', error);
            } else {
                console.log('Email sent:', info.response);
            }
        });

        return res.status(200).json({
            message: responseMessage,
            challengeMessage,
            data: {
                id: userId,
                subscription: {
                    user_id: userId,
                    plan_name: selectedPlan,
                    amount: finalAmount,
                    original_price: originalAmount,
                    discount_applied: discountApplied,
                    promocode: generatedPromoCode,
                    start_date: startDate.toISOString(),
                    end_date: endDate.toISOString(),
                    remaining_days: remaining_days,
                    is_active: 1
                }
            }
        });

    } catch (error) {
        console.error("Signup Error:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};





// Agar aap Express.js use kar rahe ho
export const promocodeDiscount = async (req, res) => {
    try {
        const { user_id, promocode } = req.body;  // Get user_id and promo code from the request body

        if (!user_id || !promocode) {
            return res.status(400).json({ message: "User ID both promo code required" });
        }

        // Step 1: Fetch the subscription for the specific user and promo code
        const [subscriptionResult] = await pool.query(
            "SELECT id, amount, promocode, original_price FROM subscriptions WHERE user_id = ? AND promocode = ?",
            [user_id, promocode]
        );

        if (subscriptionResult.length === 0) {
            return res.status(404).json({ message: "This promo code has already been used by the user" });
        }

        // Step 2: Check if the discount has already been applied by comparing original_price and amount
        if (subscriptionResult[0].original_price !== null && subscriptionResult[0].amount !== subscriptionResult[0].original_price) {
            return res.status(400).json({ message: "This promo code has already been used by the user" });
        }

        // Step 3: Calculate the 20% discount
        let originalAmount = parseFloat(subscriptionResult[0].amount);
        let discount = (originalAmount * 20) / 100;  // 20% discount
        let newAmount = originalAmount - discount;

        // Step 4: Update the subscription with the new discounted amount
        // Update both `amount` and `original_price` columns
        await pool.query("UPDATE subscriptions SET amount = ?, original_price = ? WHERE id = ?", [newAmount, originalAmount, subscriptionResult[0].id]);

        // Step 5: Return the updated subscription data
        return res.status(200).json({
            message: "Discount applied successfully",
            data: {
                user_id: user_id,
                subscription_id: subscriptionResult[0].id,
                original_price: originalAmount,  // original_price is the price before discount
                discount_applied: discount,
                new_amount: newAmount,
                promocode: promocode,
            },
        });
    } catch (error) {
        console.error("Discount apply karte waqt error:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};


// export const getPromocodeReferById = async (req, res) => {
//     try {
//         const { id } = req.params;

//         // Fetch user details by ID
//         const [user] = await pool.query("SELECT id, promocode, email FROM users WHERE id = ? AND promocode IS NOT NULL", [id]);
//         if (user.length === 0) {
//             return res.status(404).json({ message: "User not found or no promocode assigned" });
//         }

//         // Get referral count
//         const [referCount] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE referred_by = ?", [id]);

//         // Calculate total commission earned (20% of discount applied for referred users)
//         const [commissionData] = await pool.query(`
//             SELECT SUM(discount_applied * 0.20) AS total_commission 
//             FROM subscriptions 
//             WHERE referred_by = ?`,
//             [id]
//         );
//         const totalCommission = commissionData[0].total_commission || 0;



//         // 🆕 Referred users detailed info (email, plan_name, commission)
//         const [referredUsers] = await pool.query(`
//             SELECT u.email, u.timestamp, s.plan_name, (CAST(s.discount_applied AS DECIMAL(10,2)) * 0.20) AS commission ,
//             DATE_FORMAT(u.timestamp, '%M') AS month
//             FROM users u
//             JOIN subscriptions s ON u.id = s.user_id
//             WHERE u.referred_by = ?
//         `, [id]);

//         // 🔄 Month-wise commission summary
//         const [monthlyCommission] = await pool.query(`
//             SELECT 
//                 DATE_FORMAT(s.start_date, '%Y-%m-%d') AS month,
//                 SUM(CAST(s.discount_applied AS DECIMAL(10,2)) * 0.20) AS total_commission,
//                 COUNT(*) AS total_referrals
//             FROM subscriptions s
//             WHERE s.referred_by = ?
//             GROUP BY month
//             ORDER BY month DESC
//         `, [id]);

//         return res.status(200).json({
//             message: "User promo code referral count and commission fetched successfully.",
//             data: {
//                 id: user[0].id,
//                 email: user[0].email,
//                 promocode: user[0].promocode,
//                 referCount: referCount[0].count,
//                 timestamp: user[0].timestamp,

//                 comitionErned: totalCommission,
//                 referrals: referredUsers,
//                 monthlySummary: monthlyCommission
//             }
//         });
//     } catch (error) {
//         console.error("getPromocodeReferById Error:", error);
//         return res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// };


export const getPromocodeReferById = async (req, res) => {
    try {
        const { id } = req.params;
        // Fetch user details by ID
        const [user] = await pool.query(
            "SELECT id, promocode, email, timestamp FROM users WHERE id = ? AND promocode IS NOT NULL",
            [id]
        );
        if (user.length === 0) {
            return res.status(404).json({ message: "User not found or no promocode assigned" });
        }
        // Get referral count
        const [referCount] = await pool.query(
            "SELECT COUNT(*) AS count FROM users WHERE referred_by = ?",
            [id]
        );
        // Total commission: use discount_applied, fallback to original_price
        const [commissionData] = await pool.query(`
            SELECT SUM(
                CASE 
                    WHEN discount_applied > 0 
                        THEN CAST(discount_applied AS DECIMAL(10,2)) * 0.20
                    ELSE CAST(original_price AS DECIMAL(10,2)) * 0.20
                END
            ) AS total_commission 
            FROM subscriptions 
            WHERE referred_by = ?
        `, [id]);
        const totalCommission = commissionData[0].total_commission || 0;
        // Referred users detail
        const [referredUsers] = await pool.query(`
            SELECT 
                u.email, 
                u.timestamp, 
                s.plan_name,
                (
                    CASE 
                        WHEN s.discount_applied > 0 
                            THEN CAST(s.discount_applied AS DECIMAL(10,2)) * 0.20
                        ELSE CAST(s.original_price AS DECIMAL(10,2)) * 0.20
                    END
                ) AS commission,
                DATE_FORMAT(u.timestamp, '%M') AS month
            FROM users u
            JOIN subscriptions s ON u.id = s.user_id
            WHERE u.referred_by = ?
        `, [id]);
        // Monthly commission summary
        const [monthlyCommission] = await pool.query(`
            SELECT 
                DATE_FORMAT(s.start_date, '%Y-%m') AS month,
                SUM(
                    CASE 
                        WHEN s.discount_applied > 0 
                            THEN CAST(s.discount_applied AS DECIMAL(10,2)) * 0.20
                        ELSE CAST(s.original_price AS DECIMAL(10,2)) * 0.20
                    END
                ) AS total_commission,
                COUNT(*) AS total_referrals
            FROM subscriptions s
            WHERE s.referred_by = ?
            GROUP BY month
            ORDER BY month DESC
        `, [id]);
        return res.status(200).json({
            message: "User promo code referral count and commission fetched successfully.",
            data: {
                id: user[0].id,
                email: user[0].email,
                promocode: user[0].promocode,
                timestamp: user[0].timestamp,
                referCount: referCount[0].count,
                comitionErned: totalCommission,
                referrals: referredUsers,
                monthlySummary: monthlyCommission
            }
        });
    } catch (error) {
        console.error("getPromocodeReferById Error:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};







// export const getPromocodeRefer = async (req, res) => {
//     try {
//         // Fetch users with promocodes
//         const [users] = await pool.query("SELECT id, promocode, email FROM users WHERE promocode IS NOT NULL");
//         if (users.length === 0) {
//             return res.status(404).json({ message: "No users found with promocodes" });
//         }
//         // Fetch referral count for each user and filter those with count > 0
//         let userData = [];
//         for (let user of users) {
//             const [referCount] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE referred_by = ?", [user.id]);
//             if (referCount[0].count > 0) {
//                 userData.push({
//                     id: user.id,
//                     email: user.email,
//                     promocode: user.promocode,
//                     referCount: referCount[0].count
//                 });
//             }
//         }
//         if (userData.length === 0) {
//             return res.status(404).json({ message: "No users with referrals found" });
//         }
//         return res.status(200).json({
//             message: "Users with promo code referrals fetched successfully.",
//             data: userData
//         });

//     } catch (error) {
//         console.error("getPromocodeRefer Error:", error);
//         return res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// };



export const getPromocodeRefer = async (req, res) => {
    try {
        // Fetch users who have a promocode
        const [users] = await pool.query("SELECT id, email, promocode FROM users WHERE promocode IS NOT NULL");

        if (users.length === 0) {
            return res.status(404).json({ message: "No users found with promocodes" });
        }

        let userData = [];

        for (let user of users) {
            // Get users who were referred by this user, and group by month
            const [referrals] = await pool.query(`
                SELECT 
                    id, 
                    email, 
                    MONTH(timestamp) AS referred_month, 
                    DATE_FORMAT(timestamp, '%M') AS month_name,
                    DATE_FORMAT(timestamp, '%Y') AS Year_name
                FROM users 
                WHERE referred_by = ?
            `, [user.id]);
            if (referrals.length > 0) {
                userData.push({
                    id: user.id,
                    email: user.email,
                    promocode: user.promocode,
                    referCount: referrals.length,
                    referrals: referrals.map(ref => ({
                        id: ref.id,
                        email: ref.email,
                        month: ref.month_name,
                        Year: ref.Year_name
                    }))
                });
            }
        }

        if (userData.length === 0) {
            return res.status(404).json({ message: "No referral data found" });
        }

        return res.status(200).json({
            message: "Referral data with months fetched successfully.",
            data: userData
        });

    } catch (error) {
        console.error("getPromocodeRefer Error:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};



export const getCommissionDiscount = async (req, res) => {
    try {
        // Fetch all users with a promo code
        const [users] = await pool.query("SELECT id, promocode, email FROM users WHERE promocode IS NOT NULL");
        if (users.length === 0) {
            return res.status(404).json({ message: "No users found with promo codes" });
        }
        let userData = [];
        for (let user of users) {
            // Count total referrals
            const [referCount] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE referred_by = ?", [user.id]);
            // Calculate total discount given (20% of referred users' discounts)
            const [discountData] = await pool.query(`
                SELECT SUM(discount_applied * 0.20) AS total_discount 
                FROM subscriptions 
                WHERE referred_by = ?`,
                [user.id]
            );
            const totalDiscountGiven = discountData[0].total_discount || 0;
            // **Filter out users where totalDiscountGiven is 0**
            if (totalDiscountGiven > 0) {
                userData.push({
                    id: user.id,
                    email: user.email,
                    promocode: user.promocode,
                    referCount: referCount[0].count,
                    totalDiscountGiven: totalDiscountGiven
                });
            }
        }
        // If no users have discounts, return a message
        if (userData.length === 0) {
            return res.status(404).json({ message: "No users have earned a commission discount" });
        }
        return res.status(200).json({
            message: "Users with promo code referrals and earned discounts fetched successfully.",
            data: userData
        });

    } catch (error) {
        console.error("getCommissionDiscount Error:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};


export const getCommissionDiscountBYID = async (req, res) => {
    try {

        const id = req.params;
        // Fetch all users with a promo code
        const [users] = await pool.query("SELECT id, promocode, email FROM users WHERE promocode IS NOT NULL");
        if (users.length === 0) {
            return res.status(404).json({ message: "No users found with promo codes" });
        }
        let userData = [];
        for (let user of users) {
            // Count total referrals
            const [referCount] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE referred_by = ?", [user.id]);
            // Calculate total discount given (20% of referred users' discounts)
            const [discountData] = await pool.query(`
                SELECT SUM(discount_applied * 0.20) AS total_discount 
                FROM subscriptions 
                WHERE referred_by = ?`,
                [user.id]
            );
            const totalDiscountGiven = discountData[0].total_discount || 0;
            // **Filter out users where totalDiscountGiven is 0**
            if (totalDiscountGiven > 0) {
                userData.push({
                    id: user.id,
                    email: user.email,
                    promocode: user.promocode,
                    referCount: referCount[0].count,
                    totalDiscountGiven: totalDiscountGiven
                });
            }
        }
        // If no users have discounts, return a message
        if (userData.length === 0) {
            return res.status(404).json({ message: "No users have earned a commission discount" });
        }
        return res.status(200).json({
            message: "Users with promo code referrals and earned discounts fetched successfully.",
            data: userData
        });

    } catch (error) {
        console.error("getCommissionDiscount Error:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

export const getPromocodeDiscount = async (req, res) => {
    try {
        // Fetch `user_id` and `promocode` from URL parameters
        const { user_id, promocode } = req.query;

        // Validate if user_id and promocode are provided
        if (!user_id || !promocode) {
            return res.status(400).json({ message: "User ID and promo code are required" });
        }

        // Step 1: Fetch the subscription for the specific user and promo code
        const [subscriptionResult] = await pool.query(
            "SELECT id, amount, promocode, original_price FROM subscriptions WHERE user_id = ? AND promocode = ?",
            [user_id, promocode]
        );

        // If no subscription is found
        if (subscriptionResult.length === 0) {
            return res.status(404).json({ message: "No subscription found with the given promo code" });
        }

        // Step 2: Return the subscription data, including original price and current amount
        return res.status(200).json({
            message: "Promo code found",
            data: {
                user_id: user_id,
                subscription_id: subscriptionResult[0].id,
                original_price: subscriptionResult[0].original_price, // Showing the original price
                amount: subscriptionResult[0].amount, // Showing the current amount (with discount if any)
                discount_applied: 20,  // Showing the discount amount
                promocode: promocode,
            },
        });

    } catch (error) {
        console.error("Error processing promo code:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};


export const createpromocode = async (req, res) => {
    try {
        const { admin_id, promocode } = req.body;
        // Validate input
        if (!admin_id || !promocode) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Insert into database
        const query = `INSERT INTO promocode (admin_id, promocode) VALUES (?, ?)`;
        const [result] = await pool.query(query, [admin_id, promocode]);
        res.status(201).json({
            message: 'Promo code created successfully',
            promocode_id: result.insertId
        });
    } catch (error) {
        console.error("Signup Error:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

// 3. Edit Profile
export const editProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstname, lastname, email, password } = req.body;
        const hashPassword = password ? await bcrypt.hash(password, 10) : null;
        const updateQuery = "UPDATE users SET firstname=?, lastname=?, email=?, password=COALESCE(?, password) WHERE id=?";
        const [result] = await pool.query(updateQuery, [firstname, lastname, email, hashPassword, id]);
        if (result.affectedRows > 0) {
            return res.status(200).json({ message: "Profile updated successfully" });
        } else {
            return res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};


export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("email passs", email, password);
        // Check if the email exists in the admin table
        const adminQuery = "SELECT * FROM admin WHERE email= ?";
        const [adminUser] = await pool.query(adminQuery, [email]);
        if (adminUser.length > 0) {
            const admin = adminUser[0];
            const comparePassword = await bcrypt.compare(password, admin.password);
            if (!comparePassword) {
                return res.status(403).json({ message: "Password is incorrect" });
            }



            const token = await generatetoken(admin.id, "admin"); // Optionally pass role
            return res.status(200).json({
                message: "Admin Login successfull",
                success: true,
                data: { id: admin.id, email: admin.email, },
                role: "admin",
                token
            });
        }
        // If not admin, check in the users table
        const userQuery = "SELECT * FROM users WHERE email= ?";
        const [existingUser] = await pool.query(userQuery, [email]);

        if (existingUser.length === 0) {
            return res.status(401).json({ message: "Please sign up first" });
        }
        const user = existingUser[0];
        const comparePassword = await bcrypt.compare(password, user.password);
        if (!comparePassword) {
            return res.status(403).json({ message: "Password is incorrect" });
        }

        if (user.is_logged_in) {
            return res.status(403).json({ message: "User is already logged in on another device." });
        }

        await pool.query("UPDATE users SET last_login = NOW(), is_logged_in = ? WHERE id = ?", [true, user.id]);

        // Fetch user's subscription plan
        // const subscriptionQuery = `
        //     SELECT s.plan_name 
        //     FROM subscriptions s 
        //     WHERE s.user_id = ? 
        //     ORDER BY s.end_date  
        // `;


        const subscriptionQuery = `
            SELECT s.plan_name, s.start_date, s.end_date 
            FROM subscriptions s 
            WHERE s.user_id = ? 
            ORDER BY s.end_date DESC LIMIT 1
        `;

        const [subscriptionResult] = await pool.query(subscriptionQuery, [user.id]);
        const plan_name = subscriptionResult.length > 0 ? subscriptionResult[0].plan_name : "";

        let remaining_days = 0;
        if (subscriptionResult.length > 0) {
            const startDate = new Date(subscriptionResult[0].start_date);
            const endDate = new Date(subscriptionResult[0].end_date);
            const today = new Date();
            const timeDiff = endDate.getTime() - today.getTime();
            remaining_days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            remaining_days = remaining_days < 0 ? 0 : remaining_days;
        }


        // SET COOKIE and AUTO-LOGOUT for normal user login
        // res.cookie("userId", user.id, {
        //     maxAge: 60 * 60 * 1000, // 1 hour
        //     httpOnly: true,
        //     secure: process.env.NODE_ENV === "production",
        //     sameSite: "strict",
        // });

        // setTimeout(async () => {
        //     try {
        //         await pool.query("UPDATE users SET is_logged_in = ? WHERE id = ?", [false, user.id]);
        //         console.log(`Auto logout for user ID: ${user.id}`);
        //     } catch (err) {
        //         console.error("Auto-logout failed:", err.message);
        //     }
        // }, 1 * 60 * 1000); 


        const token = await generatetoken(user.id, "user");
        return res.status(200).json({
            message: "User Login Successfull",
            success: true,
            data: {
                id: user.id,
                firstname: user.firstname,
                lastname: user.lastname,
                email: user.email,
                plan_name: plan_name,
                remaining_days: remaining_days,
                promocode: user.promocode,
            },
            role: "user", token
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};


// export const logout = async (req, res) => {
//     try {
//         const { userId } = req.body; // Or get from token
//         await pool.query("UPDATE users SET is_logged_in = ? WHERE id = ?", [false, userId]);
//         return res.status(200).json({ message: "Logout successful" });
//     } catch (error) {
//         return res.status(500).json({ message: "Logout failed", error: error.message });
//     }
// };




export const logout = async (req, res) => {
    try {
        const { userId } = req.body;
        console.log("Logout request received for userId:", userId);

        const [result] = await pool.query(
            "UPDATE users SET is_logged_in = ? WHERE id = ?",
            [0, userId]
        );

        console.log("Query result:", result);

        return res.status(200).json({ message: "Logout successful" });
    } catch (error) {
        console.error("Logout error:", error.message);
        return res.status(500).json({ message: "Logout failed", error: error.message });
    }
};



// export const logout = async (req, res) => {
//     const userId = req.cookies.userId;
//     if (!userId) return res.status(400).json({ message: "No active session" });

//     try {
//         await pool.query("UPDATE users SET is_logged_in = ? WHERE id = ?", [false, userId]);
//         res.clearCookie("userId");
//         return res.status(200).json({ message: "Logged out successfully" });
//     } catch (err) {
//         return res.status(500).json({ message: "Error logging out", error: err.message });
//     }
// };


export const createCategory = async (req, res) => {
    try {
        const { category_name } = req.body;
        if (!category_name) {
            return res.status(400).json({ message: "Category name is required" });
        }
        // Check if category already exists
        const [existingCategory] = await pool.query(
            "SELECT * FROM bookcategory WHERE category_name = ?",
            [category_name]
        );
        if (existingCategory.length > 0) {
            return res.status(400).json({ message: "Category already exists" });
        }
        // Insert new category
        const [result] = await pool.query(
            "INSERT INTO bookcategory (category_name) VALUES (?)",
            [category_name]
        );
        return res.status(201).json({
            message: "Category created successfully",
            data: { id: result.insertId, category_name },
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

export const getcategory = async (req, res) => {
    try {
        const mysqlQuery = "SELECT * FROM bookcategory";
        const [result] = await pool.query(mysqlQuery);

        if (result.length > 0) {
            return res.status(200).json({ message: "Category fetched successfully", data: result });
        } else {
            return res.status(404).json({ message: "No Category data found" });
        }
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};


//cloudenary code
// export const addBook = async (req, res) => {
//     upload.fields([{ name: "image", maxCount: 1 }, { name: "audio_book_url", maxCount: 1 }])(req, res, async (err) => {
//         if (err) {
//             return res.status(400).json({ message: "File upload failed", error: err.message });
//         }

//         try {
//             const { category_id, book_name, description, status, author, questions, flip_book_url } = req.body;
//             console.log("Request Body:", req.body); // ✅ Debugging log

//             const statusValue = status || "not completed";
//             const categoryIdNum = parseInt(category_id, 10);
//             const flipBookUrl = flip_book_url || ""; // ✅ Default empty string if missing

//             let imageUrl = "";
//             let audioUrl = "";

//             // ✅ Upload image to Cloudinary
//             if (req.files["image"]?.length) {
//                 try {
//                     const result = await new Promise((resolve, reject) => {
//                         cloudinary.uploader.upload_stream({ folder: "books" }, (error, result) => {
//                             if (error) return reject(error);
//                             resolve(result);
//                         }).end(req.files["image"][0].buffer);
//                     });
//                     imageUrl = result.secure_url;
//                 } catch (error) {
//                     console.error("Image upload failed:", error);
//                     return res.status(500).json({ message: "Image upload failed", error: error.message });
//                 }
//             }

//             // ✅ Upload audio to Cloudinary
//             if (req.files["audio_book_url"]?.length) {
//                 try {
//                     const result = await new Promise((resolve, reject) => {
//                         cloudinary.uploader.upload_stream(
//                             { folder: "books/audio", resource_type: "video" },
//                             (error, result) => {
//                                 if (error) return reject(error);
//                                 resolve(result);
//                             }
//                         ).end(req.files["audio_book_url"][0].buffer);  // Correct field name
//                     });
//                     audioUrl = result.secure_url;
//                 } catch (error) {
//                     console.error("Audio upload failed:", error);
//                     return res.status(500).json({ message: "Audio upload failed", error: error.message });
//                 }
//             }

//             // ✅ Insert book data into MySQL
//             const [bookResult] = await pool.query(
//                 "INSERT INTO book (category_id, book_name, description, status, image, audio_book_url, flip_book_url, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
//                 [categoryIdNum, book_name, description, statusValue, imageUrl, audioUrl, flipBookUrl, author]
//             );
//             const bookId = bookResult.insertId;

//             let formattedQuestions = [];

//             // ✅ Insert questions into MySQL
//             if (questions) {
//                 const parsedQuestions = JSON.parse(questions);
//                 if (Array.isArray(parsedQuestions)) {
//                     const questionInsertPromises = parsedQuestions.map(async (question) => {
//                         const { question_text, options, correct_option } = question;
//                         if (!options || options.length !== 4) {
//                             throw new Error("Each question must have exactly 4 options.");
//                         }
//                         const optionTexts = options.map(option => option.text);
//                         const [questionResult] = await pool.query(
//                             "INSERT INTO bookquestions (book_id, question, option_1, option_2, option_3, option_4, correct_option) VALUES (?, ?, ?, ?, ?, ?, ?)",
//                             [bookId, question_text, optionTexts[0], optionTexts[1], optionTexts[2], optionTexts[3], correct_option]
//                         );
//                         return {
//                             id: questionResult.insertId,
//                             question_text,
//                             options: [
//                                 { text: optionTexts[0] },
//                                 { text: optionTexts[1] },
//                                 { text: optionTexts[2] },
//                                 { text: optionTexts[3] }
//                             ],
//                             correct_option
//                         };
//                     });
//                     formattedQuestions = await Promise.all(questionInsertPromises);
//                 }
//             }

//             return res.status(201).json({
//                 message: "Book and questions added successfully",
//                 data: {
//                     id: bookId,
//                     category_id: categoryIdNum,
//                     book_name,
//                     description,
//                     status: statusValue,
//                     image: imageUrl,
//                     audio_book_url: audioUrl,
//                     flip_book_url: flipBookUrl,
//                     author,
//                     questions: formattedQuestions
//                 }
//             });

//         } catch (error) {
//             console.error("Error adding book:", error);
//             return res.status(500).json({ message: "Internal server error", error: error.message });
//         }
//     });
// };


// imagekite code

// export const addBook = async (req, res) => {
//     upload.fields([{ name: "image", maxCount: 1 }, { name: "audio_book_url", maxCount: 1 }])(req, res, async (err) => {
//         if (err) {
//             return res.status(400).json({ message: "File upload failed", error: err.message });
//         }

//         try {
//             const { category_id, book_name, description, status, author, questions, flip_book_url } = req.body;
//             console.log("Request Body:", req.body); // ✅ Debug log

//             const statusValue = status || "not completed";
//             const categoryIdNum = parseInt(category_id, 10);
//             const flipBookUrl = flip_book_url || "";

//             let imageUrl = "";
//             let audioUrl = "";

//             // ✅ Upload image to ImageKit
//             if (req.files["image"]?.length) {
//                 try {
//                     const uploadResponse = await imagekit.upload({
//                         file: req.files["image"][0].buffer,
//                         fileName: `book_image_${Date.now()}`,
//                         folder: "books"
//                     });
//                     imageUrl = uploadResponse.url;
//                 } catch (error) {
//                     console.error("Image upload failed:", error);
//                     return res.status(500).json({ message: "Image upload failed", error: error.message });
//                 }
//             }

//             // ✅ Upload audio to ImageKit
//             if (req.files["audio_book_url"]?.length) {
//                 try {
//                     const uploadResponse = await imagekit.upload({
//                         file: req.files["audio_book_url"][0].buffer,
//                         fileName: `book_audio_${Date.now()}`,
//                         folder: "books/audio"
//                     });
//                     audioUrl = uploadResponse.url;
//                 } catch (error) {
//                     console.error("Audio upload failed:", error);
//                     return res.status(500).json({ message: "Audio upload failed", error: error.message });
//                 }
//             }

//             // ✅ Insert book into MySQL
//             const [bookResult] = await pool.query(
//                 "INSERT INTO book (category_id, book_name, description, status, image, audio_book_url, flip_book_url, author) VALUES ( ?, ?, ?, ?, ?, ?, ?,?)",
//                 [categoryIdNum, book_name, description, statusValue, imageUrl, audioUrl, flipBookUrl, author]
//             );
//             const bookId = bookResult.insertId;

//             let formattedQuestions = [];

//             // ✅ Insert questions into MySQL
//             if (questions) {
//                 const parsedQuestions = JSON.parse(questions);
//                 if (Array.isArray(parsedQuestions)) {
//                     const questionInsertPromises = parsedQuestions.map(async (question) => {
//                         const { question_text, options, correct_option, qustionexplanation } = question;
//                         if (!options || options.length !== 4) {
//                             throw new Error("Each question must have exactly 4 options.");
//                         }
//                         const optionTexts = options.map(option => option.text);
//                         const [questionResult] = await pool.query(
//                             "INSERT INTO bookquestions (book_id, question, option_1, option_2, option_3, option_4, correct_option,qustionexplanation) VALUES (?,?, ?, ?, ?, ?, ?, ?)",
//                             [bookId, question_text, optionTexts[0], optionTexts[1], optionTexts[2], optionTexts[3], correct_option, qustionexplanation || ""]
//                         );
//                         return {
//                             id: questionResult.insertId,
//                             question_text,
//                             options: [
//                                 { text: optionTexts[0] },
//                                 { text: optionTexts[1] },
//                                 { text: optionTexts[2] },
//                                 { text: optionTexts[3] }
//                             ],
//                             correct_option,
//                             qustionexplanation: qustionexplanation || ""
//                         };
//                     });
//                     formattedQuestions = await Promise.all(questionInsertPromises);
//                 }
//             }

//             return res.status(201).json({
//                 message: "Book and questions added successfully",
//                 data: {
//                     id: bookId,
//                     category_id: categoryIdNum,
//                     book_name,
//                     description,
//                     status: statusValue,
//                     image: imageUrl,
//                     audio_book_url: audioUrl,
//                     flip_book_url: flipBookUrl,
//                     author,
//                     questions: formattedQuestions,
//                 }
//             });

//         } catch (error) {
//             console.error("Error adding book:", error);
//             return res.status(500).json({ message: "Internal server error", error: error.message });
//         }
//     });
// };



// Backblaze code

// export const addBook = async (req, res) => {
//   upload.fields([
//     { name: "image", maxCount: 1 },
//     { name: "audio_book_url", maxCount: 1 }
//   ])(req, res, async (err) => {
//     if (err) {
//       return res.status(400).json({ message: "File upload failed", error: err.message });
//     }

//     try {
//       const {
//         category_id,
//         book_name,
//         description,
//         status,
//         author,
//         questions,
//         flip_book_url
//       } = req.body;

//          const [existingBooks] = await pool.query("SELECT id FROM book WHERE book_name = ?", [book_name]);
//             if (existingBooks.length > 0) {
//                 return res.status(400).json({ message: "Book with the same name already exists" });
//             }

//       const statusValue = status || "not completed";
//       const categoryIdNum = parseInt(category_id, 10);
//       const flipBookUrl = flip_book_url || "";

//       let imageUrl = "";
//       let audioUrl = "";

//       // ✅ Upload image to Backblaze B2
//       if (req.files["image"]?.length) {
//         try {
//           const fileBuffer = req.files["image"][0].buffer;
//           const originalName = req.files["image"][0].originalname;
//           imageUrl = await uploadToB2(fileBuffer, originalName, "books/images");
//         } catch (error) {
//           console.error("Image upload to B2 failed:", error);
//           return res.status(500).json({ message: "Image upload failed", error: error.message });
//         }
//       }

//       // ✅ Upload audio to Backblaze B2
//       if (req.files["audio_book_url"]?.length) {
//         try {
//           const fileBuffer = req.files["audio_book_url"][0].buffer;
//           const originalName = req.files["audio_book_url"][0].originalname;
//           audioUrl = await uploadToB2(fileBuffer, originalName, "books/audio");
//         } catch (error) {
//           console.error("Audio upload to B2 failed:", error);
//           return res.status(500).json({ message: "Audio upload failed", error: error.message });
//         }
//       }

//       // ✅ Insert book into MySQL
//       const [bookResult] = await pool.query(
//         "INSERT INTO book (category_id, book_name, description, status, image, audio_book_url, flip_book_url, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
//         [categoryIdNum, book_name, description, statusValue, imageUrl, audioUrl, flipBookUrl, author]
//       );

//       const bookId = bookResult.insertId;
//       let formattedQuestions = [];

//       // ✅ EXACT QUESTION INSERTION LOGIC (as you wrote it)
//       if (questions) {
//         const parsedQuestions = JSON.parse(questions);
//         if (Array.isArray(parsedQuestions)) {
//           const questionInsertPromises = parsedQuestions.map(async (question) => {
//             const { question_text, options, correct_option, qustionexplanation } = question;
//             if (!options || options.length !== 4) {
//               throw new Error("Each question must have exactly 4 options.");
//             }
//             const optionTexts = options.map(option => option.text);
//             const [questionResult] = await pool.query(
//               "INSERT INTO bookquestions (book_id, question, option_1, option_2, option_3, option_4, correct_option, qustionexplanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
//               [bookId, question_text, optionTexts[0], optionTexts[1], optionTexts[2], optionTexts[3], correct_option, qustionexplanation || ""]
//             );
//             return {
//               id: questionResult.insertId,
//               question_text,
//               options: [
//                 { text: optionTexts[0] },
//                 { text: optionTexts[1] },
//                 { text: optionTexts[2] },
//                 { text: optionTexts[3] }
//               ],
//               correct_option,
//               qustionexplanation: qustionexplanation || ""
//             };
//           });

//           formattedQuestions = await Promise.all(questionInsertPromises);
//         }
//       }

//       // ✅ Response
//       return res.status(201).json({
//         message: "Book and questions added successfully",
//         data: {
//           id: bookId,
//           category_id: categoryIdNum,
//           book_name,
//           description,
//           status: statusValue,
//           image: imageUrl,
//           audio_book_url: audioUrl,
//           flip_book_url: flipBookUrl,
//           author,
//           questions: formattedQuestions
//         }
//       });

//     } catch (error) {
//       console.error("❌ Error adding book:", error);
//       return res.status(500).json({
//         message: "Internal server error",
//         error: error.message
//       });
//     }
//   });
// };




export const sanitizeURL = (url) => {
  if (!url) return "";
  try {
    const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
    const fileName = url.substring(url.lastIndexOf('/') + 1);
    const encodedFilename = encodeURIComponent(fileName);
    return baseUrl + encodedFilename;
  } catch (e) {
    return url;
  }
};


export const addBook = async (req, res) => {
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "audio_book_url", maxCount: 1 }
  ])(req, res, async (err) => {
    if (err) {
      console.error("❌ Multer error:", err);
      return res.status(400).json({ message: "File upload failed", error: err.message });
    }

    try {
      console.log("📥 Incoming request body:", req.body);
      console.log("📦 Incoming files:", req.files);

      const {
        category_id,
        book_name,
        description,
        status,
        author,
        questions,
        flip_book_url,
        image: imageFromClient,
        audio_book_url: audioFromClient
      } = req.body;

      // Check for duplicate book
      const [existingBooks] = await pool.query("SELECT id FROM book WHERE book_name = ?", [book_name]);
      console.log("🔍 Existing book check result:", existingBooks);
      if (existingBooks.length > 0) {
        return res.status(400).json({ message: "Book with the same name already exists" });
      }

      const statusValue = status || "not completed";
      const categoryIdNum = parseInt(category_id, 10);
      const flipBookUrl = flip_book_url || "";

      let imageUrl = "";
      let audioUrl = "";

      // ✅ Upload image to B2
      if (req.files["image"]?.length) {
        try {
          console.log("🖼️ Uploading image to B2...");
          const fileBuffer = req.files["image"][0].buffer;
          const originalName = req.files["image"][0].originalname;
          imageUrl = await uploadToB2(fileBuffer, originalName, "books/images");
          console.log("✅ Image uploaded URL:", imageUrl);
        } catch (error) {
          console.error("❌ Image upload to B2 failed:", error);
          return res.status(500).json({ message: "Image upload failed", error: error.message });
        }
      } else if (imageFromClient) {
        imageUrl = sanitizeURL(imageFromClient.trim());
        console.log("📎 Image URL from client:", imageUrl);
      }

      // ✅ Upload audio to B2
      if (req.files["audio_book_url"]?.length) {
        try {
          console.log("🎵 Uploading audio to B2...");
          const fileBuffer = req.files["audio_book_url"][0].buffer;
          const originalName = req.files["audio_book_url"][0].originalname;
          audioUrl = await uploadToB2(fileBuffer, originalName, "books/audio");
          console.log("✅ Audio uploaded URL:", audioUrl);
        } catch (error) {
          console.error("❌ Audio upload to B2 failed:", error);
          return res.status(500).json({ message: "Audio upload failed", error: error.message });
        }
      } else if (audioFromClient) {
        audioUrl = sanitizeURL(audioFromClient.trim());
        console.log("📎 Audio URL from client:", audioUrl);
      }

      // ✅ Insert book into DB
      console.log("📤 Inserting book into database...");
      const [bookResult] = await pool.query(
        "INSERT INTO book (category_id, book_name, description, status, image, audio_book_url, flip_book_url, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [categoryIdNum, book_name, description, statusValue, imageUrl, audioUrl, flipBookUrl, author]
      );
      console.log("✅ Book inserted with ID:", bookResult.insertId);

      const bookId = bookResult.insertId;
      let formattedQuestions = [];

      // ✅ Handle questions if present
      if (questions) {
        console.log("🧠 Parsing and inserting questions...");
        const parsedQuestions = JSON.parse(questions);
        if (Array.isArray(parsedQuestions)) {
          const questionInsertPromises = parsedQuestions.map(async (question, index) => {
            const { question_text, options, correct_option, qustionexplanation } = question;
            console.log(`➡️ Question ${index + 1}:`, question_text);

            if (!options || options.length !== 4) {
              throw new Error("Each question must have exactly 4 options.");
            }

            const optionTexts = options.map(opt => opt.text);
            const [questionResult] = await pool.query(
              "INSERT INTO bookquestions (book_id, question, option_1, option_2, option_3, option_4, correct_option, qustionexplanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
              [bookId, question_text, optionTexts[0], optionTexts[1], optionTexts[2], optionTexts[3], correct_option, qustionexplanation || ""]
            );

            return {
              id: questionResult.insertId,
              question_text,
              options: optionTexts.map(text => ({ text })),
              correct_option,
              qustionexplanation: qustionexplanation || ""
            };
          });

          formattedQuestions = await Promise.all(questionInsertPromises);
          console.log("✅ All questions inserted.");
        }
      }

      // ✅ Final response
      console.log("✅ Sending success response...");
      return res.status(201).json({
        message: "Book and questions added successfully",
        data: {
          id: bookId,
          category_id: categoryIdNum,
          book_name,
          description,
          status: statusValue,
          image: imageUrl,
          audio_book_url: audioUrl,
          flip_book_url: flipBookUrl,
          author,
          questions: formattedQuestions
        }
      });

    } catch (error) {
      console.error("❌ Error adding book:", error);
      return res.status(500).json({ message: "Internal server error", error: error.message });
    }
  });
};


// export const saveOrUpdateAudioProgress = async (req, res) => {
//     try {
//         const { user_id, book_id, progress } = req.body;

//         const checkQuery = `
//             SELECT progress FROM audio_progress 
//             WHERE user_id = ? AND book_id = ?
//         `;
//         const [existingProgress] = await pool.query(checkQuery, [user_id, book_id]);

//         if (existingProgress.length > 0) {
//             const currentProgress = existingProgress[0].progress;

//             // Only update if new progress is greater than existing
//             if (progress > currentProgress) {
//                 const updateQuery = `
//                     UPDATE audio_progress 
//                     SET progress = ?, updated_at = NOW()
//                     WHERE user_id = ? AND book_id = ?
//                 `;
//                 await pool.query(updateQuery, [progress, user_id, book_id]);

//                 return res.status(200).json({
//                     message: "Audio progress updated successfully",
//                     data: {
//                         user_id,
//                         book_id,
//                         progress
//                     }
//                 });
//             } else {
//                 return res.status(200).json({
//                     message: "New progress is less than or equal to existing. No update performed.",
//                     data: {
//                         user_id,
//                         book_id,
//                         progress: currentProgress
//                     }
//                 });
//             }

//         } else {
//             // Insert new progress
//             const insertQuery = `
//                 INSERT INTO audio_progress (user_id, book_id, progress, updated_at)
//                 VALUES (?, ?, ?, NOW())
//             `;
//             await pool.query(insertQuery, [user_id, book_id, progress]);

//             return res.status(201).json({
//                 message: "Audio progress saved successfully",
//                 data: {
//                     user_id,
//                     book_id,
//                     progress
//                 }
//             });
//         }

//     } catch (error) {
//         return res.status(500).json({
//             message: "Internal server error",
//             error: error.message
//         });
//     }
// };




// export const saveOrUpdateAudioProgress = async (req, res) => {
//     try {
//         const { user_id, book_id, progress } = req.body;
//         const progressValue = parseFloat(progress); // ✅ Convert string to number

//         const checkQuery = `
//             SELECT progress FROM audio_progress 
//             WHERE user_id = ? AND book_id = ?
//         `;
//         const [existingProgress] = await pool.query(checkQuery, [user_id, book_id]);

//         if (existingProgress.length > 0) {
//             const currentProgress = parseFloat(existingProgress[0].progress); // 🔁 Make sure DB value is also float

//             // Only update if new progress is greater than existing
//             if (progressValue > currentProgress) {
//                 const updateQuery = `
//                     UPDATE audio_progress 
//                     SET progress = ?, updated_at = NOW()
//                     WHERE user_id = ? AND book_id = ?
//                 `;
//                 await pool.query(updateQuery, [progressValue, user_id, book_id]);

//                 return res.status(200).json({
//                     message: "Audio progress updated successfully",
//                     data: {
//                         user_id,
//                         book_id,
//                         progress: progressValue
//                     }
//                 });
//             } else {
//                 return res.status(200).json({
//                     message: "New progress is less than or equal to existing. No update performed.",
//                     data: {
//                         user_id,
//                         book_id,
//                         progress: currentProgress
//                     }
//                 });
//             }

//         } else {
//             // Insert new progress
//             const insertQuery = `
//                 INSERT INTO audio_progress (user_id, book_id, progress, updated_at)
//                 VALUES (?, ?, ?, NOW())
//             `;
//             await pool.query(insertQuery, [user_id, book_id, progressValue]);

//             return res.status(201).json({
//                 message: "Audio progress saved successfully",
//                 data: {
//                     user_id,
//                     book_id,
//                     progress: progressValue
//                 }
//             });
//         }

//     } catch (error) {
//         return res.status(500).json({
//             message: "Internal server error",
//             error: error.message
//         });
//     }
// };



// export const saveOrUpdateAudioProgress = async (req, res) => {
//     try {
//         const { user_id, book_id, progress } = req.body;
//         const progressValue = parseFloat(progress); // ✅ Convert string to number

//         const checkQuery = `
//             SELECT progress FROM audio_progress 
//             WHERE user_id = ? AND book_id = ?
//         `;
//         const [existingProgress] = await pool.query(checkQuery, [user_id, book_id]);

//         if (existingProgress.length > 0) {
//             const currentProgress = parseFloat(existingProgress[0].progress); // 🔁 Make sure DB value is also float

//             // Only update if new progress is greater than existing
//             if (progressValue > currentProgress) {
//                 const updateQuery = `
//                     UPDATE audio_progress 
//                     SET progress = ?, updated_at = NOW()
//                     WHERE user_id = ? AND book_id = ?
//                 `;
//                 await pool.query(updateQuery, [progressValue, user_id, book_id]);

//                 return res.status(200).json({
//                     message: "Audio progress updated successfully",
//                     data: {
//                         user_id,
//                         book_id,
//                         progress: progressValue
//                     }
//                 });
//             } else {
//                 return res.status(200).json({
//                     message: "New progress is less than or equal to existing. No update performed.",
//                     data: {
//                         user_id,
//                         book_id,
//                         progress: currentProgress
//                     }
//                 });
//             }

//         } else {
//             // Insert new progress
//             const insertQuery = `
//                 INSERT INTO audio_progress (user_id, book_id, progress, updated_at)
//                 VALUES (?, ?, ?, NOW())
//             `;
//             await pool.query(insertQuery, [user_id, book_id, progressValue]);

//             return res.status(201).json({
//                 message: "Audio progress saved successfully",
//                 data: {
//                     user_id,
//                     book_id,
//                     progress: progressValue
//                 }
//             });
//         }

//     } catch (error) {
//         return res.status(500).json({
//             message: "Internal server error",
//             error: error.message
//         });
//     }
// };












// export const saveOrUpdateAudioProgress = async (req, res) => {
//     try {
//         const { user_id, book_id, progress } = req.body;
//         const progressValue = parseFloat(progress); // Convert to number

//         const checkQuery = `
//             SELECT progress FROM audio_progress 
//             WHERE user_id = ? AND book_id = ?
//         `;
//         const [existingProgress] = await pool.query(checkQuery, [user_id, book_id]);

//         if (existingProgress.length > 0) {
//             const currentProgress = parseFloat(existingProgress[0].progress);

//             // ✅ Update if new progress is different (not equal)
//             if (progressValue !== currentProgress) {
//                 const updateQuery = `
//                     UPDATE audio_progress 
//                     SET progress = ?, updated_at = NOW()
//                     WHERE user_id = ? AND book_id = ?
//                 `;
//                 await pool.query(updateQuery, [progressValue, user_id, book_id]);

//                 return res.status(200).json({
//                     message: "Audio progress updated successfully",
//                     data: {
//                         user_id,
//                         book_id,
//                         progress: progressValue
//                     }
//                 });
//             } else {
//                 return res.status(200).json({
//                     message: "Progress value is the same as existing. No update performed.",
//                     data: {
//                         user_id,
//                         book_id,
//                         progress: currentProgress
//                     }
//                 });
//             }

//         } else {
//             // First time insert
//             const insertQuery = `
//                 INSERT INTO audio_progress (user_id, book_id, progress, updated_at)
//                 VALUES (?, ?, ?, NOW())
//             `;
//             await pool.query(insertQuery, [user_id, book_id, progressValue]);

//             return res.status(201).json({
//                 message: "Audio progress saved successfully",
//                 data: {
//                     user_id,
//                     book_id,
//                     progress: progressValue
//                 }
//             });
//         }

//     } catch (error) {
//         return res.status(500).json({
//             message: "Internal server error",
//             error: error.message
//         });
//     }
// };


export const saveOrUpdateAudioProgress = async (req, res) => {
    try {
        const { user_id, book_id, progress } = req.body;
        const progressValue = parseFloat(progress); // Convert to number

        const checkQuery = `
            SELECT progress FROM audio_progress 
            WHERE user_id = ? AND book_id = ?
        `;
        const [existingProgress] = await pool.query(checkQuery, [user_id, book_id]);

        if (existingProgress.length > 0) {
            const currentProgress = parseFloat(existingProgress[0].progress);

            // ✅ Update if new progress is different (not equal)
            if (progressValue !== currentProgress) {
                const updateQuery = `
                    UPDATE audio_progress 
                    SET progress = ?, updated_at = NOW()
                    WHERE user_id = ? AND book_id = ?
                `;
                await pool.query(updateQuery, [progressValue, user_id, book_id]);

                return res.status(200).json({
                    message: "Audio progress updated successfully",
                    data: {
                        user_id,
                        book_id,
                        progress: progressValue
                    }
                });
            } else {
                return res.status(200).json({
                    message: "Progress value is the same as existing. No update performed.",
                    data: {
                        user_id,
                        book_id,
                        progress: currentProgress
                    }
                });
            }

        } else {
            // First time insert
            const insertQuery = `
                INSERT INTO audio_progress (user_id, book_id, progress, updated_at)
                VALUES (?, ?, ?, NOW())
            `;
            await pool.query(insertQuery, [user_id, book_id, progressValue]);

            return res.status(201).json({
                message: "Audio progress saved successfully",
                data: {
                    user_id,
                    book_id,
                    progress: progressValue
                }
            });
        }

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};





export const getAudioProgress = async (req, res) => {
    try {
        const { user_id, book_id } = req.query;

        if (!user_id || !book_id) {
            return res.status(400).json({ message: "User ID and Book ID are required" });
        }

        const query = `
            SELECT progress FROM audio_progress 
            WHERE user_id = ? AND book_id = ?
        `;
        const [result] = await pool.query(query, [user_id, book_id]);

        if (result.length > 0) {
            const progress = result[0].progress;
            const status = progress >= 100 ? "complete" : "incomplete";



            return res.status(200).json({
                message: progress >= 100 ? "Audio completed listening" : "Audio progress fetched successfully",
                data: {
                    progress,
                    status
                }

            });
        } else {
            return res.status(404).json({ message: "No audio progress found for this user and book" });
        }

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};


export const getbook = async (req, res) => {
    try {
        const mysqlQuery = `
            SELECT 
                book.id AS id,
                book.category_id,
                book.book_name,
                book.description,
                book.status,
                book.image,
                book.audio_book_url,
                book.flip_book_url,
                book.author,
                COALESCE(
                    CONCAT(
                        '[', 
                        GROUP_CONCAT(
                            JSON_OBJECT(
                                'question_id', bookquestions.id,
                                'question_text', bookquestions.question,
                                'option_1', bookquestions.option_1,
                                'option_2', bookquestions.option_2,
                                'option_3', bookquestions.option_3,
                                'option_4', bookquestions.option_4,
                                'correct_option', bookquestions.correct_option
                            )
                        ),
                        ']'
                    ),
                    '[]'
                ) AS questions
            FROM book
            LEFT JOIN bookquestions ON book.id = bookquestions.book_id
            GROUP BY book.id`;

        const [result] = await pool.query(mysqlQuery);

        // Check if result is an array
        if (!Array.isArray(result)) {
            return res.status(500).json({ message: "Unexpected response format from database" });
        }

        // Convert questions column from string to JSON safely
        const formattedResult = result.map(book => {
            let parsedQuestions = [];
            try {
                // Only parse if questions is not an empty string
                parsedQuestions = book.questions && book.questions !== "" ? JSON.parse(book.questions) : [];
            } catch (error) {
                // In case of any parsing error, fallback to an empty array
                parsedQuestions = [];
            }
            return {
                ...book,
                questions: parsedQuestions // Safely handle JSON parsing
            };
        });

        if (formattedResult.length > 0) {
            return res.status(200).json({
                message: "Books fetched successfully",
                data: formattedResult
            });
        } else {
            return res.status(404).json({ message: "No book data found" });
        }
    } catch (error) {
        console.error(error); // Log the full error for debugging
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};





// export const getBookByid = async (req, res) => {
//     try {
//         const { id } = req.params;

//         // Query to fetch book details
//         const bookQuery = "SELECT * FROM book WHERE id = ?";
//         const [bookResult] = await pool.query(bookQuery, [id]);

//         if (bookResult.length === 0) {
//             return res.status(404).json({ message: "No Book found" });
//         }

//         // Query to fetch questions related to the book
//         const questionsQuery = `
//             SELECT id, book_id, question AS question_text, option_1, option_2, option_3, option_4, correct_option
//             FROM bookquestions
//             WHERE book_id = ?
//         `;
//         const [questionsResult] = await pool.query(questionsQuery, [id]);

//         return res.status(200).json({
//             message: "Single Book fetched successfully",
//             data: {
//                 ...bookResult[0],
//                 questions: questionsResult, // Adding formatted questions to the response
//             },
//         });

//     } catch (error) {
//         return res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// };


export const getBookByid = async (req, res) => {
    try {
        const { id } = req.params;

        // Query to fetch book details
        const bookQuery = "SELECT * FROM book WHERE id = ?";
        const [bookResult] = await pool.query(bookQuery, [id]);

        if (bookResult.length === 0) {
            return res.status(404).json({ message: "No Book found" });
        }

        // Query to fetch questions related to the book
        const questionsQuery = `
            SELECT id, book_id, question AS question_text, option_1, option_2, option_3, option_4, correct_option,qustionexplanation
            FROM bookquestions
            WHERE book_id = ?
        `;
        const [questionsResult] = await pool.query(questionsQuery, [id]);

        // Query to fetch reviews with reviewer name
        const reviewsQuery = `
            SELECT 
                r.id AS review_id, 
                r.user_id, 
                ru.firstname AS reviewer_name, 
                r.rating, 
                r.comment, 
                r.created_at 
            FROM reviews r 
            LEFT JOIN users ru ON r.user_id = ru.id 
            WHERE r.book_id = ?
        `;
        const [reviewsResult] = await pool.query(reviewsQuery, [id]);

        return res.status(200).json({
            message: "Single Book fetched successfully",
            data: {
                ...bookResult[0],
                questions: questionsResult,
                reviews: reviewsResult
            },
        });



    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};





// export const getBookByid = async (req, res) => {
//     try {
//         const { id } = req.params;

//         // Query to fetch book details along with reviews and usernames
//         const bookQuery = `
//             SELECT 
//                 b.*, 
//                 u.firstname AS book_owner, 
//                 r.id AS review_id, 
//                 r.user_id AS review_user_id, 
//                 r.rating, 
//                 r.comment, 
//                 r.created_at AS review_created_at,
//                 ru.firstname AS reviewer_name
//             FROM book b
//             LEFT JOIN users u ON b.user_id = u.id  -- Fetch book owner's firstname
//             LEFT JOIN reviews r ON b.id = r.book_id
//             LEFT JOIN users ru ON r.user_id = ru.id  -- Fetch reviewer's firstname
//             WHERE b.id = ?
//         `;
//         const [bookResults] = await pool.query(bookQuery, [id]);
//         if (bookResults.length === 0) {
//             return res.status(404).json({ message: "No Book found" });
//         }

//         // Formatting book data with reviews
//         const bookData = {
//             id: bookResults[0].id,
//             user_id: bookResults[0].user_id,
//             category_id: bookResults[0].category_id,
//             book_name: bookResults[0].book_name,
//             description: bookResults[0].description,
//             status: bookResults[0].status,
//             image: bookResults[0].image,
//             timestamp: bookResults[0].timestamp,
//             author: bookResults[0].author,
//             title: bookResults[0].title,
//             flip_book_url: bookResults[0].flip_book_url,
//             audio_book_url: bookResults[0].audio_book_url,
//             book_owner: bookResults[0].book_owner, // Book owner's username
//             reviews: bookResults
//                 .filter(row => row.review_id !== null) // Filter out if no reviews
//                 .map(review => ({
//                     review_id: review.review_id,
//                     user_id: review.review_user_id,
//                     reviewer_name: review.reviewer_name, // Reviewer's username
//                     rating: review.rating,
//                     comment: review.comment,
//                     created_at: review.review_created_at
//                 }))
//         };

//         return res.status(200).json({
//             message: "Book details with reviews fetched successfully",
//             data: bookData
//         });

//     } catch (error) {
//         return res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// };




//  backblaze code
export const editBook = async (req, res) => {
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "audio_book_url", maxCount: 1 }
  ])(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ message: "File upload failed", error: err.message });
    }

    try {
      const { id } = req.params;
      const {
        category_id,
        book_name,
        description,
        status,
        author,
        flip_book_url,
        question
      } = req.body;

      console.log("editBook", req.body);

      const statusValue = status || "not completed";
      const categoryIdNum = parseInt(category_id, 10);

      let imageUrl = req.body.image || "";
      let audioUrl = req.body.audio_book_url || "";

      // ✅ Upload image to B2 if provided
      if (req.files["image"]?.length) {
        try {
          const fileBuffer = req.files["image"][0].buffer;
          const originalName = req.files["image"][0].originalname;
          imageUrl = await uploadToB2(fileBuffer, originalName, "books/images");
        } catch (error) {
          console.error("Image upload to B2 failed:", error);
          return res.status(500).json({ message: "Image upload failed", error: error.message });
        }
      }

      // ✅ Upload audio to B2 if provided
      if (req.files["audio_book_url"]?.length) {
        try {
          const fileBuffer = req.files["audio_book_url"][0].buffer;
          const originalName = req.files["audio_book_url"][0].originalname;
          audioUrl = await uploadToB2(fileBuffer, originalName, "books/audio");
        } catch (error) {
          console.error("Audio upload to B2 failed:", error);
          return res.status(500).json({ message: "Audio upload failed", error: error.message });
        }
      }

      // ✅ Update book data in MySQL
      await pool.query(
        `UPDATE book SET 
          category_id = ?, 
          book_name = ?, 
          description = ?, 
          status = ?, 
          image = ?, 
          audio_book_url = ?, 
          flip_book_url = ?, 
          author = ? 
        WHERE id = ?`,
        [
          categoryIdNum,
          book_name,
          description,
          statusValue,
          imageUrl,
          audioUrl,
          flip_book_url,
          author,
          id
        ]
      );

      // ✅ Update questions if provided
      if (question) {
        const parsedQuestions = JSON.parse(question);
        if (Array.isArray(parsedQuestions)) {
          await Promise.all(parsedQuestions.map(async (q) => {
            const { id: questionId, question_text, options, correct_option } = q;
            if (!questionId || !options || options.length !== 4) {
              console.warn("⚠ Skipping invalid question:", q);
              return null;
            }

            const optionTexts = options.map(option => option.text);

            await pool.query(
              `UPDATE bookquestions SET 
                question = ?, 
                option_1 = ?, 
                option_2 = ?, 
                option_3 = ?, 
                option_4 = ?, 
                correct_option = ? 
              WHERE id = ? AND book_id = ?`,
              [
                question_text,
                optionTexts[0],
                optionTexts[1],
                optionTexts[2],
                optionTexts[3],
                parseInt(correct_option, 10),
                questionId,
                id
              ]
            );
          }));
        }
      }

      // ✅ Fetch updated questions for response
      const [updatedQuestions] = await pool.query(
        `SELECT id, question AS question_text, option_1, option_2, option_3, option_4, correct_option 
         FROM bookquestions WHERE book_id = ?`,
        [id]
      );

      const formattedQuestions = updatedQuestions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        options: [
          { text: q.option_1 },
          { text: q.option_2 },
          { text: q.option_3 },
          { text: q.option_4 }
        ],
        correct_option: q.correct_option
      }));

      return res.status(200).json({
        message: "Book and question updated successfully",
        data: {
          id,
          category_id: categoryIdNum,
          book_name,
          description,
          status: statusValue,
          image: imageUrl,
          audio_book_url: audioUrl,
          flip_book_url,
          author,
          question: formattedQuestions.length === 1 ? formattedQuestions[0] : formattedQuestions
        }
      });

    } catch (error) {
      console.error("❌ Error in editBook:", error);
      return res.status(500).json({ message: "Internal server error", error: error.message });
    }
  });
};



export const getquestionanswerbyid = async (req, res) => {
    try {
        const { id } = req.params;
        const mysqlQuery = "SELECT * FROM bookquestions WHERE book_id =?";
        const [result] = await pool.query(mysqlQuery, [id]);
        if (result.length > 0) {
            return res.status(200).json({
                message: "single Book fetched successfully",
                data: result
            });
        }
        else {
            return res.status(404).json({ message: "No Book found" });
        }
    }
    catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message })

    }
}

export const getBookByCategoryId = async (req, res) => {
    try {
        const { id } = req.params;
        console.log("Category ID received:", req.params);

        const mysqlQuery = "SELECT * FROM book WHERE category_id = ?";
        const [result] = await pool.query(mysqlQuery, [id]);

        console.log("Query Result:", result);

        if (result.length > 0) {
            return res.status(200).json({
                message: "Category-wise books fetched successfully",
                data: result
            });
        } else {
            return res.status(404).json({ message: "No books found for this category" });
        }
    } catch (error) {
        console.error("Database Error:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};

// export const deleteBook = async (req, res) => {
//     try {
//         const { id } = req.params;

//         // Check if the book exists
//         const checkQuery = "SELECT * FROM book WHERE id = ?";
//         const [existingBook] = await pool.query(checkQuery, [id]);

//         if (existingBook.length === 0) {
//             return res.status(404).json({ message: "No Book found" });
//         }

//         // Delete the book
//         const deleteQuery = "DELETE FROM book WHERE id = ?";
//         await pool.query(deleteQuery, [id]);

//         return res.status(200).json({
//             message: "Book deleted successfully",

//         });
//     } catch (error) {
//         console.error("Error deleting book:", error);
//         return res.status(500).json({ message: "Internal server error" });
//     }
// };


export const deleteBook = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if the book exists
        const checkQuery = "SELECT * FROM book WHERE id = ?";
        const [existingBook] = await pool.query(checkQuery, [id]);
        if (existingBook.length === 0) {
            return res.status(404).json({ message: "No Book found" });
        }
        // Delete the book
        const deleteQuery = "DELETE FROM book WHERE id = ?";
        await pool.query(deleteQuery, [id]);
        await pool.query("DELETE FROM audio_progress WHERE book_id = ?  ", [id])
        await pool.query("DELETE FROM book_test_results WHERE book_id = ?  ", [id])
         await pool.query("DELETE FROM reviews WHERE book_id = ?  ", [id])

        return res.status(200).json({
            message: "Book deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting book:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const UserDelete = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if the book exists
        const checkQuery = "SELECT * FROM users WHERE id = ?";
        const [existingUser] = await pool.query(checkQuery, [id]);

        const checkQuerys = "DELETE FROM book WHERE user_id = ?";
        await pool.query(checkQuerys, [id]);


        const checkQueryss = "DELETE FROM audio_progress WHERE user_id = ?";
        await pool.query(checkQueryss, [id]);
await pool.query("DELETE FROM reviews WHERE user_id = ?  ", [id])

        const checkQuerysss = "DELETE FROM book_test_results WHERE user_id = ?";
        await pool.query(checkQuerysss, [id]);





        if (existingUser.length === 0) {
            return res.status(404).json({ message: "No User found" });
        }

        // Delete the book
        const deleteQuery = "DELETE FROM users WHERE id = ?";
        await pool.query(deleteQuery, [id]);

        return res.status(200).json({
            message: "User deleted successfully",

        });
    } catch (error) {
        console.error("Error deleting book:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// getAllUsersWithPromo

export const getAllUsersWithPromo = async (req, res) => {
    try {
        const [users] = await pool.query("SELECT id, firstname, lastname, email, promocode, is_active FROM users WHERE promocode IS NOT NULL");

        if (users.length > 0) {
            return res.status(200).json({ message: "Users with promo codes fetched successfully", data: users });
        } else {
            return res.status(404).json({ message: "No users found with promo codes" });
        }
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

// Cancel Subscription 


export const cancelSubscription = async (req, res) => {
    try {
        const { user_id } = req.params; // User ID from request params
        console.log(`CancelSubscription called for user_id: ${user_id}`);

        // Deactivate the subscription
        const [updateSubscription] = await pool.query(
            "UPDATE subscriptions SET is_active = 0 WHERE user_id = ?",
            [user_id]
        );
        console.log(`Subscription update result:`, updateSubscription);

        if (updateSubscription.affectedRows > 0) {
            // Deactivate the user account so they cannot login
            const [updateUser] = await pool.query("UPDATE users SET is_active = 0 WHERE id = ?", [user_id]);
            console.log(`User account deactivation result:`, updateUser);

            // Fetch user's email
            const [userRows] = await pool.query("SELECT email FROM users WHERE id = ?", [user_id]);
            console.log(`Fetched user email rows:`, userRows);
            const userEmail = userRows.length ? userRows[0].email : 'Unknown user';
            const email = userEmail;  // Defining email variable for mailOptions

            // Setup email transporter
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'packageitappofficially@gmail.com',
                    pass: 'epvuqqesdioohjvi',
                },
                tls: {
                    rejectUnauthorized: false,  // Fix for self-signed cert error
                }
            });
            console.log('Email transporter configured');

            const mailOptions = {
                from: 'sagar.kiaan12@gmail.com',
                to: email, // Now email variable is defined
                subject: 'User wants to cancel subscription',
                text: `User with email ${userEmail} (ID: ${user_id}) has cancelled their subscription.`,
            };
            console.log('Mail options prepared:', mailOptions);

            // Send notification email (async, no blocking)
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error("Error sending cancellation notification email:", error);
                } else {
                    console.log("Cancellation notification email sent:", info.response);
                }
            });

            console.log(`Subscription cancelled and user deactivated for user_id: ${user_id}`);
            return res.status(200).json({ message: "Subscription cancelled and user deactivated successfully" });
        } else {
            console.warn(`No active subscription found for user_id: ${user_id}`);
            return res.status(404).json({ message: "No active subscription found for this user" });
        }
    } catch (error) {
        console.error("Cancel subscription error:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

export const createSubscriptionByAdmin = async (req, res) => {
    try {
        const { admin_id, user_id, plan_name, amount, promocode } = req.body;

        // Verify if the admin exists
        const [admin] = await pool.query("SELECT * FROM admin WHERE id = ?", [admin_id]);
        if (admin.length === 0) {
            return res.status(403).json({ message: "Admin not found or unauthorized" });
        }
        let finalAmount = amount;
        let discountApplied = false;
        let referredBy = null;
        // Check if promo code is valid and belongs to an active user
        if (promocode) {
            const [referrer] = await pool.query("SELECT id FROM users WHERE promocode = ? AND is_active = 1", [promocode]);

            if (referrer.length > 0) {
                // Apply 20% discount if a valid promo code is found
                finalAmount = amount * 0.80; // 20% discount
                discountApplied = true;
                referredBy = referrer[0].id; // Assign the referring user's ID
            }
        }
        // Calculate subscription period
        const startDate = new Date();
        let endDate = new Date();
        if (plan_name.toLowerCase() === "1 month") endDate.setMonth(endDate.getMonth() + 1);
        else if (plan_name.toLowerCase() === "6 Months") endDate.setMonth(endDate.getMonth() + 6);
        else if (plan_name.toLowerCase() === "1 Year") endDate.setFullYear(endDate.getFullYear() + 1);
        // Insert the new subscription into the database
        const [result] = await pool.query(
            "INSERT INTO subscriptions (user_id, plan_name, amount, original_price, discount_applied, referred_by, promocode, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [user_id, plan_name, finalAmount, amount, discountApplied, referredBy, promocode, startDate, endDate, 1]
        );

        if (plan_name.toLowerCase() === "1 Month") {
            await pool.query(
                "INSERT INTO progress_tracking (user_id, books_completed) VALUES (?, 0) ON DUPLICATE KEY UPDATE books_completed = books_completed",
                [user_id]
            );
        }




        return res.status(201).json({
            message: "Subscription created successfully by Admin",
            data: {
                id: result.insertId,
                user_id,
                plan_name,
                amount: finalAmount,
                original_price: amount,
                discount_applied: discountApplied,
                referred_by: referredBy,
                promocode,
                start_date: startDate,
                end_date: endDate,
                is_active: 1,
                challenge_started: plan_name.toLowerCase() === "1 Month"
            }
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

export const getsubscription = async (req, res) => {
    try {
        const mysqlQuery = "SELECT * FROM subscriptions ORDER BY id ASC LIMIT 3";
        const [result] = await pool.query(mysqlQuery);
        if (result.length > 0) {
            return res.status(200).json({
                message: "subscription fatched successfully",
                data: result
            });
        } else {
            return res.status(404).json({ message: "subscription not found" });
        }
    }
    catch {
        return res.status(500).json({ message: "Internal Server error", error: error.message });
    }
}


export const getsubscriptionByid = async (req, res) => {
    try {
        const { id } = req.params;
        console.log("Category ID received:", req.params);
        const mysqlQuery = "SELECT * FROM subscriptions WHERE user_id = ?";
        const [result] = await pool.query(mysqlQuery, [id]);
        console.log("Query Result:", result);
        if (result.length > 0) {
            return res.status(200).json({
                message: "Single Subscription fetch successfully",
                data: result
            });
        } else {
            return res.status(404).json({ message: "No Subscription found for this plan" });
        }
    } catch (error) {
        console.error("Database Error:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}


export const SubscriptionDelete = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user exists
        const checkUserQuery = "SELECT id FROM users WHERE id = ?";
        const [user] = await pool.query(checkUserQuery, [id]);

        if (user.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        // Delete user's subscription
        const deleteSubscriptionQuery = "DELETE FROM subscriptions WHERE user_id = ?";
        await pool.query(deleteSubscriptionQuery, [id]);

        // Delete user
        const deleteUserQuery = "DELETE FROM users WHERE id = ?";
        await pool.query(deleteUserQuery, [id]);

        return res.status(200).json({ message: "User and subscription deleted successfully" });

    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};


// export const updateUserSubscriptionPlan = async (req, res) => {
//     try {
//         const { user_id, new_plan_name, amount } = req.body;

//         const planLevels = {
//             "1 month": 1,
//             "6 months": 2,
//             "1 year": 3
//         };

//         const normalizedNewPlan = new_plan_name.toLowerCase();

//         if (!planLevels[normalizedNewPlan]) {
//             return res.status(400).json({ message: "Invalid plan selected" });
//         }

//         // Fetch current subscription
//         const [currentSubs] = await pool.query(
//             "SELECT plan_name FROM subscriptions WHERE user_id = ? AND is_active = 1 ORDER BY end_date DESC LIMIT 1",
//             [user_id]
//         );

//         if (currentSubs.length === 0) {
//             return res.status(400).json({ message: "No active subscription found" });
//         }

//         const currentPlan = currentSubs[0].plan_name.toLowerCase();

//         if (planLevels[normalizedNewPlan] <= planLevels[currentPlan]) {
//             return res.status(403).json({ message: `You cannot downgrade or reselect the same plan. Your current plan is '${currentPlan}'.` });
//         }

//         // Deactivate current subscription
//         await pool.query(
//             "UPDATE subscriptions SET is_active = 0 WHERE user_id = ? AND is_active = 1",
//             [user_id]
//         );

//         // Calculate dates and remaining_days
//         const startDate = new Date();
//         let endDate = new Date();
//         let remaining_days = 0;

//         if (normalizedNewPlan === "1 month") {
//             endDate.setMonth(endDate.getMonth() + 1);
//             remaining_days = 30;
//         } else if (normalizedNewPlan === "6 months") {
//             endDate.setMonth(endDate.getMonth() + 6);
//             remaining_days = 180;
//         } else if (normalizedNewPlan === "1 year") {
//             endDate.setFullYear(endDate.getFullYear() + 1);
//             remaining_days = 365;
//         }

//         // Insert new subscription
//         const [result] = await pool.query(
//             `INSERT INTO subscriptions 
//             (user_id, plan_name, amount, original_price, description, discount_applied, referred_by, promocode, start_date, end_date, is_active, challenge_eligible, books_completed, remaining_days) 
//             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//             [
//                 user_id,
//                 new_plan_name,
//                 String(amount),              // Since amount is varchar
//                 String(amount),
//                 "Upgraded Plan",
//                 "0",                         // No discount
//                 null,
//                 null,
//                 startDate,
//                 endDate,
//                 1,
//                 "1",                         // Mark as challenge eligible
//                 "0",                         // No books completed yet
//                 remaining_days
//             ]
//         );

//         return res.status(200).json({
//             message: "Subscription upgraded successfully",
//             data: {
//                 id: result.insertId,
//                 user_id,
//                 plan_name: new_plan_name,
//                 amount,
//                 start_date: startDate,
//                 end_date: endDate,
//                 is_active: 1,
//                 remaining_days
//             }
//         });

//     } catch (error) {
//         return res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// };


export const upgradeUserSubscription = async (req, res) => {
    try {
        const { user_id, new_plan_name, new_amount, promocode = null } = req.body;

        // Plan durations in days
        const planDurations = {
            "1 month": 30,
            "6 months": 180,
            "1 year": 365
        };

        const normalizedNewPlan = new_plan_name.toLowerCase();

        if (!planDurations[normalizedNewPlan]) {
            return res.status(400).json({ message: "Invalid plan selected" });
        }

        // Fetch current active subscription
        const [currentSubs] = await pool.query(
            "SELECT * FROM subscriptions WHERE user_id = ? AND is_active = 1 LIMIT 1",
            [user_id]
        );

        if (currentSubs.length === 0) {
            return res.status(404).json({ message: "No active subscription found" });
        }

        const current = currentSubs[0];
        const currentPlan = current.plan_name.toLowerCase();
        const planLevel = { "1 month": 1, "6 months": 2, "1 year": 3 };

        if (planLevel[normalizedNewPlan] <= planLevel[currentPlan]) {
            return res.status(403).json({
                message: `Downgrade not allowed. Your current plan is '${current.plan_name}'.`
            });
        }

        // Calculate remaining days
        const today = new Date();
        const currentEnd = new Date(current.end_date);
        const remainingDays = Math.max(Math.ceil((currentEnd - today) / (1000 * 60 * 60 * 24)), 0);
        // Apply promocode if any (optional)
        let discountApplied = false;
        let referredBy = null;
        let finalAmount = parseFloat(new_amount);

        if (promocode) {
            const [refUser] = await pool.query(
                "SELECT id FROM users WHERE promocode = ? AND is_active = 1",
                [promocode]
            );
            if (refUser.length > 0) {
                finalAmount = finalAmount * 0.80;
                discountApplied = true;
                referredBy = refUser[0].id;
            }
        }

        // Total days = current remaining + new plan
        const totalDays = remainingDays + planDurations[normalizedNewPlan];
        const newEndDate = new Date(today);
        newEndDate.setDate(today.getDate() + totalDays);

        // Update existing subscription
        await pool.query(
            `UPDATE subscriptions 
             SET plan_name = ?, 
                 amount = ?, 
                 original_price = ?, 
                 discount_applied = ?, 
                 referred_by = ?, 
                 promocode = ?, 
                 end_date = ?, 
                 remaining_days = ?, 
                 description = ?, 
                 challenge_eligible = ?, 
                 books_completed = books_completed 
             WHERE id = ?`,
            [
                new_plan_name,
                finalAmount.toString(),
                new_amount,
                discountApplied,
                referredBy,
                promocode,
                newEndDate,
                totalDays,
                "Upgraded plan with remaining days added",
                "1",
                current.id
            ]
        );

        return res.status(200).json({
            message: "Subscription upgraded successfully",
            data: {
                id: current.id,
                user_id,
                plan_name: new_plan_name,
                amount: finalAmount,
                original_price: new_amount,
                discount_applied: discountApplied,
                referred_by: referredBy,
                promocode,
                start_date: current.start_date,
                end_date: newEndDate,
                is_active: 1,
                challenge_eligible: "1",
                books_completed: current.books_completed,
                remaining_days: totalDays
            }
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};




export const changePassword = async (req, res) => {
    try {
        const { email, currentPassword, newPassword } = req.body;
        // Validate required fields
        if (!email || !currentPassword || !newPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }
        // Fetch user data
        const [user] = await pool.query("SELECT id, password FROM users WHERE email = ?", [email]);
        if (user.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        const userId = user[0].id;
        const hashedPassword = user[0].password;
        // Verify current password
        const passwordMatch = await bcrypt.compare(currentPassword, hashedPassword);
        if (!passwordMatch) {
            return res.status(400).json({ message: "Incorrect current password" });
        }
        // Hash the new password
        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        // Update password in database
        await pool.query("UPDATE users SET password = ? WHERE id = ?", [newHashedPassword, userId]);
        return res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Password Change Error:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

export const updateProgress = async (req, res) => {
    let { user_id, book_id, progress, progress_percentage } = req.body;
    // Use whichever key is provided
    progress = progress ?? progress_percentage;
    progress = Number(progress);
    console.log("Request Body:", req.body); // Debugging
    if (isNaN(progress) || progress < 0 || progress > 100) {
        return res.status(400).json({ error: "Progress must be a valid number between 0 and 100." });
    }
    try {
        const [existing] = await pool.query(
            "SELECT * FROM userprogress WHERE user_id = ? AND book_id = ?",
            [user_id, book_id]
        );
        if (existing.length > 0) {
            await pool.query(
                "UPDATE userprogress SET progress_percentage = ? WHERE user_id = ? AND book_id = ?",
                [progress, user_id, book_id]
            );
        } else {
            await pool.query(
                "INSERT INTO userprogress (user_id, book_id, progress_percentage) VALUES (?, ?, ?)",
                [user_id, book_id, progress]
            );
        }
        if (progress >= 80) {
            await pool.query(
                "UPDATE book SET status = 'completed' WHERE id = ?",
                [book_id]
            );
        } else {
            await pool.query(
                "UPDATE book SET status = 'not completed' WHERE id = ?",
                [book_id]
            );
        }
        return res.status(200).json({ message: "Progress updated successfully." });
    } catch (error) {
        console.error("Progress Update Error:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};

export const getUserProgress = async (req, res) => {
    const { user_id } = req.params;

    try {
        const [progress] = await pool.query(
            `SELECT up.book_id, b.book_name, up.progress_percentage 
             FROM userprogress up 
             JOIN book b ON up.book_id = b.id 
             WHERE up.user_id = ?`,
            [user_id]
        );

        return res.status(200).json({ data: progress });
    } catch (error) {
        console.error("Fetch User Progress Error:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};

export const getAllUserProgress = async (req, res) => {
    try {
        const [progress] = await pool.query(
            `SELECT u.id AS user_id, u.firstname AS user_name, b.book_name, up.progress_percentage, 
                    COALESCE(ts.score, 0) AS test_score, up.timestamp
             FROM userprogress up
             JOIN users u ON up.user_id = u.id
             JOIN book b ON up.book_id = b.id
             LEFT JOIN test_scores ts ON ts.user_id = up.user_id AND ts.book_id = up.book_id
             ORDER BY up.timestamp DESC`
        );

        return res.status(200).json({ data: progress });
    } catch (error) {
        console.error("Admin Progress Fetch Error:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};

export const updateTestScore = async (req, res) => {
    const { user_id, book_id, score } = req.body;

    if (score < 0 || score > 100) {
        return res.status(400).json({ error: "Score must be between 0 and 100." });
    }
    try {
        const [existing] = await pool.query(
            "SELECT * FROM test_scores WHERE user_id = ? AND book_id = ?",
            [user_id, book_id]
        );

        if (existing.length > 0) {
            await pool.query(
                "UPDATE test_scores SET score = ?, test_date = NOW() WHERE user_id = ? AND book_id = ?",
                [score, user_id, book_id]
            );
        } else {
            await pool.query(
                "INSERT INTO test_scores (user_id, book_id, score) VALUES (?, ?, ?)",
                [user_id, book_id, score]
            );
        }
        return res.status(200).json({ message: "Test score updated successfully." });
    } catch (error) {
        console.error("Test Score Update Error:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};


export const getReferralStats = async (req, res) => {
    try {
        const { promocode } = req.query;

        if (!promocode) {
            return res.status(400).json({ message: "Promo code is required" });
        }

        // Fetch the user who owns this promo code
        const [owners] = await pool.query("SELECT id FROM users WHERE promocode = ?", [promocode]);

        if (!owners || owners.length === 0) {
            return res.status(404).json({ message: "Promo code not found" });
        }

        const ownerId = owners[0].id;

        // Debugging log
        console.log("Owner ID:", ownerId);

        // Count how many users signed up using this promo code
        const [referrals] = await pool.query("SELECT COUNT(*) as count FROM users WHERE referred_by = ?", [ownerId]);

        console.log("Executed Query:", `SELECT COUNT(*) FROM users WHERE referred_by = ${ownerId}`);

        return res.status(200).json({
            message: "Referral data fetched successfully",
            data: {
                promo_code: promocode,
                referred_users_count: referrals[0].count
            }
        });
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

export const submittest = async (req, res) => {
    const { book_id, user_id, correct_answers, total_questions } = req.body;
    try {
        // 80% passing criteria
        const requiredCorrect = Math.ceil(total_questions * 0.8);
        const status = correct_answers >= requiredCorrect ? "completed" : "not completed";

        // Check if an entry already exists for this user and book
        const [existingResult] = await pool.query(
            "SELECT id FROM book_test_results WHERE user_id = ? AND book_id = ?",
            [user_id, book_id]
        );

        if (existingResult.length > 0) {
            // If record exists, update it
            await pool.query(
                `UPDATE book_test_results 
                 SET correct_answers = ?, total_questions = ?, status = ?
                 WHERE user_id = ? AND book_id = ?`,
                [correct_answers, total_questions, status, user_id, book_id]
            );
        } else {
            // Otherwise, insert a new record
            await pool.query(
                `INSERT INTO book_test_results (user_id, book_id, correct_answers, total_questions, status)
                VALUES (?, ?, ?, ?, ?)`,
                [user_id, book_id, correct_answers, total_questions, status]
            );
        }

        // Update book status if completed
        if (status === "completed") {
            await pool.query(
                "UPDATE book SET status = 'completed' WHERE id = ? AND user_id = ?",
                [book_id, user_id]
            );
        }

        return res.json({
            message: status === "completed" ? "Book marked as completed!" : "Keep trying!",
            correctAnswers: correct_answers,
            totalQuestions: total_questions,
            requiredCorrect,
            status
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getbyidtest = async (req, res) => {
    try {
        const { id } = req.params;
        const mysqlQuery = "SELECT * FROM book_test_results WHERE book_id =?";
        const [result] = await pool.query(mysqlQuery, [id]);
        if (result.length > 0) {
            return res.status(200).json({
                message: "single Book fetched successfully",
                data: result
            });
        }
        else {
            return res.status(404).json({ message: "No Book found" });
        }
    }
    catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message })

    }
}

// export const userbyid = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const query = `
//             SELECT 
//                 u.id, u.firstname, u.lastname, u.email, u.is_active, 
//                 COALESCE(s.plan_name, '') AS plan_name,
//                 COALESCE(s.original_price, 0) AS original_price,
//                 COALESCE(s.discount_applied, 0) AS discount_applied,
//                 COALESCE(s.amount, 0) AS final_amount,  
//                 (COALESCE(s.discount_applied, 0) / COALESCE(s.original_price, 1)) * 100 AS discount_percent,  -- Correct Discount %
//                 COALESCE(s.original_price, 0) - COALESCE(s.discount_applied, 0) AS final_price,  -- Correct Discounted Price
//                 COALESCE(s.start_date, '') AS start_date,
//                 COALESCE(s.end_date, '') AS end_date,
//                 COALESCE(s.is_active, 0) AS subscription_active,
//                 COALESCE(p.promocode, '') AS promocode
//             FROM users u
//             LEFT JOIN subscriptions s ON u.id = s.user_id
//             LEFT JOIN promocode p ON u.id = p.user_id
//             WHERE u.id = ?`;
//         const [result] = await pool.query(query, [id]);
//         if (result.length === 0) {
//             return res.status(404).json({ message: "User not found" });
//         }
//         return res.status(200).json({
//             message: "User fetched successfully",
//             data: result[0]
//         });
//     } catch (error) {
//         console.error("Fetch User by ID Error:", error);
//         return res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// };




export const userbyid = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT 
                u.id, u.firstname, u.lastname, u.email, u.is_active, 
                COALESCE(s.plan_name, '') AS plan_name,
                COALESCE(s.original_price, 0) AS original_price,
                COALESCE(s.discount_applied, 0) AS discount_applied,
                COALESCE(s.amount, 0) AS final_amount,  
                (COALESCE(s.discount_applied, 0) / COALESCE(s.original_price, 1)) * 100 AS discount_percent,
                COALESCE(s.original_price, 0) - COALESCE(s.discount_applied, 0) AS final_price,
                COALESCE(s.start_date, '') AS start_date,
                COALESCE(s.end_date, '') AS end_date,
                COALESCE(s.is_active, 0) AS subscription_active,
                COALESCE(p.promocode, '') AS promocode
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.user_id
            LEFT JOIN promocode p ON u.id = p.user_id
            WHERE u.id = ?`;

        const [result] = await pool.query(query, [id]);

        if (result.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        // Determine the challenge message based on the plan name
        let challengeMessage = "";
        const selectedPlan = result[0].plan_name.toLowerCase();

        if (selectedPlan === "1 month") {
            challengeMessage = "Complete the 30 Days Challenge and get 11 Months free!";
        } else if (selectedPlan === "6 months" || selectedPlan === "1 year") {
            challengeMessage = "Your plan is not valid for the 30 Days Challenge. Please select a 1-month plan.";
        }

        return res.status(200).json({
            message: "User fetched successfully",
            data: {
                ...result[0],
                challengeMessage, // Include the challenge message in the response
            }
        });
    } catch (error) {
        console.error("Fetch User by ID Error:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};



// export const GetCompletedBooks = async (req, res) => {
//     try {
//         const mysqlQuery = `
//             SELECT 
//                 btr.id,
//                 btr.user_id,
//                 COALESCE(u.firstname, '') AS firstname,
//                 COALESCE(u.email, '') AS email,
//                 btr.book_id,
//                 COALESCE(b.book_name, '') AS book_name,
//                 COALESCE(b.image, '') AS image,
//                 btr.correct_answers,
//                 btr.total_questions,
//                 btr.status
//             FROM book_test_results btr
//             LEFT JOIN users u ON btr.user_id = u.id
//             LEFT JOIN book b ON btr.book_id = b.id;
//         `;

//         const [result] = await pool.query(mysqlQuery);

//         console.log("Query Result Length:", result.length);
//         console.log("Query Result:", JSON.stringify(result, null, 2));

//         if (result.length > 0) {
//             return res.status(200).json({
//                 message: "Completed Books fetched successfully",
//                 data: result
//             });
//         } else {
//             return res.status(404).json({ message: "No Completed Books found" });
//         }
//     } catch (error) {
//         console.error("❌ Error:", error);
//         return res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// };

// export const GetCompletedBooks = async (req, res) => {
//     try {
//         const mysqlQuery = `
//             SELECT 
//                 btr.id,
//                 btr.user_id,
//                 COALESCE(u.firstname, '') AS firstname,
//                 COALESCE(u.email, '') AS email,
//                 btr.book_id,
//                 COALESCE(b.book_name, '') AS book_name,
//                 COALESCE(b.image, '') AS image,
//                 btr.correct_answers,
//                 btr.total_questions,
//                 btr.status,
//                 COALESCE(ap.progress, 0) AS listening_progress
//             FROM book_test_results btr
//             LEFT JOIN users u ON btr.user_id = u.id
//             LEFT JOIN book b ON btr.book_id = b.id
//             LEFT JOIN audio_progress ap ON ap.user_id = btr.user_id AND ap.book_id = btr.book_id
//         `;

//         const [result] = await pool.query(mysqlQuery);

//         if (result.length > 0) {
//             return res.status(200).json({
//                 message: "Completed Books fetched successfully",
//                 data: result
//             });
//         } else {
//             return res.status(404).json({ message: "No Completed Books found" });
//         }
//     } catch (error) {
//         console.error("❌ Error:", error);
//         return res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// };


// export const GetCompletedBooks = async (req, res) => {
//     try {
//         const mysqlQuery = `
//             SELECT 
//                 btr.id,
//                 btr.user_id,
//                 COALESCE(u.firstname, '') AS firstname,
//                 COALESCE(u.email, '') AS email,
//                 btr.book_id,
//                 COALESCE(b.book_name, '') AS book_name,
//                 COALESCE(b.image, '') AS image,
//                 btr.correct_answers,
//                 btr.total_questions,
//                 btr.status,
//                 btr.created_at AS test_date, -- ✅ Created date of the test
//                 COALESCE(ap.progress, 0) AS listening_progress
//             FROM book_test_results btr
//             LEFT JOIN users u ON btr.user_id = u.id
//             LEFT JOIN book b ON btr.book_id = b.id
//             LEFT JOIN audio_progress ap ON ap.user_id = btr.user_id AND ap.book_id = btr.book_id
//             WHERE btr.status IN ('Completed', 'Completed Successfully') -- ✅ Only show completed books
//             ORDER BY btr.created_at DESC
//         `;

//         const [result] = await pool.query(mysqlQuery);
//         if (result.length > 0) {
//             return res.status(200).json({
//                 message: "Completed Books fetched successfully",
//                 data: result
//             });
//         } else {
//             return res.status(404).json({ message: "No Completed Books found" });
//         }
//     } catch (error) {
//         console.error("❌ Error:", error);
//         return res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// };




// export const GetCompletedBooks = async (req, res) => {
//     try {
//         const mysqlQuery = `
//             SELECT 
//                 btr.id,
//                 btr.user_id,
//                 COALESCE(u.firstname, '') AS firstname,
//                 COALESCE(u.email, '') AS email,
//                 btr.book_id,
//                 COALESCE(b.book_name, '') AS book_name,
//                 COALESCE(b.image, '') AS image,
//                 btr.correct_answers,
//                 btr.total_questions,
//                 btr.status,
//                 btr.created_at AS test_date,
//                 COALESCE(ap.progress) AS listening_progress,
//                 ROUND((btr.correct_answers / btr.total_questions) * 100, 2) AS correct_percentage
//             FROM book_test_results btr
//             LEFT JOIN users u ON btr.user_id = u.id
//             LEFT JOIN book b ON btr.book_id = b.id
//             LEFT JOIN audio_progress ap ON ap.user_id = btr.user_id AND ap.book_id = btr.book_id
//             WHERE btr.status IN ('Completed', 'Completed Successfully')
//             ORDER BY btr.created_at DESC
//         `;

//         const [result] = await pool.query(mysqlQuery);
//         if (result.length > 0) {
//             return res.status(200).json({
//                 message: "Completed Books fetched successfully",
//                 data: result
//             });
//         } else {
//             return res.status(404).json({ message: "No Completed Books found" });
//         }
//     } catch (error) {
//         console.error("❌ Error:", error);
//         return res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// };



// export const GetCompletedBooks = async (req, res) => {
//     try {
//         const query = 
//             `SELECT 
//                 btr.id,
//                 btr.user_id,
//                 COALESCE(u.firstname, '') AS firstname,
//                 COALESCE(u.email, '') AS email,
//                 btr.book_id,
//                 COALESCE(b.book_name, '') AS book_name,
//                 COALESCE(b.image, '') AS image,
//                 btr.correct_answers,
//                 btr.total_questions,
//                 btr.status,
//                 btr.created_at AS test_date,
//                 COALESCE(ap.progress, 0) AS listening_progress,
//                 ROUND((btr.correct_answers / btr.total_questions) * 100, 2) AS correct_percentage
//             FROM book_test_results btr
//             LEFT JOIN users u ON btr.user_id = u.id
//             LEFT JOIN book b ON btr.book_id = b.id
//             LEFT JOIN audio_progress ap ON ap.user_id = btr.user_id AND ap.book_id = btr.book_id
//             WHERE btr.status IN ('Completed', 'Completed Successfully')
//             ORDER BY btr.created_at DESC` 
//         ;

//         const [books] = await pool.query(query);

//         if (!books.length) {
//             return res.status(404).json({ message: "No Completed Books found" });
//         }

//         res.status(200).json({
//             message: "Completed Books fetched successfully",
//             data: books
//         });
//     } catch (err) {
//         console.error("❌ Error fetching completed books:", err);
//         res.status(500).json({
//             message: "Internal server error",
//             error: err.message
//         });
//     }
// };


// export const GetCompletedBooks = async (req, res) => {
//     try {
       
//             const query = `
//             SELECT 
//                 COALESCE(btr.id, 0) AS test_id,
//                 ap.user_id,
//                 COALESCE(u.firstname, '') AS firstname,
//                 COALESCE(u.email, '') AS email,
//                 ap.book_id,
//                 COALESCE(b.book_name, '') AS book_name,
//                 COALESCE(b.image, '') AS image,
//                 COALESCE(btr.correct_answers, 0) AS correct_answers,
//                 COALESCE(btr.total_questions, 0) AS total_questions,
//                 COALESCE(btr.status, '') AS test_status,
//                 ap.updated_at AS test_date,
//                 COALESCE(ap.progress, 0) AS listening_progress,
//                 ROUND((COALESCE(btr.correct_answers, 0) / NULLIF(btr.total_questions, 0)) * 100, 2) AS correct_percentage,
//                 CASE
//                     WHEN ap.progress < 100 THEN 'Incomplete'
//                     WHEN btr.correct_answers IS NULL OR btr.total_questions = 0 THEN 'Completed'
//                     WHEN (btr.correct_answers / btr.total_questions) * 100 >= 80 THEN 'Completed Successfully'
//                     ELSE 'Completed'
//                 END AS status
//             FROM audio_progress ap
//             LEFT JOIN book_test_results btr ON ap.user_id = btr.user_id AND ap.book_id = btr.book_id
//             LEFT JOIN users u ON ap.user_id = u.id
//             LEFT JOIN book b ON ap.book_id = b.id
//             ORDER BY ap.updated_at DESC
//         `;


//         const [books] = await pool.query(query);

//         if (!books.length) {
//             return res.status(404).json({ message: "No Completed Books found" });
//         }

//         res.status(200).json({
//             message: "Completed Books fetched successfully",
//             data: books
//         });
//     } catch (err) {
//         console.error("❌ Error fetching completed books:", err);
//         res.status(500).json({
//             message: "Internal server error",
//             error: err.message
//         });
//     }
// };





export const GetCompletedBooks = async (req, res) => {
    try {
 const query = `
            SELECT 
                COALESCE(btr.id, 0) AS test_id,
                ap.user_id,
                COALESCE(u.firstname, '') AS firstname,
                COALESCE(u.email, '') AS email,
                ap.book_id,
                COALESCE(b.book_name, '') AS book_name,
                COALESCE(b.image, '') AS image,
                COALESCE(btr.correct_answers, 0) AS correct_answers,
                COALESCE(btr.total_questions, 0) AS total_questions,
                COALESCE(btr.status, '') AS test_status,
                ap.updated_at AS test_date,
                COALESCE(ap.progress, 0) AS listening_progress,
                ROUND((COALESCE(btr.correct_answers, 0) / NULLIF(btr.total_questions, 0)) * 100, 2) AS correct_percentage,
                CASE
                    WHEN ap.progress < 100 THEN 'Incomplete'
                    WHEN btr.correct_answers IS NULL OR btr.total_questions = 0 THEN 'Completed'
                    WHEN (btr.correct_answers / btr.total_questions) * 100 >= 80 THEN 'Completed Successfully'
                    ELSE 'Completed'
                END AS status
            FROM audio_progress ap
            LEFT JOIN book_test_results btr ON ap.user_id = btr.user_id AND ap.book_id = btr.book_id
            LEFT JOIN users u ON ap.user_id = u.id
            LEFT JOIN book b ON ap.book_id = b.id
            ORDER BY ap.updated_at DESC
        `;
 const [books] = await pool.query(query);
        if (!books.length) {
            return res.status(404).json({ message: "No Completed Books found" });
        }

        res.status(200).json({
            message: "Completed Books fetched successfully",
            data: books
        });
    } catch (err) {
        console.error("❌ Error fetching completed books:", err);
        res.status(500).json({
            message: "Internal server error",
            error: err.message
        });
    }
};

// export const GetCompletedBooks = async (req, res) => {
//     try {
//         const query =
//             `SELECT 
//     btr.id,
//     btr.user_id,
//     COALESCE(u.firstname, '') AS firstname,
//     COALESCE(u.email, '') AS email,
//     btr.book_id,
//     COALESCE(b.book_name, '') AS book_name,
//     COALESCE(b.image, '') AS image,
//     btr.correct_answers,
//     btr.total_questions,
//     btr.created_at AS test_date,
//     COALESCE(ap.progress, 0) AS listening_progress,
//     ROUND((btr.correct_answers / btr.total_questions) * 100, 2) AS correct_percentage,
//     CASE
//         WHEN COALESCE(ap.progress, 0) < 100 THEN 'Incomplete'
//         WHEN btr.total_questions IS NULL OR btr.total_questions = 0 THEN 'Incomplete'
//         WHEN (btr.correct_answers / btr.total_questions) * 100 >= 80 THEN 'Completed Successfully'
//         ELSE 'Complete'
//     END AS status
// FROM book_test_results btr
// LEFT JOIN users u ON btr.user_id = u.id
// LEFT JOIN book b ON btr.book_id = b.id
// LEFT JOIN audio_progress ap ON ap.user_id = btr.user_id AND ap.book_id = btr.book_id
// WHERE (btr.correct_answers / btr.total_questions) * 100 >= 80
// ORDER BY btr.created_at DESC;`;
//         const [books] = await pool.query(query);
//         if (!books.length) {
//             return res.status(404).json({ message: "No Completed Books found" });
//         }
//         res.status(200).json({
//             message: "Completed Books fetched successfully",
//             data: books
//         });
//     } catch (err) {
//         console.error("❌ Error fetching completed books:", err);
//         res.status(500).json({
//             message: "Internal server error",
//             error: err.message
//         });
//     }
// };




// export const GetCompletedBooksByUserId = async (req, res) => {
//     try {
//         const { id } = req.params;  // Extract id from request parameters
//         console.log("Received userId:", id);
//         if (!id) {
//             return res.status(400).json({ message: "User ID is required" });
//         }
//         const mysqlQuery = `SELECT 
//         btr.id,
//         btr.user_id,
//         COALESCE(u.firstname, '') AS firstname,
//         COALESCE(u.email, '') AS email,
//         btr.book_id,
//         COALESCE(b.book_name, '') AS book_name,
//         COALESCE(b.image, '') AS image,
//         btr.correct_answers,
//         btr.total_questions,
//         btr.status,
//         btr.created_at AS test_date,
//         COALESCE(ap.progress, 0) AS listening_progress,
//         ROUND((btr.correct_answers / btr.total_questions) * 100, 2) AS correct_percentage,
// CASE
//             WHEN ap.progress < 100 THEN 'Incomplete'
//             WHEN btr.correct_answers IS NULL OR btr.total_questions = 0 THEN 'Completed'
//             WHEN (btr.correct_answers / btr.total_questions) * 100 >= 80 THEN 'Completed Successfully'
//             ELSE 'Completed'
//         END AS status
//     FROM book_test_results btr
//     LEFT JOIN users u ON btr.user_id = u.id
//     LEFT JOIN book b ON btr.book_id = b.id
//     LEFT JOIN audio_progress ap ON ap.user_id = btr.user_id AND ap.book_id = btr.book_id
//     WHERE btr.user_id = ? AND btr.status IN ('Completed', 'Completed Successfully')
//     ORDER BY btr.created_at DESC
// `;
//         const [result] = await pool.query(mysqlQuery, [parseInt(id)]);  // Ensure id is an integer
//         console.log("Query Result Length:", result.length);
//         console.log("Query Result:", JSON.stringify(result, null, 2));
//         if (result.length > 0) {
//             return res.status(200).json({
//                 message: "Completed Books fetched successfully",
//                 data: result
//             });
//         } else {
//             return res.status(404).json({ message: "No Completed Books found for this user" });
//         }
//     } catch (error) {
//         console.error("❌ Error:", error);
//         return res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// };


// export const GetCompletedBooksByUserId = async (req, res) => {
//     try {
//         const { id } = req.params;
//         console.log("Received userId:", id);

//         if (!id) {
//             return res.status(400).json({ message: "User ID is required" });
//         }

//         const mysqlQuery = `
//             SELECT 
//                 COALESCE(btr.id, 0) AS test_id,
//                 ap.user_id,
//                 COALESCE(u.firstname, '') AS firstname,
//                 COALESCE(u.email, '') AS email,
//                 ap.book_id,
//                 COALESCE(b.book_name, '') AS book_name,
//                 COALESCE(b.image, '') AS image,
//                 COALESCE(btr.correct_answers, 0) AS correct_answers,
//                 COALESCE(btr.total_questions, 0) AS total_questions,
//                 COALESCE(btr.status, '') AS test_status,
//                 ap.updated_at AS test_date,
//                 COALESCE(ap.progress, 0) AS listening_progress,
//                 ROUND((COALESCE(btr.correct_answers, 0) / NULLIF(btr.total_questions, 0)) * 100, 2) AS correct_percentage,
//                 CASE
//                     WHEN ap.progress < 100 THEN 'Incomplete'
//                     WHEN btr.correct_answers IS NULL OR btr.total_questions = 0 THEN 'Completed'
//                     WHEN (btr.correct_answers / btr.total_questions) * 100 >= 80 THEN 'Completed Successfully'
//                     ELSE 'Completed'
//                 END AS status
//             FROM audio_progress ap
//             LEFT JOIN book_test_results btr ON ap.user_id = btr.user_id AND ap.book_id = btr.book_id
//             LEFT JOIN users u ON ap.user_id = u.id
//             LEFT JOIN book b ON ap.book_id = b.id
//             WHERE ap.user_id = ?
//             ORDER BY ap.updated_at DESC
//         `;
//         const [result] = await pool.query(mysqlQuery, [parseInt(id)]);
//         console.log("Query Result Length:", result.length);
//         console.log("Query Result:", JSON.stringify(result, null, 2));

//         if (result.length > 0) {
//             return res.status(200).json({
//                 message: "Completed/In-progress Books fetched successfully",
//                 data: result
//             });
//         } else {
//             return res.status(404).json({ message: "No audio progress found for this user" });
//         }
//     } catch (error) {
//         console.error("❌ Error:", error);
//         return res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// };



export const GetCompletedBooksByUserId = async (req, res) => {
    try {
        const { id } = req.params;
        console.log("Received userId:", id);

        if (!id) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const mysqlQuery = `
            SELECT 
                COALESCE(btr.id, 0) AS test_id,
                ap.user_id,
                COALESCE(u.firstname, '') AS firstname,
                COALESCE(u.email, '') AS email,
                ap.book_id,
                COALESCE(b.book_name, '') AS book_name,
                COALESCE(b.image, '') AS image,
                COALESCE(btr.correct_answers, 0) AS correct_answers,
                COALESCE(btr.total_questions, 0) AS total_questions,
                COALESCE(btr.status, '') AS test_status,
                ap.updated_at AS test_date,
                COALESCE(ap.progress, 0) AS listening_progress,
                ROUND((COALESCE(btr.correct_answers, 0) / NULLIF(btr.total_questions, 0)) * 100, 2) AS correct_percentage,
                CASE
                    WHEN ap.progress < 100 THEN 'Incomplete'
                    WHEN btr.correct_answers IS NULL OR btr.total_questions = 0 THEN 'Completed'
                    WHEN (btr.correct_answers / btr.total_questions) * 100 >= 80 THEN 'Completed Successfully'
                    ELSE 'Completed'
                END AS status
            FROM audio_progress ap
            LEFT JOIN (
                SELECT b1.*
                FROM book_test_results b1
                INNER JOIN (
                    SELECT user_id, book_id, MAX(id) AS max_id
                    FROM book_test_results
                    GROUP BY user_id, book_id
                ) latest ON b1.id = latest.max_id
            ) btr ON ap.user_id = btr.user_id AND ap.book_id = btr.book_id
            LEFT JOIN users u ON ap.user_id = u.id
            LEFT JOIN book b ON ap.book_id = b.id
            WHERE ap.user_id = ?
            ORDER BY ap.updated_at DESC
        `;

        const [result] = await pool.query(mysqlQuery, [parseInt(id)]);
        console.log("Query Result Length:", result.length);
        console.log("Query Result:", JSON.stringify(result, null, 2));

        if (result.length > 0) {
            return res.status(200).json({
                message: "Completed/In-progress Books fetched successfully",
                data: result
            });
        } else {
            return res.status(404).json({ message: "No audio progress found for this user" });
        }

    } catch (error) {
        console.error("❌ Error:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};



export const startChallenge = async (req, res) => {
    try {
        const { user_id } = req.body;
        // Check if user has an active 1-month subscription
        const [user] = await pool.query(
            "SELECT * FROM subscriptions WHERE user_id = ? AND plan_name = '1 Month' AND is_active = 1",
            [user_id]
        );
        if (user.length === 0) {
            return res.status(403).json({ message: "User not eligible for 30 Days Challenge" });
        }
        // Challenge progress tracking ko insert/update karo
        await pool.query(
            "INSERT INTO progress_tracking (user_id, books_completed) VALUES (?, 0) ON DUPLICATE KEY UPDATE books_completed = books_completed",
            [user_id]
        );
        return res.status(200).json({ message: "30 Days Challenge started successfully!" });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

//old code
// export const submitChallengeTest = async (req, res) => {
//     try {
//         const { user_id, book_id, correct_answers, total_questions } = req.body;
//         // 80% pass criteria
//         const requiredCorrect = Math.ceil(total_questions * 0.8);
//         const status = correct_answers >= requiredCorrect ? "completed" : "not completed";
//         // ✅ Check if same user already attempted any book today
//         const [existingTest] = await pool.query(
//             `SELECT id FROM book_test_results 
//              WHERE user_id = ? AND DATE(created_at) = CURDATE()`,
//             [user_id]
//         );
//         if (existingTest.length > 0) {
//             return res.status(400).json({ message: "You can attempt only one book per day." });
//         }
//         // ✅ Insert new test record
//         await pool.query(
//             "INSERT INTO book_test_results (user_id, book_id, correct_answers, total_questions, status) VALUES (?, ?, ?, ?, ?)",
//             [user_id, book_id, correct_answers, total_questions, status]
//         );
//         if (status === "completed") {
//             // ✅ Progress tracking update karo
//             await pool.query(
//                 "UPDATE progress_tracking SET books_completed = books_completed + 1 WHERE user_id = ?",
//                 [user_id]
//             );
//         }
//         return res.status(200).json({
//             message: status === "completed" ? "Book marked as completed!" : "Try again!",
//             correct_answers,
//             total_questions,
//             requiredCorrect,
//             status
//         });

//     } catch (error) {
//         return res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// };



//new code
// export const submitChallengeTest = async (req, res) => {
//     try {
//         const { user_id, book_id, correct_answers, total_questions } = req.body;
//         const requiredCorrect = Math.ceil(total_questions * 0.8);
//         const status = correct_answers >= requiredCorrect ? "completed" : "not completed";

//         // ✅ Check if user has attempted any book today
//         const [existingTests] = await pool.query(
//             `SELECT book_id, status FROM book_test_results 
//              WHERE user_id = ? AND DATE(created_at) = CURDATE()`,
//             [user_id]
//         );

//         const alreadyPassedBook = existingTests.find(test => test.status === "completed");

//         if (alreadyPassedBook) {
//             return res.status(400).json({ message: "You have already passed a book today." });
//         }

//         const attemptedSameBook = existingTests.find(test => test.book_id === book_id);

//         // ✅ If user has already attempted a different book today, deny further attempts
//         if (existingTests.length > 0 && !attemptedSameBook) {
//             return res.status(400).json({ message: "You can only attempt one book per day." });
//         }

//         // ✅ Check if this is the first attempt for this book
//         const [previousAttempts] = await pool.query(
//             "SELECT id, status FROM book_test_results WHERE user_id = ? AND book_id = ?",
//             [user_id, book_id]
//         );

//         const isFirstAttempt = previousAttempts.length === 0;

//         // ✅ Insert test result
//         await pool.query(
//             "INSERT INTO book_test_results (user_id, book_id, correct_answers, total_questions, status, attempt_number) VALUES (?, ?, ?, ?, ?, ?)",
//             [user_id, book_id, correct_answers, total_questions, status, previousAttempts.length + 1]
//         );

//         // ✅ Update progress only if first attempt is passed
//         if (status === "completed" && isFirstAttempt) {
//             await pool.query(
//                 "UPDATE progress_tracking SET books_completed = books_completed + 1 WHERE user_id = ?",
//                 [user_id]
//             );
//         }

//         return res.status(200).json({
//             message: status === "completed" ? "Book marked as completed!" : "Try again!",
//             correct_answers,
//             total_questions,
//             requiredCorrect,
//             status,
//             isFirstAttempt
//         });

//     } catch (error) {
//         return res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// };


export const submitChallengeTest = async (req, res) => {
    try {
        const { user_id, book_id, correct_answers, total_questions } = req.body;
        const requiredCorrect = Math.ceil(total_questions * 0.8);
        const status = correct_answers >= requiredCorrect ? "Completed Successfully" : "Completed";

        // ✅ Step 1: Prevent retake - user can attempt each book only once ever
        const [alreadyAttempted] = await pool.query(
            `SELECT id FROM book_test_results WHERE user_id = ? AND book_id = ?`,
            [user_id, book_id]
        );

        if (alreadyAttempted.length > 0) {
            return res.status(400).json({
                message: "You have already attempted this book.",
                status: "Attempt Blocked",
                alreadyAttempted: true,
            });
        }

        // ✅ Step 2: Check if the user already attempted 10 different books today
        const [todayAttempts] = await pool.query(
            `SELECT COUNT(DISTINCT book_id) as bookCount FROM book_test_results
   WHERE user_id = ? AND DATE(created_at) = CURDATE()`,
            [user_id]
        );

        if (todayAttempts[0].bookCount >= 10) {
            return res.status(400).json({
                message: "You can only attempt up to 10 different books per day.",
                status: "Limit Reached",
                dailyLimitReached: true,
            });
        }

        // ✅ Step 3: Insert the new test attempt
        await pool.query(
            `INSERT INTO book_test_results
    (user_id, book_id, correct_answers, total_questions, status, attempt_number)
   VALUES (?, ?, ?, ?, ?, 1)`,
            [user_id, book_id, correct_answers, total_questions, status]
        );

        // ✅ Step 4: Update progress if test passed
        if (status === "Completed Successfully") {
            await pool.query(
                `UPDATE progress_tracking
     SET books_completed = books_completed + 1
     WHERE user_id = ?`,
                [user_id]
            );
        }

        // ✅ Step 5: Respond
        return res.status(200).json({
            message: status === "Completed Successfully" ? "Book marked as completed!" : "Try again!",
            correct_answers,
            total_questions,
            requiredCorrect,
            status,
            attemptSaved: true
        });

    } catch (error) {
        console.error("Error submitting test:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};


//new code
export const gatallUserChallengeProgreses = async (req, res) => {
    try {
        // ✅ Fetch all users with active "1 Month" subscription
        const [progress] = await pool.query(
            `SELECT pt.user_id, u.firstname, u.email, 
                    s.plan_name, s.promocode ,
                    DATE_FORMAT(pt.timestamp, '%M') AS progress_month,
                    DATE_FORMAT(pt.timestamp, '%Y') AS Year_name
             FROM users u
             JOIN progress_tracking pt ON u.id = pt.user_id
             LEFT JOIN subscriptions s ON u.id = s.user_id 
             WHERE s.plan_name = '1 Month'` // Plan filter applied
        );

        if (!progress || progress.length === 0) {
            return res.status(404).json({ message: "No users have started the challenge yet." });
        }

        // ✅ Fetch all users' book progress based on first attempt pass
        const userChallengeData = await Promise.all(progress.map(async (user) => {
            const [books] = await pool.query(
                `SELECT btr.book_id, btr.status,
                        CASE WHEN btr.attempt_number = 1 AND btr.status = 'Completed Successfully' 
                             THEN 1 
                             ELSE 0 
                        END AS first_attempt_pass
                 FROM book_test_results btr
                 WHERE btr.user_id = ? 
                 ORDER BY btr.created_at ASC`,
                [user.user_id]
            );

            // ✅ Only count books passed in first attempt for challenge progress
            const booksCompleted = books.filter(book => book.first_attempt_pass === 1).length;
            const remainingBooks = Math.max(30 - booksCompleted, 0); // Ensure it never goes negative
            // ✅ Determine overall book status
            const bookStatusFor1Month = remainingBooks === 0 ? "Completed Successfully" : "incompleted";
            return {
                id: user.user_id,
                books_completed: booksCompleted,
                remaining_books: remainingBooks,
                firstname: user.firstname,
                email: user.email,
                promo_code: user.promocode || "No promo code",
                subscription_plan: user.plan_name || "No subscription",
                subscription_status: user.plan_name ? "Active" : "Pending",
                bookk_status_for_1_month: bookStatusFor1Month,
                progress_month: user.progress_month,
                Year_name: user.Year_name,
                progress_month: user.progress_month,
                book_read_list: books // ✅ List will include all completed books
            };
        }));
        return res.status(200).json({
            message: "User challenge progress fetched successfully",
            data: userChallengeData
        });

    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};


//old code
// export const getUserChallengeProgress = async (req, res) => {
//     try {
//         const { user_id } = req.params;

//         // Progress, User, aur Subscription details fetch karo
//         const [progress] = await pool.query(
//             `SELECT pt.books_completed, 
//                     u.firstname, u.email, 
//                     s.plan_name, s.promocode
//              FROM progress_tracking pt 
//              JOIN users u ON pt.user_id = u.id 
//              LEFT JOIN subscriptions s ON u.id = s.user_id
//              WHERE pt.user_id = ?`,
//             [user_id]
//         );
//         if (progress.length === 0) {
//             return res.status(404).json({ message: "User has not started the challenge yet." });
//         }
//         // Subscription plan aur status set karna
//         const subscription_plan = progress[0].plan_name || "No subscription";
//         const subscription_status = progress[0].plan_name ? "Active" : "Pending"; // Agar plan hai to Active, warna Pending
//         return res.status(200).json({
//             message: "User challenge progress fetched successfully",
//             books_completed: progress[0].books_completed,
//             remaining_books: 30 - progress[0].books_completed,
//             firstname: progress[0].firstname,
//             email: progress[0].email,
//             subscription_plan: subscription_plan,
//             subscription_status: subscription_status, // "Active" ya "Pending"
//             promocode: progress[0].promocode
//         });
//     } catch (error) {
//         return res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// };



// export const getUserChallengeProgress = async (req, res) => {
//     try {
//         const { user_id } = req.params;

//         // ✅ Fetch progress, user, and subscription details
//         const [progress] = await pool.query(
//             `SELECT pt.books_completed, 
//                     u.firstname, u.email, 
//                     s.plan_name, s.promocode,
//                      MIN(pt.timestamp) AS challenge_start_date  -- ✅ Get earliest progress date
//              FROM progress_tracking pt 
//              JOIN users u ON pt.user_id = u.id 
//              LEFT JOIN subscriptions s ON u.id = s.user_id
//              WHERE pt.user_id = ?`,
//             [user_id]
//         );

//         if (progress.length === 0) {
//             return res.status(404).json({ message: "User has not started the challenge yet." });
//         }


//         // const challengeStartDate = progress[0].challenge_start_date;
//         // const elapsedDays = challengeStartDate
//         //     ? Math.floor((new Date() - new Date(challengeStartDate)) / (1000 * 60 * 60 * 24)) // Convert ms to days
//         //     : 0;
//         const challengeStartDate = progress[0]?.challenge_start_date;
//         if (!challengeStartDate) {
//             return res.status(404).json({ message: "User has not started the challenge yet." });
//         }

//         // Calculate total elapsed days
//         const totalElapsedDays = Math.floor((new Date() - new Date(challengeStartDate)) / (1000 * 60 * 60 * 24));

//         // Limit to max 30 days
//         const elapsedDays = Math.min(totalElapsedDays, 30);



//         console.log("challengeStartDate Days:", challengeStartDate); // Debugging
//         // ✅ Fetch all completed books with first attempt status & calculate test score
//         const [books] = await pool.query(
//             `SELECT btr.book_id, btr.status, btr.attempt_number, 
//                     (btr.correct_answers / NULLIF(btr.total_questions, 0)) * 100 AS test_score,
//                     CASE 
//                         WHEN btr.attempt_number = 1 AND btr.status = 'Completed Successfully' THEN 1
//                         ELSE 0
//                     END AS first_attempt_pass
//              FROM book_test_results btr
//              WHERE btr.user_id = ? 
//              AND btr.status = 'Completed Successfully'
//              ORDER BY btr.created_at ASC`,
//             [user_id]
//         );

//         console.log("Books Query Result:", books); // Debugging

//         // ✅ Count only first attempt pass books for challenge
//         const challengeCount = books.filter(book => book.first_attempt_pass === 1).length;

//         // ✅ Calculate average test score (excluding null values)
//         const validScores = books
//             .filter(book => book.test_score !== null) // Remove null scores
//             .map(book => parseFloat(book.test_score)); // Convert to numbers

//         const avgTestScore = validScores.length > 0
//             ? (validScores.reduce((sum, score) => sum + score, 0) / validScores.length).toFixed(2)
//             : "N/A"; // If no valid scores, show "N/A"

//         return res.status(200).json({
//             message: "User challenge progress fetched successfully",
//             books_completed: challengeCount,  // ✅ Only first attempt passed books count
//             remaining_books: Math.max(0, 30 - challengeCount), // Ensure non-negative value
//             avg_test_score: avgTestScore, // ✅ Calculated dynamically
//             elapsed_days: elapsedDays, //
//             firstname: progress[0].firstname,
//             email: progress[0].email,
//             subscription_plan: progress[0].plan_name || "No subscription",
//             subscription_status: progress[0].plan_name ? "Active" : "Pending",
//             promocode: progress[0].promocode,
//             book_read_list: books, // ✅ Show all books (first or later attempts)
//         });

//     } catch (error) {
//         return res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// };



// export const getUserChallengeProgress = async (req, res) => {
//     try {
//         const { user_id } = req.params;

//         // ✅ Fetch progress, user, and subscription details
//         const [progress] = await pool.query(
//             `SELECT pt.books_completed, 
//                     u.firstname, u.email, 
//                     s.plan_name, s.promocode,
//                     MIN(pt.timestamp) AS challenge_start_date
//              FROM progress_tracking pt 
//              JOIN users u ON pt.user_id = u.id 
//              LEFT JOIN subscriptions s ON u.id = s.user_id
//              WHERE pt.user_id = ?`,
//             [user_id]
//         );

//         if (progress.length === 0 || !progress[0]?.challenge_start_date) {
//             return res.status(404).json({ message: "User has not started the challenge yet." });
//         }

//         const challengeStartDate = progress[0].challenge_start_date;
//         const totalElapsedDays = Math.floor((new Date() - new Date(challengeStartDate)) / (1000 * 60 * 60 * 24));
//         const elapsedDays = Math.min(totalElapsedDays, 30);

//         // ✅ Fetch all completed books
//         const [books] = await pool.query(
//             `SELECT btr.book_id, btr.status, btr.attempt_number, 
//             btr.correct_answers, btr.total_questions, btr.created_at,
//             (btr.correct_answers / NULLIF(btr.total_questions, 0)) * 100 AS test_score,
//             CASE 
//                 WHEN btr.attempt_number = 1 AND btr.status IN ('Completed Successfully', 'Completed') THEN 1
//                 ELSE 0
//             END AS first_attempt_pass
//      FROM book_test_results btr
//      WHERE btr.user_id = ? 
//      AND btr.status IN ('Completed Successfully', 'Completed')
//      ORDER BY btr.created_at ASC`,
//             [user_id]
//         );

//         // ✅ Calculate challenge count (first attempt success)
//         const challengeCount = books.filter(book => book.first_attempt_pass === 1).length;

//         // ✅ Average test score
//         const validScores = books
//             .filter(book => book.test_score !== null)
//             .map(book => parseFloat(book.test_score));

//         const avgTestScore = validScores.length > 0
//             ? (validScores.reduce((sum, score) => sum + score, 0) / validScores.length).toFixed(2)
//             : "N/A";

//         // ✅ New: badgeEarn - count of books with score > 80%
//         const badgeEarn = books.filter(book => book.test_score > 80).length;

//         // ✅ New: dailyBookReadCount - group books by created_at (date only)
//         // const dailyBookReadCount = {};
//         // books.forEach(book => {
//         //     const dateKey = new Date(book.created_at).toISOString().split('T')[0]; // "YYYY-MM-DD"
//         //     if (!dailyBookReadCount[dateKey]) {
//         //         dailyBookReadCount[dateKey] = 0;
//         //     }
//         //     dailyBookReadCount[dateKey]++;
//         // });

//         const dateMap = {};
//         books.forEach(book => {
//             const dateKey = new Date(book.created_at).toISOString().split('T')[0];
//             if (!dateMap[dateKey]) {
//                 dateMap[dateKey] = 0;
//             }
//             dateMap[dateKey]++;
//         });

//         const dailyBookReadCount = Object.entries(dateMap).map(([date, count]) => ({
//             date,
//             count
//         }));

//         return res.status(200).json({
//             message: "User challenge progress fetched successfully",
//             books_completed: challengeCount,
//             remaining_books: Math.max(0, 30 - challengeCount),
//             avg_test_score: avgTestScore,
//             elapsed_days: elapsedDays,
//             firstname: progress[0].firstname,
//             email: progress[0].email,
//             subscription_plan: progress[0].plan_name || "No subscription",
//             subscription_status: progress[0].plan_name ? "Active" : "Pending",
//             promocode: progress[0].promocode,
//             book_read_list: books,
//             badgeEarn, // ✅ added badge count
//             dailyBookReadCount // ✅ added daily breakdown
//         });

//     } catch (error) {
//         console.error("❌ Error in getUserChallengeProgress:", error);
//         return res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// };


// t 1
// export const getUserChallengeProgress = async (req, res) => {
//     try {
//         const { user_id } = req.params;

//         // ✅ Fetch user and subscription details + challenge start date using a subquery
//         const [progress] = await pool.query(
//             `SELECT u.firstname, u.email, 
//                     s.plan_name, s.promocode,
//                     (SELECT MIN(pt.timestamp) 
//                      FROM progress_tracking pt 
//                      WHERE pt.user_id = ?) AS challenge_start_date
//              FROM users u 
//              LEFT JOIN subscriptions s ON u.id = s.user_id
//              WHERE u.id = ?`,
//             [user_id, user_id]
//         );

//         if (progress.length === 0 || !progress[0]?.challenge_start_date) {
//             return res.status(404).json({ message: "User has not started the challenge yet." });
//         }

//         const challengeStartDate = progress[0].challenge_start_date;
//         const totalElapsedDays = Math.floor((new Date() - new Date(challengeStartDate)) / (1000 * 60 * 60 * 24));
//         const elapsedDays = Math.min(totalElapsedDays, 30);

//         // ✅ Fetch all completed books
//         const [books] = await pool.query(
//             `SELECT btr.book_id, btr.status, btr.attempt_number, 
//                     btr.correct_answers, btr.total_questions, btr.created_at,
//                     (btr.correct_answers / NULLIF(btr.total_questions, 0)) * 100 AS test_score,
//                     CASE 
//                         WHEN btr.attempt_number = 1 AND btr.status IN ('Completed Successfully', 'Completed') THEN 1
//                         ELSE 0
//                     END AS first_attempt_pass
//              FROM book_test_results btr
//              WHERE btr.user_id = ? 
//              AND btr.status IN ('Completed Successfully', 'Completed')
//              ORDER BY btr.created_at ASC`,
//             [user_id]
//         );

//         // ✅ Calculate challenge count (first attempt success)
//         const challengeCount = books.filter(book => book.first_attempt_pass === 1).length;

//         // ✅ Average test score
//         const validScores = books
//             .filter(book => book.test_score !== null)
//             .map(book => parseFloat(book.test_score));

//         const avgTestScore = validScores.length > 0
//             ? (validScores.reduce((sum, score) => sum + score, 0) / validScores.length).toFixed(2)
//             : "N/A";

//         // ✅ Badge earn count (score > 80)
//         const badgeEarn = books.filter(book => book.test_score > 80).length;

//         // ✅ Daily book read count
//         const dateMap = {};
//         books.forEach(book => {
//             const dateKey = new Date(book.created_at).toISOString().split('T')[0];
//             if (!dateMap[dateKey]) {
//                 dateMap[dateKey] = 0;
//             }
//             dateMap[dateKey]++;
//         });

//         const dailyBookReadCount = Object.entries(dateMap).map(([date, count]) => ({
//             date,
//             count
//         }));

//         return res.status(200).json({
//             message: "User challenge progress fetched successfully",
//             books_completed: challengeCount,
//             remaining_books: Math.max(0, 30 - challengeCount),
//             avg_test_score: avgTestScore,
//             elapsed_days: elapsedDays,
//             firstname: progress[0].firstname,
//             email: progress[0].email,
//             subscription_plan: progress[0].plan_name || "No subscription",
//             subscription_status: progress[0].plan_name ? "Active" : "Pending",
//             promocode: progress[0].promocode,
//             book_read_list: books,
//             badgeEarn,
//             dailyBookReadCount
//         });

//     } catch (error) {
//         console.error("❌ Error in getUserChallengeProgress:", error);
//         return res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// };

//  t 2
// export const getUserChallengeProgress = async (req, res) => {
//     try {
//         const { user_id } = req.params;

//         // ✅ Fetch user and subscription details + challenge start date
//         const [progress] = await pool.query(
//             `SELECT u.firstname, u.email, 
//                     s.plan_name, s.promocode,
//                     (SELECT MIN(pt.timestamp) 
//                      FROM progress_tracking pt 
//                      WHERE pt.user_id = ?) AS challenge_start_date
//              FROM users u 
//              LEFT JOIN subscriptions s ON u.id = s.user_id
//              WHERE u.id = ?`,
//             [user_id, user_id]
//         );

//         if (progress.length === 0 || !progress[0]?.challenge_start_date) {
//             return res.status(404).json({ message: "User has not started the challenge yet." });
//         }

//         const challengeStartDate = progress[0].challenge_start_date;
//         const totalElapsedDays = Math.floor((new Date() - new Date(challengeStartDate)) / (1000 * 60 * 60 * 24));
//         const elapsedDays = Math.min(totalElapsedDays, 30);

//         const [books] = await pool.query(
//             `SELECT btr.book_id, btr.status, btr.attempt_number, 
//                     btr.correct_answers, btr.total_questions, btr.created_at,
//                     (btr.correct_answers / NULLIF(btr.total_questions, 0)) * 100 AS test_score,
//                     CASE 
//                       WHEN btr.attempt_number = 1 AND btr.status IN ('Completed Successfully', 'Completed') THEN 1
//                       ELSE 0
//                     END AS first_attempt_pass
//              FROM book_test_results btr
//              WHERE btr.user_id = ? 
//              AND btr.status IN ('Completed Successfully', 'Completed')
//              ORDER BY btr.created_at ASC`,
//             [user_id]
//         );

//         const challengeCount = books.filter(book => book.first_attempt_pass === 1).length;

//         const validScores = books
//             .filter(book => book.test_score !== null)
//             .map(book => parseFloat(book.test_score));

//         const avgTestScore = validScores.length > 0
//             ? (validScores.reduce((sum, score) => sum + score, 0) / validScores.length).toFixed(2)
//             : "N/A";

//         const badgeEarn = books.filter(book => book.test_score > 80).length;

//         const dateMap = {};
//         books.forEach(book => {
//             const dateKey = new Date(book.created_at).toISOString().split('T')[0];
//             if (!dateMap[dateKey]) {
//                 dateMap[dateKey] = 0;
//             }
//             dateMap[dateKey]++;
//         });

//         const dailyBookReadCount = Object.entries(dateMap).map(([date, count]) => ({
//             date,
//             count
//         }));

//         // ✅ Email Sending Logic
//         const [track] = await pool.query(
//             "SELECT books_completed, email_sent FROM progress_tracking WHERE user_id = ?",
//             [user_id]
//         );

//         console.log("Track data:", track);  // Log track data to ensure it's fetched correctly

//         if (
//             track.length > 0 &&
//             parseInt(track[0].books_completed) == 30 &&  // Ensure we compare numbers, not strings
//             track[0].email_sent == 0  // Check if email hasn't been sent
//         ) {
//             // This will send the email
//             console.log("User has completed 30 books, sending email.");
//             const transporter = nodemailer.createTransport({
//                 service: 'gmail',
//                 auth: {
//                     user: 'packageitappofficially@gmail.com',
//                     pass: 'epvuqqesdioohjvi'
//                 }
//             });

//             const mailOptions = {
//                 from: 'gautambairagi221999@gmail.com',
//                 to: progress[0].email,
//                 subject: '🎉 Congratulations on Completing the 30 Book Challenge!',
//                 html: `<p>Dear ${progress[0].firstname},</p>
//                        <p>Congratulations! You've successfully completed your 30-book reading challenge. We're proud of your dedication and discipline. 🌟</p>
//                        <p>Keep growing and keep reading!</p>
//                        <p>Best wishes,<br/>Smart Life Academy Team</p>`
//             };

//             await transporter.sendMail(mailOptions);
//             console.log("Email sent successfully!");

//             // Update email_sent to 1 to avoid resending
//             await pool.query(
//                 "UPDATE progress_tracking SET email_sent = 1 WHERE user_id = ?",
//                 [user_id]
//             );
//             console.log("Email sent flag updated in the database.");
//         }

//         return res.status(200).json({
//             message: "User challenge progress fetched successfully",
//             books_completed: challengeCount,
//             remaining_books: Math.max(0, 30 - challengeCount),
//             avg_test_score: avgTestScore,
//             elapsed_days: elapsedDays,
//             firstname: progress[0].firstname,
//             email: progress[0].email,
//             subscription_plan: progress[0].plan_name || "No subscription",
//             subscription_status: progress[0].plan_name ? "Active" : "Pending",
//             promocode: progress[0].promocode,
//             book_read_list: books,
//             badgeEarn,
//             dailyBookReadCount
//         });

//     } catch (error) {
//         console.error("❌ Error in getUserChallengeProgress:", error);
//         return res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// };




export const getUserChallengeProgress = async (req, res) => {
    try {
        const { user_id } = req.params;

        // ✅ Fetch user and subscription details + challenge start date
        const [progress] = await pool.query(
            `SELECT u.firstname, u.email, 
                    s.plan_name, s.promocode,
                    (SELECT MIN(pt.timestamp) 
                     FROM progress_tracking pt 
                     WHERE pt.user_id = ?) AS challenge_start_date
             FROM users u 
             LEFT JOIN subscriptions s ON u.id = s.user_id
             WHERE u.id = ?`,
            [user_id, user_id]
        );

        if (progress.length === 0 || !progress[0]?.challenge_start_date) {
            return res.status(404).json({ message: "User has not started the challenge yet." });
        }

        const challengeStartDate = progress[0].challenge_start_date;
        const totalElapsedDays = Math.floor((new Date() - new Date(challengeStartDate)) / (1000 * 60 * 60 * 24));
        const elapsedDays = Math.min(totalElapsedDays, 30);

 

        const [books] = await pool.query(
            `SELECT btr.book_id, btr.status, btr.attempt_number, 
                    btr.correct_answers, btr.total_questions, btr.created_at,
                    (btr.correct_answers / NULLIF(btr.total_questions, 0)) * 100 AS test_score,
                    CASE 
                      WHEN btr.attempt_number = 1 AND btr.status IN ('Completed Successfully', 'Completed') THEN 1
                      ELSE 0
                    END AS first_attempt_pass
             FROM book_test_results btr
             WHERE btr.user_id = ? 
             AND btr.status IN ('Completed Successfully', 'Completed')
             ORDER BY btr.created_at ASC`,
            [user_id]
        );

        const challengeCount = books.filter(book => book.first_attempt_pass === 1).length;


               


let challenge_status = "Incomplete";

if (challengeCount >= 30 && elapsedDays <= 30) {
    challenge_status = "Completed Successfully";
}

        const validScores = books
            .filter(book => book.test_score !== null)
            .map(book => parseFloat(book.test_score));

        const avgTestScore = validScores.length > 0
            ? (validScores.reduce((sum, score) => sum + score, 0) / validScores.length).toFixed(2)
            : "N/A";

        const badgeEarn = books.filter(book => book.test_score > 80).length;

        const dateMap = {};
        books.forEach(book => {
            const dateKey = new Date(book.created_at).toISOString().split('T')[0];
            if (!dateMap[dateKey]) {
                dateMap[dateKey] = 0;
            }
            dateMap[dateKey]++;
        });

        const dailyBookReadCount = Object.entries(dateMap).map(([date, count]) => ({
            date,
            count
        }));

        // ✅ Email Sending Logic
        const [track] = await pool.query(
            "SELECT books_completed, email_sent FROM progress_tracking WHERE user_id = ?",
            [user_id]
        );

        console.log("Track data:", track);  // Log track data to ensure it's fetched correctly

        if (
            track.length > 0 &&
            parseInt(track[0].books_completed) == 30 &&  // Ensure we compare numbers, not strings
            track[0].email_sent == 0  // Check if email hasn't been sent
        ) {
            // This will send the email
            console.log("User has completed 30 books, sending email.");
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'packageitappofficially@gmail.com',
                    pass: 'epvuqqesdioohjvi'
                }
            });

            const mailOptions = {
                from: 'gautambairagi221999@gmail.com',
                to: progress[0].email,
                subject: '🎉 Congratulations on Completing the 30 Book Challenge!',
                html: `<p>Dear ${progress[0].firstname},</p>
                       <p>Congratulations! You've successfully completed your 30-book reading challenge. We're proud of your dedication and discipline. 🌟</p>
                       <p>Keep growing and keep reading!</p>
                       <p>Best wishes,<br/>Smart Life Academy Team</p>`
            };

            await transporter.sendMail(mailOptions);
            console.log("Email sent successfully!");

            // Update email_sent to 1 to avoid resending
            await pool.query(
                "UPDATE progress_tracking SET email_sent = 1 WHERE user_id = ?",
                [user_id]
            );
            console.log("Email sent flag updated in the database.");
        }

        return res.status(200).json({
            message: "User challenge progress fetched successfully",
            books_completed: challengeCount,
            remaining_books: Math.max(0, 30 - challengeCount),
            avg_test_score: avgTestScore,
            elapsed_days: elapsedDays,
            challenge_status,
            firstname: progress[0].firstname,
            email: progress[0].email,
            subscription_plan: progress[0].plan_name || "No subscription",
            subscription_status: progress[0].plan_name ? "Active" : "Pending",
            promocode: progress[0].promocode,
            book_read_list: books,
            badgeEarn,
            dailyBookReadCount
        });

    } catch (error) {
        console.error("❌ Error in getUserChallengeProgress:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};






export const getReviewsByBookId = async (req, res) => {
    try {
        const { bookId } = req.params; // Book ID from the URL parameter
        const mysqlQuery = "SELECT * FROM reviews WHERE book_id = ?";
        const [result] = await pool.query(mysqlQuery, [bookId]);
        if (result.length > 0) {
            return res.status(200).json({
                message: "Reviews fetched successfully",
                data: result,
            });
        } else {
            return res.status(404).json({
                message: "No reviews found for this book",
            });
        }
    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
};


export const getReviews = async (req, res) => {
    try {
        // SQL query to fetch reviews, user first name and book name
        const mysqlQuery = `
            SELECT 
                r.id, 
                r.rating, 
                r.comment, 
                r.created_at, 
                r.updated_at, 
                r.status, 
                u.firstname AS firstname, 
                b.book_name AS book_name
            FROM 
                reviews r
            LEFT JOIN 
                users u ON r.user_id = u.id
            LEFT JOIN 
                book b ON r.book_id = b.id
        `;

        // Execute the query
        const [result] = await pool.query(mysqlQuery);

        // Check if results were returned
        if (result.length > 0) {
            return res.status(200).json({
                message: "Reviews fetched successfully",
                data: result,
            });
        } else {
            return res.status(404).json({
                message: "No reviews found",
            });
        }
    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
};


export const getReviewsApproved = async (req, res) => {
    try {
        // SQL query to fetch reviews, user first name and book name
        const mysqlQuery = `
            SELECT 
                r.id, 
                r.rating, 
                r.comment, 
                r.created_at, 
                r.updated_at, 
                r.status, 
                u.firstname AS firstname, 
                b.book_name AS book_name
            FROM 
                reviews r 
            LEFT JOIN 
                users u ON r.user_id = u.id
            LEFT JOIN 
                book b ON r.book_id = b.id 

                WHERE 
        r.status = 'approved'
        `;

        // Execute the query
        const [result] = await pool.query(mysqlQuery);

        // Check if results were returned
        if (result.length > 0) {
            return res.status(200).json({
                message: "Reviews fetched successfully",
                data: result,
            });
        } else {
            return res.status(404).json({
                message: "No reviews found for Approved status",
            });
        }
    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
};

export const submitReview = async (req, res) => {
    try {
        const { user_id, book_id, rating, comment } = req.body; // Review data from the request body
        const mysqlQuery = "INSERT INTO reviews (user_id, book_id, rating, comment) VALUES (?, ?, ?, ?)";
        const [result] = await pool.query(mysqlQuery, [user_id, book_id, rating, comment]);

        return res.status(201).json({
            message: "Review submitted successfully",
            reviewId: result.insertId,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
};

export const updateReview = async (req, res) => {
    try {
        const { id } = req.params; // Review ID from URL params
        const { rating, comment } = req.body; // Updated review data from request body

        const mysqlQuery = "UPDATE reviews SET rating = ?, comment = ?, updated_at = NOW() WHERE id = ?";
        const [result] = await pool.query(mysqlQuery, [rating, comment, id]);

        if (result.affectedRows > 0) {
            return res.status(200).json({
                message: "Review updated successfully",
            });
        } else {
            return res.status(404).json({
                message: "Review not found",
            });
        }
    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
};

export const deleteReview = async (req, res) => {
    try {
        const { id } = req.params; // Review ID from URL params
        const mysqlQuery = "DELETE FROM reviews WHERE id = ?";
        const [result] = await pool.query(mysqlQuery, [id]);
        if (result.affectedRows > 0) {
            return res.status(200).json({
                message: "Review deleted successfully",
            });
        } else {
            return res.status(404).json({
                message: "Review not found",
            });
        }
    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
};

export const updateReviewStatus = async (req, res) => {
    try {
        const { id } = req.params;  // Extract reviewId from URL params
        const { status } = req.body;  // Extract new status from request body

        // Validate the provided status value
        const validStatuses = ["pending", "approved", "rejected"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid status provided. Valid statuses are 'pending', 'approved', or 'rejected'."
            });
        }

        // SQL query to update the status of the review
        const mysqlQuery = "UPDATE reviews SET status = ?, updated_at = NOW() WHERE id = ?";
        const [result] = await pool.query(mysqlQuery, [status, id]);

        // Check if the review was updated
        if (result.affectedRows > 0) {
            return res.status(200).json({
                message: "Review status updated successfully"
            });
        } else {
            return res.status(404).json({
                message: "Review not found"
            });
        }
    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};


// export const saveUserVisited = async (req, res) => {
//     try {
//         const { Uemail } = req.body;
//         if (!Uemail) {
//             return res.status(400).json({ message: "Email is required" });
//         }
//         const mysqlQuery = "INSERT INTO visiteduser (Uemail, purchaseStatus) VALUES (?, NOW())";
//         const [result] = await pool.query(mysqlQuery, [Uemail]);
//         return res.status(201).json({
//             message: "User visit saved successfully",
//              data: {
//                 id: result.id,
//                 email: Uemail,
//                 purchaseStatus: "pending", // assuming "purchaseStatus" is initially pending
//                 createdAt: new Date().toISOString() // optional: frontend-friendly timestamp
//             }
//         });
//     } catch (error) {
//         return res.status(500).json({
//             message: "Internal server error",
//             error: error.message,
//         });
//     }
// };




export const saveUserVisited = async (req, res) => {
    try {
        const { Uemail } = req.body;
        if (!Uemail) {
            return res.status(400).json({ message: "Email is required" });
        }
        // Check if email already exists
        const checkQuery = "SELECT * FROM visiteduser WHERE Uemail = ?";
        const [existingUser] = await pool.query(checkQuery, [Uemail]);

        if (existingUser.length > 0) {
            return res.status(200).json({ message: "User already exists" });
        }
        // Insert new user with purchaseStatus = false
        const insertQuery = "INSERT INTO visiteduser (Uemail, purchaseStatus) VALUES (?, ?)";
        const [result] = await pool.query(insertQuery, [Uemail, false]);
        return res.status(201).json({
            message: "User visit saved successfully",
            data: {
                id: result.insertId,
                email: Uemail,
                purchaseStatus: false,
                createdAt: new Date().toISOString()
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
};



// export const GetUserVisited = async (req, res) => {
//     try {
//         const mysqlQuery = "SELECT * FROM  visiteduser";
//         const [result] = await pool.query(mysqlQuery);

//         // for (let user of visitedUsers) {
//         //     const [existingUser] = await pool.query("SELECT * FROM user WHERE email = ?", [user.email]);

//         //     if (existingUser.length > 0) {
//         //         await pool.query("UPDATE user SET visiteduser = ? WHERE email = ?", [true, user.email]);
//         //     }
//         // }

//         return res.status(201).json({
//             message: "Status update succesasfully",
//              data: result
//         });
//         // Loop through visited users and update their plan status if they exist in `user` table

//     } catch (error) {
//         return res.status(500).json({
//             message: "Internal server error",
//             error: error.message,
//         });
//     }
// };



// export const GetUserVisited = async (req, res) => {
//     try {
//         const mysqlQuery = "SELECT * FROM visiteduser";
//         const [visitedUsers] = await pool.query(mysqlQuery);

//         // Loop through visited users and update their visiteduser status if they exist in `user` table


//         return res.status(200).json({
//             message: "Status updated successfully",
//             data: visitedUsers
//         });

//     } catch (error) {
//         return res.status(500).json({
//             message: "Internal server error",
//             error: error.message,
//         });
//     }
// };

// export const updateVisitedUsersStatus = async (req, res) => {
//     try {
//         // Get all visited users
//         const getVisitedUsersQuery = "SELECT * FROM visiteduser";
//         const [visitedUsers] = await pool.query(getVisitedUsersQuery);

//         for (const user of visitedUsers) {
//             const checkUserQuery = "SELECT * FROM users WHERE email = ?";
//             const [existingUsers] = await pool.query(checkUserQuery, [user.Uemail]);

//             // If the user exists in 'user' table, update purchaseStatus
//             if (existingUsers.length > 0) {
//                 const updateStatusQuery = "UPDATE visiteduser SET purchaseStatus = 1 WHERE Uemail = ?";
//                 await pool.query(updateStatusQuery, [user.Uemail]);
//             }
//         }

//         // Get all updated visited users
//         const [updatedVisitedUsers] = await pool.query("SELECT * FROM visiteduser");

//         return res.status(200).json({
//             message: "Visited users updated successfully",
//             data: updatedVisitedUsers
//         });
//     } catch (error) {
//         return res.status(500).json({
//             message: "Internal server error",
//             error: error.message
//         });
//     }
// };


export const updateVisitedUsersStatus = async (req, res) => {
    try {
        // Get all visited users
        const getVisitedUsersQuery = "SELECT * FROM visiteduser";
        const [visitedUsers] = await pool.query(getVisitedUsersQuery);
        for (const user of visitedUsers) {
            const checkUserQuery = "SELECT * FROM users WHERE email = ?";
            const [existingUsers] = await pool.query(checkUserQuery, [user.Uemail]);

            // If the user exists in 'user' table, update purchaseStatus
            if (existingUsers.length > 0) {
                const updateStatusQuery = "UPDATE visiteduser SET purchaseStatus = 1 WHERE Uemail = ?";
                await pool.query(updateStatusQuery, [user.Uemail]);
            }
        }
        // Get all updated visited users
        const [updatedVisitedUsers] = await pool.query("SELECT * FROM visiteduser");
        // Add userType based on purchaseStatus
        const usersWithType = updatedVisitedUsers.map(user => ({
            ...user,
            userType: user.purchaseStatus === 1 ? "customer" : "visitor"
        }));

        return res.status(200).json({
            message: "Visited users updated successfully",
            data: usersWithType
        });
    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};


export const updateUserSubscription = async (req, res) => {
    try {
        const { userId } = req.params;
        const { email, plan_name, promocode, is_active } = req.body;

        // Pehle user ka email update karo
        await pool.query('UPDATE users SET email = ? WHERE id = ?', [email, userId]);

        // Check karo subscription record hai ya nahi
        const [subs] = await pool.query('SELECT * FROM subscriptions WHERE user_id = ?', [userId]);

        if (subs.length === 0) {
            return res.status(404).json({ status: "false", message: "Subscription record not found. Update failed." });
        }

        // Subscription record update karo
        await pool.query(`
            UPDATE subscriptions
            SET plan_name = ?, promocode = ?, is_active = ?
            WHERE user_id = ?
        `, [plan_name, promocode, is_active, userId]);

        res.status(200).json({
            status: "true",
            message: "User subscription updated successfully"
        });
    } catch (error) {
        console.error("Error updating user subscription:", error);
        res.status(500).json({ status: "false", message: "Internal server error" });
    }
};











