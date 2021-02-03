"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AzLoginProvider_1 = require("./AzLoginProvider");
const ServicePrincipalLogin_1 = require("../PowerShell/ServicePrincipalLogin");
class ServicePrincipalAzLoginProvider extends AzLoginProvider_1.AzLoginProvider {
    constructor(info) {
        super(info);
        this.AzLoginCommandArgs.push([
            "--service-principal",
            "-u", this._info.ServicePrincipalId,
            "-p", this._info.ServicePrincipalKey,
            "--tenant", this._info.TenantId
        ]);
    }
    EnsureRequiredConfiguration() {
        if (!this._info.ServicePrincipalId || !this._info.ServicePrincipalKey || !this._info.TenantId) {
            throw new Error("Not all values are present in the creds object. Ensure clientId, clientSecret and tenantId are supplied.");
        }
        if (!this._info.ServicePrincipalId || !this._info.ServicePrincipalKey || !this._info.TenantId || !this._info.SubscriptionId) {
            throw new Error("Not all values are present in the creds object. Ensure clientId, clientSecret, tenantId and subscriptionId are supplied.");
        }
    }
    ConfigureAzPsSession() {
        console.log(`Using service principal ${this._info.ServicePrincipalId} for powershell`);
        this.AzurePsSession = new ServicePrincipalLogin_1.ServicePrincipalLogin(this._info.ServicePrincipalId, this._info.ServicePrincipalKey, this._info.TenantId, this._info.SubscriptionId, this._info.AllowNoSubscriptionsLogin, this._info.Environment, this._info.ResourceManagerEndpointUrl);
    }
}
exports.ServicePrincipalAzLoginProvider = ServicePrincipalAzLoginProvider;
