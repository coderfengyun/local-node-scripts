"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hash_1 = require("@ethersproject/hash");
const api_1 = require("@polkadot/api");
const keyring_1 = require("@polkadot/keyring");
const util_1 = require("@polkadot/util");
const csv_parse_1 = require("csv-parse");
const ethers_1 = require("ethers");
const config_json_1 = __importDefault(require("./config.json"));
const fs = __importStar(require("fs"));
// import from "csv-parser";
const ENDPOINT = "ws://localhost:9944/ws";
;
const main = async () => {
    let res = [];
    let ethAddress2Did = await parse_linker_entries();
    let parsedRecoverApplications = await parse_recover_did_form();
    let validCount = parsedRecoverApplications.filter((item) => item.valid).reduce((acc, _cur) => acc++, 0);
    let invalidCount = parsedRecoverApplications.filter((item) => !item.valid).reduce((acc, _cur) => acc++, 0);
    ;
    console.log(`after parse file, there exists ${validCount} valid record, ${invalidCount} invalid record`);
    for (let recoverApplication of parsedRecoverApplications) {
        let tmp = { record: recoverApplication.record, success: true, reason: "" };
        if (!recoverApplication.valid) {
            res.push({ ...tmp, success: false, reason: "application is not valid" });
            continue;
        }
        if (!ethAddress2Did.has(recoverApplication.ethAddress)) {
            res.push({ ...tmp, success: false, reason: "ethereum address is not bound to any did" });
            continue;
        }
        let did = ethAddress2Did.get(recoverApplication.ethAddress);
        await doTransferDid(did, recoverApplication.newSubstrateAddress);
        res.push({ ...tmp });
    }
};
const doTransferDid = async (did, newSubstrateAccount) => {
    const providerWs = new api_1.WsProvider(ENDPOINT);
    let apiWs = await api_1.ApiPromise.create({ provider: providerWs });
    let sudoMnemonic = config_json_1.default['sudoMnemonic'];
    const keyring = new api_1.Keyring({ type: "sr25519" });
    const sudo = keyring.addFromUri(sudoMnemonic);
    await apiWs.tx.sudo.sudo(apiWs.tx.did.forceTransferWithAssets(did, newSubstrateAccount)).signAndSend(sudo);
};
const parse_linker_entries = async () => {
    const parser = fs.createReadStream('/Users/yangdoudou/Downloads/did_recovery.tsv')
        .pipe((0, csv_parse_1.parse)({ delimiter: '\t' }));
    let records = [];
    for await (const record of parser) {
        records.push(record);
    }
    return records.filter((item) => item[2].trim() == "Ethereum").reduce((res, cur) => res.set(cur[1] /**eth address */, cur[0] /**did */), new Map());
};
const parse_recover_did_form = async () => {
    const parser = fs.createReadStream('/Users/yangdoudou/Downloads/did_recovery.tsv')
        .pipe((0, csv_parse_1.parse)({ delimiter: '\t' }));
    let records = [];
    for await (const record of parser) {
        records.push(record);
    }
    let res = new Map();
    /**
     * format example: datetime substrateAccount signature
     * 2022-11-10 上午10:22:39	5HKMVsDFGP6aPEpmgAKCoEGTdBAEih6qNR9k8igZqxGNGnXF	{   "address": "0x1b83905912A591e5D049E9e46Fd333751F81156A",   "msg": "Parami DID Account\nNew account: 5HKMVsDFGP6aPEpmgAKCoEGTdBAEih6qNR9k8igZqxGNGnXF",   "sig": "0x4fbe1f0788f9e53b7361367dc89181a253d8b9e832b7c70dc13966db72443c447a065b2bcc230e97d9b37c467df670774cce68d0053a175484d0740cd4dce0e41c",   "version": "2" }	did:ad3:mSS3YAx6rxYP5VuZqEpn5X7ncSU
     * */
    for (const record of records) {
        res.set(record, { record, ethAddress: "", newSubstrateAddress: "", valid: false });
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
        res.set(record, { record, ethAddress: signature.address, newSubstrateAddress: newSubstrateAccount, valid: true });
    }
    return records.map((record, _i, _a) => res.get(record));
};
const isValidAddressPolkadotAddress = (address) => {
    try {
        (0, keyring_1.encodeAddress)((0, util_1.isHex)(address)
            ? (0, util_1.hexToU8a)(address)
            : (0, keyring_1.decodeAddress)(address));
        return true;
    }
    catch (error) {
        return false;
    }
};
const verify = (signature) => {
    try {
        let recoveredAddress = ethers_1.ethers.utils.recoverAddress((0, hash_1.hashMessage)(signature.msg), signature.sig);
        return recoveredAddress == signature.address;
    }
    catch (err) {
        return false;
    }
};
const findSignatureFrom = (record) => {
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
            let tmp = JSON.parse(item);
            if (!!tmp.address && !!tmp.msg && !!tmp.sig) {
                signature = tmp;
                console.log(`ethAddress is ${signature.address}, msg is ${signature.msg}!`);
                //TODO: replace \r with return int signature.msg
            }
        }
        catch (err) {
            // console.log(`error occur when parse signature ${item}`);
        }
        ;
    }
    return signature;
};
main().catch((err) => console.error(err));
