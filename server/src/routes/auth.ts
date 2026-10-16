import express from "express";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const router = express.Router();

router.post("/register", async (req, res) => {
    const { email, password } = req.body;
    const saltRounds = 10;

    if (typeof email !== "string" || typeof password !== "string" || !email || !password ) {
        res.status(400).json({ error: "Email and password are required." });
        return;
    }

    try {
        const existingUser = await db.select().from(users).where(eq(users.email, email));

        if (existingUser.length !== 0) {
            res.status(400).json({ error: "Email already in use." });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = await db.insert(users).values({ email, password: hashedPassword }).returning({ id: users.id, email: users.email});

        res.status(200).json({ user: newUser[0] });
    } catch (err) {
        console.error("Error registering user:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/login", async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (typeof email !== "string" || typeof password !== "string"|| !email.trim() || !password) {
            res.status(400).json({ error: "Email and password are required." });
            return;
        }

        const result = await db
            .select()
            .from(users)
            .where(eq(users.email, email.trim()));
        
        if (result.length === 0) {
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }

        const user = result[0];
        const passwordMatch = await bcrypt.compare(password, user.password)

        if (!passwordMatch) {
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }

        // authenticated user then gets fresh session id
        req.session.regenerate((err) => {
            if (err) {
                next(err);
                return;
            }

            req.session.userId = user.id;

            // save session before sending res
            req.session.save((err) => {
                if (err) {
                    next(err);
                    return;
                }

                res.json({
                    id: user.id,
                    email: user.email
                });
            })
        });
        
    } catch (err) {
        next(err);
    }
});

router.post("/logout", (req, res, next) => {
    req.session.destroy((err) => {
        if (err) {
            next(err);
            return;
        }

        res.clearCookie("chat.sid", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/"
        });

        res.sendStatus(204);
    })
});

export default router;