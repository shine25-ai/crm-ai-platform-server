const { AsyncLocalStorage } = require('async_hooks');

const tenantStorage = new AsyncLocalStorage();

const runWithTenant = (context, callback) =>
    tenantStorage.run(context, callback);

const getTenantContext = () => tenantStorage.getStore() || {};

module.exports = {
    runWithTenant,
    getTenantContext
};
