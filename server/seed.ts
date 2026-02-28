import { drizzle } from "drizzle-orm/node-postgres";
import { categories, products } from "@shared/schema";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL!);

export async function seedDatabase() {
  const existingCats = await db.select().from(categories);
  if (existingCats.length > 0) return;

  const [gpus, cpus, mobos, memory, storage_cat, cooling, cases, peripherals] = await db.insert(categories).values([
    { name: "Graphics Cards", slug: "graphics-cards", description: "Unleash max frames", icon: "Monitor" },
    { name: "Processors", slug: "processors", description: "The brain of your rig", icon: "Cpu" },
    { name: "Motherboards", slug: "motherboards", description: "The backbone of your build", icon: "CircuitBoard" },
    { name: "Memory", slug: "memory", description: "Multitask seamlessly", icon: "Zap" },
    { name: "Storage", slug: "storage", description: "Lightning fast loads", icon: "HardDrive" },
    { name: "Cooling", slug: "cooling", description: "Keep temps sub-zero", icon: "Fan" },
    { name: "Cases", slug: "cases", description: "House your dream build", icon: "Box" },
    { name: "Peripherals", slug: "peripherals", description: "Complete your setup", icon: "Keyboard" },
  ]).returning();

  await db.insert(products).values([
    { name: "NVIDIA RTX 4090 Founders Edition", slug: "rtx-4090-fe", price: 1599.99, categoryId: gpus.id, badge: "New Release", vendor: "NVIDIA", description: "The ultimate GPU for creators and gamers. 24GB GDDR6X, DLSS 3.0, ray tracing." },
    { name: "AMD Radeon RX 7900 XTX", slug: "rx-7900-xtx", price: 899.99, categoryId: gpus.id, badge: "Best Seller", vendor: "AMD", description: "Top-tier AMD GPU. 24GB GDDR6, RDNA 3, hardware ray tracing." },
    { name: "NVIDIA RTX 4070 Ti Super", slug: "rtx-4070-ti-super", price: 749.99, categoryId: gpus.id, vendor: "NVIDIA", description: "Excellent 1440p performance with DLSS 3 support." },
    { name: "AMD Ryzen 9 7950X3D", slug: "ryzen-9-7950x3d", price: 699.99, categoryId: cpus.id, badge: "Best Seller", vendor: "AMD", description: "16 cores, 32 threads. 3D V-Cache for ultimate gaming performance." },
    { name: "Intel Core i9-14900K", slug: "i9-14900k", price: 549.99, categoryId: cpus.id, vendor: "Intel", description: "24 cores (8P+16E), up to 6.0GHz. Unlocked for overclocking." },
    { name: "AMD Ryzen 7 7800X3D", slug: "ryzen-7-7800x3d", price: 399.99, categoryId: cpus.id, badge: "Hot", vendor: "AMD", description: "8 cores, 16 threads with 3D V-Cache. The best gaming CPU." },
    { name: "ASUS ROG Strix X670E-E Gaming", slug: "rog-strix-x670e", price: 449.99, categoryId: mobos.id, badge: "New Release", vendor: "ASUS", description: "AM5 socket, DDR5, PCIe 5.0, WiFi 6E, 2.5G LAN." },
    { name: "MSI MAG B650 Tomahawk WiFi", slug: "msi-b650-tomahawk", price: 229.99, categoryId: mobos.id, vendor: "MSI", description: "AM5 socket, DDR5, PCIe 4.0, WiFi 6E. Great value." },
    { name: "Corsair Dominator Platinum 64GB DDR5", slug: "corsair-dominator-64gb", price: 249.99, categoryId: memory.id, vendor: "Corsair", description: "DDR5-5600, CL36, dual-channel kit with iCUE RGB." },
    { name: "G.Skill Trident Z5 RGB 32GB DDR5", slug: "gskill-trident-z5-32gb", price: 129.99, categoryId: memory.id, badge: "Sale", vendor: "G.Skill", description: "DDR5-6000, CL30, optimised for AMD EXPO.", compareAtPrice: 159.99 },
    { name: "Samsung 990 Pro 2TB NVMe", slug: "samsung-990-pro-2tb", price: 159.99, categoryId: storage_cat.id, vendor: "Samsung", description: "PCIe Gen4, 7450/6900 MB/s read/write. TLC NAND." },
    { name: "WD Black SN850X 1TB", slug: "wd-sn850x-1tb", price: 89.99, categoryId: storage_cat.id, badge: "Sale", vendor: "Western Digital", description: "PCIe Gen4 NVMe. Up to 7300MB/s read speeds.", compareAtPrice: 109.99 },
    { name: "NZXT Kraken X73 RGB 360mm AIO", slug: "nzxt-kraken-x73", price: 199.99, categoryId: cooling.id, vendor: "NZXT", description: "360mm radiator, RGB infinity mirror pump, CAM software." },
    { name: "Noctua NH-D15 chromax.black", slug: "noctua-nh-d15", price: 99.99, categoryId: cooling.id, badge: "Best Seller", vendor: "Noctua", description: "Dual tower air cooler, 2x NF-A15 fans, all-black design." },
    { name: "Lian Li O11 Dynamic EVO", slug: "lian-li-o11-evo", price: 169.99, categoryId: cases.id, badge: "Best Seller", vendor: "Lian Li", description: "Dual-chamber mid-tower ATX, tempered glass, modular design." },
    { name: "Corsair 5000D Airflow", slug: "corsair-5000d-airflow", price: 149.99, categoryId: cases.id, vendor: "Corsair", description: "High-airflow mid-tower ATX, tempered glass, up to 360mm radiator." },
    { name: "Logitech G Pro X Superlight 2", slug: "logitech-gpx-superlight-2", price: 139.99, categoryId: peripherals.id, badge: "New Release", vendor: "Logitech", description: "60g wireless gaming mouse, HERO 2 sensor, 95hrs battery." },
    { name: "Corsair K100 RGB Mechanical Keyboard", slug: "corsair-k100-rgb", price: 219.99, categoryId: peripherals.id, vendor: "Corsair", description: "OPX optical switches, PBT keycaps, iCUE control wheel." },
    { name: "SteelSeries Arctis Nova Pro Wireless", slug: "steelseries-arctis-nova-pro", price: 349.99, categoryId: peripherals.id, vendor: "SteelSeries", description: "Active noise cancelling, dual wireless, hot-swappable battery." },
    { name: "LG 27GP850-B 27\" 1440p 165Hz", slug: "lg-27gp850b", price: 329.99, categoryId: peripherals.id, badge: "Sale", vendor: "LG", description: "Nano IPS, 1ms GTG, HDR400, G-Sync & FreeSync Premium.", compareAtPrice: 399.99 },
  ]);

  console.log("Database seeded with categories and products.");
}
