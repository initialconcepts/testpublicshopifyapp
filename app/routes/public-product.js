// app/routes/public-product.js
import { authenticate } from "../shopify.server";

// Handle POST requests (action)
export const action = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);

    // Generate random product
    const colors = ["Red", "Orange", "Yellow", "Green"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const title = `${color} Snowboard #${Math.floor(Math.random() * 100)}`;

    const response = await admin.graphql(
      `#graphql
        mutation populateProduct($product: ProductCreateInput!) {
          productCreate(product: $product) {
            product {
              id
              title
              variants(first: 1) {
                edges {
                  node {
                    id
                    price
                  }
                }
              }
            }
          }
        }`,
      { variables: { product: { title } } }
    );

    const product = (await response.json()).data.productCreate.product;

    // Optional: set price of first variant
    const variantId = product.variants.edges[0].node.id;
    await admin.graphql(
      `#graphql
        mutation updateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants {
              id
              price
            }
          }
        }`,
      { variables: { productId: product.id, variants: [{ id: variantId, price: "100.00" }] } }
    );

    return new Response(JSON.stringify({ title: product.title }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (err) {
    console.error("Error generating product:", err);
    return new Response(JSON.stringify({ error: "Failed to create product" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }
};

// Handle OPTIONS preflight requests
export const loader = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }
  return new Response("Not Found", { status: 404 });
};
