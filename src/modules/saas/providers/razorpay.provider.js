const crypto = require('crypto');
const axios = require('axios');
const PaymentProvider = require('./paymentProvider');
const AppError = require('../../../shared/utils/appError');

class RazorpayProvider extends PaymentProvider {
    constructor() {
        super('razorpay');
    }

    verifyWebhookSignature(rawBody, signature) {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) {
            throw new AppError(
                'Razorpay webhook secret is not configured',
                503
            );
        }
        if (!signature) throw new AppError('Razorpay signature missing', 401);

        const expected = crypto
            .createHmac('sha256', secret)
            .update(rawBody)
            .digest('hex');

        if (expected !== signature) {
            throw new AppError('Invalid Razorpay webhook signature', 401);
        }
    }

    verifyPaymentSignature({ orderId, paymentId, signature }) {
        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!secret) {
            throw new AppError('Razorpay key secret is not configured', 503);
        }
        if (!orderId || !paymentId || !signature) {
            throw new AppError(
                'Razorpay payment signature details missing',
                400
            );
        }

        const expected = crypto
            .createHmac('sha256', secret)
            .update(`${orderId}|${paymentId}`)
            .digest('hex');

        if (expected !== signature) {
            throw new AppError('Invalid Razorpay payment signature', 401);
        }
    }

    async createCheckout({ company, plan, receipt, notes = {} }) {
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keyId || !keySecret) {
            throw new AppError('Razorpay keys are not configured', 503);
        }

        const amount = Math.round(Number(plan.price || 0) * 100);
        if (amount <= 0) {
            throw new AppError(
                'Razorpay order amount must be greater than zero',
                400
            );
        }

        const response = await axios.post(
            'https://api.razorpay.com/v1/orders',
            {
                amount,
                currency: plan.currency || 'INR',
                receipt,
                notes: {
                    companyId: String(company?._id || ''),
                    planId: String(plan?._id || ''),
                    ...notes
                }
            },
            {
                auth: {
                    username: keyId,
                    password: keySecret
                }
            }
        );

        return {
            provider: 'razorpay',
            mode: 'order',
            keyId,
            orderId: response.data.id,
            amount: response.data.amount,
            currency: response.data.currency,
            receipt: response.data.receipt,
            status: response.data.status,
            companyId: company?._id,
            planId: plan?._id
        };
    }
}

module.exports = new RazorpayProvider();
