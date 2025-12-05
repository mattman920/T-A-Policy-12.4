// netlify/edge-functions/fireproof.ts

// 1. Import the default handler from the Fireproof Netlify package.
// We give it a clear local name, like 'fireproofHandler'.
import fireproofHandler from '@fireproof/netlify';

// 2. Export that imported function as the explicit default export.
// This satisfies Netlify's requirement that the default export must be a resolved function.
export default fireproofHandler;
