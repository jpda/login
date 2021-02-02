import * as core from '@actions/core';
import { FormatType, SecretParser } from 'actions-secret-parser';
import { LoginInfo } from './LoginInfo';

export class ServicePrincipalLoginInfo extends LoginInfo {
    public ServicePrincipalId: string;
    public ServicePrincipalKey: string;

    public constructor(incomingCreds?: string, servicePrincipalId?: string, servicePrincipalKey?: string) {
        let creds = incomingCreds ? incomingCreds : core.getInput('creds');
        let secrets = new SecretParser(creds, FormatType.JSON);

        super(
            core.getInput('allow-no-subscriptions').toLowerCase() === "true",
            core.getInput('enable-AzPSSession').toLowerCase() === "true",
            secrets.getSecret('$.subscriptionId').toLowerCase(),
            core.getInput('environment').toLowerCase(),
            secrets.getSecret('$.managementEndpointUrl').toLowerCase(),
            secrets.getSecret('$.tenantId').toLowerCase()
        );

        this.ServicePrincipalId = servicePrincipalId ? servicePrincipalId : secrets.getSecret("$.clientId", false);
        this.ServicePrincipalKey = servicePrincipalKey ? servicePrincipalKey : secrets.getSecret("$.clientSecret", true);
    }
}
