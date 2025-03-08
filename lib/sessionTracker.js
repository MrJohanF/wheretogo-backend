// utils/sessionTracker.js
import { prisma } from "../prisma/prisma.js";
import UAParser from "ua-parser-js";
import axios from "axios";

// Create or update a user session
export const createUserSession = async (userId, req) => {
  try {
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"];
    
    // Parse user agent information
    const deviceInfo = parseUserAgent(userAgent);
    
    // Get location information
    const location = await getLocationFromIp(ipAddress);
    
    // Create new session
    const session = await prisma.userSession.create({
      data: {
        userId,
        ipAddress,
        userAgent,
        deviceName: deviceInfo.deviceName,
        location,
        isActive: true,
        lastActivity: new Date()
      }
    });
    
    return session;
  } catch (error) {
    console.error("Error creating session:", error);
    // Create basic session if enhanced tracking fails
    return prisma.userSession.create({
      data: {
        userId,
        isActive: true
      }
    });
  }
};

// Update session activity timestamp
export const updateSessionActivity = async (sessionId) => {
  if (!sessionId) return null;
  
  return prisma.userSession.update({
    where: { id: parseInt(sessionId) },
    data: { lastActivity: new Date() }
  });
};

// Parse user agent to get browser and device info
function parseUserAgent(userAgent) {
  if (!userAgent) return { deviceName: "Unknown" };
  
  const parser = new UAParser(userAgent);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();
  
  let deviceName = "";
  
  if (browser.name) {
    deviceName = browser.name;
    
    if (os.name) {
      if (device.type === "mobile" || device.type === "tablet") {
        deviceName += ` on \${device.vendor || ""} \${device.model || os.name}`.trim();
      } else {
        deviceName += ` on \${os.name}`;
      }
    }
  } else {
    deviceName = device.vendor ? `\${device.vendor} \${device.model}` : os.name || "Unknown Device";
  }
  
  return { deviceName };
}

// Get location from IP using ipinfo.io
async function getLocationFromIp(ip) {
  if (!ip || ip === "::1" || ip.includes("127.0.0.1")) {
    return "Local Development";
  }
  
  try {
    const response = await axios.get(`https://ipinfo.io/\${ip}?token=d54e5eec392442`);
    if (response.data) {
      return `\${response.data.city || ""}, \${response.data.country || ""}`.trim();
    }
    return "Unknown location";
  } catch (error) {
    console.error("Error looking up IP:", error);
    return "Unknown location";
  }
}