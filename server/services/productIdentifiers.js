import crypto from "node:crypto";

// Crockford Base32 avoids characters that are easy to confuse when reading IDs.
const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export const isShortIdentifier = (value) => typeof value === "string" && /^[0-9A-HJKMNP-TV-Z]{8}$/.test(value);

export const createShortIdentifier = () => Array.from(crypto.randomBytes(8), (byte) => alphabet[byte & 31]).join("");

export const createUniqueShortIdentifier = async (model, field) => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
        const candidate = createShortIdentifier();
        if (!await model.exists({[field]:candidate})) return candidate;
    }
    throw new Error(`Unable to generate a unique ${field}`);
};

export const isIdentifierDuplicate = (error) => error?.code === 11000
    && ["productId", "variantId", "sku"].some((field) => error.keyPattern?.[field] || error.keyValue?.[field]);
