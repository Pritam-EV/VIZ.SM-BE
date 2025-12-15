import express from "express";
import { User } from '../../../Shared/Data/MongoDB/Models/User.js';
import { Partner } from "../../../Shared/Data/MongoDB/Models/Partner.js";
import { Device } from "../../../Shared/Data/MongoDB/Models/Device.js";
import bcrypt from 'bcrypt';
import AccountController from "../Controllers/Account.js";
import authenticateUser from "../Middlewares/UserAuthentication.js";
import { Login } from "../../../Shared/Data/MongoDB/Models/Login.js";
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
    const loginId = (req as any).customContext?.user?.id;
    
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

// ================================
// PROFILE ROUTES
// ================================

// GET /api/account/profile
// GET /api/account/profile
router.get("/profile", authenticateUser, async (req, res) => {
  try {
    const loginId = (req as any).customContext?.user?.id;

    if (!loginId) {
      return res.status(401).json({ error: "Unauthorized: missing user in token" });
    }

    // 🔹 Login document for name / mobile / email
    const loginDoc = await Login.findById(loginId).lean();

    if (!loginDoc) {
      return res.status(404).json({ error: "User profile not found" });
    }

    // 🔹 Check if this login has a partner record
    const partnerDoc = await Partner.findOne({ login: loginId }).lean();
    const hasPartner = !!partnerDoc;

    // Shape the data as FE expects
    return res.json({
      user: {
        firstName: loginDoc.firstName || loginDoc.firstName || "",
        name:       loginDoc.firstName || loginDoc.firstName || "",
        mobile:     loginDoc.mobile,
        phone:      loginDoc.mobile,
        email:      loginDoc.email || "",
      },
      hasPartner,   // 👈 FE will use this
    });
  } catch (err: any) {
    console.error("❌ /api/account/profile GET error:", err);
    return res.status(500).json({
      error: "Failed to load profile",
      details: err?.message || "Unknown error",
    });
  }
});


// PUT /api/account/profile
router.put("/profile", authenticateUser, async (req, res) => {
  try {
    const loginId = (req as any).customContext?.user?.id;

    if (!loginId) {
      return res.status(401).json({ error: "Unauthorized: missing user in token" });
    }

    const { name, email } = req.body;

    const update: any = {};

    if (typeof name === "string" && name.trim()) {
      // store as firstName (or name) depending on your Login schema
      update.firstName = name.trim();
    }

    if (typeof email === "string") {
      update.email = email.trim();
    }

    const updatedLogin = await Login.findByIdAndUpdate(
      loginId,
      { $set: update },
      { new: true }
    ).lean();

    if (!updatedLogin) {
      return res.status(404).json({ error: "User profile not found" });
    }

    return res.json({
      message: "Profile updated successfully",
      user: {
        firstName: updatedLogin.firstName || updatedLogin.firstName || "",
        name:       updatedLogin.firstName || updatedLogin.firstName || "",
        mobile:     updatedLogin.mobile,
        phone:      updatedLogin.mobile,
        email:      updatedLogin.email || "",
      },
    });
  } catch (err: any) {
    console.error("❌ /api/account/profile PUT error:", err);
    return res.status(500).json({
      error: "Failed to update profile",
      details: err?.message || "Unknown error",
    });
  }
});



export default router;
