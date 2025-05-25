class ApiError extends Error{
    constructor(
        statusCode,
        message="Something Went Wrong",
        errors = [],
        stack = ""
    ){
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false
        this.erros = errors

        if(stack){
            this.stack = stack
        }
        else
        {
            Error.captureStackTrace(this,this.contructor)
        }
    }
}

export {ApiError}