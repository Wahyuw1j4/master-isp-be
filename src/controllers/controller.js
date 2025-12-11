// src/http/BaseController.js
import { prisma } from "../prisma.js";

class BaseController {
    sendResponse(res, statusCode, message, data = undefined) {
        res.status(statusCode).json({
            status: statusCode >= 200 && statusCode < 300 ? "success" : "failed",
            message,
            data,
        });
    }

    handlePrismaError(error) {
        if (error instanceof prisma.PrismaClientValidationError) {
            return {
                status: "error",
                code: "VALIDATION_ERROR",
                message: "Invalid data sent to database",
                detail: error.message,
            };
        }

        if (error instanceof prisma.PrismaClientKnownRequestError) {
            switch (error.code) {
                case "P2002":
                    return {
                        status: "error",
                        code: "DUPLICATE_KEY",
                        message: `Duplicate value for field: ${error.meta?.target}`,
                    };
                case "P2003":
                    return {
                        status: "error",
                        code: "FOREIGN_KEY_CONSTRAINT",
                        message: `Invalid relation: ${error.meta?.field_name}`,
                    };
                case "P2025":
                    return {
                        status: "error",
                        code: "NOT_FOUND",
                        message: "Record not found",
                    };
                default:
                    return {
                        status: "error",
                        code: error.code,
                        message: error.message,
                    };
            }
        }

        // Fallback unknown error
        return {
            status: "error",
            code: "UNKNOWN_ERROR",
            message: error.message || "Unexpected error",
        };
    }
}
const Controller = new BaseController();
export {
    BaseController,
    Controller
};