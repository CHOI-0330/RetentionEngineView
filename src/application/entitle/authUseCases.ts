import type { User } from "../../type/core";
import type { UseCaseResult } from "./models";

export interface RegisterUserInput {
  email: string;
  password: string;
  displayName: string;
  role: User["role"];
}

export interface LoginUserInput {
  email: string;
  password: string;
}

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

const success = <T>(value: T): UseCaseResult<T> => ({ kind: "success", value });
const failure = (kind: "Forbidden" | "ValidationError" | "NotFound", message: string): UseCaseResult<never> => ({
  kind: "failure",
  error: { kind, message },
});

const isValidEmail = (value: string) => /.+@.+\..+/.test(value);
const isValidPassword = (value: string) => value.length >= MIN_PASSWORD_LENGTH && value.length <= MAX_PASSWORD_LENGTH;

const isAllowedRole = (role: string): role is User["role"] => ["NEW_HIRE", "MENTOR", "ADMIN"].includes(role);

export const registerUserUseCase = (
  input: RegisterUserInput
): UseCaseResult<{ email: string; password: string; displayName: string; role: User["role"] }> => {
  const email = input.email.trim();
  const displayName = input.displayName.trim();
  const password = input.password;
  const role = input.role;

  if (!isValidEmail(email)) {
    return failure("ValidationError", "Invalid email format.");
  }

  if (!isValidPassword(password)) {
    return failure(
      "ValidationError",
      `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`
    );
  }

  if (displayName.length === 0) {
    return failure("ValidationError", "Display name must not be empty.");
  }

  if (!isAllowedRole(role) || role === "ADMIN") {
    return failure("Forbidden", "Unsupported role." );
  }

  return success({ email, password, displayName, role });
};

export const loginUserUseCase = (
  input: LoginUserInput
): UseCaseResult<{ email: string; password: string }> => {
  const email = input.email.trim();
  const password = input.password;

  if (!isValidEmail(email)) {
    return failure("ValidationError", "Invalid email format.");
  }

  if (!isValidPassword(password)) {
    return failure("ValidationError", "Invalid password." );
  }

  return success({ email, password });
};

export const logoutUserUseCase = (
  input: { accessToken: string }
): UseCaseResult<{ accessToken: string }> => {
  const token = input.accessToken.trim();
  if (token.length === 0) {
    return failure("ValidationError", "Access token is required.");
  }
  return success({ accessToken: token });
};
