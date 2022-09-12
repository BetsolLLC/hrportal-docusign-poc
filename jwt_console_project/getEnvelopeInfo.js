const docusign = require('docusign-esign');
const signingViaEmail = require('../lib/eSignature/examples/signingViaEmail');
const fs = require('fs');
const path = require('path');
const prompt = require('prompt-sync')();
const moment = require('moment');

const jwtConfig = require('./jwtConfig.json');
const { ProvisioningInformation } = require('docusign-esign');
const express=require('express');
const app=express();
const url=require('url');
app.get('/getInfo',(req,res)=>{
    const SCOPES = [
        "signature", "impersonation"
    ];
    
    async function authenticate(){
        const jwtLifeSec = 10 * 60, // requested lifetime for the JWT is 10 min
          dsApi = new docusign.ApiClient();
        dsApi.setOAuthBasePath(jwtConfig.dsOauthServer.replace('https://', '')); // it should be domain only.
        let rsaKey = fs.readFileSync(jwtConfig.privateKeyLocation);
      
        try {
          const results = await dsApi.requestJWTUserToken(jwtConfig.dsJWTClientId,
            jwtConfig.impersonatedUserGuid, SCOPES, rsaKey,
            jwtLifeSec);
          const accessToken = results.body.access_token;
      
        
          const userInfoResults = await dsApi.getUserInfo(accessToken);
      
          
          let userInfo = userInfoResults.accounts.find(account =>
            account.isDefault === "true");
      
          return {
            accessToken: results.body.access_token,
            apiAccountId: userInfo.accountId,
            basePath: `${userInfo.baseUri}/restapi`
          };
        } catch (e) {
          console.log(e);
          let body = e.response && e.response.body;
          
          if (body) {
           
            if (body.error && body.error === 'consent_required') {
              if (getConsent()){ return authenticate(); };
            } else {
    
              this._debug_log(`\nAPI problem: Status code ${e.response.status}, message body:
              ${JSON.stringify(body, null, 4)}\n\n`);
            }
          }
        }
      }
    
      function getArgs(apiAccountId, accessToken, basePath,envelopeId){
        const args = {
          accessToken: accessToken,
          basePath: basePath,
          accountId: apiAccountId,
          envelopeId: envelopeId
        };
      
        return args
      }
      const getEnvelope = async (args) => {
        // Data for this method
        // args.basePath
        // args.accessToken
        // args.accountId
        // args.envelopeId
      
        let dsApiClient = new docusign.ApiClient();
        dsApiClient.setBasePath(args.basePath);
        dsApiClient.addDefaultHeader("Authorization", "Bearer " + args.accessToken);
        let envelopesApi = new docusign.EnvelopesApi(dsApiClient),
          results = null;
      
        // Step 1. Call Envelopes::get
        // Exceptions will be caught by the calling function
        results = await envelopesApi.getEnvelope(
          args.accountId,
          args.envelopeId,
          null
        );
        return results;
      };
      async function main(){
        let accountInfo = await authenticate();
        let param=url.parse(req.url,true).query;
        let envelopeId=param.envelopeId;
        let args = getArgs(accountInfo.apiAccountId, accountInfo.accessToken, accountInfo.basePath,envelopeId);
        let getInfo= await getEnvelope(args);
        if(getInfo){
            res.json(getInfo.status);
        }
        else
        res.send('No Documents Completed');
        
      }
    
      main();
});

app.listen(3000);