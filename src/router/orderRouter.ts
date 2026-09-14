import express, { Router } from "express";
import { OrderController } from "../controller/orderController.js";
import asyncHandler from "../../middleware/asyncHandler.js";

const router = express.Router();
const orderController = new OrderController();

router.post("/createOrder", asyncHandler(orderController.createOrder));
// router.get("/getOrders", asyncHandler(orderController.getOrders));
router.get("/singleOrder/:id", asyncHandler(orderController.getOrderById));
router.patch(
  "/upDateOrder/:id",
  asyncHandler(orderController.updateOrderStatus),
);

const OrderRouter: Router = router;

export default OrderRouter;
