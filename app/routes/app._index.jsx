import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }) => {
  const { authenticate } = await import("../shopify.server"); // server-only dynamic import
  const { admin } = await authenticate.admin(request);

  // Fetch existing products
  const response = await admin.graphql(
    `#graphql
      {
        products(first: 10) {
          edges {
            node {
              id
              title
              variants(first: 10) {
                edges {
                  node {
                    id
                    price
                  }
                }
              }
            }
          }
        }
      }`
  );

  const data = await response.json();

  return { products: data.data.products.edges.map(edge => edge.node) };
};

export const action = async ({ request }) => {
  const { authenticate } = await import("../shopify.server"); // server-only dynamic import
  const { admin } = await authenticate.admin(request);

  const color = ["Red", "Orange", "Yellow", "Green"][Math.floor(Math.random() * 4)];
  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
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

  const responseJson = await response.json();
  const product = responseJson.data.productCreate.product;
  const variantId = product.variants.edges[0].node.id;

  const variantResponse = await admin.graphql(
    `#graphql
      mutation shopifyReactRouterTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          productVariants {
            id
            price
            barcode
            createdAt
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

  const variantResponseJson = await variantResponse.json();

  return {
    product: responseJson.data.productCreate.product,
    variant: variantResponseJson.data.productVariantsBulkUpdate.productVariants,
  };
};

export default function Index({ loaderData }) {
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [message, setMessage] = useState("Hello from Shopify App!");
  const [products, setProducts] = useState(loaderData?.products || []);
  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";
  const productId = fetcher.data?.product?.id.replace("gid://shopify/Product/", "");

  useEffect(() => {
    if (productId) {
      shopify.toast.show("Product created");
    }
  }, [productId, shopify]);

  // Add created product to local list
  useEffect(() => {
    if (fetcher.data?.product) {
      setProducts((prev) => [...prev, fetcher.data.product]);
    }
  }, [fetcher.data]);

  const generateProduct = () => fetcher.submit({}, { method: "POST" });

  return (
    <s-page>
      <ui-title-bar title="React Router app template">
        <button variant="primary" onClick={generateProduct}>
          Generate a product
        </button>
      </ui-title-bar>

      <s-section heading="TESTING YAY🎉">
        <s-paragraph>
          This embedded app template uses{" "}
          <s-link href="https://shopify.dev/docs/apps/tools/app-bridge" target="_blank">
            App Bridge
          </s-link>{" "}
          interface examples like an{" "}
          <s-link href="/app/additional">additional page in the app nav</s-link>
          , as well as an{" "}
          <s-link href="https://shopify.dev/docs/api/admin-graphql" target="_blank">
            Admin GraphQL
          </s-link>{" "}
          mutation demo.
        </s-paragraph>

        <s-paragraph>{message}</s-paragraph>
        <s-button onClick={() => setMessage("You clicked me!")}>
          Click me
        </s-button>
      </s-section>

      <s-section heading="Get started with products">
        <s-stack direction="inline" gap="base">
          <s-button onClick={generateProduct} {...(isLoading ? { loading: true } : {})}>
            Generate a product
          </s-button>
          {fetcher.data?.product && (
            <s-button
              href={`shopify:admin/products/${productId}`}
              target="_blank"
              variant="tertiary"
            >
              View product
            </s-button>
          )}
        </s-stack>
      </s-section>

      <s-section heading="Products">
        {products.map((p) => (
          <s-paragraph key={p.id}>
            {p.title} - ${p.variants[0]?.price}
          </s-paragraph>
        ))}
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
