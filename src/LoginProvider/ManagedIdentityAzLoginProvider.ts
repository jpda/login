import { ManagedIdentityLoginInfo } from './ManagedIdentityLoginInfo';
import { AzLoginProvider } from './AzLoginProvider';

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
}
