import type { Product } from "./types";

// Sample Products Data (placeholder until API wiring)
export const products: Product[] = [
  {
    id: "1",
    name: "Men's leather shoe",
    price: 520,
    rating: 5,
    reviews: 201,
    image: "🥾",
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
    image: "👟",
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
    image: "👟",
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
    image: "🥾",
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
    image: "👨‍💼",
    seller: "Joshua Kabu",
    category: "service",
    isService: true,
    priceType: "hourly",
  },
];

