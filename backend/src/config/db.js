import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const connection = await mongoose.connect(process.env.MONGO_URI, {
            maxPoolSize: 10,
            minPoolSize: 2,
            socketTimeoutMS: 45000,
            serverSelectionTimeoutMS: 10000,
            heartbeatFrequencyMS: 10000,
            family: 4,
        });
        console.log(`MongoDB connected: ${connection.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
    }
};

export default connectDB;