// scripts/addDefaultPreferencesToExistingUsers.js - Migration to add default preferences to existing users
import { prisma } from '../prisma/prisma.js';
import { DEFAULT_PREFERENCES } from '../utils/defaultPreferences.js';


async function addDefaultPreferencesToExistingUsers() {
  try {
    // Get all users
    const users = await prisma.user.findMany({ select: { id: true } });
    console.log(`Adding default preferences for ${users.length} users...`);
    
    for (const user of users) {
      const userId = user.id;
      
      // Check for existing preferences
      const existingPrefs = await prisma.userPreference.findMany({
        where: { userId },
        select: { key: true }
      });
      
      const existingKeys = new Set(existingPrefs.map(p => p.key));
      
      // Set up preferences that don't exist
      const prefsToCreate = [];
      
      for (const [key, value] of Object.entries(DEFAULT_PREFERENCES)) {
        if (!existingKeys.has(key)) {
          prefsToCreate.push({
            userId,
            key,
            value
          });
        }
      }
      
      if (prefsToCreate.length > 0) {
        await prisma.userPreference.createMany({
          data: prefsToCreate,
          skipDuplicates: true
        });
        console.log(`Added ${prefsToCreate.length} default preferences for user ${userId}`);
      }
    }
    
    console.log('Default preference migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addDefaultPreferencesToExistingUsers();