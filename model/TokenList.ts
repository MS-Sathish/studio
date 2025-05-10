import mongoose from "mongoose";

const TokenListSchema = new mongoose.Schema({
	tokenAddress: { type: String, required: true, unique: true },
	tokenSymbol: String,
	assetId: { type: Number, required: true, unique: true },
	createdAt: { type: Date, default: Date.now },
});

export const TokenList = mongoose.model(
	'TokenList', TokenListSchema, 'TokenLists');

