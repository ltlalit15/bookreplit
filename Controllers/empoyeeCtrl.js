import { pool } from "../Config/dbConnect.js";
export const addempoyee = async (req, res) => {
    try {
        const { username, email, password } = req.body
        const existingstaff = await pool.query("SELECT email FROM empoyee WHERE email=?", email)
        if(!existingstaff){
            return res.status(403).json("staff already exist")
        }
        else{
            const hashpassword = await bcrypt.hash(password, 10)
            const staffdata = {
                username, 
                email,
                password : hashpassword,
            }
            const [result] = await pool.query("INSERT INTO staff SET ?", staffdata)
            if (result) {
                return res.status(200).json({ message: `${username} created sucessfully`, data: staffdata });
            }
            else {
                return res.status(404).json({ message: "staff not created" });
            }
        }
    }
    catch (error) {
        return res.result.status(500).json({ message: "internal server error", error: error.message });
    }  
}
export const getempoyee = async (req, res) => {
}

