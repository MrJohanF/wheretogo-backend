// db.js or prisma.js
import { PrismaClient } from '@prisma/client';

// For Next.js hot reloading in development
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // Prevent multiple instances in development with hot reloading
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export { prisma };