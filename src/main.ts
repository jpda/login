import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import { ManagedIdentityLoginInfo } from './LoginProvider/ManagedIdentityLoginInfo';
import { ServicePrincipalLoginInfo } from './LoginProvider/ServicePrincipalLoginInfo';
import { ManagedIdentityAzLoginProvider } from './LoginProvider/ManagedIdentityAzLoginProvider';
import { ServicePrincipalAzLoginProvider } from './LoginProvider/ServicePrincipalAzLoginProvider';
import { ILoginProvider } from './LoginProvider/AzLoginProvider';

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
        let loginProvider: ILoginProvider;

        const useManagedIdentity = core.getInput('enable-managed-identity').toLowerCase() === "true";
        console.log(`Preparing to login with ${useManagedIdentity ? "managed identity" : "service principal"}.`);

        if (!useManagedIdentity && !creds) {
            throw new Error("Managed identity is not enabled. Service principal authentication requires a creds object, which was not supplied.");
        }
        if (useManagedIdentity) {
            loginProvider = new ManagedIdentityAzLoginProvider(new ManagedIdentityLoginInfo());
        }
        else {
            loginProvider = new ServicePrincipalAzLoginProvider(new ServicePrincipalLoginInfo());
        }
        isAzCLISuccess = await loginProvider.Login();
        if (isAzCLISuccess) {
            console.log("Login successful.");
        } else {
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
}

export async function executeAzCliCommand(
    command: string,
    silent?: boolean,
    execOptions: any = {},
    args: any = []) {

    execOptions.silent = !!silent;
    try {
        console.log(`executing: "${azPath}" ${command} ${args.join(' ')}`);
        await exec.exec(`"${azPath}" ${command}`, args, execOptions);
    }
    catch (error) {
        throw new Error(error);
    }
}

main();