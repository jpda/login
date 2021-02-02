"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const io = __importStar(require("@actions/io"));
const actions_secret_parser_1 = require("actions-secret-parser");
const ServicePrincipalLogin_1 = require("./PowerShell/ServicePrincipalLogin");
const ManagedIdentityLogin_1 = require("./PowerShell/ManagedIdentityLogin");
var azPath;
var prefix = !!process.env.AZURE_HTTP_USER_AGENT ? `${process.env.AZURE_HTTP_USER_AGENT}` : "";
var azPSHostEnv = !!process.env.AZUREPS_HOST_ENVIRONMENT ? `${process.env.AZUREPS_HOST_ENVIRONMENT}` : "";
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Set user agent variable
            var isAzCLISuccess = false;
            let usrAgentRepo = `${process.env.GITHUB_REPOSITORY}`;
            let actionName = 'AzureLogin';
            let userAgentString = (!!prefix ? `${prefix}+` : '') + `GITHUBACTIONS/${actionName}@v1_${usrAgentRepo}`;
            let azurePSHostEnv = (!!azPSHostEnv ? `${azPSHostEnv}+` : '') + `GITHUBACTIONS/${actionName}@v1_${usrAgentRepo}`;
            core.exportVariable('AZURE_HTTP_USER_AGENT', userAgentString);
            core.exportVariable('AZUREPS_HOST_ENVIRONMENT', azurePSHostEnv);
            azPath = yield io.which("az", true);
            let output = "";
            const execOptions = {
                listeners: {
                    stdout: (data) => {
                        output += data.toString();
                    }
                }
            };
            yield executeAzCliCommand("--version", true, execOptions);
            core.debug(`az cli version used:\n${output}`);
            let creds = core.getInput('creds');
            const useManagedIdentity = core.getInput('enable-managed-identity').toLowerCase() === "true";
            let loginProvider;
            console.log(`Preparing to login. Managed identity: ${useManagedIdentity}`);
            if (!useManagedIdentity && !creds) {
                throw new Error("Managed identity is not enabled. Service principal authentication requires a creds object, which was not supplied.");
            }
            if (useManagedIdentity) {
                let loginInfo = new ManagedIdentityLoginInfo();
                loginProvider = yield ManagedIdentityAzLoginProvider.Build(loginInfo);
            }
            else {
                let loginInfo = new ServicePrincipalLoginInfo();
                loginProvider = new ServicePrincipalAzLoginProvider(loginInfo);
            }
            isAzCLISuccess = yield loginProvider.Login();
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
    });
}
class LoginInfo {
    constructor(allowNoSubscriptionsLogin, enableAzPsSession, subscriptionId, environment, resourceManagerEndpointUrl, tenantId) {
        this.AllowNoSubscriptionsLogin = allowNoSubscriptionsLogin ? allowNoSubscriptionsLogin : core.getInput('allow-no-subscriptions').toLowerCase() === "true";
        this.EnableAzPsSession = enableAzPsSession ? enableAzPsSession : core.getInput('enable-AzPSSession').toLowerCase() === "true";
        this.SubscriptionId = subscriptionId ? subscriptionId : core.getInput('enable-AzPSSession').toLowerCase();
        this.Environment = environment ? environment : core.getInput('environment').toLowerCase();
        this.ResourceManagerEndpointUrl = resourceManagerEndpointUrl ? resourceManagerEndpointUrl : core.getInput('environment').toLowerCase();
        this.TenantId = tenantId ? tenantId : core.getInput('tenantId').toLowerCase();
    }
}
class ManagedIdentityLoginInfo extends LoginInfo {
    constructor(useUserManagedIdentity, userManagedIdenityResourceId) {
        super(core.getInput('allow-no-subscriptions').toLowerCase() === "true", core.getInput('enable-AzPSSession').toLowerCase() === "true", 
        //todo : check this name
        core.getInput('managed-identity-subscriptionId').toLowerCase(), core.getInput('environment').toLowerCase(), core.getInput('managementEndpointUrl').toLowerCase(), core.getInput('tenantId').toLowerCase());
        this.UseUserManagedIdentity =
            useUserManagedIdentity ? useUserManagedIdentity : core.getInput('enable-managed-identity').toLowerCase() === "true";
        this.UserManagedIdentityResourceId =
            userManagedIdenityResourceId ? userManagedIdenityResourceId : core.getInput('user-managed-identity-resource-id');
    }
}
class ServicePrincipalLoginInfo extends LoginInfo {
    constructor(incomingCreds, servicePrincipalId, servicePrincipalKey) {
        let creds = incomingCreds ? incomingCreds : core.getInput('creds');
        let secrets = new actions_secret_parser_1.SecretParser(creds, actions_secret_parser_1.FormatType.JSON);
        super(core.getInput('allow-no-subscriptions').toLowerCase() === "true", core.getInput('enable-AzPSSession').toLowerCase() === "true", secrets.getSecret('$.subscriptionId').toLowerCase(), core.getInput('environment').toLowerCase(), secrets.getSecret('$.managementEndpointUrl').toLowerCase(), secrets.getSecret('$.tenantId').toLowerCase());
        this.ServicePrincipalId = servicePrincipalId ? servicePrincipalId : secrets.getSecret("$.clientId", false);
        this.ServicePrincipalKey = servicePrincipalKey ? servicePrincipalKey : secrets.getSecret("$.clientSecret", true);
    }
}
class ManagedIdentityAzLoginProvider {
    constructor(info) {
        this.azureSupportedCloudName = new Set([
            "azureusgovernment",
            "azurechinacloud",
            "azuregermancloud",
            "azurecloud",
            "azurestack"
        ]);
        this.AzLoginCommandArgs = [];
        this._info = info;
        // root msi login
        this.AzLoginCommandArgs.push("--identity");
    }
    static Build(info) {
        return __awaiter(this, void 0, void 0, function* () {
            var a = new ManagedIdentityAzLoginProvider(info);
            yield a.Initialize();
            return a;
        });
    }
    Initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            this.Init();
            yield this.SetEnvironment();
            this.ConfigureLogin();
            this.SetPsSession();
        });
    }
    Init() {
        // no subscription supplied. Not a hard error, but could cause unexpected behavior.
        if (!this._info.SubscriptionId) {
            console.warn("When using Managed Identity, subscriptionId is not required. However, consider setting subscriptionId explicitly, especially if the managed identity has permission in multiple subscriptions.");
        }
        if (!this._info.SubscriptionId && !this._info.AllowNoSubscriptionsLogin) {
            throw new Error("Ensure subscriptionId is supplied or set allowNoSubscriptionsLogin to true.");
        }
        if (!this.azureSupportedCloudName.has(this._info.Environment)) {
            throw new Error("Unsupported value for environment is passed. The list of supported values for environment are ‘azureusgovernment', ‘azurechinacloud’, ‘azuregermancloud’, ‘azurecloud’ or ’azurestack’");
        }
        if (this._info.AllowNoSubscriptionsLogin) {
            this.AzLoginCommandArgs.push("--allow-no-subscriptions");
        }
    }
    SetEnvironment() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._info.Environment == "azurestack") {
                if (!this._info.ResourceManagerEndpointUrl) {
                    throw new Error("resourceManagerEndpointUrl is a required parameter when environment is defined.");
                }
                console.log(`Unregistering cloud: "${this._info.Environment}" first if it exists`);
                try {
                    yield executeAzCliCommand(`cloud set -n AzureCloud`, true);
                    yield executeAzCliCommand(`cloud unregister -n "${this._info.Environment}"`, false);
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
                    yield executeAzCliCommand(`cloud register -n "${this._info.Environment}" --endpoint-resource-manager "${this._info.ResourceManagerEndpointUrl}" --suffix-keyvault-dns "${suffixKeyvault}" --suffix-storage-endpoint "${suffixStorage}" --profile "${profileVersion}"`, false);
                }
                catch (error) {
                    core.error(`Error while trying to register cloud "${this._info.Environment}": "${error}"`);
                }
                console.log(`Done registering cloud: "${this._info.Environment}"`);
            }
            yield executeAzCliCommand(`cloud set -n "${this._info.Environment}"`, false);
            console.log(`Done setting cloud: "${this._info.Environment}"`);
        });
    }
    ConfigureLogin() {
        if (this._info.UseUserManagedIdentity && this._info.UserManagedIdentityResourceId) {
            console.log(`using user assigned managed identity: ${this._info.UserManagedIdentityResourceId}`);
            this.AzLoginCommandArgs.push("-u", this._info.UserManagedIdentityResourceId);
        }
    }
    Login() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`attempting login with ${this.AzLoginCommandArgs.join()}`);
            yield executeAzCliCommand(`login`, true, {}, this.AzLoginCommandArgs);
            if (this._info.SubscriptionId) {
                console.log(`setting subscription to ${this._info.SubscriptionId}`);
                yield executeAzCliCommand(`account set --subscription "${this._info.SubscriptionId}"`, true);
            }
            if (this._info.EnableAzPsSession) {
                console.log(`enabling powershell session`);
                // Attempting Az PS login
                var psSession = this.SetPsSession();
                yield psSession.initialize();
                yield psSession.login();
            }
            return true;
        });
    }
    SetPsSession(userManagedIdentityResourceId) {
        console.log(`Running Azure PS Login`);
        var azPwshLogin;
        if (userManagedIdentityResourceId) {
            console.log(`Using user managed identity for powershell login`);
            azPwshLogin = new ManagedIdentityLogin_1.ManagedIdentityLogin(userManagedIdentityResourceId);
        }
        else {
            azPwshLogin = new ManagedIdentityLogin_1.ManagedIdentityLogin();
        }
        return azPwshLogin;
    }
}
class ServicePrincipalAzLoginProvider {
    constructor(info) {
        this.azureSupportedCloudName = new Set([
            "azureusgovernment",
            "azurechinacloud",
            "azuregermancloud",
            "azurecloud",
            "azurestack"
        ]);
        this.AzLoginCommandArgs = [];
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
    Login() {
        return __awaiter(this, void 0, void 0, function* () {
            yield executeAzCliCommand(`login`, true, {}, this.AzLoginCommandArgs);
            if (this._info.SubscriptionId) {
                var subscriptionArgs = [
                    "--subscription"
                ];
            }
            yield executeAzCliCommand(`account set`, true, {}, subscriptionArgs);
            if (this._info.EnableAzPsSession) {
                // Attempting Az PS login
                var psSession = this.SetPsSession();
                yield psSession.initialize();
                yield psSession.login();
            }
            return true;
        });
    }
    SetPsSession() {
        console.log(`Running Azure PS Login`);
        return new ServicePrincipalLogin_1.ServicePrincipalLogin(this._info.ServicePrincipalId, this._info.ServicePrincipalKey, this._info.TenantId, this._info.SubscriptionId, this._info.AllowNoSubscriptionsLogin, this._info.Environment, this._info.ResourceManagerEndpointUrl);
    }
    Init() {
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
            this.AzLoginCommandArgs.push("--allow-no-subscriptions");
        }
    }
    SetEnvironment() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._info.Environment == "azurestack") {
                if (!this._info.ResourceManagerEndpointUrl) {
                    throw new Error("resourceManagerEndpointUrl is a required parameter when environment is defined.");
                }
                console.log(`Unregistering cloud: "${this._info.Environment}" first if it exists`);
                try {
                    yield executeAzCliCommand(`cloud set -n AzureCloud`, true);
                    yield executeAzCliCommand(`cloud unregister -n "${this._info.Environment}"`, false);
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
                    yield executeAzCliCommand(`cloud register -n "${this._info.Environment}" --endpoint-resource-manager "${this._info.ResourceManagerEndpointUrl}" --suffix-keyvault-dns "${suffixKeyvault}" --suffix-storage-endpoint "${suffixStorage}" --profile "${profileVersion}"`, false);
                }
                catch (error) {
                    core.error(`Error while trying to register cloud "${this._info.Environment}": "${error}"`);
                }
                console.log(`Done registering cloud: "${this._info.Environment}"`);
            }
            yield executeAzCliCommand(`cloud set -n "${this._info.Environment}"`, false);
            console.log(`Done setting cloud: "${this._info.Environment}"`);
        });
    }
}
function executeAzCliCommand(command, silent, execOptions = {}, args = []) {
    return __awaiter(this, void 0, void 0, function* () {
        execOptions.silent = !!silent;
        try {
            console.log(`executing login: "${azPath}" ${command}`);
            yield exec.exec(`"${azPath}" ${command}`, args, execOptions);
        }
        catch (error) {
            throw new Error(error);
        }
    });
}
main();
