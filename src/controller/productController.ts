import type { Request, Response } from "express";
import { type CreateProductInput } from "../../global/type.js";
import { prisma } from "../../database/index.js";

import { ApiError } from "../../middleware/apiError.js";
import { BUSINESS_CATEGORIES } from "../lib/constant.js";
import type { Prisma } from "../../generated/prisma_client/client.js";

type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

export class ProductController {
  createProduct = async (
    req: Request<{}, {}, any>,
    res: Response,
  ): Promise<void> => {
    try {
      const {
        sellerId,
        name,
        description,
        category,
        price,
        stock,
        discount = 0,
        unit,
        minimumQty = 1,
        supplierCountry,
        images = [],
        tiers = [],
      } = req.body;

      const sellerExists = await prisma.regSeller.findUnique({
        where: { id: Number(sellerId) },
      });

      if (!sellerExists) {
        throw new ApiError(404, "Seller not found with the provided sellerId");
      }

      const formattedImages = Array.isArray(images)
        ? images
            .filter(
              (url: string) => typeof url === "string" && url.trim() !== "",
            )
            .map((url: string) => ({
              url: url.trim(),
            }))
        : [];

      const formattedTiers = Array.isArray(tiers)
        ? tiers.map((tier: any) => ({
            minQty: Number(tier.minQty),
            maxQty: tier.maxQty ? Number(tier.maxQty) : null,
            unitPrice: Number(tier.unitPrice),
          }))
        : [];

      const product = await prisma.sellerProductInfo.create({
        data: {
          sellerId,
          name,
          description,
          category,
          price,
          stock,
          discount,
          unit,
          minimumQty,
          supplierCountry,
          ...(images?.length
            ? {
                images: {
                  create: images.map((url: string) => ({
                    url: url.trim(),
                  })),
                },
              }
            : {}),

          ...(tiers?.length
            ? {
                tiers: {
                  create: tiers.map((tier: any) => ({
                    minQty: tier.minQty,
                    maxQty: tier.maxQty ?? null,
                    unitPrice: tier.unitPrice,
                  })),
                },
              }
            : {}),
        },

        include: {
          images: true,
          tiers: true,
        },
      });

      res.status(201).json({
        success: true,
        message: "B2B Tiered Product created successfully",
        data: product,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to create product",
      });
    }
  };
  getProducts = async (req: Request, res: Response): Promise<void> => {
    const {
      sellerId,
      category,
      search,
      minPrice,
      maxPrice,
      countryCodes,
      page = "1",
      limit = "10",
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, parseInt(String(limit), 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const whereCondition: Prisma.sellerProductInfoWhereInput = {};
    const andConditions: Prisma.sellerProductInfoWhereInput[] = [];

    if (sellerId) {
      whereCondition.sellerId = Number(sellerId);
    }

    if (
      category &&
      String(category).trim() !== "" &&
      String(category) !== "all"
    ) {
      whereCondition.category = {
        equals: String(category).trim(),
        mode: "insensitive",
      };
    }

    if (search && String(search).trim() !== "") {
      const searchTerm = String(search).trim();
      andConditions.push({
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { description: { contains: searchTerm, mode: "insensitive" } },
          { category: { contains: searchTerm, mode: "insensitive" } },
          { supplierCountry: { contains: searchTerm, mode: "insensitive" } },
        ],
      });
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceCondition: Prisma.FloatFilter = {};

      if (
        minPrice !== undefined &&
        String(minPrice).trim() !== "" &&
        !isNaN(Number(minPrice))
      ) {
        priceCondition.gte = Number(minPrice);
      }
      if (
        maxPrice !== undefined &&
        String(maxPrice).trim() !== "" &&
        !isNaN(Number(maxPrice))
      ) {
        priceCondition.lte = Number(maxPrice);
      }
      if (Object.keys(priceCondition).length > 0) {
        whereCondition.price = priceCondition;
      }
    }

    // FIXED: Improved Country Code Handling
    if (countryCodes) {
      const rawValues = (
        Array.isArray(countryCodes)
          ? countryCodes
          : String(countryCodes).split(",")
      )
        .map((c) => String(c).trim())
        .filter((c) => c.length > 0);

      const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
      const countriesArray = new Set<string>();

      for (const value of rawValues) {
        // Add original value (e.g., "se" or "Sweden")
        countriesArray.add(value);

        // If 2-letter ISO code, convert to Uppercase and get full name
        if (/^[A-Za-z]{2}$/.test(value)) {
          const uppercaseCode = value.toUpperCase();
          countriesArray.add(uppercaseCode); // Add "SE"

          try {
            const fullName = regionNames.of(uppercaseCode);
            if (fullName) {
              countriesArray.add(fullName); // Add "Sweden"
            }
          } catch {
            // Invalid region code ignored
          }
        }
      }

      const countriesList = Array.from(countriesArray);

      if (countriesList.length > 0) {
        andConditions.push({
          OR: [
            { supplierCountry: { in: countriesList, mode: "insensitive" } },
            {
              seller: {
                businessLocation: { in: countriesList, mode: "insensitive" },
              },
            },
          ],
        });
      }
    }

    if (andConditions.length > 0) {
      whereCondition.AND = andConditions;
    }

    const [total, products] = await prisma.$transaction([
      prisma.sellerProductInfo.count({ where: whereCondition }),
      prisma.sellerProductInfo.findMany({
        where: whereCondition,
        skip,
        take: limitNum,
        include: {
          images: {
            select: { id: true, url: true },
          },
          tiers: {
            orderBy: { minQty: "asc" },
          },
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
              number: true,
              businessLocation: true,
              logo: true,
              verificationStatus: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  };
  getDiscountedProducts = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const {
        page = "1",
        limit = "10",
        category,
        search,
        supplierCountry,
      } = req.query;

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.max(1, parseInt(String(limit), 10) || 10);
      const skip = (pageNum - 1) * limitNum;

      // Filter condition for discounted products (discount > 0)
      const whereCondition: Prisma.sellerProductInfoWhereInput = {
        discount: {
          gt: 0,
        },
      };

      const andConditions: Prisma.sellerProductInfoWhereInput[] = [];

      // Category Filter
      if (
        category &&
        String(category).trim() !== "" &&
        String(category) !== "all"
      ) {
        whereCondition.category = {
          equals: String(category).trim(),
          mode: "insensitive",
        };
      }

      // Country Filter
      if (supplierCountry && String(supplierCountry).trim() !== "") {
        whereCondition.supplierCountry = {
          equals: String(supplierCountry).trim(),
          mode: "insensitive",
        };
      }

      // Search Filter
      if (search && String(search).trim() !== "") {
        const searchTerm = String(search).trim();
        andConditions.push({
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { description: { contains: searchTerm, mode: "insensitive" } },
            { category: { contains: searchTerm, mode: "insensitive" } },
          ],
        });
      }

      if (andConditions.length > 0) {
        whereCondition.AND = andConditions;
      }

      const [total, products] = await prisma.$transaction([
        prisma.sellerProductInfo.count({ where: whereCondition }),
        prisma.sellerProductInfo.findMany({
          where: whereCondition,
          skip,
          take: limitNum,
          include: {
            images: {
              select: { id: true, url: true },
            },
            tiers: {
              orderBy: { minQty: "asc" },
            },
            seller: {
              select: {
                id: true,
                name: true,
                email: true,
                number: true,
                businessLocation: true,
                logo: true,
                verificationStatus: true,
              },
            },
          },
          orderBy: { discount: "desc" }, // Highest discount first
        }),
      ]);

      // Format products to dynamically include calculated original price (oldPrice)
      const formattedProducts = products.map((product) => {
        const discountPercentage = product.discount || 0;
        // Formula: originalPrice = currentPrice / (1 - discount/100)
        const calculatedOldPrice =
          discountPercentage > 0
            ? Number(
                (product.price / (1 - discountPercentage / 100)).toFixed(2),
              )
            : null;

        return {
          ...product,
          oldPrice: calculatedOldPrice,
        };
      });

      const totalPages = Math.ceil(total / limitNum);

      res.status(200).json({
        success: true,
        data: formattedProducts,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching discounted products:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
  getProductById = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      throw new ApiError(400, "Invalid product ID");
    }

    const product = await prisma.sellerProductInfo.findUnique({
      where: {
        id,
      },

      include: {
        tiers: true,
        seller: true,
        images: true,
      },
    });

    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  };

  updateProduct = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);

    // Validate product ID
    if (!Number.isInteger(id)) {
      throw new ApiError(400, "Invalid product ID");
    }

    const {
      name,
      description,
      category,
      price,
      stock,
      discount,
      unit,
      minimumQty,
      supplierCountry,
    } = req.body;

    // Validate category only when provided
    if (
      category &&
      !BUSINESS_CATEGORIES.includes(category as BusinessCategory)
    ) {
      throw new ApiError(
        400,
        `Invalid category. Allowed categories: ${BUSINESS_CATEGORIES.join(", ")}`,
      );
    }

    // Check product exists
    const existingProduct = await prisma.sellerProductInfo.findUnique({
      where: {
        id,
      },
    });

    if (!existingProduct) {
      throw new ApiError(404, "Product not found");
    }

    // Build update data conditionally
    const updateData = {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(price !== undefined && { price: Number(price) }),
      ...(stock !== undefined && { stock: Number(stock) }),
      ...(discount !== undefined && {
        discount: Number(discount),
      }),
      ...(unit !== undefined && { unit }),
      ...(minimumQty !== undefined && {
        minimumQty: Number(minimumQty),
      }),
      ...(supplierCountry !== undefined && {
        supplierCountry,
      }),
    };

    const product = await prisma.sellerProductInfo.update({
      where: {
        id,
      },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  };

  deleteProduct = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      throw new ApiError(400, "Invalid product ID");
    }

    const existingProduct = await prisma.sellerProductInfo.findUnique({
      where: {
        id,
      },
    });

    if (!existingProduct) {
      throw new ApiError(404, "Product not found");
    }

    await prisma.sellerProductInfo.delete({
      where: {
        id,
      },
    });

    res.status(200).json({
      success: true,
      message: "Product deleted",
    });
  };

  addProductTier = async (req: Request, res: Response): Promise<void> => {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId)) {
      throw new ApiError(400, "Invalid product ID");
    }

    const { minQuantity, maxQuantity, price } = req.body;

    if (minQuantity == null || price == null) {
      throw new ApiError(400, "minQuantity and price are required");
    }

    const product = await prisma.sellerProductInfo.findUnique({
      where: {
        id: productId,
      },
    });

    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    const tier = await prisma.sellerProductItems.create({
      data: {
        productId,
        minQuantity: Number(minQuantity),
        maxQuantity: maxQuantity != null ? Number(maxQuantity) : null,
        price: Number(price),
      },
    });

    res.status(201).json({
      success: true,
      data: tier,
    });
  };
}
