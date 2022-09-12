const docusign = require('docusign-esign');
const signingViaEmail = require('../lib/eSignature/examples/signingViaEmail');
const fs = require('fs');
const path = require('path');
const prompt = require('prompt-sync')();

const jwtConfig = require('./jwtConfig.json');
const { ProvisioningInformation } = require('docusign-esign');
const demoDocsPath = path.resolve(__dirname, '../demo_documents');
const doc2File = 'form2.pdf';
const doc3File = 'World_Wide_Corp_lorem.pdf';
const express=require('express');
const app=express();
const url=require('url');
app.get('/sendEmail',(req,res)=>{


  const SCOPES = [
    "signature", "impersonation"
];

 function getConsent() {
 var urlScopes = SCOPES.join('+');

 // Construct consent URL
 var redirectUri = "https://developers.docusign.com/platform/auth/consent";
 var consentUrl = `${jwtConfig.dsOauthServer}/oauth/auth?response_type=code&` +
                     `scope=${urlScopes}&client_id=${jwtConfig.dsJWTClientId}&` +
                     `redirect_uri=${redirectUri}`;

 res.send("Open the following URL in your browser to grant consent to the application:");
 res.send(consentUrl);
rres.send("Consent granted? \n 1)Yes \n 2)No");
 let consentGranted = prompt("");
 if(consentGranted == "1"){
   return true;
 } else {
   console.error("Please grant consent!");
   process.exit();
 }
}

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

   // get user info
   const userInfoResults = await dsApi.getUserInfo(accessToken);

   // use the default account
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
   // Determine the source of the error
   if (body) {
       // The user needs to grant consent
     if (body.error && body.error === 'consent_required') {
       if (getConsent()){ return authenticate(); };
     } else {
       // Consent has been granted. Show status code for DocuSign API error
       this._debug_log(`\nAPI problem: Status code ${e.response.status}, message body:
       ${JSON.stringify(body, null, 4)}\n\n`);
     }
   }
 }
}

function getArgs(apiAccountId, accessToken, basePath){
  const values=url.parse(req.url,true).query;
 signerEmail = values.signerEmail;
 signerName = values.signerName;
 ccEmail =values.ccEmail;
 ccName = values.ccName;

 const envelopeArgs = {
   signerEmail: signerEmail,
   signerName: signerName,
   ccEmail: ccEmail,
   ccName: ccName,
   status: "sent",
   doc2File: path.resolve(demoDocsPath, doc2File),
   doc3File: path.resolve(demoDocsPath, doc3File)
 };
 const args = {
   accessToken: accessToken,
   basePath: basePath,
   accountId: apiAccountId,
   envelopeArgs: envelopeArgs
 };

 return args
}


async function main(){
 const values=url.parse(req.url,true).query;
 let signerName=values.signerName;
 let accountInfo = await authenticate();
 let args = getArgs(accountInfo.apiAccountId, accountInfo.accessToken, accountInfo.basePath);
 let envelopeId = await signingViaEmail.sendEnvelope(args);
 if(envelopeId)
 {
  let ret={envelopeId,signerName};
  res.json(ret);
 }
 else
 {
  res.json('Error');
 }
}

main();

});
app.listen(3000);