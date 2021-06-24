import * as IpcApiFactory from "./IpcApiFactory";
import {SeededCryptoModulePromise, SymmetricKey} from "@dicekeys/seeded-crypto-js"
import * as keytar from 'keytar';
import * as crypto from 'crypto';
import * as fs from 'fs';
import {promises as fsp} from "fs"
import * as path from 'path';
import {app} from 'electron';
import { StringDecoder } from "string_decoder";

const keytarServiceName = "DiceKeys"
const keytarAccountName = "DiceKeysEncryptionKey"
const storeFileName = "encrypted_dicekeys.json"

type DiceKeyIdToJsonEncodedPackagedSealedMessage = {
  [id: string]: string;
};


IpcApiFactory.implementAsyncApi( "setDiceKey", async (id: string, humanReadableForm: string) => {
  const symmetricKey = await getSymmetricKeyForStoringDiceKeys();
  let storedDiceKeys = await loadStoredDiceKeys()
  storedDiceKeys[id] = symmetricKey.seal(humanReadableForm).toJson();
  await saveStoredDiceKeys(storedDiceKeys)
});


IpcApiFactory.implementAsyncApi( "getDiceKey", getDiceKey);
async function getDiceKey(keyId: string): Promise<string> {
  const symmetricKey = await getSymmetricKeyForStoringDiceKeys();
  let storedDiceKeys = await loadStoredDiceKeys();
  const jsonPackagedSealedMessage = storedDiceKeys[keyId];
  if (jsonPackagedSealedMessage == null) {
    throw "doesn't exist";
  }
  const humanReadableFormBytes = symmetricKey.unsealJsonPackagedSealedMessage(storedDiceKeys[keyId]);
  const humanReadableForm = new StringDecoder('utf8').write(Buffer.from(humanReadableFormBytes));
  return humanReadableForm;  
}

IpcApiFactory.implementAsyncApi( "getStoredKeyList", async () => {
  const symmetricKey = await getSymmetricKeyForStoringDiceKeys();
  const storedDiceKeys = await loadStoredDiceKeys()
  return Object.entries(storedDiceKeys).reduce( (result, entry) => {
     const [keyId, jsonPackagedSealedMessage] = entry;
     try {
      const humanReadableFormBytes = symmetricKey.unsealJsonPackagedSealedMessage(jsonPackagedSealedMessage);
      const humanReadableForm = new StringDecoder('utf8').write(Buffer.from(humanReadableFormBytes));
      // 13th die letter and digit, where each die is letter, character, orientation triplet
      const centerLetterAndDigit = humanReadableForm.substr(12 * 3, 2);
      result.push({keyId, centerLetterAndDigit})
     } catch {}
     return result;
  }, [] as {centerLetterAndDigit: string, keyId: string}[]);
});

IpcApiFactory.implementAsyncApi( "deleteDiceKey", async (id: string): Promise<boolean> => {
  let storedDiceKeys = await loadStoredDiceKeys()
  if (storedDiceKeys[id]) {
    delete storedDiceKeys[id]
    await saveStoredDiceKeys(storedDiceKeys)
    return true
  } else{
    return false
  }
});

async function loadStoredDiceKeys(): Promise<DiceKeyIdToJsonEncodedPackagedSealedMessage>{
  const filename =  path.join(app.getPath('userData'), storeFileName)
  
  if (fs.existsSync(filename)){
    const json = await fsp.readFile(filename, "utf8")
    try{
      return JSON.parse(json) as DiceKeyIdToJsonEncodedPackagedSealedMessage
    } catch (e) {
      console.log(e)
    }
  }
  return {}
}

async function saveStoredDiceKeys(store: DiceKeyIdToJsonEncodedPackagedSealedMessage): Promise<void>{
  const filename =  path.join(app.getPath('userData'), storeFileName)
  return fsp.writeFile(filename, JSON.stringify(store))
}

function randomString(size = 32) {
  return crypto
    .randomBytes(size)
    .toString('base64')
    .slice(0, size)
}

async function getEncryptionKeySeed(): Promise<string> {
  const storedSeed = await keytar.getPassword(keytarServiceName, keytarAccountName);
  if (storedSeed != null){
    return storedSeed;
  } else {
    const seed = randomString(32);
    await keytar.setPassword(keytarServiceName, keytarAccountName, seed);
    return seed;
  }
}

const recipeForKeyToEncryptDiceKeysOnDisk=`{"purpose": "encryptDiceKeysOnDisk"}`;
async function getSymmetricKeyForStoringDiceKeys(): Promise<SymmetricKey> {
  const SeededCryptoModule = await SeededCryptoModulePromise;
  const seed = await getEncryptionKeySeed();
  return SeededCryptoModule.SymmetricKey.deriveFromSeed(seed, recipeForKeyToEncryptDiceKeysOnDisk);
}
  