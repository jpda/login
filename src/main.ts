import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import { FormatType, SecretParser } from 'actions-secret-parser';
import { ServicePrincipalLogin } from './PowerShell/ServicePrincipalLogin';
import { ManagedIdentityLogin } from "./PowerShell/ManagedIdentityLogin";

var azPath: string;
var prefix = !!process.env.AZURE_HTTP_USER_AGENT ? `${process.env.AZURE_HTTP_USER_AGENT}` : "";
var azPSHostEnv = !!process.env.AZUREPS_HOST_ENVIRONMENT ? `${process.env.AZUREPS_HOST_ENVIRONMENT}` : "";

async function main() {
    try {
        // Set user agent variable
        var isAzCLISuccess = false;
        let usrAgentRepo = `${process.env.GITHUB_REPOSITORY}`;
        let actionName = 'AzureLogin';
        let userAgentString = (!!prefix ? `${prefix}+` : '') + `GITHUBACTIONS/${actionName}@v1_${usrAgentRepo}`;
        let azurePSHostEnv = (!!azPSHostEnv ? `${azPSHostEnv}+` : '') + `GITHUBACTIONS/${actionName}@v1_${usrAgentRepo}`;
        core.exportVariable('AZURE_HTTP_USER_AGENT', userAgentString);
        core.exportVariable('AZUREPS_HOST_ENVIRONMENT', azurePSHostEnv);

        azPath = await io.which("az", true);

        let output: string = "";
        const execOptions: any = {
            listeners: {
                stdout: (data: Buffer) => {
                    output += data.toString();
                }
            }
        };

        await executeAzCliCommand("--version", true, execOptions);
        core.debug(`az cli version used:\n${output}`);

        let creds = core.getInput('creds');
        const useManagedIdentity = core.getInput('enable-managed-identity').toLowerCase() === "true";

        let loginProvider: ILoginProvider;

        console.log(`Preparing to login. Managed identity: ${useManagedIdentity}`);

        if (!useManagedIdentity && !creds) {
            throw new Error("Managed identity is not enabled. Service principal authentication requires a creds object, which was not supplied.");
        }
        if (useManagedIdentity) {
            let loginInfo = new ManagedIdentityLoginInfo();
            loginProvider = new ManagedIdentityAzLoginProvider(loginInfo);
        }
        else {
            let loginInfo = new ServicePrincipalLoginInfo();
            loginProvider = new ServicePrincipalAzLoginProvider(loginInfo);
        }
        isAzCLISuccess = await loginProvider.Login();
        console.log("Login successful.");
    }
    catch (error) {
        if (!isAzCLISuccess) {
            core.error("Az CLI Login failed. Please check the credentials. For more information refer https://aka.ms/create-secrets-for-GitHub-workflows");
        }
        else {
            core.error(`Azure PowerShell Login failed. Please check the credentials. For more information refer https://aka.ms/create-secrets-for-GitHub-workflows"`);
        }
        core.setFailed(error);
    }
    finally {
        // Reset AZURE_HTTP_USER_AGENT
        core.exportVariable('AZURE_HTTP_USER_AGENT', prefix);
        core.exportVariable('AZUREPS_HOST_ENVIRONMENT', azPSHostEnv);
    }
}

interface ILoginProvider {
    AzLoginCommandArgs: any[];
    Login(): Promise<boolean>;
    SetPsSession();
}

class LoginInfo {
    public AllowNoSubscriptionsLogin: boolean;
    public EnableAzPsSession: boolean;
    public SubscriptionId: string;
    public Environment: string;
    public ResourceManagerEndpointUrl: string;
    public TenantId: string;

    public constructor(allowNoSubscriptionsLogin?: boolean, enableAzPsSession?: boolean, subscriptionId?: string, environment?: string, resourceManagerEndpointUrl?: string, tenantId?: string) {
        this.AllowNoSubscriptionsLogin = allowNoSubscriptionsLogin ? allowNoSubscriptionsLogin : core.getInput('allow-no-subscriptions').toLowerCase() === "true";
        this.EnableAzPsSession = enableAzPsSession ? enableAzPsSession : core.getInput('enable-AzPSSession').toLowerCase() === "true";
        this.SubscriptionId = subscriptionId ? subscriptionId : core.getInput('enable-AzPSSession').toLowerCase();
        this.Environment = environment ? environment : core.getInput('environment').toLowerCase();
        this.ResourceManagerEndpointUrl = resourceManagerEndpointUrl ? resourceManagerEndpointUrl : core.getInput('environment').toLowerCase();
        this.TenantId = tenantId ? tenantId : core.getInput('tenantId').toLowerCase();
    }
}

