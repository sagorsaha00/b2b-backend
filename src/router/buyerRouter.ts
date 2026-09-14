import express, { Router } from "express";
import { BuyerController } from "../controller/buyerController.js";
import asyncHandler from "../../middleware/asyncHandler.js";

const router = express.Router();

const buyerController = new BuyerController();

router.post("/registerBuyer", asyncHandler(buyerController.registerBuyer));
router.post("/loginBuyer", asyncHandler(buyerController.loginBuyer));
router.get("/getBuyerInfo", asyncHandler(buyerController.getBuyers));
router.get("/getBuyerById/:id", asyncHandler(buyerController.getBuyerById));

const buyerRouter: Router = router;

export default buyerRouter;
