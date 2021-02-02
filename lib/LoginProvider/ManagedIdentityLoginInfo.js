"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const LoginInfo_1 = require("./LoginInfo");
class ManagedIdentityLoginInfo extends LoginInfo_1.LoginInfo {
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
exports.ManagedIdentityLoginInfo = ManagedIdentityLoginInfo;
