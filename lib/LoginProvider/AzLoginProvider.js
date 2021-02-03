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
const main_1 = require("../main");
class AzLoginProvider {
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
        console.log(`AzLoginProvider created with config: ${JSON.stringify(info)}`);
        if (this._info.EnableAzPsSession) {
            this.ConfigureAzPsSession();
        }
        this.EnsureConfiguration();
    }
    SetEnvironment() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._info.Environment == "azurestack") {
                if (!this._info.ResourceManagerEndpointUrl) {
                    throw new Error("resourceManagerEndpointUrl is a required parameter when environment is defined.");
                }
                console.log(`Unregistering cloud: "${this._info.Environment}" first if it exists`);
                try {
                    yield main_1.executeAzCliCommand(`cloud set -n AzureCloud`, true);
                    yield main_1.executeAzCliCommand(`cloud unregister -n "${this._info.Environment}"`, false);
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
                    yield main_1.executeAzCliCommand(`cloud register -n "${this._info.Environment}" --endpoint-resource-manager "${this._info.ResourceManagerEndpointUrl}" --suffix-keyvault-dns "${suffixKeyvault}" --suffix-storage-endpoint "${suffixStorage}" --profile "${profileVersion}"`, false);
                }
                catch (error) {
                    core.error(`Error while trying to register cloud "${this._info.Environment}": "${error}"`);
                }
                console.log(`Done registering cloud: "${this._info.Environment}"`);
            }
            yield main_1.executeAzCliCommand(`cloud set -n "${this._info.Environment}"`, false);
            console.log(`Done setting cloud: "${this._info.Environment}"`);
        });
    }
    EnsureConfiguration() {
        console.log(`AzLoginProvider: ensuring configuration...`);
        if (!this._info.SubscriptionId && !this._info.AllowNoSubscriptionsLogin) {
            throw new Error("Not all values are present. Ensure subscriptionId is supplied.");
        }
        if (!this.azureSupportedCloudName.has(this._info.Environment)) {
            throw new Error("Unsupported value for environment is passed. The list of supported values for environment are ‘azureusgovernment', ‘azurechinacloud’, ‘azuregermancloud’, ‘azurecloud’ or ’azurestack’");
        }
        this.EnsureRequiredConfiguration();
    }
    Login() {
        return __awaiter(this, void 0, void 0, function* () {
            let output = "";
            const execOptions = {
                listeners: {
                    stdout: (data) => {
                        output += data.toString();
                    }
                }
            };
            console.log(`Setting environment to ${this._info.Environment}`);
            yield this.SetEnvironment();
            console.log(`Environment set to ${this._info.Environment}`);
            if (this._info.AllowNoSubscriptionsLogin) {
                console.log(`AllowNoSubscription is true`);
                this.AzLoginCommandArgs.push("--allow-no-subscriptions");
            }
            console.log(`logging in...`);
            yield main_1.executeAzCliCommand(`login`, true, execOptions, this.AzLoginCommandArgs);
            console.log(`az login succeeded.`);
            if (this._info.SubscriptionId) {
                var subscriptionArgs = [
                    "--subscription", this._info.SubscriptionId
                ];
                console.log(`setting subscription context: ${this._info.SubscriptionId}`);
                yield main_1.executeAzCliCommand(`account set`, true, execOptions, subscriptionArgs);
                console.log(`subscription set to ${this._info.SubscriptionId}`);
            }
            if (this._info.EnableAzPsSession) {
                console.log(`enabling AzPs session...`);
                var psSession = this.AzurePsSession;
                yield psSession.initialize();
                yield psSession.login();
                console.log(`enabled AzPsSession.`);
            }
            return true;
        });
    }
}
exports.AzLoginProvider = AzLoginProvider;
