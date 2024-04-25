import { Bench, hrtimeNow } from "tinybench";
import mdiff from "microdiff";
import { diff } from "./packages/obj-diff/dist/index";
import { detailedDiff } from "deep-object-diff";
import { diff as justDiff } from "just-diff";
import deepDiff from "deep-diff";

const obj1 = {
  id: 8,
  title: "Microsoft Surface Laptop 4",
  description: "Style and speed. Stand out on ...",
  price: 1499,
  discountPercentage: 10.23,
  rating: 4.43,
  stock: { inStock: true, count: 68 },
  brand: "Microsoft Surface",
  category: "laptops",
  resources: {
    images: {
      thumbnail: "https://cdn.dummyjson.com/product-images/8/thumbnail.jpg",
      items: [
        "https://cdn.dummyjson.com/product-images/8/1.jpg",
        "https://cdn.dummyjson.com/product-images/8/2.jpg",
        "https://cdn.dummyjson.com/product-images/8/3.jpg",
        "https://cdn.dummyjson.com/product-images/8/4.jpg",
        "https://cdn.dummyjson.com/product-images/8/thumbnail.jpg",
      ],
    },
  },
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-02"),
};

const obj2 = {
  id: 8,
  title: "Microsoft Surface Laptop 4",
  description: "Style and speed. Stand out on.",
  price: 1599,
  discountPercentage: 10.23,
  rating: 4.43,
  stock: { inStock: true, count: 18 },
  brand: "Microsoft Surface",
  category: "laptops",
  resources: {
    images: {
      thumbnail: "https://cdn.dummyjson.com/product-images/8/thumbnail.jpg",
      items: [
        "https://cdn.dummyjson.com/product-images/8/1.jpg",
        "https://cdn.dummyjson.com/product-images/8/2.jpg",
        "https://cdn.dummyjson.com/product-images/8/3.jpg",
        "https://cdn.dummyjson.com/product-images/8/4.jpg",
      ],
    },
  },
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-03"),
};

const bench = new Bench({ time: 100, now: hrtimeNow });

bench
  .add("diff", () => {
    diff(obj1, obj2);
  })
  .add("microdiff", () => {
    mdiff(obj1, obj2);
  })
  .add("deep-object-diff", () => {
    detailedDiff(obj1, obj2);
  })
  .add("just-diff", () => {
    justDiff(obj1, obj2);
  })
  .add("deep-diff", () => {
    deepDiff(obj1, obj2);
  });

await bench.warmup();
await bench.run();

console.table(bench.table());
