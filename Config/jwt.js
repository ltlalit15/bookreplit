import jwt from 'jsonwebtoken';

export const generatetoken = async (id) => {
    return await jwt.sign({ id }, "gautamrehansssss", { expiresIn: "1d" })            // secrete key  ' gautamrehansssss '

};