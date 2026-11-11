# Multi-Shop E-Commerce Management System

A multi-store e-commerce management platform built with Laravel 12 and a React 18 SPA frontend. The system provides multi-tenant merchant operations with a shared master product catalog, store-specific inventory listings, price and thumbnail overrides, role-based access control, and an active customer storefront.

---

## System Overview

The system is designed around the **Shared Product Catalog Architecture**:

- **Master Product Catalog**: A centralized product repository. Products can be created by either Platform Admins or Shop Owners. Any product published to the shared catalog becomes available for other shop owners to list in their stores.
- **Shop Product Listings**: Merchant-specific product associations. When a shop owner adds a product from the shared catalog to their shop, they can set or modify retail prices, descriptions, and thumbnails for their shop while maintaining catalog linkage.
- **Customer Storefront**: Customers can browse verified shops and view products assigned to each store. Products that are not assigned to any shop are strictly hidden from customers.
- **Role-Based Access Control**:
  - `Admin`: Full management over shops, catalog products, orders, and user accounts. Can change user roles and reset passwords to `12345678`.
  - `Owner`: Shop management portal to browse the shared catalog, add items to their shop with custom pricing, and author new products for the shared catalog.
  - `Customer`: Storefront browsing, store-filtered product exploration, shopping cart, and checkout.

---

## Tech Stack & Requirements

- **PHP**: 8.2 or higher (compatible with PHP 8.3, 8.4, 8.5)
- **Framework**: Laravel 12
- **Database**: MySQL 8.0+ or MariaDB 10.4+
- **Frontend**: React 18 SPA, Vite, Tailwind CSS, TanStack React Query
- **Authentication**: Laravel Sanctum (Session and token authentication)
- **Role & Permission Management**: Spatie Laravel Permission

---

## Step-by-Step Setup Guide

Follow these steps to run the project from a fresh clone:

### 1. Clone Repository
```bash
git clone https://github.com/Prianka-Mimi/e-commerce-management.git
cd e-commerce-management
```

### 2. Install PHP Dependencies
```bash
composer install
```

### 3. Configure Environment
```bash
cp .env.example .env
```
Open `.env` and verify your database settings:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ecommerce_management
DB_USERNAME=root
DB_PASSWORD=
```

### 4. Generate Application Key
```bash
php artisan key:generate
```

### 5. Run Database Migrations & Seeders
```bash
php artisan migrate
```
```bash
php artisan db:seed
```
OR
```bash
php artisan migrate:fresh --seed
```
*Creates the database tables, configures roles (`Admin`, `Owner`, `Customer`), and populates demo stores and catalog products.*

### 6. Create Storage Symlink
```bash
php artisan storage:link
```

### 7. Install Frontend Dependencies & Build
```bash
npm install
npm run build
```

### 8. Start Application Server
```bash
php artisan serve
```
The application will be running at: **`http://localhost:8000`**  
*(If using Laravel Xampp, Laragon, Herd or Valet, access via `http://e-commerce-management.test`).*

---

## Demo Credentials

All seeded accounts use the standard password: `12345678`

| Portal | Email | Password | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Platform Admin** | `admin@admin.com` | `12345678` | `Admin` | Full management (Shops, Catalog, Users) |
| **Shop Owner** | `owner@shop.com` | `12345678` | `Owner` | Owner of TechVerse Electronics |
| **Customer** | Direct Storefront | — | `Customer` | Guest browsing, cart & checkout |

---

## Key Features

1. **Shared Catalog Workflow**:
   - Admins and Shop Owners can add products to the shared catalog.
   - Shop Owners can browse the shared catalog and list items into their shop with price and thumbnail overrides.
2. **Customer Visibility Rules**:
   - Customers only see products assigned to active shops with store-specific prices and thumbnails.
   - Unassigned products remain hidden from the storefront.
3. **Admin Controls**:
   - KPI dashboard overview (Total Shops, Total Sellers, Total Buyers, Total Products, Total Catalog).
   - Recent orders preview with full order inspection.
   - Shop CRUD and Product CRUD management.
   - User account role assignments and one-click password reset to default (`12345678`).
4. **Pagination Standard**:
   - Standard pagination controls are conditionally displayed strictly when a module has more than 20 items.

---

## Author

[Fatema Akther Prianka](https://github.com/Prianka-Mimi)

## Contact

<div align="left">
  <a href="https://webdeveloperprianka.netlify.app/" target="_blank"> 
    <img src="https://img.shields.io/static/v1?message=Portfolio&logo=website&label=&color=E4405F&logoColor=white&labelColor=&style=for-the-badge" height="35" alt="portfolio logo"  />
  </a>
  <a href="https://www.linkedin.com/in/prianka-mimi/" target="_blank">
    <img src="https://img.shields.io/static/v1?message=LinkedIn&logo=linkedin&label=&color=0077B5&logoColor=white&labelColor=&style=for-the-badge" height="35" alt="linkedin logo"  />
  </a>
  <a href="https://stackoverflow.com/users/23182049/prianka-mimi" target="_blank">
    <img src="https://img.shields.io/static/v1?message=Stackoverflow&logo=stackoverflow&label=&color=FE7A16&logoColor=white&labelColor=&style=for-the-badge" height="35" alt="stackoverflow logo"  />
  </a>
  <a href="https://leetcode.com/u/prianka-mimi/" target="_blank">
    <img src="https://img.shields.io/badge/LeetCode-FFA116?style=for-the-badge&logo=leetcode&logoColor=white" height="35" alt="LeetCode logo" />
  </a>
  <a href="mailto:priankamimi0204@gmail.com" target="_blank">
    <img src="https://img.shields.io/static/v1?message=Gmail&logo=gmail&label=&color=D14836&logoColor=white&labelColor=&style=for-the-badge" height="35" alt="gmail logo"  />
  </a>
  <a href="https://discord.com/channels/@me" target="_blank">
    <img src="https://img.shields.io/static/v1?message=Discord&logo=discord&label=&color=7289DA&logoColor=white&labelColor=&style=for-the-badge" height="35" alt="discord logo"  />
  </a>
  <a href="https://www.facebook.com/dev.prianka.mimi" target="_blank">
    <img src="https://img.shields.io/static/v1?message=Facebook&logo=facebook&label=&color=1877F2&logoColor=white&labelColor=&style=for-the-badge" height="35" alt="facebook logo"  />
  </a>
</div>