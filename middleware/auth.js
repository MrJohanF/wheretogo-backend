import {jwtVerify} from "jose";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();


const authMiddleware = async (req, res, next) => {
    try {

        // Get the token from the cookies
        const token = req.cookies.token;

        // If no token, return unauthorized
        if (!token) {
            return res.status(401).json({ message: "No token provided" });
        }

        // Verify the token
        const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
        
        // Fetch the user from the database

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            }
        });

        // If no user, return unauthorized
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        // Attach the user to the request
        req.user = user;

        // Continue to the next middleware
        next();

    } catch (error) {
        // If there is an error, return unauthorized
        console.error("Authentication error:", error);
        return res.status(401).json({ message: "Invalid token" });
    }
};

export default authMiddleware;
