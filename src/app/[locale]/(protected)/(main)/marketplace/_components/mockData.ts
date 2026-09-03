import type { Product } from "./types";

// Placeholder image base – picsum.photos returns stable images per seed (no 404s)
const img = (seed: string, w = 590, h = 400) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

// Sample Products Data (placeholder until API wiring) – image URLs for cover display
export const products: Product[] = [
  {
    id: "1",
    name: "Men's leather shoe",
    price: 520,
    rating: 5,
    reviews: 201,
    image: img("shoe1"),
    images: [img("shoe1"), img("shoe1b"), img("shoe1c"), img("shoe1d")],
    seller: "Joshua Kabu",
    sellerAvatar: img("seller-joshua", 80, 80),
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
    image: img("shoe2"),
    images: [img("shoe2"), img("shoe2b"), img("shoe2c"), img("shoe2d")],
    seller: "Sarah Jane",
    sellerAvatar: img("seller-sarah", 80, 80),
    category: "shoes",
    isService: false,
  },
  {
    id: "3",
    name: "Kids' canvas shoes",
    price: 150,
    rating: 4.8,
    reviews: 98,
    image: img("shoe3"),
    images: [img("shoe3"), img("shoe3b"), img("shoe3c"), img("shoe3d")],
    seller: "Fashion Now",
    sellerAvatar: img("seller-fashion", 80, 80),
    category: "shoes",
    isService: false,
  },
  {
    id: "4",
    name: "Unisex hiking boots",
    price: 450,
    rating: 4.2,
    reviews: 215,
    image: img("shoe4"),
    images: [img("shoe4"), img("shoe4b"), img("shoe4c"), img("shoe4d")],
    seller: "Joshua Kabu",
    sellerAvatar: img("seller-joshua", 80, 80),
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
    image: img("service1"),
    images: [img("service1"), img("service1b"), img("service1c"), img("service1d")],
    seller: "Joshua Kabu",
    sellerAvatar: img("seller-joshua", 80, 80),
    category: "service",
    isService: true,
    priceType: "hourly",
  },
  {
    id: "s2",
    name: "Logo design",
    price: 200,
    rating: 4.9,
    reviews: 84,
    image: img("service2"),
    images: [img("service2"), img("service2b"), img("service2c"), img("service2d")],
    seller: "Sarah Jane",
    sellerAvatar: img("seller-sarah", 80, 80),
    category: "service",
    isService: true,
    priceType: "fixed",
    serviceExtras: [
      { id: "source", name: "Include source file", description: "You will get original file you can use to edit.", price: 125 },
      { id: "revisions", name: "2 extra revisions", description: "Two additional revision rounds after delivery.", price: 50 },
      { id: "rush", name: "Rush delivery (48h)", description: "Get your logo delivered within 48 hours.", price: 80 },
    ],
  },
];

