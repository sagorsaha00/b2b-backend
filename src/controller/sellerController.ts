import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { ApiError } from "../../middleware/apiError.js";
import { prisma } from "../../database/index.js";

const allowedStatuses = ["pending", "verified", "rejected"] as const;

type SellerVerificationStatus = (typeof allowedStatuses)[number];

export class SellerController {
  registerSeller = async (req: Request, res: Response): Promise<void> => {
    const {
      name,
      email,
      number,
      businessLocation,
      logo,
      coverPhoto,
      password,
    } = req.body;
    console.log("body", req.body);
    if (!name || !email || !number || !businessLocation) {
      throw new ApiError(
        400,
        "name, email, number and businessLocation are required",
      );
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const seller = await prisma.regSeller.create({
      data: {
        name,
        email,
        number,
        businessLocation,
        logo,
        coverPhoto,
        hashedPassword,
      },
    });

    res.status(201).json({
      success: true,
      data: seller,
    });
  };
  loginSeller = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, "email and password are required");
    }

    const seller = await prisma.regSeller.findUnique({
      where: {
        email,
      },
    });

    if (!seller) {
      throw new ApiError(401, "Invalid email or password");
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      seller.hashedPassword,
    );

    if (!isPasswordCorrect) {
      throw new ApiError(401, "Invalid email or password");
    }

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: { seller },
    });
  };
  // getSellers = async (req: Request, res: Response): Promise<void> => {
  //   const { verificationStatus } = req.query;

  //   let status: SellerVerificationStatus | undefined;

  //   if (verificationStatus) {
  //     const statusValue = String(verificationStatus);

  //     if (!allowedStatuses.includes(statusValue as SellerVerificationStatus)) {
  //       throw new ApiError(
  //         400,
  //         `verificationStatus must be one of: ${allowedStatuses.join(", ")}`,
  //       );
  //     }

  //     status = statusValue as SellerVerificationStatus;
  //   }

  //   const sellers = await prisma.regSeller.findMany({
  //     where: {
  //       verificationStatus: status,
  //     },
  //     orderBy: {
  //       createdAt: "desc",
  //     },
  //   });

  //   res.status(200).json({
  //     success: true,
  //     count: sellers.length,
  //     data: sellers,
  //   });
  // };
  getPaginatedSellers = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        verificationStatus,
        search,
        page = "1",
        limit = "10",
      } = req.query;

      let status: SellerVerificationStatus | undefined;

      if (verificationStatus && verificationStatus !== "all") {
        const statusValue = String(verificationStatus);

        if (
          !allowedStatuses.includes(statusValue as SellerVerificationStatus)
        ) {
          throw new ApiError(
            400,
            `verificationStatus must be one of: ${allowedStatuses.join(", ")}`,
          );
        }

        status = statusValue as SellerVerificationStatus;
      }

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.max(1, parseInt(String(limit), 10) || 10);
      const skip = (pageNum - 1) * limitNum;

      const whereCondition: any = {};

      if (status) {
        whereCondition.verificationStatus = status;
      }

      if (search && String(search).trim() !== "") {
        const searchTerm = String(search).trim();

        // Matched directly to your regSeller schema fields
        whereCondition.OR = [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { email: { contains: searchTerm, mode: "insensitive" } },
          { number: { contains: searchTerm, mode: "insensitive" } },
          { businessLocation: { contains: searchTerm, mode: "insensitive" } },
        ];
      }

      const [total, sellers] = await prisma.$transaction([
        prisma.regSeller.count({ where: whereCondition }),
        prisma.regSeller.findMany({
          where: whereCondition,
          skip,
          take: limitNum,
          orderBy: {
            createdAt: "desc",
          },
        }),
      ]);

      const totalPages = Math.ceil(total / limitNum) || 1;

      res.status(200).json({
        success: true,
        data: sellers,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      });
    } catch (error: any) {
      console.error("Error in getPaginatedSellers:", error);
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, message: error.message });
        return;
      }
      res.status(500).json({
        success: false,
        message: error?.message || "Internal server error",
      });
    }
  };
  getSellerById = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      throw new ApiError(400, "Invalid seller ID");
    }

    const seller = await prisma.regSeller.findUnique({
      where: { id },
      include: {
        products: true,
      },
    });

    if (!seller) {
      throw new ApiError(404, "Seller not found");
    }

    res.status(200).json({
      success: true,
      data: seller,
    });
  };

  updateSeller = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      throw new ApiError(400, "Invalid seller ID");
    }

    const { name, number, businessLocation, logo, coverPhoto } = req.body;

    const existingSeller = await prisma.regSeller.findUnique({
      where: { id },
    });

    if (!existingSeller) {
      throw new ApiError(404, "Seller not found");
    }

    const seller = await prisma.regSeller.update({
      where: { id },
      data: {
        name,
        number,
        businessLocation,
        logo,
        coverPhoto,
      },
    });

    res.status(200).json({
      success: true,
      data: seller,
    });
  };

  updateVerificationStatus = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(id)) {
      throw new ApiError(400, "Invalid seller ID");
    }

    if (!allowedStatuses.includes(status)) {
      throw new ApiError(
        400,
        `status must be one of: ${allowedStatuses.join(", ")}`,
      );
    }

    const existingSeller = await prisma.regSeller.findUnique({
      where: { id },
    });

    if (!existingSeller) {
      throw new ApiError(404, "Seller not found");
    }

    const seller = await prisma.regSeller.update({
      where: { id },
      data: {
        verificationStatus: status,
      },
    });

    res.status(200).json({
      success: true,
      data: seller,
    });
  };
}
