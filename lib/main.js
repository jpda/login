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
const ManagedIdentityLoginInfo_1 = require("./LoginProvider/ManagedIdentityLoginInfo");
const ServicePrincipalLoginInfo_1 = require("./LoginProvider/ServicePrincipalLoginInfo");
const ManagedIdentityAzLoginProvider_1 = require("./LoginProvider/ManagedIdentityAzLoginProvider");
const ServicePrincipalAzLoginProvider_1 = require("./LoginProvider/ServicePrincipalAzLoginProvider");
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
            let loginProvider;
            const useManagedIdentity = core.getInput('enable-managed-identity').toLowerCase() === "true";
            console.log(`Preparing to login with ${useManagedIdentity ? "managed identity" : "service principal"}.`);
            if (!useManagedIdentity && !creds) {
                throw new Error("Managed identity is not enabled. Service principal authentication requires a creds object, which was not supplied.");
            }
            if (useManagedIdentity) {
                loginProvider = new ManagedIdentityAzLoginProvider_1.ManagedIdentityAzLoginProvider(new ManagedIdentityLoginInfo_1.ManagedIdentityLoginInfo());
            }
            else {
                loginProvider = new ServicePrincipalAzLoginProvider_1.ServicePrincipalAzLoginProvider(new ServicePrincipalLoginInfo_1.ServicePrincipalLoginInfo());
            }
            isAzCLISuccess = yield loginProvider.Login();
            if (isAzCLISuccess) {
                console.log("Login successful.");
            }
            else {
                console.error("Login failed.");
            }
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
function executeAzCliCommand(command, silent, execOptions = {}, args = []) {
    return __awaiter(this, void 0, void 0, function* () {
        execOptions.silent = !!silent;
        try {
            console.log(`executing: "${azPath}" ${command} ${args.join()}`);
            yield exec.exec(`"${azPath}" ${command}`, args, execOptions);
        }
        catch (error) {
            throw new Error(error);
        }
    });
}
exports.executeAzCliCommand = executeAzCliCommand;
main();
