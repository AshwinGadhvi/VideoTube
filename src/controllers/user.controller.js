import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefereshTokens = async (userId)=>{
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})
        return {accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500,"Something went wrong when generating access and referesh tokes!!!")
    }
};


const registerUser = asyncHandler(async (req, res) => {
    //get user details from frontend
    //validation of details
    //check if user already exists
    //check if we have file - images,avatar
    //upload to cloudinary
    //create user object - create entry in db
    //remove password and refresh token field from response
    //check reponse user created successfully or not
    //return response successfully

    const { username, fullName, email, password } = req.body;
    // console.log("email : ", email);

    if ([fullName, email, username, password].some((field) => field?.trim() === ""))
    {
        throw new ApiError(400, "All Fields Are Required");
    }

    const existedUser = await User.findOne({
        $or: [{username},{email}]
    })
    if(existedUser)
    {
        throw new ApiError(409,"User Is Already Exited!!")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0)
        {
            coverImageLocalPath = req.files.coverImage[0].path;
        }

    if(!avatarLocalPath)
    {
        throw new ApiError(400,"Avatar File Is Required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar)
    {
        throw new ApiError(400,"Avatar File Is Required");
    }


    //db entry 

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if(!createdUser)
    {
        throw new ApiError(500,"Something went wrong when registering user");
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User Registered Successfully...")
    )
});

const loginUser = asyncHandler(async (req,res)=>{
    //get the req.body
    //check username or email their 
    //find the user
    //check password
    //access and refresh token generate
    //send in cookies
    //send response successfully login
    const {username,email,password} = req.body;
    console.log(username,email,password);
    if(!username && !email)
    {
        throw new ApiError(400,"Username Or Emial Required!!")
    }

    const user = await User.findOne({
        $or:[{username},{email}]
    })

    if(!user)
    {
        throw new ApiError(404,"User Not Found!!!");
    }
    
    const isPasswordValid = await user.isPasswordCorrect(password);
    console.log(isPasswordValid);
    if(!isPasswordValid)
    {
        throw new ApiError(401,"Password Incorrect!!!");
    }

    const {accessToken,refreshToken} = await generateAccessAndRefereshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly:true,
        secure:true
    }

    return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",refreshToken,options).json(
        new ApiResponse(200,{
            user:loggedInUser,accessToken,refreshToken
        },
        "User LoggedIN Successfully.."
    ))
});

const logoutUser = asyncHandler(async ()=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )

    const options = {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{

    },"User Logged Out!!!"))
})


export { registerUser,loginUser,logoutUser };
