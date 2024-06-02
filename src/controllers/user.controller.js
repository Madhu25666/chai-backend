import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import e from "express";

const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images,
    // check for avatar
    // if avtar is available, upload them to cloudinary from local file path, and receive the URL
    // create user object - create entry in db
    // remove (delete) password and refresh token field from response
    // check for user creation
    // return res

    const {fullName, email, username, password } = req.body
    console.log("email: ", email);
    // console.dir(req, { depth: null, colors: true });

    

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;

    console.log("REQ.FILES: ", req.files);
    console.log("");
    console.log("REQ.BODY: ", req.body);

    // const coverImageLocalPath = req.files.coverImage[0].path

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "AvatarLocalPath is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",  //if coverImage does not exist, we add an empty string.
        email, 
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )  //removes(just avoids) the password and refresh token attached to the user and adds the remaining fields to createdUser.

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    //req.files is provided by Multar. Because Multer is middleare
    //and it added some new methods into the req.  This is what most middlewares do. 


    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

    })

export {registerUser}

