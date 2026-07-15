const mongoose = require('mongoose');
const { getTenantContext } = require('../utils/tenantContext');

const scopedQueryOperations = [
    'count',
    'countDocuments',
    'deleteMany',
    'deleteOne',
    'distinct',
    'find',
    'findOne',
    'findOneAndDelete',
    'findOneAndRemove',
    'findOneAndReplace',
    'findOneAndUpdate',
    'replaceOne',
    'updateMany',
    'updateOne'
];

const platformModelNames = new Set([
    'Company',
    'Plan',
    'Subscription',
    'CompanyInvoice',
    'PaymentTransaction',
    'BillingEvent',
    'UsageCounter'
]);

const shouldScopeSchema = (schema, model) =>
    schema.options.tenantScoped !== false &&
    !platformModelNames.has(model.modelName) &&
    schema.path('tenantId');

const appendTenantFilter = function appendTenantFilter() {
    const context = getTenantContext();
    if (!context.tenantId || context.isPlatformSuperAdmin) return;
    if (!shouldScopeSchema(this.model.schema, this.model)) return;

    const currentQuery = this.getQuery();
    if (currentQuery.tenantId || currentQuery.$or || currentQuery.$and) {
        this.setQuery({ $and: [currentQuery, { tenantId: context.tenantId }] });
        return;
    }
    this.where({ tenantId: context.tenantId });
};

const tenantScopePlugin = (schema) => {
    if (schema.options.tenantScoped === false) return;
    if (schema.options._id === false) return;

    if (!schema.path('tenantId')) {
        schema.add({
            tenantId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Company',
                default: null,
                index: true
            }
        });
    }

    if (!schema.path('companyId')) {
        schema.add({
            companyId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Company',
                default: null,
                index: true
            }
        });
    }

    scopedQueryOperations.forEach((operation) => {
        schema.pre(operation, appendTenantFilter);
    });

    schema.pre('aggregate', function scopeAggregate() {
        const context = getTenantContext();
        if (!context.tenantId || context.isPlatformSuperAdmin) return;
        if (!shouldScopeSchema(this.model().schema, this.model())) return;

        const pipeline = this.pipeline();
        const firstStage = pipeline[0] || {};
        const mustInsertAfterGeoNear = Boolean(firstStage.$geoNear);
        const tenantMatch = { $match: { tenantId: context.tenantId } };
        pipeline.splice(mustInsertAfterGeoNear ? 1 : 0, 0, tenantMatch);
    });

    schema.pre('save', function scopeSave() {
        const context = getTenantContext();
        if (
            context.tenantId &&
            !context.isPlatformSuperAdmin &&
            schema.path('tenantId') &&
            !this.tenantId
        ) {
            this.tenantId = context.tenantId;
            this.companyId = this.companyId || context.tenantId;
        }
    });
};

module.exports = tenantScopePlugin;
