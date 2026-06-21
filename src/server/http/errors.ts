import { NextResponse } from "next/server";

export class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "HttpError";
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Sign in or continue as guest first.") {
    super(message, 401);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "You are not authorized to access this resource.") {
    super(message, 403);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Resource not found.") {
    super(message, 404);
  }
}

export function errorResponse(error: unknown, fallbackMessage: string, fallbackStatus = 400) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallbackMessage },
    { status: error instanceof HttpError ? error.status : fallbackStatus },
  );
}
