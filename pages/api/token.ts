import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../utils/mongoose";
import { TokenList } from "../../model/TokenList";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await connectToDatabase();

  if (req.method === "POST") {
    try {
      const { tokenAddress, tokenSymbol, assetId } = req.body;

      if (!tokenAddress || typeof assetId !== "number") {
        return res.status(400).json({ error: "tokenAddress and assetId are required." });
      }

      const newToken = await TokenList.create({
        tokenAddress,
        tokenSymbol,
        assetId,
      });

      return res.status(201).json({ token: newToken });
    } catch (error: any) {
      if (error.code === 11000) {
        return res.status(409).json({
          error: "Duplicate tokenAddress or assetId already exists.",
        });
      }
      return res.status(500).json({ error: error.message });
    }
  }

  return res.setHeader("Allow", ["POST"]).status(405).end(`Method ${req.method} Not Allowed`);
}
