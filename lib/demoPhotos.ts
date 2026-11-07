// Fallback photos for when the camera or Wi-Fi fails during the demo.
// Swap in real meal photos: drop files in public/demo/ and update this list.
export const DEMO_PHOTOS: { src: string; label: string }[] = [
  { src: "/demo/burger-lettuce.svg", label: "Burger w/ lettuce" },
  { src: "/demo/burger-no-lettuce.svg", label: "Burger, no lettuce" },
  { src: "/demo/burger-fries.svg", label: "Burger + fries" },
  { src: "/demo/chicken-rice-broccoli.svg", label: "Chicken, rice, broccoli" },
  { src: "/demo/fries-soda.svg", label: "Fries + soda" },
];
