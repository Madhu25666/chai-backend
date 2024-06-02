import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {  //cb is callback.. This function is obtained from multer documentation
    // file is obtained from multer, req is available with us, cb is a callback function that requires null and address as parameter
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
      
      cb(null, file.originalname)  //console log this file to see what else is available.
    }
  })
  
export const upload = multer({ 
    storage, 
})