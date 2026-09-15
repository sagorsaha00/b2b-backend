import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../../database/index.js";
import { ApiError } from "../../middleware/apiError.js";

export class BuyerController {
  //register
  registerBuyer = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {
        name,
        email,
        phoneNumber,
        profilePic,
        location,
        businessInfo,
        password,
      } = req.body;

      if (!name || !email || !phoneNumber || !password) {
        throw new ApiError(
          400,
          "name, email, phoneNumber and password are required",
        );
      }

      const existing = await prisma.regBuyer.findFirst({
        where: { OR: [{ email }, { phoneNumber }] },
      });
      if (existing) {
        throw new ApiError(
          409,
          "An account with this email or phone number already exists",
        );
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const buyer = await prisma.regBuyer.create({
        data: {
          name,
          email,
          phoneNumber,
          profilePic,
          location,
          hashedPassword,
          ...(businessInfo?.name
            ? {
                businessInfo: {
                  create: {
                    name: businessInfo.name,
                    tradeLicense: businessInfo.tradeLicense,
                    userNationalId: businessInfo.userNationalId,
                  },
                },
              }
            : {}),
        },
        include: { businessInfo: true },
      });

      const { hashedPassword: _omit, ...safeBuyer } = buyer;

      res.status(201).json({
        success: true,
        data: safeBuyer,
      });
    } catch (err) {
      next(err); // hand off to your centralized error middleware, which must always respond with JSON
    }
  };

  loginBuyer = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, "email and password are required");
    }

    const buyer = await prisma.regBuyer.findUnique({
      where: {
        email,
      },
    });

    if (!buyer) {
      throw new ApiError(401, "Invalid email or password");
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      buyer.hashedPassword,
    );

    if (!isPasswordCorrect) {
      throw new ApiError(401, "Invalid email or password");
    }

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        buyer,
      },
    });
  };

  getBuyers = async (req: Request, res: Response): Promise<void> => {
    //role base
    const buyers = await prisma.regBuyer.findMany({
      include: {
        businessInfo: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      count: buyers.length,
      data: buyers,
    });
  };

  //get buyerId
  getBuyerById = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      throw new ApiError(400, "Invalid buyer ID");
    }

    const buyer = await prisma.regBuyer.findUnique({
      where: {
        id,
      },
      include: {
        businessInfo: true,
        orders: true,
        wishlists: true,
      },
    });

    if (!buyer) {
      throw new ApiError(404, "Buyer not found");
    }

    res.json({
      success: true,
      data: buyer,
    });
  };
}
