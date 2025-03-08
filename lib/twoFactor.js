// utils/twoFactor.js
import { authenticator } from "otplib";
import crypto from "crypto";
import { prisma } from "../prisma/prisma.js";
import qrcode from "qrcode";

// Setup 2FA for a user
export const setupTwoFactor = async (userId, email) => {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(email, "YourAppName", secret);
  
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret }
  });
  
  const qrCodeUrl = await qrcode.toDataURL(otpauth);
  return { secret, qrCodeUrl };
};

// Verify and enable 2FA
export const verifyAndEnableTwoFactor = async (userId, token) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true }
  });
  
  if (!user?.twoFactorSecret) {
    throw new Error("Two-factor authentication not set up");
  }
  
  const isValid = authenticator.verify({
    token,
    secret: user.twoFactorSecret
  });
  
  if (!isValid) {
    throw new Error("Invalid verification code");
  }
  
  // Generate backup codes
  const backupCodes = await generateBackupCodes(userId);
  
  // Enable 2FA
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true }
  });
  
  return { enabled: true, backupCodes };
};

// Generate backup codes
export const generateBackupCodes = async (userId) => {
  // Delete existing backup codes
  await prisma.twoFactorBackupCode.deleteMany({
    where: { userId }
  });
  
  const backupCodes = [];
  
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString("hex");
    backupCodes.push(code);
    
    await prisma.twoFactorBackupCode.create({
      data: {
        userId,
        code,
        used: false
      }
    });
  }
  
  return backupCodes;
};

// Verify token during login
export const verifyToken = async (userId, token) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true }
  });
  
  if (!user?.twoFactorSecret) {
    return false;
  }
  
  return authenticator.verify({
    token,
    secret: user.twoFactorSecret
  });
};

// Verify backup code
export const verifyBackupCode = async (userId, code) => {
  const backupCode = await prisma.twoFactorBackupCode.findFirst({
    where: {
      userId,
      code,
      used: false
    }
  });
  
  if (!backupCode) {
    return false;
  }
  
  await prisma.twoFactorBackupCode.update({
    where: { id: backupCode.id },
    data: { used: true }
  });
  
  return true;
};