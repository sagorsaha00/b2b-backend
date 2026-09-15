import type { Request, Response } from "express";
import { ApiError } from "../../middleware/apiError.js";
import { prisma } from "../../database/index.js";
import { resolveUnitPrice } from "../lib/index.js";

export class OrderController {
  createOrder = async (req: Request, res: Response): Promise<void> => {
    const { buyerId, sellerId, productId, quantity } = req.body;

    if (!buyerId || !sellerId || !productId || !quantity) {
      throw new ApiError(
        400,
        "buyerId, sellerId, productId and quantity are required",
      );
    }

    const order = await prisma.$transaction(async (tx) => {
      const product = await tx.sellerProductInfo.findUnique({
        where: {
          id: Number(productId),
        },
        include: {
          tiers: true,
        },
      });
      console.log("product", product);
      if (!product) {
        throw new ApiError(404, "Product not found");
      }

      if (product.sellerId !== Number(sellerId)) {
        throw new ApiError(400, "Product does not belong to the given seller");
      }

      if (quantity < product.minimumQty) {
        throw new ApiError(
          400,
          `Minimum order quantity is ${product.minimumQty}`,
        );
      }

      if (product.stock < quantity) {
        throw new ApiError(400, "Insufficient stock");
      }

      const unitPrice = resolveUnitPrice(product, Number(quantity));

      const totalAmount = unitPrice * Number(quantity);

      const newOrder = await tx.order.create({
        data: {
          buyerId: Number(buyerId),
          sellerId: Number(sellerId),
          productId: Number(productId),
          quantity: Number(quantity),
          totalAmount,
          tiers: product.tiers.map((tier) => ({
            minQuantity: tier.minQty,
            maxQuantity: tier.maxQty,
            price: tier.unitPrice,
          })),
        },
      });

      await tx.sellerProductInfo.update({
        where: {
          id: product.id,
        },
        data: {
          stock: {
            decrement: Number(quantity),
          },
        },
      });

      return newOrder;
    });

    res.status(201).json({
      success: true,
      data: order,
    });
  };
  // getOrders = async (req: Request, res: Response): Promise<void> => {
  //   const { buyerId, sellerId, status } = req.query;

  //   const orders = await prisma.order.findMany({
  //     where: {
  //       buyerId: buyerId ? Number(buyerId) : undefined,
  //       sellerId: sellerId ? Number(sellerId) : undefined,
  //       status: String(status) ? String(status) : undefined,
  //     },
  //     include: {
  //       product: true,
  //       payment: true,
  //     },
  //     orderBy: {
  //       createdAt: "desc",
  //     },
  //   });

  //   res.json({
  //     success: true,
  //     count: orders.length,
  //     data: orders,
  //   });
  // };

  getOrderById = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);

    const order = await prisma.order.findUnique({
      where: {
        id,
      },
      include: {
        buyer: true,
        seller: true,
        product: true,
        payment: true,
      },
    });

    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    res.json({
      success: true,
      data: order,
    });
  };

  updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const { status } = req.body;

    const allowedStatuses = [
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      throw new ApiError(
        400,
        `status must be one of: ${allowedStatuses.join(", ")}`,
      );
    }

    const order = await prisma.order.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });

    res.json({
      success: true,
      data: order,
    });
  };
}
