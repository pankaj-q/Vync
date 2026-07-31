import UserPost from '../model/userPost.js';

const createPost = async (req,res) => {
    const {title, description, image, author} = req.body;
    if(!title || !description || !author) {
        return res.status(400).json({message: "Please fill all the fields"}); 
     }
     const newPost = new UserPost({
        title,
        description,
        image,
        author
     })
    await newPost.save();
    res.status(201).json({
        success: true,
        message: "Post created successfully",
        post: {
            id: newPost._id,
            title: newPost.title,
            description: newPost.description,
            image: newPost.image,
            author: newPost.author,
            createdAt: newPost.createdAt,
            updatedAt: newPost.updatedAt
        }
    }); 
}
