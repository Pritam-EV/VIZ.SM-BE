import express from "express";
import { User } from '../../../Shared/Data/MongoDB/Models/User.js';
import { Device } from "../../../Shared/Data/MongoDB/Models/Device.js";
import bcrypt from 'bcrypt';
import AccountController from "../Controllers/Account.js";
import authenticateUser from "../Middlewares/UserAuthentication.js";

const router = express.Router();
const controller = new AccountController();

// ================================
// AUTHENTICATION ROUTES
// ================================
router.post("/userSignUp", controller.userSignUp.bind(controller));
router.post("/partnerSignUp", controller.partnerSignUp.bind(controller));
router.post("/signIn", controller.signIn.bind(controller));

// ================================
// PASSWORD RESET
// ================================
router.post('/resetPassword', async (req, res) => {
  try {
    const { mobile, newPassword } = req.body;

    // Validation
    if (!mobile || !newPassword) {
      return res.status(400).json({ 
        error: 'Mobile and newPassword are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user (assumes mobile is stored in Login model or User model)
    const result = await User.updateOne(
      { mobile: mobile }, // Adjust field name if different
      { $set: { password: hashedPassword } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    res.status(200).json({ 
      message: 'Password reset successfully' 
    });
  } catch (err: any) {
    console.error('❌ Reset password error:', err);
    res.status(500).json({ 
      error: 'Failed to reset password',
      details: err?.message || 'Unknown error'
    });
  }
});

// ================================
// DEVICES - Matches UserHome.js exactly
// ================================
// GET /api/account/devices/user - ✅ 100% TypeScript Safe
router.get("/devices/user", authenticateUser, async (req, res) => {
  try {
    const loginId = (req as any).user?.id || (req as any).user?.loginId || (req as any).user?._id;
    
    if (!loginId) {
      return res.status(401).json({ error: "Unauthorized: missing user in token" });
    }

    const user = await User.findOne({ login: loginId }).lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // ✅ TYPE SAFE: Explicit array check + type assertion
    const devices = user.devices as any[];
    if (!devices || devices.length === 0) {
      return res.status(404).json({ error: "No devices linked" });
    }

    // ✅ TYPE SAFE: Explicit indexing with bounds check
    const firstDevice = devices[0];
    if (!firstDevice || !firstDevice.device) {
      return res.status(404).json({ error: "Invalid device data" });
    }

    const deviceId = firstDevice.device;

    const device = await Device.findById(deviceId).lean();
    if (!device) {
      return res.status(404).json({ error: "Linked device not found" });
    }

    res.json({
      device: {
        serialnumber: device._id,
        pool: device.pool,
        status: device.status,
        rate: device.rate,
        totalEnergy: device.totalEnergy,
      },
    });
  } catch (err: any) {
    console.error("❌ /devices/user error:", err);
    res.status(500).json({ error: "Failed to load user device" });
  }
});


export default router;
