export interface User {
    id: number;
    company_id: number | null;
    name: string;
    email: string;
    phone: string | null;
    photo: string | null;
    role: string[];
    status: number;
}

export interface Company {
    id: number;
    user_id: number;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    website: string | null;
    logo: string | null;
    status: number;
    status_text?: string;
    sort_description: string | null;
    description: string | null;
    is_default: number;
    shop_products_count?: number;
    preview_products?: Array<{
        id: number;
        name: string;
        price: number;
        thumbnail: string;
    }>;
    created_at: string;
    updated_at: string;
}

export interface Product {
    id: number;
    name: string;
    price: number;
    stock: number;
    cost: number | null;
    discount: number | null;
    sku: string;
    barcode: string | null;
    description?: string | null;
    status: number;
    status_text: string;
    photo: string | null;
    company_id: number | null;
    is_assigned?: boolean;
    shop_product_id?: number | null;
    created_at: string;
    updated_at: string;
}

export interface ShopProduct {
    id: number;
    product_id: number;
    company_id: number;
    name: string;
    base_name?: string;
    shop_name_override?: string | null;
    sku: string;
    base_price: number;
    shop_price: number | null;
    custom_price?: number | null;
    effective_price: number;
    stock?: number;
    thumbnail: string;
    status: number;
    status_text: string;
    description: string | null;
    shop_description?: string | null;
    product?: Product;
    created_at: string;
    updated_at: string;
}

export interface CustomerShopProduct {
    id: number;
    product_id: number;
    company_id?: number;
    company_name?: string;
    name: string;
    price: number;
    original_price?: number;
    has_discount?: boolean;
    stock?: number;
    thumbnail: string;
    description: string | null;
    sku: string;
}

export interface PaginationMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}

export interface PaginatedData<T> {
    data: T[];
    meta: PaginationMeta;
    links: {
        first: string;
        last: string;
        prev: string | null;
        next: string | null;
    };
}

export interface ApiResponse<T = unknown> {
    status: boolean;
    status_message: string;
    data: T;
    status_code: number;
}
