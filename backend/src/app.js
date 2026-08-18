import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import passport from './config/passport.js';
import rateLimit from './middleware/rateLimit.js'
import errorHandler from './middleware/errorHandler.js'
import { verifySmtp } from './utils/email.js'
import userRoutes from './routes/userRoutes.js'
import authRoutes from './routes/auth.routes.js'
import fileRoutes from './routes/file.js'
import conversationRoutes from './routes/conversation.routes.js'
import messageRoutes from './routes/message.routes.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const allowedOrigins = [
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://localhost:5005',
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost')) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(passport.initialize());

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health/email', async (req, res) => {
    res.json(await verifySmtp());
});

app.use('/api', rateLimit(60000, 60));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);

app.use(express.static('public'));

const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    if (req.path.startsWith('/assets')) return next();
    if (req.path.startsWith('/favicon')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
});

app.use(errorHandler);

export default app;
