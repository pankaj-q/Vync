import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const { default: app } = await import('./src/app.js');
import connectDB from './src/config/db.js';
import { setupSocket } from './src/config/socket.js';
import redis from './src/config/redis.js';

const PORT = process.env.PORT || 5005;

connectDB()
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

const { server, io } = setupSocket(app);
app.set('io', io);

redis.on('connect', () => {
  console.log('Redis ready');
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export { io };
