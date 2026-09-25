import HeroBanner from "@/app/_components/layout/HeroBanner";
import Storefront from "@/app/_components/shop/Storefront";
import { getProducts } from "@/app/_lib/catalog";

// Rendered per request so filters in a shared link (?gender=women&sale=1)
// arrive in the first HTML. After that, filtering is instant on the client.
export default async function HomePage({ searchParams }) {
  await searchParams;
  return (
    <>
      <HeroBanner />
      <Storefront products={getProducts()} />
    </>
  );
}
