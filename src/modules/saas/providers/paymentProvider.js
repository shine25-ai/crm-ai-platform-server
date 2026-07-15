const AppError = require('../../../shared/utils/appError');

class PaymentProvider {
    constructor(providerName) {
        this.providerName = providerName;
    }

    async createCheckout() {
        throw new AppError(
            `${this.providerName} checkout is not configured`,
            501
        );
    }

    async verifyPayment() {
        throw new AppError(
            `${this.providerName} payment verification is not configured`,
            501
        );
    }

    async handleWebhook() {
        throw new AppError(
            `${this.providerName} webhook is not configured`,
            501
        );
    }

    async syncSubscription() {
        throw new AppError(
            `${this.providerName} subscription sync is not configured`,
            501
        );
    }

    async cancelSubscription() {
        throw new AppError(
            `${this.providerName} subscription cancellation is not configured`,
            501
        );
    }

    async updatePlan() {
        throw new AppError(
            `${this.providerName} plan update is not configured`,
            501
        );
    }
}

module.exports = PaymentProvider;
