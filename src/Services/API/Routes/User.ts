import { Router } from "express";
import HomeController from "../Controllers/Home.js";

const userRouter = Router();

const homeController = new HomeController();

userRouter.get("/home", homeController.getUserHomePageDetails);

export default userRouter;