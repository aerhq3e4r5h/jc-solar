/**
 * fetch that Next.js never caches on its own. Database reads must be fresh;
 * where caching is wanted, a "use cache" function around the query does it,
 * with tags the admin can expire. (Next otherwise kept raw responses in
 * .next/cache/fetch-cache, which survives between builds and deploys.)
 */
export const noStoreFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: "no-store" });
