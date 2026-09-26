import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Conversation from '../src/model/conversation.model.js';
import Message from '../src/model/message.model.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (!process.env.MONGO_URI) {
    console.error("MONGO_URI not set");
    process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log("Connected to DB");
        const convs = await Conversation.find({
            $expr: { $eq: [{ $size: '$participants' }, 2] }
        }).lean();

        const groups = {};
        for (const c of convs) {
            const key = c.participants.map(String).sort().join(':');
            (groups[key] = groups[key] || []).push(c);
        }

        let merged = 0;
        let keyed = 0;
        for (const [key, list] of Object.entries(groups)) {
            if (list.length < 2) {
                if (!list[0].conversationKey) {
                    await Conversation.updateOne(
                        { _id: list[0]._id },
                        { $set: { conversationKey: key } }
                    );
                    keyed++;
                }
                continue;
            }

            list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            const keep = list[0];
            const drop = list.slice(1);

            for (const d of drop) {
                await Message.updateMany(
                    { conversation: d._id },
                    { $set: { conversation: keep._id } }
                );
            }

            const lastMsg = await Message.findOne({ conversation: keep._id })
                .sort({ createdAt: -1 })
                .lean();

            await Conversation.updateOne(
                { _id: keep._id },
                {
                    $set: {
                        conversationKey: key,
                        lastMessage: lastMsg?._id || keep.lastMessage,
                        lastMessageAt: lastMsg?.createdAt || keep.lastMessageAt
                    }
                }
            );

            await Conversation.deleteMany({ _id: { $in: drop.map(d => d._id) } });
            merged += drop.length;
            console.log(`Merged ${drop.length} dupe(s) for key ${key} -> keep ${keep._id}`);
        }

        console.log(`Done. Merged: ${merged}, keyed legacy: ${keyed}`);
        process.exit(0);
    })
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });