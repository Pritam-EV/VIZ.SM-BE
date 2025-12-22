import { Router } from "express";
import HomeController from "../Controllers/Home.js";
import UserController from "../Controllers/User.js";

const userRouter = Router();

const homeController = new HomeController();
const userController = new UserController();

userRouter.get("/home", homeController.getUserHomePageDetails);

// ✅ ADD THIS LINE (POST support)
userRouter.post("/linkdevice", userController.linkUserDevice);

userRouter.patch("/linkdevice", userController.linkUserDevice);

userRouter.patch("/unlinkdevices", userController.unlinkUserDevices);

userRouter.post("/topupdevice", userController.topupUserDevice);

userRouter.get("/devicehistory", userController.userDeviceTopupHistory);

userRouter.get("/wallethistory", userController.userWalletHistory);

export default userRouter;