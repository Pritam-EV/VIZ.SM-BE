import express from "express";
import { User } from '../../../Shared/Data/MongoDB/Models/User.js';  // ✅ Use destructuring
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

export default router;
