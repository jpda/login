"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AzLoginProvider_1 = require("./AzLoginProvider");
class ServicePrincipalAzLoginProvider extends AzLoginProvider_1.AzLoginProvider {
    constructor(info) {
        super(info);
        this.EnsureRequiredValues();
        this.AzLoginCommandArgs.push([
            "--service-principal",
            "-u", this._info.ServicePrincipalId,
            "-p", this._info.ServicePrincipalKey,
            "--tenant", this._info.TenantId
        ]);
    }
    EnsureRequiredValues() {
        if (!this._info.ServicePrincipalId || !this._info.ServicePrincipalKey || !this._info.TenantId) {
            throw new Error("Not all values are present in the creds object. Ensure clientId, clientSecret and tenantId are supplied.");
        }
        if (!this._info.ServicePrincipalId || !this._info.ServicePrincipalKey || !this._info.TenantId || !this._info.SubscriptionId) {
            throw new Error("Not all values are present in the creds object. Ensure clientId, clientSecret, tenantId and subscriptionId are supplied.");
        }
    }
}
exports.ServicePrincipalAzLoginProvider = ServicePrincipalAzLoginProvider;
