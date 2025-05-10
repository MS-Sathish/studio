import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
	bitcoinAddress: { type: String, unique: true },
    evmAddress: { type: String, unique: true },
	publicKey: String,
	mnemonic: { type: String, required: true, unique: true },
	ss58Address: { type: String, required: true, unique: true },
});

export const User = mongoose.model(
	'BTCUser', UserSchema, 'BTCUsers');

