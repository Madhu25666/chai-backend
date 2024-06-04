import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
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

export default router