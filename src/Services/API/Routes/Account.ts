import express from "express";
import { User } from '../../../Shared/Data/MongoDB/Models/User.js';  // ✅ Use destructuring
import { Device } from "../../../Shared/Data/MongoDB/Models/Device.js";
import * as bcrypt from 'bcrypt';  // ✅ Use namespace import
import AccountController from "../Controllers/Account.js";
import authenticateUser from "../Middlewares/UserAuthentication.js";

const router = express.Router();
const controller = new AccountController();

// Sign up / sign in
router.post("/userSignUp", controller.userSignUp.bind(controller));
router.post("/partnerSignUp", controller.partnerSignUp.bind(controller));
router.post("/signIn", controller.signIn.bind(controller));

// POST /api/account/resetPassword
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

    // Hash the password (don't re-require bcrypt here)
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user in MongoDB
    const result = await User.updateOne(
      { mobile: mobile },
      { $set: { password: hashedPassword } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    // ✅ Success
    res.status(200).json({ 
      message: 'Password reset successfully' 
    });

  } catch (err: any) {  // ✅ Fix: Add type annotation
    console.error('❌ Reset password error:', err);
    res.status(500).json({ 
      error: 'Failed to reset password',
      details: err?.message || 'Unknown error'
    });
  }
});

router.get("/devices/user", authenticateUser, async (req, res) => {
  try {
    // You are already decoding JWT elsewhere; typical pattern:
    // userAuthMiddleware puts loginId or userId on req.user
    const loginId = (req as any).user?.id || (req as any).user?.loginId;
    if (!loginId) {
      return res.status(401).json({ error: "Unauthorized: missing user in token" });
    }

    // 1) Find user doc by login ref
    const user = await User.findOne({ login: loginId }).lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // user.devices is an array of { device: string, createdAt: Date }
    if (!user.devices || user.devices.length === 0) {
      return res.status(404).json({ error: "No devices linked" });
    }

    // For now: take first device
    const deviceId = user.devices[0].device;

    // 2) Load Device
    const device = await Device.findById(deviceId).lean();
    if (!device) {
      return res.status(404).json({ error: "Linked device not found" });
    }

    // 3) Return minimal info your frontend expects
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
