import { ServicePrincipalLoginInfo } from './ServicePrincipalLoginInfo';
import { AzLoginProvider } from './AzLoginProvider';

export class ServicePrincipalAzLoginProvider extends AzLoginProvider {
    protected _info: ServicePrincipalLoginInfo;

    constructor(info: ServicePrincipalLoginInfo) {
        super(info);
        this.EnsureRequiredValues();
        this.AzLoginCommandArgs.push([
            "--service-principal",
            "-u", this._info.ServicePrincipalId,
            "-p", this._info.ServicePrincipalKey,
            "--tenant", this._info.TenantId
        ]);
    }

    private EnsureRequiredValues() {
        if (!this._info.ServicePrincipalId || !this._info.ServicePrincipalKey || !this._info.TenantId) {
            throw new Error("Not all values are present in the creds object. Ensure clientId, clientSecret and tenantId are supplied.");
        }

        if (!this._info.ServicePrincipalId || !this._info.ServicePrincipalKey || !this._info.TenantId || !this._info.SubscriptionId) {
            throw new Error("Not all values are present in the creds object. Ensure clientId, clientSecret, tenantId and subscriptionId are supplied.");
        }
    }
}
