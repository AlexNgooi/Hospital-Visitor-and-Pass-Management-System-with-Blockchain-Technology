package eduupm.hsaas.common;

import java.io.IOException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.dao.DataAccessException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.HttpMediaTypeNotSupportedException;

/** Converts controller failures without exposing rejected input or exception messages. */
@RestControllerAdvice
public class ApiExceptionHandler {
    private final ApiErrors errors;
    public ApiExceptionHandler(ApiErrors errors) { this.errors = errors; }

    /** Unsupported verbs are client errors rather than unexplained server failures. */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public void method(HttpServletRequest request,HttpServletResponse response) throws IOException {
        errors.write(request,response,new ApiFailure(405,"METHOD_NOT_ALLOWED","Method is not supported."));
    }
    /** The API accepts JSON without echoing the original Content-Type or parser diagnostics. */
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public void media(HttpServletRequest request,HttpServletResponse response) throws IOException {
        errors.write(request,response,new ApiFailure(415,"UNSUPPORTED_MEDIA_TYPE","Use application/json."));
    }

    /** Preserves explicit safe business codes. */
    @ExceptionHandler(ApiFailure.class)
    public void business(ApiFailure failure, HttpServletRequest request, HttpServletResponse response) throws IOException {
        errors.write(request, response, failure);
    }

    /** Uses constant validation messages because parser and binding errors can contain input. */
    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentNotValidException.class})
    public void validation(HttpServletRequest request, HttpServletResponse response) throws IOException {
        errors.write(request, response, new ApiFailure(400, "VALIDATION_FAILED", "Check the request fields."));
    }

    /** Hides internal database diagnostics from clients. */
    @ExceptionHandler(DataAccessException.class)
    public void database(HttpServletRequest request, HttpServletResponse response) throws IOException {
        errors.write(request, response, new ApiFailure(503, "SERVICE_UNAVAILABLE", "Service temporarily unavailable."));
    }

    /** Unknown paths use the same JSON boundary. */
    @ExceptionHandler({NoResourceFoundException.class, NoHandlerFoundException.class})
    public void missing(HttpServletRequest request, HttpServletResponse response) throws IOException {
        errors.write(request, response, new ApiFailure(404, "NOT_FOUND", "Resource not found."));
    }

    /** Fails closed rather than serializing an unreviewed exception. */
    @ExceptionHandler(Exception.class)
    public void unexpected(HttpServletRequest request, HttpServletResponse response) throws IOException {
        errors.write(request, response, new ApiFailure(500, "INTERNAL_ERROR", "Request could not be completed."));
    }
}
