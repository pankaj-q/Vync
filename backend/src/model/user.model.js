import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    uppercase: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email address"],
  },
  password: {
    type: String,
    required: true,
    minLength: 6,
    match: /^(?=.*[A-Za-z])(?=.*\d).{6,}$/,
  },
  provider: {
    type: String,
    default: "local",
  },
  bio: {
    type: String,
    default: "",
    maxlength: 200,
  },
  avatarUrl: {
    type: String,
    default: "",
  },
  googleId: {
    type: String,
    default: null,
  },
  githubId: {
    type: String,
    default: null,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: {
    type: String,
    default: null,
  },
verificationExpires: {
      type: Date,
      default: null,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
});

        userSchema.pre('save',async function() {
         if(!this.isModified('password')) return;
        
        this.password = await bcrypt.hash(this.password, 10);
        
     })

        userSchema.methods.comparePassword = async function(password) {
           return await bcrypt.compare(password, this.password)
            
        };

        userSchema.methods.generateAccessToken = function() {
          return jwt.sign ({
            _id: this._id,
            name: this.name,
            email: this.email
          },process.env.JWT_SECRET, {expiresIn: '1h'}) 
        };
        

        userSchema.methods.generateRefreshToken = function() {
            return jwt.sign ({
                _id: this._id
            },process.env.JWT_SECRET, {expiresIn: '7d'});
        };
    
    const User =  mongoose.model('User', userSchema);
    export default User;