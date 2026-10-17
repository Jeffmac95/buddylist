import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import sessionMiddleware from "../middleware/session.js";
import type { Request, Response } from "express";

export const clients = new Map<number, Set<WebSocket>>();

export function setupWebSocket(server: Server) {
    const wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (req, socket, head) => {
        if (req.headers.origin !== "http://localhost:5173") {
            socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
            socket.destroy();
            return;
        }

        const expressReq = req as Request;

        sessionMiddleware(req as Request, {} as Response, () => {
            const userId = expressReq.session?.userId;

            if (!userId) {
                socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                socket.destroy();
                return;
            }

            wss.handleUpgrade(req, socket, head, (ws) => {
                wss.emit("connection", ws, req, userId);
            })
        });
    });

    wss.on("connection", (ws: WebSocket, _req: unknown, userId: number) => {
        console.log(`User: ${userId} connected`);

        if (!clients.has(userId)) {
            clients.set(userId, new Set());
        }
        clients.get(userId)!.add(ws);

        ws.on("message", (raw) => {
            let msg;
            try {
                msg = JSON.parse(raw.toString());
            } catch {
                ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
                return;
            }

            console.log(`From user ${userId}: `, msg);
            ws.send(JSON.stringify({ type: "echo", data: msg }));
        });

        ws.on("close", () => {
            clients.get(userId)?.delete(ws);
            if (clients.get(userId)?.size === 0) {
                clients.delete(userId);
            }
            console.log(`User ${userId} disconnected`);
        });

        ws.on("error", console.error);
    });

    return wss;
}