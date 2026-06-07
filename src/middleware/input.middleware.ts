import { Request, Response, NextFunction } from "express";
import { body, validationResult, ValidationChain } from "express-validator";


// Individual validation rules typed as ValidationChain
export const emailValidation: ValidationChain = body("email")
  .optional()
  .isEmail()
  .withMessage("Enter a valid email")
  .normalizeEmail();

export const passwordValidation: ValidationChain = body("password")
  .notEmpty()
  .withMessage("Password is required")
  .isLength({ min: 6 })
  .withMessage("Password must be 6+ characters");

export const numberValidation: ValidationChain = body("number")
  .notEmpty()
  .withMessage("Phone number is required");

export const nameValidation: ValidationChain = body("name")
  .isLength({ min: 5 })
  .withMessage("Name must be between 5 and 200 characters");

// The validation execution middleware
export const validateInput = (
  req: Request, 
  res: Response, 
  next: NextFunction
): void | Response => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Bundled rules for your routes
export const registerRules = [
  emailValidation,
  passwordValidation,
  numberValidation,
  nameValidation,
  validateInput,
];

export const loginRules = [
  passwordValidation,
  numberValidation,
  validateInput,
];
