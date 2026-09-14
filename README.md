# 🛒 B2B E-commerce Backend API

A robust, high-performance B2B E-commerce backend platform built with **Node.js**, **Express**, **TypeScript**, **Prisma ORM (v7)**, and **Supabase (PostgreSQL)**.

---

## 🚀 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL (Hosted on Supabase)
- **ORM:** Prisma v7
- **Package Manager:** pnpm
- **Deployment:** Vercel

---

## 🛠️ Key Features

- **B2B Tiered Pricing:** Dynamic bulk product pricing tiers based on order quantity.
- **Product & Seller Management:** Complete seller storefronts, product variations, catalog search, and categories.
- **Database Pooling:** Optimized connection pooling with Supabase Transaction Pooler for serverless deployments.
- **Type-Safe Database Access:** Schema-first design using Prisma ORM.

---

## 📁 Project Structure

```text
├── generated/           # Auto-generated Prisma Client
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── migrations/      # Database migration history
├── src/
│   ├── config/          # Configurations (Prisma, DB)
│   ├── controllers/     # API request handlers
│   ├── middleware/      # Authentication & Error middlewares
│   ├── routes/          # API Route definitions
│   └── index.ts         # Application entry point
├── prisma.config.ts     # Prisma v7 Configuration
├── vercel.json          # Vercel deployment configuration
└── package.json
```
