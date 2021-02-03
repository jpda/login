import { ServicePrincipalLoginInfo } from './ServicePrincipalLoginInfo';
import { AzLoginProvider } from './AzLoginProvider';
import { ServicePrincipalLogin } from '../PowerShell/ServicePrincipalLogin';

export class ServicePrincipalAzLoginProvider extends AzLoginProvider {
    protected _info: ServicePrincipalLoginInfo;

    constructor(info: ServicePrincipalLoginInfo) {
        super(info);
        this.AzLoginCommandArgs.concat([
            "--service-principal",
            "--username", this._info.ServicePrincipalId,
            "--password", this._info.ServicePrincipalKey,
            "--tenant", this._info.TenantId
        ]);
    }

    protected EnsureRequiredConfiguration() {
        console.log(`ServicePrincipalAzLoginProvider: ensuring configuration...`);
        if (!this._info.ServicePrincipalId || !this._info.ServicePrincipalKey || !this._info.TenantId) {
            throw new Error("Not all values are present in the creds object. Ensure clientId, clientSecret and tenantId are supplied.");
        }

        if (!this._info.ServicePrincipalId || !this._info.ServicePrincipalKey || !this._info.TenantId || !this._info.SubscriptionId) {
            throw new Error("Not all values are present in the creds object. Ensure clientId, clientSecret, tenantId and subscriptionId are supplied.");
        }
    }

    protected ConfigureAzPsSession() {
        console.log(`Using service principal ${this._info.ServicePrincipalId} for powershell`);
        this.AzurePsSession = new ServicePrincipalLogin(
            this._info.ServicePrincipalId,
            this._info.ServicePrincipalKey,
            this._info.TenantId,
            this._info.SubscriptionId,
            this._info.AllowNoSubscriptionsLogin,
            this._info.Environment,
            this._info.ResourceManagerEndpointUrl);
    }
}
