"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AzLoginProvider_1 = require("./AzLoginProvider");
const ManagedIdentityLogin_1 = require("../PowerShell/ManagedIdentityLogin");
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
    EnsureRequiredConfiguration() { }
    ConfigureAzPsSession() {
        if (this._info.UserManagedIdentityResourceId) {
            console.log(`Using user-assigned managed identity for powershell login: ${this._info.UserManagedIdentityResourceId}`);
            this.AzurePsSession = new ManagedIdentityLogin_1.ManagedIdentityLogin(this._info.UserManagedIdentityResourceId);
        }
        else {
            console.log(`Using system-assigned managed identity for powershell login`);
            this.AzurePsSession = new ManagedIdentityLogin_1.ManagedIdentityLogin();
        }
    }
}
exports.ManagedIdentityAzLoginProvider = ManagedIdentityAzLoginProvider;
