import * as core from '@actions/core';
import { ManagedIdentityLoginInfo } from './ManagedIdentityLoginInfo';
import { ServicePrincipalLoginInfo } from './ServicePrincipalLoginInfo';
import { executeAzCliCommand } from "../main";

export interface ILoginProvider {
    Login(): Promise<boolean>;
}

export abstract class AzLoginProvider implements ILoginProvider {
    protected azureSupportedCloudName = new Set([
        "azureusgovernment",
        "azurechinacloud",
        "azuregermancloud",
        "azurecloud",
        "azurestack"
    ]);

    protected AzLoginCommandArgs: any[] = [];
    protected _info: ServicePrincipalLoginInfo | ManagedIdentityLoginInfo;
    protected AzurePsSession: IAzurePowerShellSession;

    constructor(info: ServicePrincipalLoginInfo | ManagedIdentityLoginInfo) {
        this._info = info;

        console.log(`AzLoginProvider created with config: ${JSON.stringify(info)}`);

        if (this._info.EnableAzPsSession) {
            this.ConfigureAzPsSession();
        }
        this.EnsureConfiguration();
    }

    protected abstract ConfigureAzPsSession(): void;

    protected abstract EnsureRequiredConfiguration(): void;

    protected async SetEnvironment() {
        if (this._info.Environment == "azurestack") {
            if (!this._info.ResourceManagerEndpointUrl) {
                throw new Error("resourceManagerEndpointUrl is a required parameter when environment is defined.");
            }

            console.log(`Unregistering cloud: "${this._info.Environment}" first if it exists`);
            try {
                await executeAzCliCommand(`cloud set -n AzureCloud`, true);
                await executeAzCliCommand(`cloud unregister -n "${this._info.Environment}"`, false);
            }
            catch (error) {
                console.log(`Ignore cloud not registered error: "${error}"`);
            }

            console.log(`Registering cloud: "${this._info.Environment}" with ARM endpoint: "${this._info.ResourceManagerEndpointUrl}"`);
            try {
                let baseUri = this._info.ResourceManagerEndpointUrl;
                if (baseUri.endsWith('/')) {
                    baseUri = baseUri.substring(0, baseUri.length - 1); // need to remove trailing / from resourceManagerEndpointUrl to correctly derive suffixes below
                }
                let suffixKeyvault = ".vault" + baseUri.substring(baseUri.indexOf('.')); // keyvault suffix starts with .
                let suffixStorage = baseUri.substring(baseUri.indexOf('.') + 1); // storage suffix starts without .
                let profileVersion = "2019-03-01-hybrid";
                await executeAzCliCommand(`cloud register -n "${this._info.Environment}" --endpoint-resource-manager "${this._info.ResourceManagerEndpointUrl}" --suffix-keyvault-dns "${suffixKeyvault}" --suffix-storage-endpoint "${suffixStorage}" --profile "${profileVersion}"`, false);
            }
            catch (error) {
                core.error(`Error while trying to register cloud "${this._info.Environment}": "${error}"`);
            }

            console.log(`Done registering cloud: "${this._info.Environment}"`);
        }

        await executeAzCliCommand(`cloud set -n "${this._info.Environment}"`, false);
        console.log(`Done setting cloud: "${this._info.Environment}"`);
    }

    private EnsureConfiguration() {
        console.log(`AzLoginProvider: ensuring configuration...`);
        if (!this._info.SubscriptionId && !this._info.AllowNoSubscriptionsLogin) {
            throw new Error("Not all values are present. Ensure subscriptionId is supplied.");
        }

        if (!this.azureSupportedCloudName.has(this._info.Environment)) {
            throw new Error("Unsupported value for environment is passed. The list of supported values for environment are ‘azureusgovernment', ‘azurechinacloud’, ‘azuregermancloud’, ‘azurecloud’ or ’azurestack’");
        }
        this.EnsureRequiredConfiguration();
    }

    public async Login(): Promise<boolean> {
        let output: string = "";
        const execOptions: any = {
            listeners: {
                stdout: (data: Buffer) => {
                    output += data.toString();
                }
            }
        };

        console.log(`Setting environment to ${this._info.Environment}`);
        await this.SetEnvironment();
        console.log(`Environment set to ${this._info.Environment}`);

        if (this._info.AllowNoSubscriptionsLogin) {
            console.log(`AllowNoSubscription is true`);
            this.AzLoginCommandArgs.push("--allow-no-subscriptions");
        }

        console.log(`logging in...`);
        try {
            await executeAzCliCommand(`login`, false, execOptions, this.AzLoginCommandArgs);
            console.log(output);
        } catch (ex) {
            console.error(ex);
            console.log(output);
            return false;
        }

        console.log(output);
        console.log(`az login succeeded.`);

        if (this._info.SubscriptionId) {
            var subscriptionArgs = [
                "--subscription", this._info.SubscriptionId
            ];
            console.log(`setting subscription context: ${this._info.SubscriptionId}`)
            await executeAzCliCommand(`account set`, false, execOptions, subscriptionArgs);
            console.log(`subscription set to ${this._info.SubscriptionId}`);
        }

        if (this._info.EnableAzPsSession) {
            console.log(`enabling AzPs session...`);
            var psSession = this.AzurePsSession;
            await psSession.initialize();
            await psSession.login();
            console.log(`enabled AzPsSession.`);
        }
        return true;
    }
}
