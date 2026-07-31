import jwt from 'jsonwebtoken';
import User from '../model/user.model.js';

export const protect = async(req, res, next) => {
    const authHeader = req.headers.authorization;
    if(!authHeader || !authHeader.startsWith('Bearer')) {
        return res.status(401).json({message: "Not authorized"});
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded._id).select('-password');
        next();
    } catch (error) {
        return res.status(401).json({message: "Not authorized"});
    }
}