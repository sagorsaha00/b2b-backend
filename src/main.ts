import express from "express";
import cors from "cors";
import buyerRouter from "./router/buyerRouter.js";
import OrderRouter from "./router/orderRouter.js";
import sellerRouter from "./router/sellerRouter.js";
import productRouter from "./router/productRouter.js";

import "dotenv/config";

const app = express();

app.use(
  cors({
    origin: "*", // Vercel deployment-এর জন্য আপাতত '*' রাখুন
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("server is ok no tension");
});

// Routers
app.use("/api/buyer", buyerRouter);
app.use("/api/order", OrderRouter);
app.use("/api/seller", sellerRouter);
app.use("/api/product", productRouter);

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

export default app;
