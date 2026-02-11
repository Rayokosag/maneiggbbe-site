const { body, query, param, validationResult } = require('express-validator');
const xss = require('xss');

function sanitize(value) {
  if (typeof value === 'string') {
    return xss(value.trim());
  }
  return value;
}

function sanitizeBody(fields) {
  return (req, res, next) => {
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        req.body[field] = sanitize(req.body[field]);
      }
    }
    next();
  };
}

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

const validateLogin = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

const validatePackage = [
  body('sender.name').trim().notEmpty().withMessage('Sender name is required'),
  body('sender.phone').trim().notEmpty().withMessage('Sender phone is required'),
  body('sender.address').trim().notEmpty().withMessage('Sender address is required'),
  body('sender.city').trim().notEmpty().withMessage('Sender city is required'),
  body('sender.zip').trim().notEmpty().withMessage('Sender ZIP is required'),
  body('recipient.name').trim().notEmpty().withMessage('Recipient name is required'),
  body('recipient.phone').trim().notEmpty().withMessage('Recipient phone is required'),
  body('recipient.address').trim().notEmpty().withMessage('Recipient address is required'),
  body('recipient.city').trim().notEmpty().withMessage('Recipient city is required'),
  body('recipient.zip').trim().notEmpty().withMessage('Recipient ZIP is required'),
  body('package.weight').isFloat({ min: 0.1 }).withMessage('Weight must be at least 0.1 lbs'),
  body('package.speed').isIn(['standard', 'express', 'overnight']).withMessage('Invalid delivery speed'),
  handleValidationErrors
];

const validateCustomerRegistration = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().trim(),
  handleValidationErrors
];

const validateProfileUpdate = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional().trim(),
  handleValidationErrors
];

const validatePasswordChange = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  handleValidationErrors
];

const validatePasswordReset = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors
];

const validateForgotPassword = [
  body('email').isEmail().withMessage('Valid email is required'),
  handleValidationErrors
];

module.exports = {
  sanitize,
  sanitizeBody,
  handleValidationErrors,
  validateLogin,
  validatePackage,
  validateCustomerRegistration,
  validateProfileUpdate,
  validatePasswordChange,
  validatePasswordReset,
  validateForgotPassword
};
