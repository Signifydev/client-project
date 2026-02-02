// lib/otp.js
import crypto from 'crypto';

/**
 * Generate a 6-digit OTP
 * @returns {string} 6-digit OTP
 */
export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash an OTP using SHA-256
 * @param {string} otp - The OTP to hash
 * @returns {string} Hashed OTP
 */
export function hashOTP(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * Verify if an entered OTP matches the stored hashed OTP
 * @param {string} enteredOTP - The OTP entered by user
 * @param {string} storedHashedOTP - The hashed OTP stored in database
 * @returns {boolean} True if OTP matches
 */
export function verifyOTP(enteredOTP, storedHashedOTP) {
  const hashedEnteredOTP = hashOTP(enteredOTP);
  return hashedEnteredOTP === storedHashedOTP;
}

/**
 * Generate OTP with expiration time (in minutes)
 * @param {number} minutes - Expiration time in minutes
 * @returns {object} OTP object with code and expiration time
 */
export function generateOTPWithExpiry(minutes = 10) {
  const otp = generateOTP();
  const expiryTime = new Date(Date.now() + minutes * 60000);
  
  return {
    code: otp,
    hashedCode: hashOTP(otp),
    expiresAt: expiryTime
  };
}

/**
 * Check if OTP is expired
 * @param {Date} expiryTime - OTP expiration time
 * @returns {boolean} True if expired
 */
export function isOTPExpired(expiryTime) {
  return new Date() > new Date(expiryTime);
}

export default {
  generateOTP,
  hashOTP,
  verifyOTP,
  generateOTPWithExpiry,
  isOTPExpired
};