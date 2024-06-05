import { Router } from "express";
import { loginUser, logoutUser, registerUser, refreshAccessToken, changeCurrentPassword, geCurrenttUser } from "../controllers/user.controller.js";
import {upload} from '../middlewares/multer.middleware.js'
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(         //upload.fields data is being sent to multer middleware
    upload.fields([
        {name: "avatar",
        maxCount: 1
        },
        {name: "coverImage",
        maxCount: 1
        },
    ]),
    registerUser)

router.route("/login").post(loginUser)

//securedRoutes
router.route("/logout").post(verifyJWT, logoutUser)    //verifyJWT is another middleware we created to verify tokens
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/get-user").post(verifyJWT, geCurrenttUser)

export default router