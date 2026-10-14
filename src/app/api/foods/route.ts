import { Food } from "@/lib/vyra-data";
type Product = {
  code?: string;
  product_name?: string;
  brands?: string;
  image_front_small_url?: string;
  nutriments?: Record<string, number>;
};
function food(product: Product): Food | null {
  const n = product.nutriments;
  if (
    !product.product_name ||
    !n ||
    ![
      "energy-kcal_100g",
      "proteins_100g",
      "carbohydrates_100g",
      "fat_100g",
    ].every((key) => Number.isFinite(n[key]) && n[key] >= 0)
  )
    return null;
  return {
    id: product.code || product.product_name,
    name: product.product_name,
    brand: product.brands,
    kcal: n["energy-kcal_100g"],
    protein: n.proteins_100g,
    carbs: n.carbohydrates_100g,
    fat: n.fat_100g,
    image: product.image_front_small_url?.startsWith(
      "https://images.openfoodfacts.org/",
    )
      ? product.image_front_small_url
      : undefined,
    source: "Open Food Facts",
  };
}
export async function GET(request: Request) {
  const url = new URL(request.url),
    barcode = url.searchParams.get("barcode"),
    q = url.searchParams.get("q")?.trim();
  if (
    barcode ? !/^\d{8,14}$/.test(barcode) : !q || q.length < 2 || q.length > 80
  )
    return Response.json(
      {
        error:
          "Bitte eine gültige Produktnummer oder mindestens 2 Suchzeichen eingeben.",
      },
      { status: 400 },
    );
  const fields = "code,product_name,brands,nutriments,image_front_small_url";
  const endpoint = barcode
    ? `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${fields}`
    : `https://world.openfoodfacts.org/cgi/search.pl?${new URLSearchParams({ search_terms: q!, search_simple: "1", action: "process", json: "1", page_size: "15", fields })}`;
  try {
    const result = await fetch(endpoint, {
      headers: { "User-Agent": "VYRA/2.0 (https://viera-matheis.vercel.app)" },
      signal: AbortSignal.timeout(12000),
      next: { revalidate: 3600 },
    });
    if (result.status === 404) return Response.json({ foods: [] });
    if (!result.ok)
      return Response.json(
        {
          error:
            "Die Produktdatenbank ist gerade nicht erreichbar. Bitte später erneut versuchen.",
        },
        { status: 502 },
      );
    const json = await result.json();
    const products: Product[] = barcode
      ? json.product
        ? [json.product]
        : []
      : json.products || [];
    return Response.json({ foods: products.map(food).filter(Boolean) });
  } catch {
    return Response.json(
      {
        error:
          "Die Suche hat zu lange gedauert. Eigene Lebensmittel kannst du weiterhin eintragen.",
      },
      { status: 504 },
    );
  }
}
