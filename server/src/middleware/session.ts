import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "../db/index.js";

const PgSession = connectPgSimple(session);

const sessionMiddleware = (session({
    store: new PgSession({
        pool,
        createTableIfMissing: true
    }),
    name: "chat.sid",
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,//7d
    }
}));

export default sessionMiddleware;