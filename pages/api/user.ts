
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../utils/mongoose";
import { Keyring } from "@polkadot/keyring";
import { mnemonicGenerate } from "@polkadot/util-crypto";
import { User } from "../../model/User";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await connectToDatabase();

  if (req.method === "POST") {
    try {
      const { evmAddress, bitcoinAddress } = req.body; // bitcoinAddress can be undefined

      if (!evmAddress) {
        return res.status(400).json({ error: "evmAddress is required." });
      }

      // Check if user already exists with this evmAddress
      const existingUserByEvm = await User.findOne({ evmAddress });
      if (existingUserByEvm) {
        // If user exists, return their data.
        // Future logic could allow updating bitcoinAddress here if provided and different.
        return res.status(200).json({ message: "User already exists.", user: existingUserByEvm });
      }
      
      // If bitcoinAddress is provided, check if it's already in use by another user
      if (bitcoinAddress) {
        const existingUserByBitcoin = await User.findOne({ bitcoinAddress });
        if (existingUserByBitcoin) {
          return res.status(409).json({ error: "This Bitcoin address is already associated with another user." });
        }
      }

      const keyring = new Keyring({ type: "sr25519" });
      const mnemonic = mnemonicGenerate();
      const pair = keyring.createFromUri(mnemonic, {}, "sr25519");

      const newUserDocument: any = {
        evmAddress,
        mnemonic,
        publicKey: pair.publicKey,
        ss58Address: pair.address,
      };

      if (bitcoinAddress) { // Only add bitcoinAddress if provided
        newUserDocument.bitcoinAddress = bitcoinAddress;
      }

      const newUser = await User.create(newUserDocument);

      return res.status(201).json({ user: newUser });
    } catch (error: any) {
      if (error.code === 11000) {
        let field = "a unique field";
        if (error.keyPattern?.evmAddress) field = "EVM address";
        else if (error.keyPattern?.bitcoinAddress) field = "Bitcoin address";
        else if (error.keyPattern?.mnemonic) field = "mnemonic";
        else if (error.keyPattern?.ss58Address) field = "SS58 address";
        return res.status(409).json({ error: `Duplicate key error: This ${field} may already be in use.` });
      }
      return res.status(500).json({ error: error.message });
    }
  } else if (req.method === "GET") {
    try {
      const { evmAddress, bitcoinAddress } = req.query;

      if (!evmAddress && !bitcoinAddress) {
        return res.status(400).json({ error: "Provide either evmAddress or bitcoinAddress" });
      }

      const queryParts = [];
      if (evmAddress) queryParts.push({ evmAddress: evmAddress as string });
      if (bitcoinAddress) queryParts.push({ bitcoinAddress: bitcoinAddress as string });
      
      const query = queryParts.length > 1 ? { $or: queryParts } : queryParts[0];

      const user = await User.findOne(query);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.status(200).json({ user });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  } else if (req.method === "PUT") {
    try {
      const { evmAddress: queryEvmAddress } = req.query; // EVM address from query to identify user
      const { bitcoinAddress: newBitcoinAddress, evmAddress: newEvmAddress } = req.body; // New bitcoin address or EVM from body

      if (!queryEvmAddress || typeof queryEvmAddress !== "string") {
        return res.status(400).json({ error: "Valid current evmAddress in query is required to identify the user." });
      }
      
      const updateData: any = {};
      if (newBitcoinAddress !== undefined) { // Allow setting or unsetting bitcoinAddress
         // If newBitcoinAddress is not null/empty, check for uniqueness
        if (newBitcoinAddress && typeof newBitcoinAddress === 'string') {
            const existingUserWithBtc = await User.findOne({ bitcoinAddress: newBitcoinAddress, evmAddress: { $ne: queryEvmAddress } });
            if (existingUserWithBtc) {
                return res.status(409).json({ error: "This Bitcoin address is already associated with another user." });
            }
        }
        updateData.bitcoinAddress = newBitcoinAddress;
      }
      if (newEvmAddress && typeof newEvmAddress === 'string') {
        // If newEvmAddress is provided, check for uniqueness before updating
        if (newEvmAddress !== queryEvmAddress) {
            const existingUserWithEvm = await User.findOne({ evmAddress: newEvmAddress });
            if (existingUserWithEvm) {
                return res.status(409).json({ error: "This EVM address is already associated with another user." });
            }
        }
        updateData.evmAddress = newEvmAddress;
      }


      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No update data provided (e.g., bitcoinAddress or new evmAddress)." });
      }

      const updatedUser = await User.findOneAndUpdate(
        { evmAddress: queryEvmAddress },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found with the specified evmAddress." });
      }

      return res.status(200).json({ user: updatedUser });
    } catch (error: any) {
       if (error.code === 11000) {
         let field = "a unique field";
         if (error.keyPattern?.evmAddress) field = "EVM address";
         else if (error.keyPattern?.bitcoinAddress) field = "Bitcoin address";
         return res.status(409).json({ error: `Update failed: This ${field} may already be in use by another account.` });
       }
      return res.status(500).json({ error: error.message });
    }
  } else {
    res.setHeader("Allow", ["POST", "GET", "PUT"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
