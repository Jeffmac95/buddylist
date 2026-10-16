import express from "express";
import cors from "cors";
import morgan from "morgan";
import "dotenv/config";

import sessionMiddleware from "./middleware/session.js";
import authRoutes from "./routes/auth.js";


const app = express();
const port = process.env.PORT || 3000;

app.use(morgan("dev"));
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
app.use(express.json());
app.use(sessionMiddleware)
app.use("/auth", authRoutes);

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});