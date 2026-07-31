import { Server } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import redis from './redis.js';

let io;

const setupSocket = (app) => {
    const server = http.createServer(app);

    io = new Server(server, {
        cors: {
            origin: (origin, callback) => {
                if (!origin || origin.startsWith('http://localhost')) return callback(null, true);
                callback(null, process.env.CLIENT_URL || false);
            },
            methods: ['GET', 'POST'],
        },
    });

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication required'));
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded._id;
            next();
        } catch (err) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.userId}`);

        socket.join(`user:${socket.userId}`);

        redis.set(`online:${socket.userId}`, '1', 'EX', 300);

        io.emit('user-status', { userId: socket.userId, status: 'online' });

        socket.on('join-conversation', (conversationId) => {
            socket.join(`conversation:${conversationId}`);
        });

        socket.on('leave-conversation', (conversationId) => {
            socket.leave(`conversation:${conversationId}`);
        });

        socket.on('typing', ({ conversationId, isTyping }) => {
            socket.to(`conversation:${conversationId}`).emit('user-typing', {
                userId: socket.userId,
                conversationId,
                isTyping,
            });
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.userId}`);

            redis.del(`online:${socket.userId}`);

            io.emit('user-status', { userId: socket.userId, status: 'offline' });
        });
    });

    return { server, io };
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};

export { setupSocket, getIO };
