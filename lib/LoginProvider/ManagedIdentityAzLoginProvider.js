"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AzLoginProvider_1 = require("./AzLoginProvider");
class ManagedIdentityAzLoginProvider extends AzLoginProvider_1.AzLoginProvider {
    constructor(info) {
        super(info);
        this.AzLoginCommandArgs.push("--identity"); // bare minimum needed for MSI login
        this.ConfigureUserManagedIdentity();
    }
    ConfigureUserManagedIdentity() {
        if (this._info.UseUserManagedIdentity && this._info.UserManagedIdentityResourceId) {
            console.log(`configuring user-assigned managed identity: ${this._info.UserManagedIdentityResourceId}`);
            this.AzLoginCommandArgs.push("-u", this._info.UserManagedIdentityResourceId);
        }
    }
}
exports.ManagedIdentityAzLoginProvider = ManagedIdentityAzLoginProvider;
