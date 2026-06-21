import { Request, Response, NextFunction } from "express";
import { body, validationResult, ValidationChain } from "express-validator";
import bcrypt from "bcryptjs"; 

//INDIVIDUAL VALIDATION RULES

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

// Enforces confirmation alignment before encryption
export const confirmPasswordValidation: ValidationChain = body("confirmPassword")
  .notEmpty()
  .withMessage("Confirm password is required")
  .custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Password confirmation values do not match.");
    }
    return true;
  });

export const phoneValidation: ValidationChain = body("phone_number")
  .notEmpty()
  .withMessage("Phone number is required");


export const companyNameValidation: ValidationChain = body("company_name")
  .isLength({ min: 5, max: 200 })
  .withMessage("Company name must be between 5 and 200 characters");

export const passengerNameValidation: ValidationChain = body("full_name")
  .isLength({ min: 3, max: 100 })
  .withMessage("Full name must be between 3 and 100 characters");

export const passengerPhoneValidation: ValidationChain = body("phone_number")
  .notEmpty()
  .withMessage("Phone number is required");

// Flexible login rule
export const loginIdentifierValidation: ValidationChain = body("identifier")
  .notEmpty()
  .withMessage("Email or Phone number is required to login");


//CORE EXECUTION MIDDLEWARES

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

/**
 * AUTOMATED HASHING 
  */
export const hashPasswordPayload = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const passwordKey = req.body.password;
    if (passwordKey) {
      const salt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(passwordKey, salt);
    }
    next();
  } catch (error: any) {
    console.error("Global Hash Processing Failure:", error.message);
    return res.status(500).json({ error: "Internal Server Error during security encryption." });
  }
};


//BUNDLED ROUTE RULES
// For Manager / Admin Registration
export const registerRules = [
  emailValidation,
  passwordValidation,
  confirmPasswordValidation, 
  phoneValidation,        
  companyNameValidation,  
  validateInput,
  hashPasswordPayload 
];

//UPDATED STANDARD LOGIN BUNDLE: Uses dynamic loginIdentifierValidation to check for 'identifier(email/phone_number)'
export const loginRules = [
  loginIdentifierValidation,
  passwordValidation,
  validateInput 
];

// For Passenger Registration
export const passengerRegisterRules = [
  emailValidation,
  passwordValidation,
  confirmPasswordValidation,
  passengerPhoneValidation,
  passengerNameValidation,
  validateInput,
  hashPasswordPayload 
];

// For Flexible Authentication Login 
export const passengerLoginRules = [
  loginIdentifierValidation,
  passwordValidation,
  validateInput
];
