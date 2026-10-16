export function paymentEnvironment(env:Record<string,string|undefined>=process.env):"test"|"production"{
 const mode=env.PAYMENT_ENVIRONMENT??"test";
 if(mode!=="test"&&mode!=="production")throw Error("Invalid payment environment");
 return mode;
}
export function paymentCredentialPrefix(env:Record<string,string|undefined>):"MP_TEST"|"MP_PRODUCTION"{
 return paymentEnvironment(env)==="production"?"MP_PRODUCTION":"MP_TEST";
}
