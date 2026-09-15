import type { ErrorRequestHandler, RequestHandler } from "express";
import { ApiError } from "./apiError.js";
import { Prisma } from "../generated/prisma_client/client.js";

interface MappedError {
  statusCode: number;
  message: string;
}

function mapPrismaError(err: unknown): MappedError | null {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }

  switch (err.code) {
    case "P2002": {
      const target = err.meta?.target;
      const field = Array.isArray(target) ? target.join(", ") : "field";
      return {
        statusCode: 409,
        message: `Duplicate value for unique field: ${field}`,
      };
    }
    case "P2025":
      return { statusCode: 404, message: "Record not found" };
    case "P2003":
      return {
        statusCode: 400,
        message: "Invalid reference to a related record",
      };
    default:
      return null;
  }
}

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const prismaMapped = mapPrismaError(err);

  const statusCode =
    (err instanceof ApiError ? err.statusCode : undefined) ??
    prismaMapped?.statusCode ??
    500;

  const message =
    prismaMapped?.message ??
    (err instanceof Error ? err.message : undefined) ??
    "Internal Server Error";

  if (statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode).json({ success: false, message });
};

export const notFound: RequestHandler = (req, res) => {
  res
    .status(404)
    .json({ success: false, message: `Route not found: ${req.originalUrl}` });
};
