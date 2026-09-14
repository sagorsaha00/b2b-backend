import express, { Router } from "express";
import { SellerController } from "../controller/sellerController.js";
import asyncHandler from "../../middleware/asyncHandler.js";

const router = express.Router();
const sellerController = new SellerController();

router.post(
  "/createSellerAccount",
  asyncHandler(sellerController.registerSeller),
);
router.post("/loginSeller", asyncHandler(sellerController.loginSeller));
// router.get("/getSellerByStatus", asyncHandler(sellerController.getSellers));
router.get(
  "/getPaginatedSellers",
  asyncHandler(sellerController.getPaginatedSellers),
);
router.get("/getSellerById/:id", asyncHandler(sellerController.getSellerById));
router.patch(
  "/updateSellerAccount/:id",
  asyncHandler(sellerController.updateSeller),
);

router.patch(
  "/updateSellerStatus",
  asyncHandler(sellerController.updateVerificationStatus),
);
const sellerRouter: Router = router;
export default sellerRouter;
