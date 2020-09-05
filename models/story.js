var mongoose=require("mongoose");

var storySchema = new mongoose.Schema({
    title:String,
    image:String,
    storyBody:String,
    author:{
        id:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    reads: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ]
})

module.exports = mongoose.model("Story", storySchema);