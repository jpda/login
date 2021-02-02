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
const actions_secret_parser_1 = require("actions-secret-parser");
const LoginInfo_1 = require("./LoginInfo");
class ServicePrincipalLoginInfo extends LoginInfo_1.LoginInfo {
    constructor(incomingCreds, servicePrincipalId, servicePrincipalKey) {
        let creds = incomingCreds ? incomingCreds : core.getInput('creds');
        let secrets = new actions_secret_parser_1.SecretParser(creds, actions_secret_parser_1.FormatType.JSON);
        super(core.getInput('allow-no-subscriptions').toLowerCase() === "true", core.getInput('enable-AzPSSession').toLowerCase() === "true", secrets.getSecret('$.subscriptionId').toLowerCase(), core.getInput('environment').toLowerCase(), secrets.getSecret('$.managementEndpointUrl').toLowerCase(), secrets.getSecret('$.tenantId').toLowerCase());
        this.ServicePrincipalId = servicePrincipalId ? servicePrincipalId : secrets.getSecret("$.clientId", false);
        this.ServicePrincipalKey = servicePrincipalKey ? servicePrincipalKey : secrets.getSecret("$.clientSecret", true);
    }
}
exports.ServicePrincipalLoginInfo = ServicePrincipalLoginInfo;
