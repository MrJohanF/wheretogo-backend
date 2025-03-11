// prisma/seed.js
import { prisma } from "../prisma/prisma.js";
import bcrypt from 'bcryptjs';
import { DEFAULT_PREFERENCES } from "../utils/defaultPreferences.js";

async function main() {
  try {
    // Datos del admin por defecto
    const adminData = {
      email: 'admin@mywheretogo.com',
      password: 'Admin123',
      name: 'Administrador',
      role: 'ADMIN'
    }

    // Verificar si ya existe un admin
    const existingAdmin = await prisma.user.findFirst({
      where: {
        role: 'ADMIN'
      }
    });

    let adminId;

    if (!existingAdmin) {
      // Crear admin solo si no existe
      const hashedPassword = await bcrypt.hash(adminData.password, 10);
      
      const newAdmin = await prisma.user.create({
        data: {
          email: adminData.email,
          password: hashedPassword,
          name: adminData.name,
          role: adminData.role
        }
      });

      adminId = newAdmin.id;
      console.log('✅ Usuario administrador creado:', newAdmin.email);
    } else {
      console.log('ℹ️ Ya existe un usuario administrador');
      adminId = existingAdmin.id;
    }

    // Verificar si el admin ya tiene preferencias configuradas
    const existingPrefs = await prisma.userPreference.count({
      where: { userId: adminId }
    });

    if (existingPrefs === 0) {
      // Crear preferencias por defecto
      const prefsToCreate = [];
      
      for (const [key, value] of Object.entries(DEFAULT_PREFERENCES)) {
        prefsToCreate.push({
          userId: adminId,
          key,
          value
        });
      }
      
      await prisma.userPreference.createMany({
        data: prefsToCreate
      });
      
      console.log('✅ Preferencias por defecto creadas para el administrador');
    } else {
      console.log('ℹ️ El administrador ya tiene preferencias configuradas');
    }
  } catch (error) {
    console.error('❌ Error durante el proceso de seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();