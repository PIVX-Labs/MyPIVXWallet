export const translation = new Proxy(
    {},
    {
        get(_target, prop) {
            // Return key in tests so they aren't affected by translation changes
            return prop;
        },
    }
);
