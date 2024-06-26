import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import e from "express";


const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken= user.generateAccessToken()  //generated using user credentials
        const refreshToken=user.generateRefreshToken()  //generated using user credentials
        user.refreshToken=refreshToken
        await user.save({validateBeforeSave: false})   //This will prevent the db from trying to match passwords and givng an error

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generated refresh and access token")
    }
}


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

    const loginUser = asyncHandler(async (req, res) =>{
    
        // TODOs:
        // req body -> data
        // username or email
        // find the user
        // password check
        // access and refresh token
        // send cookies
        // send success message in the response
    

        const {email, username, password} = req.body
        
        console.log("email ", email)
        // true && true = true      username absent && email absent     will check both     => true     => Error        
        // true && false = false    username absent && email present    will check both     => false    => Skip
        // false && true = false    username present && email absent    will check first    => false    => Skip
        // false && false = false   username present && email present   will check first    => false    => Skip

        if(!username && !email){
            throw new ApiError(400, "username or email is required!!")
        }

        const user= await User.findOne({
            $or:  [{username}, {email}]
        })

        // console.log("user", user)

        if(!user){
            throw new ApiError(404, "User does not exist")
        }
        
        const isPasswordValid = await user.isPasswordCorrect(password)

        
        if(!isPasswordValid){
            throw new ApiError(401, "Invalid User Credentials")
        }

        const {accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

        const loggedInUser = await User.findById(user._id).
        select("-password -refreshToken")


        const options ={
            httpOnly: true,
            secure: true
        }
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200,
                {
                    user: loggedInUser, accessToken,
                    refreshToken
                },
                    
            "User logged in Successfully"
            )

        )



    })

    const logoutUser = asyncHandler(async(req, res) => {
        //clear cookies
        //deletetokens

        await User.findByIdAndUpdate(req.user._id,
            {
                $set: {                                     //MongoDBs $set operator that updates the specific fields sent here         
                    refreshToken: undefined
                }
            },
            {
                new: true
            }
            
        )
        
        const options ={
            httpOnly: true,
            secure: true
        }

        return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))


    })

    const refreshAccessToken = asyncHandler(async(req, res) =>{
            //get refresh token from cookie
            //get refresh token for existing user db
            //compare if both cookies match
            //if yes create new access token and 
            //return with user

            const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
            
            if(!incomingRefreshToken){
                throw new ApiError(400, "Unauthorized request")
            }

try {
                const decodedToken= jwt.verify(incomingRefreshToken, process.env.ACCESS_TOKEN_SECRET)  //token is decoded as it is encoded with user info during creation 
    
                const user = await User.findById(decodedToken?._id)
    
                if (!user) {
                    throw new ApiError(401, "Invalid refresh token")
                }
    
                if(incomingRefreshToken !== user?.refreshToken){
                    throw new ApiError(400, "Refresh token is expired or used")
                }
    
                const options = {
                    httpOnly: true,
                    secure: true
                }
    
    
                const {accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)
    
                return res
                .status(200)
                .cookie("accessToken", accessToken, options)
                .cookie("refreshToken", newRefreshToken, options)
                .json(new ApiResponse(200, {
                    accessToken: accessToken,
                    refreshToken: newRefreshToken
    
                }, "Access Token Refreshed"
                ))
                } catch (error) {
                    throw new ApiError(401, error?.message || "Invalid refresh token")  
                }

    })

    const changeCurrentPassword =asyncHandler(async(req, res) =>{
            //take current password and new password from fronend
            //Get current user object.  This is available in case hte middleware has run.
            // It is the middleware which adds user into req object (Check auth.middleware line before next())
            //Compare if password sent matches the existing password
            //If yes, set new password in it's place.. else send error
            //save user.
            //return success message
            //add entirity in try catch

        const{oldPassword, newPassword, confPassword} = req.body

        if (!(newPassword===confPassword)){
            throw new ApiError(400, "Password Do Not Match")        
        }

        const user = await User.findById(req.user?._id)
        const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

        if(! isPasswordCorrect){
            throw new ApiError(400, "Invalid Old Password")
        }        

        user.password = newPassword
        await user.save({validateBeforeSave: false})

        return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password Changed Successfully"))


    })
    
    const geCurrenttUser = asyncHandler(async(req, res) => {
        return res
        .status(200)
        .json(new ApiResponse(
            200,
            req.user,
            "User fetched successfully"
        ))
    })

    const updateAccountDetails = asyncHandler(async(req, res)=>{
        const {fullName, email} = req.body

        if(!fullName || !email){
            throw new ApiError(400, "All fields are required")
        }

        User.findByIdAndUpdate(req.user?._id,
            {
                $set: {
                    fullName,               //both of these syntax work, fullName: fullName or just fullName
                    email: email            //both of these syntax work, email: email or just email
                    }
            },
            {new: true}   //If you want the newobject or updated object to be returned back to you, this is set to true
            
            ).select("-password")
            
            return res
            .status(200)
            .json(new ApiResponse(200, user, "Account details updated successfully"))

    })

    const updateUserAvatar = asyncHandler(async(req, res)=>{
        
        const avatarLocalPath=req.file?.path            //req.file which is different from req.files here because we are taking only the avatar and not the coverimage.
                                                        //check req.files in registerUser and see how it is different.

        if(!avatarLocalPath){
            throw new ApiError(400, "Avathar is missing")
        }

        const avatar = await uploadOnCloudinary(avatarLocalPath)

        if(!avatar.url){
            throw new ApiError(400, "Error while uploading on avatar")
        }

        const user = await User.findByIdAndUpdate(req.user?._id,
            { 
                $set:{ avatar: avatar.url}
            },
            {new: true}
        ).select("-password")

        return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Avatar Updated successfully"
            )
        )

    })

    const updateUserCoverImage = asyncHandler(async(req, res)=>{
        
        const coverImageLocalPath=req.file?.path            //req.file which is different from req.files here because we are taking only the avatar and not the coverimage.
                                                        //check req.files in registerUser and see how it is different.

        if(!coverImageLocalPath){
            throw new ApiError(400, "Cover image file is missing")
        }

        const coverImage = await uploadOnCloudinary(coverImageLocalPath)

        if(!coverImage.url){
            throw new ApiError(400, "Error while uploading on coverImage")
        }

        const user = await User.findByIdAndUpdate(req.user?._id,
            { 
                $set:{ coverImage: coverImage.url}
            },
            {new: true}
        ).select("-password")

        return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Cover Image Updated successfully"
            )
        )

    })

    const getUserChannelProfile = asyncHandler(async(req, res)=>{
        
    })

    const getWatchHistory = asyncHandler(async(req, res)=>{
        
    })

export {
    registerUser, loginUser,
    logoutUser, refreshAccessToken,
    changeCurrentPassword, geCurrenttUser,
    updateAccountDetails, updateUserAvatar,
    updateUserCoverImage, getUserChannelProfile,
    getWatchHistory
}

