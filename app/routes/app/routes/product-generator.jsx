import { json } from "@shopify/remix-oxygen";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);

    // Random product logic
    const color = ["Red", "Orange", "Yellow", "Green"][
      Math.floor(Math.random() * 4)
    ];
    const response = await admin.graphql(
      `#graphql
        mutation populateProduct($product: ProductCreateInput!) {
          productCreate(product: $product) {
            product {
              id
              title
              handle
              status
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
      {
        variables: {
          product: {
            title: `${color} Snowboard #${Math.floor(Math.random() * 100)}`,
          },
        },
      }
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
      {
        variables: {
          productId: product.id,
          variants: [{ id: variantId, price: "100.00" }],
        },
      }
    );

    return json({ title: product.title });
  } catch (err) {
    console.error(err);
    return json({ error: "Failed to create product" }, { status: 500 });
  }
};
