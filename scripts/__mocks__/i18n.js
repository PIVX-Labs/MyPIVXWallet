export const ALERTS = new Proxy(
    {},
    {
        get(_target, prop) {
            // Return the proxy itself if trying to access ALERTS
            if (prop === 'ALERTS') return translation;
            // Return key in tests so they aren't affected by translation changes
            return prop;
        },
    }
);

export const translation = ALERTS;

export const tr = (message, vars) => {
    return (
        message +
        ' ' +
        vars
            .map((v) => {
                let varStr = '';
                for (const key in v) {
                    varStr += key + ' ' + v[key];
                }
                return varStr;
            })
            .join(' ')
    );
};
