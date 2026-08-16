import { Server } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import redis from './redis.js';
import Conversation from '../model/conversation.model.js';

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
            const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
            socket.userId = decoded._id;
            next();
        } catch (err) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.userId}`);

        socket.join(`user:${socket.userId}`);

        redis.set(`online:${socket.userId}`, '1', 'EX', 300).catch((err) => console.error('Redis online set error:', err));

        io.emit('user-status', { userId: socket.userId, status: 'online' });

        socket.on('join-conversation', async (conversationId) => {
            const conversation = await Conversation.findById(conversationId);
            const isParticipant = conversation && conversation.participants.some(
                (p) => p.toString() === socket.userId.toString()
            );
            if (!isParticipant) {
                return socket.emit('error', { message: 'Not authorized to join this conversation' });
            }
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

            redis.del(`online:${socket.userId}`).catch((err) => console.error('Redis online del error:', err));

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
