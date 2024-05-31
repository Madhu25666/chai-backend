class ApiResponse {
    constructor(statusCode, data, message = "Success"){
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = statusCode < 400  //this.sucess is set to true  if the response is statuscode less than 400, else false...
    }
}

export { ApiResponse }