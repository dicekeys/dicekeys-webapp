/**
 * @jest-environment jsdom
 */
import {
  ApiCalls,
  ApiFactory,
  PostMessageApiFactory,
  DerivationOptions,
} from "@dicekeys/dicekeys-api-js"

import {
  ConsentResponse, ApiRequestContext
} from '../api-handler/handle-api-request'
import { postMessageApiResponder } from "../api-handler/handle-post-message-api-request";
import { stringToUtf8ByteArray } from "../api/encodings";
import { SeededCryptoModulePromise } from "@dicekeys/seeded-crypto-js";
import { postMessageApiCallFactory } from "@dicekeys/dicekeys-api-js/dist/post-message-api-factory";

// const diceKey = DiceKey.fromHumanReadableForm(
//   "A1tA1tA1tA1tA1tA1tA1tA1tA1tA1tA1tA1tA1tA1tA1tA1tA1tA1tA1tA1tA1tA1tA1tA1tA1t" as DiceKeyInHumanReadableForm
// );

const getUsersConsentApprove = (requestContext: ApiRequestContext): Promise<ConsentResponse> =>
  Promise.resolve({seedString: "a bogus seed", mutatedRequest: requestContext.request } );
// const getUsersConsentReject: (request: ApiCalls.ApiRequestObject) => Promise<ConsentResponse> =
//   (_request: ApiCalls.ApiRequestObject)  =>
//     Promise.reject(new Exceptions.UserDeclinedToAuthorizeOperation())


// const requestUsersConsent = (response: UsersConsentResponse) => () =>
//   Promise.resolve(response);
// const getUsersApprovalOfApiCommand: GetUsersApprovalOfApiCommand = ({
//     derivationOptionsJson
// }) => Promise.resolve({
//   seedString: DiceKey.toSeedString(diceKey, DerivationOptions(derivationOptionsJson)),
//   derivationOptionsJson
// });

const defaultRequestHost = "client.app";
const defaultRequestOrigin = `https://${defaultRequestHost}`;

const mockClient = (
  requestOrigin: string = defaultRequestOrigin,
  getUsersConsent: (request: ApiRequestContext) => Promise<ConsentResponse>
) => {
  const mockServer = postMessageApiResponder(
    getUsersConsent,
    (response) =>
      PostMessageApiFactory.handlePossibleResultMessage(
        {
          origin: "https://dicekeys.com",
          data: response
        } as MessageEvent
      )
  );

  return postMessageApiCallFactory(
    <CALL extends ApiCalls.ApiCall>(
      request: ApiCalls.RequestMessage<CALL> & ApiCalls.PostMessageRequestMetadata 
    ): Promise<ApiCalls.ApiCallResult<CALL>> => {
      const resultPromise = PostMessageApiFactory.addPostMessageApiPromise<ApiCalls.ApiCallResult<CALL>>(request.requestId)
      
      mockServer({
        origin: requestOrigin,
        data: request
      } as MessageEvent);

      return resultPromise;
    }
  )
}

const defaultTestCall = PostMessageApiFactory.postMessageApiCallFactory(
  mockClient(defaultRequestOrigin, getUsersConsentApprove)
);
const generateSignature = ApiFactory.apiCallFactory<ApiCalls.GenerateSignature>("generateSignature", defaultTestCall);
const getSealingKey = ApiFactory.apiCallFactory<ApiCalls.GetSealingKey>("getSealingKey", defaultTestCall);
const getSecret = ApiFactory.apiCallFactory<ApiCalls.GetSecret>("getSecret", defaultTestCall);
const getPassword = ApiFactory.apiCallFactory<ApiCalls.GetPassword>("getPassword", defaultTestCall);
const getSignatureVerificationKey = ApiFactory.apiCallFactory<ApiCalls.GetSignatureVerificationKey>("getSignatureVerificationKey", defaultTestCall);
const getSigningKey = ApiFactory.apiCallFactory<ApiCalls.GetSigningKey>("getSigningKey", defaultTestCall);
const getSymmetricKey = ApiFactory.apiCallFactory<ApiCalls.GetSymmetricKey>("getSymmetricKey", defaultTestCall);
const getUnsealingKey = ApiFactory.apiCallFactory<ApiCalls.GetUnsealingKey>("getUnsealingKey", defaultTestCall);
const sealWithSymmetricKey = ApiFactory.apiCallFactory<ApiCalls.SealWithSymmetricKey>("sealWithSymmetricKey", defaultTestCall);
const unsealWithSymmetricKey = ApiFactory.apiCallFactory<ApiCalls.UnsealWithSymmetricKey>("unsealWithSymmetricKey", defaultTestCall);
const unsealWithUnsealingKey = ApiFactory.apiCallFactory<ApiCalls.UnsealWithUnsealingKey>("unsealWithUnsealingKey", defaultTestCall);


