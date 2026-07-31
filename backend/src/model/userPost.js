import mongoose, {Schema} from 'mongoose';

const userPostSchema = new Schema({
   title: {type: String, required: true, trim: true,},
   description: {type: String, required: true,trim: true,},
   image: {type:String,},
   author: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true,},
   likes: [
    {type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        text: {
            type: String,
            createdAt: Date,
            default: Date.now,
        },
    }],
    isPublished: {
        type: Boolean,
        default: false
    },
},
    {
     timestamps: true
    }
    );

const userPost = mongoose.model('UserPost', userPostSchema);

export default userPost;