// prisma/seed.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient()

async function main() {
  try {
    // Datos del admin por defecto
    const adminData = {
      email: 'admin@wheretogo.com',
      password: 'Admin',
      name: 'Administrador',
      role: 'ADMIN'
    }

    // Verificar si ya existe un admin
    const existingAdmin = await prisma.user.findFirst({
      where: {
        role: 'ADMIN'
      }
    })

    if (!existingAdmin) {
      // Crear admin solo si no existe
      const hashedPassword = await bcrypt.hash(adminData.password, 10)
      
      const newAdmin = await prisma.user.create({
        data: {
          email: adminData.email,
          password: hashedPassword,
          name: adminData.name,
          role: adminData.role
        }
      })

      console.log('✅ Usuario administrador creado:', newAdmin.email)
    } else {
      console.log('ℹ️ Ya existe un usuario administrador')
    }
  } catch (error) {
    console.error('❌ Error al crear el administrador:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()