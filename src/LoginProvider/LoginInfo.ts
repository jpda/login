// base login info - common across providers
export class LoginInfo {
    public AllowNoSubscriptionsLogin: boolean;
    public EnableAzPsSession: boolean;
    public SubscriptionId: string;
    public Environment: string;
    public ResourceManagerEndpointUrl: string;
    public TenantId: string;

    public constructor(allowNoSubscriptionsLogin: boolean, enableAzPsSession: boolean, subscriptionId: string, environment: string, resourceManagerEndpointUrl: string, tenantId: string) {
        this.AllowNoSubscriptionsLogin = allowNoSubscriptionsLogin; // ? allowNoSubscriptionsLogin : core.getInput('allow-no-subscriptions').toLowerCase() === "true";
        this.EnableAzPsSession = enableAzPsSession; // ? enableAzPsSession : core.getInput('enable-AzPSSession').toLowerCase() === "true";
        this.SubscriptionId = subscriptionId; // ? subscriptionId : core.getInput('subscriptionId').toLowerCase();
        this.Environment = environment; // ? environment : core.getInput('environment').toLowerCase();
        this.ResourceManagerEndpointUrl = resourceManagerEndpointUrl; // ? resourceManagerEndpointUrl : core.getInput('resourceManagerEndpointUrl').toLowerCase();
        this.TenantId = tenantId; // ? tenantId : core.getInput('tenantId').toLowerCase();
    }
}
