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

const passwordValidator = (field = 'password') =>
  body(field)
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('Password must contain at least 1 lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain at least 1 uppercase letter')
    .matches(/\d/).withMessage('Password must contain at least 1 digit');

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

const VALID_STATUSES = ['Pending Pickup', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered'];

const validatePackageStatus = [
  body('status').isIn(VALID_STATUSES).withMessage('Invalid status value'),
  handleValidationErrors
];

const validatePackageUpdate = [
  body('sender_name').optional().trim().notEmpty().withMessage('Sender name cannot be empty'),
  body('sender_phone').optional().trim().notEmpty().withMessage('Sender phone cannot be empty'),
  body('sender_address').optional().trim().notEmpty().withMessage('Sender address cannot be empty'),
  body('sender_city').optional().trim().notEmpty().withMessage('Sender city cannot be empty'),
  body('sender_zip').optional().trim().notEmpty().withMessage('Sender ZIP cannot be empty'),
  body('recipient_name').optional().trim().notEmpty().withMessage('Recipient name cannot be empty'),
  body('recipient_phone').optional().trim().notEmpty().withMessage('Recipient phone cannot be empty'),
  body('recipient_address').optional().trim().notEmpty().withMessage('Recipient address cannot be empty'),
  body('recipient_city').optional().trim().notEmpty().withMessage('Recipient city cannot be empty'),
  body('recipient_zip').optional().trim().notEmpty().withMessage('Recipient ZIP cannot be empty'),
  body('weight').optional().isFloat({ min: 0.1 }).withMessage('Weight must be at least 0.1 lbs'),
  body('speed').optional().isIn(['standard', 'express', 'overnight']).withMessage('Invalid delivery speed'),
  handleValidationErrors
];

const validateDistanceCalc = [
  body('from').trim().notEmpty().withMessage('"from" postal code is required'),
  body('to').trim().notEmpty().withMessage('"to" postal code is required'),
  body('weight').isFloat({ gt: 0 }).withMessage('Weight must be greater than 0'),
  body('speed').optional().isIn(['standard', 'express', 'overnight']).withMessage('Invalid delivery speed'),
  handleValidationErrors
];

const validateCustomerRegistration = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  passwordValidator('password'),
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
  passwordValidator('newPassword'),
  handleValidationErrors
];

const validatePasswordReset = [
  body('token').notEmpty().withMessage('Reset token is required'),
  passwordValidator('password'),
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
  validatePackageStatus,
  validatePackageUpdate,
  validateDistanceCalc,
  validateCustomerRegistration,
  validateProfileUpdate,
  validatePasswordChange,
  validatePasswordReset,
  validateForgotPassword
};