class ManagedIdentityLoginInfo extends LoginInfo {
    public UseUserManagedIdentity: boolean;
    public UserManagedIdentityResourceId: string;

    constructor(useUserManagedIdentity?: boolean, userManagedIdenityResourceId?: string) {
        super(
            core.getInput('allow-no-subscriptions').toLowerCase() === "true",
            core.getInput('enable-AzPSSession').toLowerCase() === "true",
            //todo : check this name
            core.getInput('managed-identity-subscriptionId').toLowerCase(),
            core.getInput('environment').toLowerCase(),
            core.getInput('managementEndpointUrl').toLowerCase(),
            core.getInput('tenantId').toLowerCase()
        )
        this.UseUserManagedIdentity =
            useUserManagedIdentity ? useUserManagedIdentity : core.getInput('enable-managed-identity').toLowerCase() === "true";
        this.UserManagedIdentityResourceId =
            userManagedIdenityResourceId ? userManagedIdenityResourceId : core.getInput('user-managed-identity-resource-id');
    }
}

class ServicePrincipalLoginInfo extends LoginInfo {
    public ServicePrincipalId: string;
    public ServicePrincipalKey: string;

    public constructor(incomingCreds?: string, servicePrincipalId?: string, servicePrincipalKey?: string) {
        let creds = incomingCreds ? incomingCreds : core.getInput('creds');
        let secrets = new SecretParser(creds, FormatType.JSON);

        super(
            core.getInput('allow-no-subscriptions').toLowerCase() === "true",
            core.getInput('enable-AzPSSession').toLowerCase() === "true",
            secrets.getSecret('$.subscriptionId').toLowerCase(),
            core.getInput('environment').toLowerCase(),
            secrets.getSecret('$.managementEndpointUrl').toLowerCase(),
            secrets.getSecret('$.tenantId').toLowerCase()
        )

        this.ServicePrincipalId = servicePrincipalId ? servicePrincipalId : secrets.getSecret("$.clientId", false);
        this.ServicePrincipalKey = servicePrincipalKey ? servicePrincipalKey : secrets.getSecret("$.clientSecret", true);
    }
}

class ManagedIdentityAzLoginProvider implements ILoginProvider {
    private azureSupportedCloudName = new Set([
        "azureusgovernment",
        "azurechinacloud",
        "azuregermancloud",
        "azurecloud",
        "azurestack"]);

    AzLoginCommandArgs: any[] = [];
    private _info: ManagedIdentityLoginInfo;

    constructor(info: ManagedIdentityLoginInfo) {
        this._info = info;

        // root msi login
        this.AzLoginCommandArgs.push("--identity");

        this.Init();
        this.SetEnvironment();
        this.ConfigureLogin();
        this.SetPsSession();
    }

    private Init() {
        // no subscription supplied. Not a hard error, but could cause unexpected behavior.
        if (!this._info.SubscriptionId) {
            console.warn("When using Managed Identity, subscriptionId is not required. However, consider setting subscriptionId explicitly, especially if the managed identity has permission in multiple subscriptions.")
        }

        if (!this._info.SubscriptionId && !this._info.AllowNoSubscriptionsLogin) {
            throw new Error("Ensure subscriptionId is supplied or set allowNoSubscriptionsLogin to true.");
        }

        if (!this.azureSupportedCloudName.has(this._info.Environment)) {
            throw new Error("Unsupported value for environment is passed. The list of supported values for environment are ‘azureusgovernment', ‘azurechinacloud’, ‘azuregermancloud’, ‘azurecloud’ or ’azurestack’");
        }

        if (this._info.AllowNoSubscriptionsLogin) {
            this.AzLoginCommandArgs.push("--allow-no-subscriptions")
        }
    }

    private async SetEnvironment() {
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

            console.log(`Done registering cloud: "${this._info.Environment}"`)
        }

