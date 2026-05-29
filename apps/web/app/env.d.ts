/// <reference types="@cloudflare/workers-types" />

// Vite ?url import
declare module "*.css?url" {
  const url: string;
  export default url;
}
