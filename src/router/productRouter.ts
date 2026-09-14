import express, { type Router } from "express";

import { ProductController } from "../controller/productController.js";
import asyncHandler from "../../middleware/asyncHandler.js";

const router = express.Router();

const productController = new ProductController();

router.post("/createProduct", asyncHandler(productController.createProduct));
router.get(
  "/getDiscountedProducts",
  asyncHandler(productController.getDiscountedProducts),
);
router.get("/getProduct", asyncHandler(productController.getProducts));

router.get(
  "/getProductById/:id",
  asyncHandler(productController.getProductById),
);

router.put("/updateProduct/:id", asyncHandler(productController.updateProduct));

router.delete(
  "/deleteProduct/:id",
  asyncHandler(productController.deleteProduct),
);

router.post(
  "/addProductTier/:id/tiers",
  asyncHandler(productController.addProductTier),
);

const productRouter: Router = router;

export default productRouter;
