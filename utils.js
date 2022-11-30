"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submit = exports.parseError = void 0;
const parseError = (chain, error) => {
    const decoded = chain.registry.findMetaError(error.asModule);
    const { docs, name, section } = decoded;
    return `${section}.${name}: ${docs.join(' ')}`;
};
exports.parseError = parseError;
const submit = (chain, extrinsic, keypair) => {
    return new Promise((resolve, reject) => {
        try {
            extrinsic.signAndSend(keypair, { nonce: -1 }, ({ events, status, dispatchError }) => {
                if (dispatchError) {
                    reject(new Error((0, exports.parseError)(chain, dispatchError)));
                }
                else if (status.isInBlock) {
                    resolve({
                        tx: extrinsic.hash.toHex(),
                        block: status.asInBlock.toHex(),
                    });
                }
            });
        }
        catch (e) {
            reject(e);
        }
    });
};
exports.submit = submit;
