import express from "express";
import cors from "cors";
import buyerRouter from "./router/buyerRouter.js";
import OrderRouter from "./router/orderRouter.js";
import sellerRouter from "./router/sellerRouter.js";
import productRouter from "./router/productRouter.js";

import "dotenv/config";

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:3000",
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", async (req, res) => {
  res.send("server is ok no tension");
});

//router
app.use("/api/buyer", buyerRouter);
app.use("/api/order", OrderRouter);
app.use("/api/seller", sellerRouter);
app.use("/api/product", productRouter);
const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
