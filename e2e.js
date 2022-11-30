"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("@polkadot/api");
const util_crypto_1 = require("@polkadot/util-crypto");
const spinnies_1 = __importDefault(require("spinnies"));
const utils_1 = require("./utils");
(async () => {
    const spinnies = new spinnies_1.default();
    const provider = new api_1.WsProvider('ws://127.0.0.1:9944');
    const keyring = new api_1.Keyring({ type: 'sr25519' });
    const chain = await api_1.ApiPromise.create({
        provider,
        runtime: {
            AdRuntimeApi: [
                {
                    methods: {
                        cal_reward: {
                            description: 'pre calculate reward of this did, adId, nftId pair',
                            params: [
                                {
                                    name: 'ad_id',
                                    type: 'H256',
                                },
                                {
                                    name: 'nft_id',
                                    type: 'u32',
                                },
                                {
                                    name: 'visitor',
                                    type: 'H160',
                                },
                                {
                                    name: 'referrer',
                                    type: 'Option<H160>',
                                }
                            ],
                            type: 'u128'
                        }
                    },
                    version: 1
                }
            ]
        }
    });
    const alice = keyring.addFromUri('//Alice');
    const m = keyring.addFromUri(await (0, util_crypto_1.mnemonicGenerate)(12));
    // 1. New User
    console.log('Registering visitor DID...'),
        await (0, utils_1.submit)(chain, chain.tx.balances.transfer(m.address, 3000n * 10n ** 18n), alice);
    await (0, utils_1.submit)(chain, chain.tx.did.register(null), m);
    const didOf = await chain.query.did.didOf(m.address);
    const did = didOf.toString();
    console.log(`visitor did: ${did}`);
    // 2. Prepare KOL
    const k = keyring.addFromUri(await (0, util_crypto_1.mnemonicGenerate)(12));
    await (0, utils_1.submit)(chain, chain.tx.balances.transfer(k.address, 3000n * 10n ** 18n), alice);
    await (0, utils_1.submit)(chain, chain.tx.did.register(null), k);
    const kolOf = await chain.query.did.didOf(k.address);
    const kol = kolOf.toString();
    console.log(`kol did is: ${kol}`);
    console.log('Creating NFT...');
    await (0, utils_1.submit)(chain, chain.tx.nft.kick(), k);
    const nftOf = await chain.query.nft.preferred(kol);
    const nft = nftOf.toString();
    console.log(`NFT: ${nft}`);
    console.log('Backing KOL...');
    await (0, utils_1.submit)(chain, chain.tx.nft.back(nft, 1000n * 10n ** 18n), m);
    console.log('Minting NFT...');
    await (0, utils_1.submit)(chain, chain.tx.nft.mint(nft, 'Test Token', 'XTT', 1000n * 10n ** 18n), k);
    console.log('NFT Minted');
    // 3. Prepare Advertiser
    const a = keyring.addFromUri(await (0, util_crypto_1.mnemonicGenerate)(12));
    console.log('Creating Advertiser...');
    await (0, utils_1.submit)(chain, chain.tx.balances.transfer(a.address, 3000n * 10n ** 18n), alice);
    await (0, utils_1.submit)(chain, chain.tx.did.register(null), a);
    const aderOf = await chain.query.did.didOf(a.address);
    const ader = aderOf.toString();
    console.log(`Advertiser: ${ader}`);
    console.log('Depositing to become Advertiser...');
    await (0, utils_1.submit)(chain, chain.tx.advertiser.deposit(1000n * 10n ** 18n), a);
    // 4. Prepare Advertisement
    const tag = new Date().toISOString();
    console.log('Creating Tags...');
    await (0, utils_1.submit)(chain, chain.tx.tag.create(tag), a);
    console.log('Creating Advertisement...');
    await (0, utils_1.submit)(chain, chain.tx.ad.create([tag], 'ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG', 10, 500000, 1n * 10n ** 18n, 1n * 10n ** 18n, 50n * 10n ** 18n, null), a);
    const adsOf = await chain.query.ad.adsOf(ader);
    const ad = adsOf.toHuman()[0];
    console.log(`Advertisement: ${ad}`);
    console.log(`Bidding by ${a.address}...`);
    await (0, utils_1.submit)(chain, chain.tx.swap.sellCurrency(nft, 40n * 10n ** 18n, 2000n * 10n ** 18n, 50000), a);
    await (0, utils_1.submit)(chain, chain.tx.ad.bidWithFraction(ad, nft, 1000n * 10n ** 18n, null, null), a);
    console.log(`bid success`);
    // 5. Payout
    console.log(`Claiming...`);
    const res = await chain.call.adRuntimeApi.calReward(ad, nft, did, null);
    console.log(`cal_reward's result is: ${res.toHuman()}`);
    await chain.disconnect();
})();
