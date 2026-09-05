/// <reference types="@cloudflare/workers-types/2023-07-01" />
/// <reference types="vite/client" />

declare module "*.css?url" {
  const content: string;
  export default content;
}
