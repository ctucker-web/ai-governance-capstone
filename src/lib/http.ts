import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/modules/auth/policy";
export function errorResponse(error: unknown) {
  if (error instanceof z.ZodError)
    return NextResponse.json(
      {
        error: error.issues
          .map((i) => `${i.path.join(".") || "Input"}: ${i.message}`)
          .join(" "),
      },
      { status: 400 },
    );
  if (error instanceof AppError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof SyntaxError)
    return NextResponse.json(
      { error: "The request could not be read." },
      { status: 400 },
    );
  console.error(
    "Governance operation failed:",
    error instanceof Error ? error.name : "UnknownError",
  );
  return NextResponse.json(
    {
      error:
        "The operation could not be completed. Please refresh and try again.",
    },
    { status: 500 },
  );
}
