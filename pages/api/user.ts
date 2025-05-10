import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../utils/mongoose";
import { Keyring } from "@polkadot/keyring";
import { mnemonicGenerate } from "@polkadot/util-crypto";
import { User } from "../../model/User";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await connectToDatabase();

  if (req.method === "POST") {
    try {
      const { evmAddress, bitcoinAddress } = req.body;

      if (!evmAddress || !bitcoinAddress) {
        return res.status(400).json({ error: "evmAddress and bitcoinAddress are required." });
      }

      const keyring = new Keyring({ type: "sr25519" });
      const mnemonic = mnemonicGenerate();
      const pair = keyring.createFromUri(mnemonic, {}, "sr25519");

      const newUser = await User.create({
        evmAddress,
        bitcoinAddress,
        mnemonic,
        publicKey: pair.publicKey,
        ss58Address: pair.address,
      });

      res.status(201).json({ user: newUser });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  else if (req.method === "GET") {
    try {
      const { evmAddress, bitcoinAddress } = req.query;
  
      if (!evmAddress && !bitcoinAddress) {
        return res.status(400).json({ error: "Provide either evmAddress or bitcoinAddress" });
      }
  
      const query: any = {};
      if (evmAddress) query.evmAddress = evmAddress;
      if (bitcoinAddress) query.bitcoinAddress = bitcoinAddress;
  
      const user = await User.findOne({
        $or: [
          { evmAddress: query.evmAddress },
          { bitcoinAddress: query.bitcoinAddress },
        ],
      });
  
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
  
      res.status(200).json({ user });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
  

  else if (req.method === "PUT") {
    try {
      const { evmAddress } = req.query;
      const { bitcoinAddress } = req.body;

      if (!evmAddress || typeof evmAddress !== "string") {
        return res.status(400).json({ error: "Invalid or missing evmAddress" });
      }

      const updatedUser = await User.findOneAndUpdate(
        { evmAddress },
        { bitcoinAddress },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.status(200).json({ user: updatedUser });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  else {
    res.setHeader("Allow", ["POST", "GET", "PUT"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
