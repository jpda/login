import * as core from '@actions/core';
import { LoginInfo } from './LoginInfo';

export class ManagedIdentityLoginInfo extends LoginInfo {
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
        );
        this.UseUserManagedIdentity =
            useUserManagedIdentity ? useUserManagedIdentity : core.getInput('enable-managed-identity').toLowerCase() === "true";
        this.UserManagedIdentityResourceId =
            userManagedIdenityResourceId ? userManagedIdenityResourceId : core.getInput('user-managed-identity-resource-id');
    }
}
