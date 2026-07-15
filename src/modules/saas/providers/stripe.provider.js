const crypto = require('crypto');
const PaymentProvider = require('./paymentProvider');
const AppError = require('../../../shared/utils/appError');

class StripeProvider extends PaymentProvider {
    constructor() {
        super('stripe');
    }

    verifyWebhookSignature(rawBody, signature) {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) {
            throw new AppError('Stripe webhook secret is not configured', 503);
        }
        if (!signature) throw new AppError('Stripe signature missing', 401);

        const expected = crypto
            .createHmac('sha256', secret)
            .update(rawBody)
            .digest('hex');

        if (!String(signature).includes(expected)) {
            throw new AppError('Invalid Stripe webhook signature', 401);
        }
    }

    async createCheckout({ company, plan }) {
        return {
            provider: 'stripe',
            mode: 'subscription',
            checkoutUrl: '',
            message:
                'Stripe SDK checkout creation placeholder. Configure Stripe secret key and price IDs to enable live checkout.',
            companyId: company?._id,
            planId: plan?._id,
            providerPriceId: plan?.providerPriceIds?.stripe || ''
        };
    }
}

module.exports = new StripeProvider();