describe("End-to-end API tests using the PostMessage API", () => {

//  const loadDiceKeyAsync = () => Promise.resolve(diceKey);
//  const requestUsersConsent = (response: UsersConsentResponse) => () =>
//    new Promise<UsersConsentResponse>( (respond) => respond(response) );
 // const requestUsersConsentWillApprove = requestUsersConsent(UsersConsentResponse.Allow);

  const derivationOptionsJson = "{}";
  const derivationOptionsForProtectedKeysJson = JSON.stringify(DerivationOptions({
    clientMayRetrieveKey: true
  }));
  const testMessage = "The secret ingredient is dihydrogen monoxide";
  const testMessageByteArray = stringToUtf8ByteArray(testMessage);

  test("symmetricKeySealAndUnseal", async () => {
    const packagedSealedMessage = await sealWithSymmetricKey({
      derivationOptionsJson,
      plaintext: testMessageByteArray
    });
    const {plaintext} = await unsealWithSymmetricKey({packagedSealedMessage});
    expect(plaintext).toStrictEqual(testMessageByteArray);
//    packagedSealedMessage.delete();
  });

  
  test("Local symmetric key seal and remote unseal", async () => {
    const symmetricKeyFields = await getSymmetricKey({
      derivationOptionsJson: derivationOptionsForProtectedKeysJson
    });
    const symmetricKey = (await SeededCryptoModulePromise).SymmetricKey.fromJsObject(symmetricKeyFields);
    const packagedSealedMessage = symmetricKey.seal(testMessageByteArray);
    const {plaintext} = await unsealWithSymmetricKey({packagedSealedMessage});
    expect(plaintext).toStrictEqual(testMessageByteArray);
  });

  test("Remote sign and verify", async () => {
    const sig = await generateSignature({derivationOptionsJson, message: testMessageByteArray})
    const signatureVerificationKeyFields = await getSignatureVerificationKey({derivationOptionsJson})
    const signatureVerificationKey = (await SeededCryptoModulePromise)
      .SignatureVerificationKey.fromJsObject(signatureVerificationKeyFields);
    expect(signatureVerificationKey.signatureVerificationKeyBytes).toStrictEqual(sig.signatureVerificationKey.signatureVerificationKeyBytes);
    expect(signatureVerificationKey.verify(testMessageByteArray, sig.signature)).toBeTruthy();
    expect(signatureVerificationKey.verify(Uint8Array.from([0]), sig.signature)).toBeFalsy();
    signatureVerificationKey.delete();
  });

  
  test("Local sign and verify", async () => {
    const signingKeyFields = await getSigningKey({derivationOptionsJson: derivationOptionsForProtectedKeysJson});
    const signingKey = (await SeededCryptoModulePromise).SigningKey.fromJsObject(signingKeyFields);
    const signature = signingKey.generateSignature(testMessageByteArray);
    const signatureVerificationKeyFields = await getSignatureVerificationKey({
      derivationOptionsJson: derivationOptionsForProtectedKeysJson
    })
    const signatureVerificationKey = (await SeededCryptoModulePromise)
      .SignatureVerificationKey.fromJsObject(signatureVerificationKeyFields);
    expect(signatureVerificationKey.verify(testMessageByteArray, signature)).toBeTruthy();
    expect(signatureVerificationKey.verify(Uint8Array.from([0]), signature)).toBeFalsy();
    signatureVerificationKey.delete();
  });

  test("asymmetricSealAndUnseal", async () => {
    const sealingKeyFields = await getSealingKey({derivationOptionsJson});
    const sealingKey = (await SeededCryptoModulePromise).SealingKey.fromJsObject(sealingKeyFields);
    const unsealingInstructionsJson = JSON.stringify({
      "requireUsersConsent": {
          "question": "Do you want use \"8fsd8pweDmqed\" as your SpoonerMail account password and remove your current password?",
          "actionButtonLabels": {
              "allow": "Make my password \"8fsd8pweDmqed\"",
              "deny": "No"
          }
      }
    });
    const packagedSealedPkMessage = sealingKey.sealWithInstructions(testMessageByteArray, unsealingInstructionsJson);
    const {plaintext} = await unsealWithUnsealingKey({packagedSealedMessage: packagedSealedPkMessage})
    expect(plaintext).toStrictEqual(testMessageByteArray);
    expect(packagedSealedPkMessage.unsealingInstructions).toBe(unsealingInstructionsJson);
  });

  
  test("Local Asymmetric Seal And Unseal", async () => {
    const UnsealingKeyFields = await getUnsealingKey({
      derivationOptionsJson: derivationOptionsForProtectedKeysJson
    });
    const unsealingKey = (await SeededCryptoModulePromise).UnsealingKey.fromJsObject(UnsealingKeyFields);
    const sealingKey = unsealingKey.getSealingKey();
    const unsealingInstructionsJson = JSON.stringify({
      "requireUsersConsent": {
          "question": "Do you want use \"8fsd8pweDmqed\" as your SpoonerMail account password and remove your current password?",
          "actionButtonLabels": {
              "allow": "Make my password \"8fsd8pweDmqed\"",
              "deny": "No"
          }
      }
    });
    const packagedSealedPkMessage = sealingKey.sealWithInstructions(testMessageByteArray, unsealingInstructionsJson);
    const plaintext = unsealingKey.unseal(packagedSealedPkMessage);
    expect(plaintext).toStrictEqual(testMessageByteArray);
    expect(packagedSealedPkMessage.unsealingInstructions).toBe(unsealingInstructionsJson);
  });


  test("getSecret", async () => {
    const derivationOptions = DerivationOptions({
      allow: [{host: defaultRequestHost}],
      lengthInBytes: 13
    });
    const secret = await getSecret({derivationOptionsJson: JSON.stringify(derivationOptions)});
    expect(secret.secretBytes.length).toBe(13);
  });

  
  test("getPassword", async () => {
    const derivationOptions = DerivationOptions({
      allow: [{host: defaultRequestHost}],
      lengthInBytes: 13
    });
    const {password, derivationOptionsJson} = await getPassword({
      derivationOptionsJson: JSON.stringify(derivationOptions)
    });
    expect(derivationOptionsJson).toBeDefined();
    expect(password.length).toBeGreaterThan(13);
  });


});
