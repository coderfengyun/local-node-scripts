import { hashMessage } from "@ethersproject/hash";
import { Keyring, ApiPromise, WsProvider } from "@polkadot/api";
import { decodeAddress, encodeAddress } from "@polkadot/keyring";
import { Codec } from "@polkadot/types-codec/types";
import { hexToNumber, hexToU8a, isHex } from "@polkadot/util";
import { Sign, sign } from "crypto";
import { parse } from 'csv-parse';
import { ethers } from "ethers";
import config from "./config.json"
import * as fs from 'fs';
import { stringUnion } from "parity-scale-codec";

// import from "csv-parser";

const ENDPOINT = "ws://localhost:9944/ws";
// const ENDPOINT = "wss://rpc.parami.io/ws";


interface Signature {
    address: string;
    msg: string;
    sig: string;
    version: string;
};

type ParsedRecord = {
    record: string[];
    ethAddress: string;
    newSubstrateAddress: string;
    valid: boolean;
}

type ProcessResult = {
    record: string[];
    success: boolean;
    reason: string;
}

const main = async () => {
    let res: ProcessResult[] = [];
    let ethAddress2Did = await parse_linker_entries();
    let parsedRecoverApplications = await parse_recover_did_form();

    let validCount = parsedRecoverApplications.filter((item) => item.valid).reduce((acc, _cur) => acc++, 0);
    let invalidCount = parsedRecoverApplications.filter((item) => !item.valid).reduce((acc, _cur) => acc++, 0);;
    console.log(`after parse file, there exists ${validCount} valid record, ${invalidCount} invalid record`);

    for (let recoverApplication of parsedRecoverApplications) {
        let tmp: ProcessResult = {record: recoverApplication.record, success: true, reason: ""};

        if (!recoverApplication.valid) {
            res.push({...tmp, success: false, reason: "application is not valid"});
            continue;
        }

        if (!ethAddress2Did.has(recoverApplication.ethAddress)) {
            res.push({...tmp, success: false, reason: "ethereum address is not bound to any did"});
            continue;
        }

        let did = ethAddress2Did.get(recoverApplication.ethAddress);
        
        await doTransferDid(did!, recoverApplication.newSubstrateAddress);
        res.push({...tmp});
    }
}

const doTransferDid =async (did: string, newSubstrateAccount: string) => {
    const providerWs = new WsProvider(ENDPOINT);
    
    let apiWs = await ApiPromise.create({provider: providerWs});
    let sudoMnemonic = config['sudoMnemonic'];
    const keyring = new Keyring({ type: "sr25519"});
    const sudo = keyring.addFromUri(sudoMnemonic);

    await apiWs.tx.sudo.sudo(
        apiWs.tx.did.forceTransferWithAssets(did, newSubstrateAccount)
    ).signAndSend(sudo);
}

const parse_linker_entries = async (): Promise<Map<string, string>> => {
    const parser = fs.createReadStream('/Users/yangdoudou/Downloads/did_recovery.tsv')
        .pipe(parse({ delimiter: '\t' }));

    let records: string[][] = [];
    for await (const record of parser) {
        records.push(record);
    }

    return records.filter((item) => item[2].trim() == "Ethereum").reduce((res, cur)=>res.set(cur[1] /**eth address */, cur[0] /**did */), new Map())
};

const parse_recover_did_form = async (): Promise<ParsedRecord[]> => {
    const parser = fs.createReadStream('/Users/yangdoudou/Downloads/did_recovery.tsv')
        .pipe(parse({ delimiter: '\t' }));

    let records: string[][] = [];
    for await (const record of parser) {
        records.push(record);
    }

    let res: Map<string[], ParsedRecord> = new Map();
    /** 
     * format example: datetime substrateAccount signature
     * 2022-11-10 上午10:22:39	5HKMVsDFGP6aPEpmgAKCoEGTdBAEih6qNR9k8igZqxGNGnXF	{   "address": "0x1b83905912A591e5D049E9e46Fd333751F81156A",   "msg": "Parami DID Account\nNew account: 5HKMVsDFGP6aPEpmgAKCoEGTdBAEih6qNR9k8igZqxGNGnXF",   "sig": "0x4fbe1f0788f9e53b7361367dc89181a253d8b9e832b7c70dc13966db72443c447a065b2bcc230e97d9b37c467df670774cce68d0053a175484d0740cd4dce0e41c",   "version": "2" }	did:ad3:mSS3YAx6rxYP5VuZqEpn5X7ncSU						 
     * */
    for (const record of records) {
        
        res.set(record, {record, ethAddress: "", newSubstrateAddress: "", valid: false});

        //1. validate substrate account
        let newSubstrateAccount = record[1].trim();
        if (!isValidAddressPolkadotAddress(newSubstrateAccount)) {
            console.log(`parse_input_file failed: newSubstrateAccount is not valid, ${newSubstrateAccount}`);
            continue;
        }
        
        //2. find ethereum signature
        let signature = findSignatureFrom(record);
        if (!signature) {
            console.log(`parse_input_file failed: can't find signature, for newSubstrateAccount ${newSubstrateAccount}, signature is ${signature}`);    
            continue;
        }
        
        //3. verify ethereum signature
        let verified = verify(signature);
        if (!verified) {
            console.log(`parse_input_file failed: signature verification failed, ${JSON.stringify(signature)}`);
            continue;
        }
        
        res.set(record, {record, ethAddress: signature.address, newSubstrateAddress: newSubstrateAccount, valid: true});
    }

    return records.map((record, _i, _a) => res.get(record)!);
}

const isValidAddressPolkadotAddress = (address: string) => {
    try {
      encodeAddress(
        isHex(address)
          ? hexToU8a(address)
          : decodeAddress(address)
      );
  
      return true;
    } catch (error) {
      return false;
    }
  };

const verify = (signature: Signature): boolean => {
    try {
        let recoveredAddress = ethers.utils.recoverAddress(hashMessage(signature.msg), signature.sig);
        return recoveredAddress == signature.address;
    } catch (err) {
        return false;
    }   
}

const findSignatureFrom = (record: string[]): Signature | undefined => {
    let signature;
    
    for (let item of record) {
        
        try {
            item = item.trim();
            if (!item.startsWith("{")) {
                item = "{ " + item;
            }

            if (!item.endsWith("}")) {
                item = item + " }";
            }

            let tmp = JSON.parse(item) as Signature;
            if (!!tmp.address && !!tmp.msg && !!tmp.sig) {
                signature = tmp;
                console.log(`ethAddress is ${signature.address}, msg is ${signature.msg}!`);
                //TODO: replace \r with return int signature.msg
            }
        } catch (err) {
            // console.log(`error occur when parse signature ${item}`);
        };
    }
    return signature;
}

main().catch((err) => console.error(err));