        await executeAzCliCommand(`cloud set -n "${this._info.Environment}"`, false);
        console.log(`Done setting cloud: "${this._info.Environment}"`);
    }

    private ConfigureLogin() {
        if (this._info.UseUserManagedIdentity && this._info.UserManagedIdentityResourceId) {
            console.log(`using user assigned managed identity: ${this._info.UserManagedIdentityResourceId}`);
            this.AzLoginCommandArgs.push("-u", this._info.UserManagedIdentityResourceId);
        }
    }

    public async Login(): Promise<boolean> {
        console.log(`attempting login with ${this.AzLoginCommandArgs.join()}`);
        await executeAzCliCommand(`login`, true, {}, this.AzLoginCommandArgs);

        if (this._info.SubscriptionId) {
            console.log(`setting subscription to ${this._info.SubscriptionId}`);
            await executeAzCliCommand(`account set --subscription "${this._info.SubscriptionId}"`, true);
        }

        if (this._info.EnableAzPsSession) {
            console.log(`enabling powershell session`);
            // Attempting Az PS login
            var psSession = this.SetPsSession();
            await psSession.initialize();
            await psSession.login();
        }

        return true;
    }

    public SetPsSession(userManagedIdentityResourceId?: string): IAzurePowerShellSession {
        console.log(`Running Azure PS Login`);
        var azPwshLogin: IAzurePowerShellSession;

        if (userManagedIdentityResourceId) {
            console.log(`Using user managed identity for powershell login`);
            azPwshLogin = new ManagedIdentityLogin(userManagedIdentityResourceId);
        } else {
            azPwshLogin = new ManagedIdentityLogin();
        }
        return azPwshLogin;
    }
}

class ServicePrincipalAzLoginProvider implements ILoginProvider {
    private azureSupportedCloudName = new Set([
        "azureusgovernment",
        "azurechinacloud",
        "azuregermancloud",
        "azurecloud",
        "azurestack"]);

    AzLoginCommandArgs: any[] = [];
    private _info: ServicePrincipalLoginInfo;

    constructor(info: ServicePrincipalLoginInfo) {
        this._info = info;
        this.Init();
        this.SetEnvironment();

        this.AzLoginCommandArgs.push([
            "--service-principal",
            "-u", this._info.ServicePrincipalId,
            "-p", this._info.ServicePrincipalKey,
            "--tenant", this._info.TenantId
        ]);
    }

    public async Login(): Promise<boolean> {
        await executeAzCliCommand(`login`, true, {}, this.AzLoginCommandArgs);

        if (this._info.SubscriptionId) {
            var subscriptionArgs = [
                "--subscription"
            ];
        }

        await executeAzCliCommand(`account set`, true, {}, subscriptionArgs);

        if (this._info.EnableAzPsSession) {
            // Attempting Az PS login
            var psSession = this.SetPsSession();
            await psSession.initialize();
            await psSession.login();
        }

        return true;
    }

    public SetPsSession(): IAzurePowerShellSession {
        console.log(`Running Azure PS Login`);
        return new ServicePrincipalLogin(
            this._info.ServicePrincipalId,
            this._info.ServicePrincipalKey,
            this._info.TenantId,
            this._info.SubscriptionId,
            this._info.AllowNoSubscriptionsLogin,
            this._info.Environment,
            this._info.ResourceManagerEndpointUrl);
    }

    private Init() {
        if (!this._info.ServicePrincipalId || !this._info.ServicePrincipalKey || !this._info.TenantId) {
            throw new Error("Not all values are present in the creds object. Ensure clientId, clientSecret and tenantId are supplied.");
        }

        if (!this._info.SubscriptionId && !this._info.AllowNoSubscriptionsLogin) {
            throw new Error("Not all values are present in the creds object. Ensure subscriptionId is supplied.");
        }

        if (!this.azureSupportedCloudName.has(this._info.Environment)) {
            throw new Error("Unsupported value for environment is passed.The list of supported values for environment are ‘azureusgovernment', ‘azurechinacloud’, ‘azuregermancloud’, ‘azurecloud’ or ’azurestack’");
        }

        if (!this._info.ServicePrincipalId || !this._info.ServicePrincipalKey || !this._info.TenantId || !this._info.SubscriptionId) {
            throw new Error("Not all values are present in the creds object. Ensure clientId, clientSecret, tenantId and subscriptionId are supplied.");
        }

        if (this._info.AllowNoSubscriptionsLogin) {
            this.AzLoginCommandArgs.push("--allow-no-subscriptions")
        }
    }

    private async SetEnvironment() {
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

            console.log(`Done registering cloud: "${this._info.Environment}"`)
        }

        await executeAzCliCommand(`cloud set -n "${this._info.Environment}"`, false);
        console.log(`Done setting cloud: "${this._info.Environment}"`);
    }
}

async function executeAzCliCommand(
    command: string,
    silent?: boolean,
    execOptions: any = {},
    args: any = []) {

    execOptions.silent = !!silent;
    try {
        console.log(`executing login: "${azPath}" ${command}`);
        await exec.exec(`"${azPath}" ${command}`, args, execOptions);
    }
    catch (error) {
        throw new Error(error);
    }
}

main();