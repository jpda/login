"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// base login info - common across providers
class LoginInfo {
    constructor(allowNoSubscriptionsLogin, enableAzPsSession, subscriptionId, environment, resourceManagerEndpointUrl, tenantId) {
        this.AllowNoSubscriptionsLogin = allowNoSubscriptionsLogin; // ? allowNoSubscriptionsLogin : core.getInput('allow-no-subscriptions').toLowerCase() === "true";
        this.EnableAzPsSession = enableAzPsSession; // ? enableAzPsSession : core.getInput('enable-AzPSSession').toLowerCase() === "true";
        this.SubscriptionId = subscriptionId; // ? subscriptionId : core.getInput('subscriptionId').toLowerCase();
        this.Environment = environment; // ? environment : core.getInput('environment').toLowerCase();
        this.ResourceManagerEndpointUrl = resourceManagerEndpointUrl; // ? resourceManagerEndpointUrl : core.getInput('resourceManagerEndpointUrl').toLowerCase();
        this.TenantId = tenantId; // ? tenantId : core.getInput('tenantId').toLowerCase();
    }
}
exports.LoginInfo = LoginInfo;
