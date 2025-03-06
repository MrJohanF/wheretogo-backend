
// Prisma Client
import { PrismaClient } from '@prisma/client'


// Prisma Client Instance
const prisma = global.prisma || new PrismaClient()

// Development Environment
if (process.env.NODE_ENV === 'development') global.prisma = prisma


export default prisma


