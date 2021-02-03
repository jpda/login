import { ManagedIdentityLoginInfo } from './ManagedIdentityLoginInfo';
import { AzLoginProvider } from './AzLoginProvider';
import { ManagedIdentityLogin } from '../PowerShell/ManagedIdentityLogin';

export class ManagedIdentityAzLoginProvider extends AzLoginProvider {
    protected _info: ManagedIdentityLoginInfo;

    constructor(info: ManagedIdentityLoginInfo) {
        super(info);
        this.AzLoginCommandArgs.push("--identity"); // bare minimum needed for MSI login
        this.ConfigureUserManagedIdentity();
    }

    private ConfigureUserManagedIdentity() {
        if (this._info.UseUserManagedIdentity && this._info.UserManagedIdentityResourceId) {
            console.log(`configuring user-assigned managed identity: ${this._info.UserManagedIdentityResourceId}`);
            this.AzLoginCommandArgs.push("-u", this._info.UserManagedIdentityResourceId);
        }
    }

    protected EnsureRequiredConfiguration() { }

    protected ConfigureAzPsSession() {
        if (this._info.UserManagedIdentityResourceId) {
            console.log(`Using user-assigned managed identity for powershell login: ${this._info.UserManagedIdentityResourceId}`);
            this.AzurePsSession = new ManagedIdentityLogin(this._info.UserManagedIdentityResourceId);
        } else {
            console.log(`Using system-assigned managed identity for powershell login`);
            this.AzurePsSession = new ManagedIdentityLogin();
        }
    }
}