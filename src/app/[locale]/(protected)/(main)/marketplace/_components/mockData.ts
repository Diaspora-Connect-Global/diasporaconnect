import type { Product } from "./types";

// Sample Products Data (placeholder until API wiring) – image URLs for cover display
export const products: Product[] = [
  {
    id: "1",
    name: "Men's leather shoe",
    price: 520,
    rating: 5,
    reviews: 201,
    image: "https://images.unsplash.com/photo-1614252369475-531eba835b1d?w=590&q=80",
    seller: "Joshua Kabu",
    colors: ["Brown", "Black"],
    category: "shoes",
    isService: false,
  },
  {
    id: "2",
    name: "Women's running sneakers",
    price: 280,
    rating: 4.5,
    reviews: 150,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=590&q=80",
    seller: "Sarah Jane",
    category: "shoes",
    isService: false,
  },
  {
    id: "3",
    name: "Kids' canvas shoes",
    price: 150,
    rating: 4.8,
    reviews: 98,
    image: "https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?w=590&q=80",
    seller: "Fashion Now",
    category: "shoes",
    isService: false,
  },
  {
    id: "4",
    name: "Unisex hiking boots",
    price: 450,
    rating: 4.2,
    reviews: 215,
    image: "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=590&q=80",
    seller: "Joshua Kabu",
    category: "shoes",
    isService: false,
  },
];

export const services: Product[] = [
  {
    id: "s1",
    name: "Virtual assistance",
    price: 150,
    rating: 5,
    reviews: 201,
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=590&q=80",
    seller: "Joshua Kabu",
    category: "service",
    isService: true,
    priceType: "hourly",
  },
];

